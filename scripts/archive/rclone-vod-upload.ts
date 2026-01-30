/**
 * rclone → Cloudflare Stream VOD(풀영상) 업로드
 *
 * 사용법:
 *   npx tsx scripts/rclone-vod-upload.ts --dry-run           # 검증만
 *   npx tsx scripts/rclone-vod-upload.ts --limit 5           # 5개만 업로드
 *   npx tsx scripts/rclone-vod-upload.ts --folder "폴더명"   # 특정 폴더만
 *   npx tsx scripts/rclone-vod-upload.ts                     # 전체 업로드
 *
 * 환경변수:
 *   VOD_GDRIVE_FOLDER_ID - Google Drive VOD 폴더 ID (필수)
 */

import { createClient } from '@supabase/supabase-js'
import { spawn, execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

// VOD 폴더 ID (환경변수 또는 인자로 설정)
const VOD_GDRIVE_FOLDER_ID = process.env.VOD_GDRIVE_FOLDER_ID || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const RCLONE_BASE = 'gdrive:'
const TEMP_DIR = path.join(os.tmpdir(), 'rg-vod-upload')

// 파일 크기 제한
const MAX_DIRECT_UPLOAD_SIZE = 200 * 1024 * 1024 // 200MB
const MAX_FILE_SIZE = 30 * 1024 * 1024 * 1024 // 30GB (Cloudflare 제한)

// ============================================
// 타입
// ============================================

interface VideoFile {
  name: string
  path: string
  size: number
  folderName: string
}

interface UploadOptions {
  dryRun: boolean
  limit?: number
  folderFilter?: string
  folderId?: string
  unit?: 'excel' | 'crew'
}

// ============================================
// rclone 유틸
// ============================================

function getRcloneOpts(folderId: string): string[] {
  return ['--drive-root-folder-id=' + folderId]
}

function rcloneExec(args: string[], folderId: string): string {
  const opts = getRcloneOpts(folderId)
  const result = execSync(['rclone', ...args, ...opts].join(' '), {
    encoding: 'utf-8',
    timeout: 120000, // 2분 타임아웃 (폴더 스캔)
  })
  return result
}

function rcloneLsJson(remotePath: string, folderId: string): any[] {
  try {
    const result = rcloneExec(['lsjson', `${RCLONE_BASE}${remotePath}`], folderId)
    return JSON.parse(result)
  } catch (e) {
    console.error(`   ⚠️  폴더 스캔 실패: ${e instanceof Error ? e.message : String(e)}`)
    return []
  }
}

async function rcloneDownload(remotePath: string, localPath: string, folderId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const opts = getRcloneOpts(folderId)
    const args = [
      'copy',
      `${RCLONE_BASE}${remotePath}`,
      path.dirname(localPath),
      ...opts,
      '--progress',
    ]

    const proc = spawn('rclone', args)
    let lastLog = Date.now()

    proc.stderr.on('data', (data) => {
      const line = data.toString().trim()
      // 1초에 한 번만 로그 출력
      if (Date.now() - lastLog > 1000 && (line.includes('%') || line.includes('Transferred'))) {
        const cleanLine = line.split('\n')[0].substring(0, 70)
        process.stdout.write(`\r   📥 ${cleanLine}`)
        lastLog = Date.now()
      }
    })

    proc.on('close', (code) => {
      process.stdout.write('\r' + ' '.repeat(80) + '\r')
      if (code === 0) resolve()
      else reject(new Error(`rclone 다운로드 실패: code ${code}`))
    })

    proc.on('error', reject)
  })
}

// ============================================
// Cloudflare 업로드
// ============================================

async function uploadToCloudflare(filePath: string, title: string): Promise<string> {
  const stats = fs.statSync(filePath)

  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(`파일 크기 초과: ${formatSize(stats.size)} > 30GB`)
  }

  // 200MB 이하는 직접 업로드
  if (stats.size <= MAX_DIRECT_UPLOAD_SIZE) {
    return uploadDirect(filePath, title)
  }

  // 200MB 초과는 TUS 업로드
  return uploadTus(filePath, title)
}

async function uploadDirect(filePath: string, title: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath)
  const blob = new Blob([fileBuffer])

  const formData = new FormData()
  formData.append('file', blob, path.basename(filePath))

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` },
      body: formData,
    }
  )

  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(data.errors?.[0]?.message || 'Cloudflare 업로드 실패')
  }

  return data.result.uid
}

async function uploadTus(filePath: string, title: string): Promise<string> {
  const stats = fs.statSync(filePath)
  const fileSize = stats.size

  // 1. TUS 업로드 URL 요청
  const initRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(fileSize),
        'Upload-Metadata': `name ${Buffer.from(title).toString('base64')}`,
      },
    }
  )

  if (!initRes.ok) {
    const err = await initRes.text()
    throw new Error(`TUS 초기화 실패: ${err}`)
  }

  const uploadUrl = initRes.headers.get('location')
  if (!uploadUrl) {
    throw new Error('TUS 업로드 URL을 받지 못했습니다')
  }

  const uid = initRes.headers.get('stream-media-id')

  // 2. 청크 업로드 (50MB 단위, 스트리밍 방식)
  const chunkSize = 50 * 1024 * 1024
  const fd = fs.openSync(filePath, 'r')
  const buffer = Buffer.alloc(chunkSize)
  let offset = 0
  let lastLogTime = Date.now()

  try {
    while (offset < fileSize) {
      const bytesRead = fs.readSync(fd, buffer, 0, chunkSize, offset)
      const chunk = buffer.subarray(0, bytesRead)

      let retries = 3
      while (retries > 0) {
        try {
          const patchRes = await fetch(uploadUrl, {
            method: 'PATCH',
            headers: {
              'Tus-Resumable': '1.0.0',
              'Upload-Offset': String(offset),
              'Content-Type': 'application/offset+octet-stream',
            },
            body: chunk,
          })

          if (!patchRes.ok) {
            throw new Error(`HTTP ${patchRes.status}`)
          }
          break
        } catch (e) {
          retries--
          if (retries === 0) {
            throw new Error(`청크 업로드 실패: ${(e as Error).message}`)
          }
          console.log(`\n   ⚠️  재시도 중... (${3 - retries}/3)`)
          await new Promise(r => setTimeout(r, 3000))
        }
      }

      offset += bytesRead
      const progress = Math.round((offset / fileSize) * 100)

      if (Date.now() - lastLogTime > 1000) {
        process.stdout.write(`\r   ☁️  업로드: ${progress}% (${formatSize(offset)} / ${formatSize(fileSize)})   `)
        lastLogTime = Date.now()
      }
    }
  } finally {
    fs.closeSync(fd)
  }

  process.stdout.write('\r' + ' '.repeat(60) + '\r')

  if (!uid) {
    throw new Error('Cloudflare UID를 받지 못했습니다')
  }

  return uid
}

// ============================================
// DB 함수
// ============================================

async function checkDuplicate(title: string): Promise<{ exists: boolean; hasCloudflare: boolean; id?: number }> {
  const { data } = await supabase
    .from('media_content')
    .select('id, cloudflare_uid')
    .eq('title', title)
    .limit(1)

  if (!data || data.length === 0) {
    return { exists: false, hasCloudflare: false }
  }

  return {
    exists: true,
    hasCloudflare: !!data[0].cloudflare_uid,
    id: data[0].id,
  }
}

async function saveToDatabase(title: string, cloudflareUid: string, unit: 'excel' | 'crew', existingId?: number) {
  const videoUrl = `https://iframe.videodelivery.net/${cloudflareUid}`
  const thumbnailUrl = `https://videodelivery.net/${cloudflareUid}/thumbnails/thumbnail.jpg?width=640&height=360&fit=crop`

  if (existingId) {
    // 기존 레코드 업데이트
    await supabase
      .from('media_content')
      .update({
        cloudflare_uid: cloudflareUid,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
      })
      .eq('id', existingId)
    return { updated: true }
  }

  // 신규 레코드 삽입
  await supabase.from('media_content').insert({
    content_type: 'vod',
    title,
    video_url: videoUrl,
    cloudflare_uid: cloudflareUid,
    thumbnail_url: thumbnailUrl,
    unit,
    is_featured: false,
    view_count: 0,
  })

  return { updated: false }
}

// ============================================
// 헬퍼
// ============================================

function extractTitle(fileName: string): string {
  return fileName.replace(/\.(mp4|mov|avi|mkv|webm)$/i, '').trim()
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`
  if (mins > 0) return `${mins}m ${secs}s`
  return `${secs}s`
}

function parseArgs(): UploadOptions {
  const args = process.argv.slice(2)
  const options: UploadOptions = { dryRun: false }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run': options.dryRun = true; break
      case '--limit': options.limit = parseInt(args[++i], 10); break
      case '--folder': options.folderFilter = args[++i]; break
      case '--folder-id': options.folderId = args[++i]; break
      case '--unit': options.unit = args[++i] as 'excel' | 'crew'; break
    }
  }

  return options
}

// ============================================
// 메인
// ============================================

async function main() {
  console.log('═'.repeat(60))
  console.log('🎬 rclone → Cloudflare Stream VOD 업로드')
  console.log('═'.repeat(60))

  const options = parseArgs()
  const folderId = options.folderId || VOD_GDRIVE_FOLDER_ID

  if (!folderId) {
    console.log('\n❌ Google Drive 폴더 ID가 필요합니다.')
    console.log('   사용법: npx tsx scripts/rclone-vod-upload.ts --folder-id <폴더ID>')
    console.log('   또는 환경변수: VOD_GDRIVE_FOLDER_ID=<폴더ID>')
    process.exit(1)
  }

  const unit = options.unit || 'excel'

  console.log(`\n📋 설정:`)
  console.log(`   모드: ${options.dryRun ? '🔍 검증만' : '🚀 실제 업로드'}`)
  console.log(`   폴더 ID: ${folderId}`)
  console.log(`   Unit: ${unit}`)
  if (options.limit) console.log(`   제한: ${options.limit}개`)
  if (options.folderFilter) console.log(`   폴더 필터: ${options.folderFilter}`)

  // 임시 폴더 생성
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }

  // 파일 수집
  console.log('\n📁 Google Drive 스캔 중...')

  const allFiles: VideoFile[] = []
  const rootItems = rcloneLsJson('', folderId)

  // 루트의 MP4 파일
  const rootVideos = rootItems.filter((f: any) => !f.IsDir && /\.(mp4|mov|avi|mkv|webm)$/i.test(f.Name))
  for (const file of rootVideos) {
    allFiles.push({
      name: file.Name,
      path: file.Name,
      size: file.Size,
      folderName: '(루트)',
    })
  }

  // 하위 폴더 스캔
  const subFolders = rootItems
    .filter((f: any) => f.IsDir)
    .filter((f: any) => !options.folderFilter || f.Name.includes(options.folderFilter))

  for (const folder of subFolders) {
    console.log(`   📂 ${folder.Name} 스캔 중...`)
    const folderItems = rcloneLsJson(folder.Name, folderId)
    const videos = folderItems.filter((f: any) => !f.IsDir && /\.(mp4|mov|avi|mkv|webm)$/i.test(f.Name))

    for (const file of videos) {
      allFiles.push({
        name: file.Name,
        path: `${folder.Name}/${file.Name}`,
        size: file.Size,
        folderName: folder.Name,
      })
    }
    console.log(`      ${videos.length}개 영상`)
  }

  console.log(`\n📊 총 ${allFiles.length}개 영상 발견`)

  if (allFiles.length === 0) {
    console.log('⚠️  업로드할 영상이 없습니다.')
    return
  }

  // 용량 체크
  const oversizedFiles = allFiles.filter(f => f.size > MAX_FILE_SIZE)
  if (oversizedFiles.length > 0) {
    console.log(`\n⚠️  30GB 초과 파일 ${oversizedFiles.length}개 (건너뜀):`)
    oversizedFiles.forEach(f => console.log(`   - ${f.name} (${formatSize(f.size)})`))
  }

  // 유효한 파일만 필터링
  let toUpload = allFiles.filter(f => f.size <= MAX_FILE_SIZE)

  // 제한 적용
  if (options.limit && toUpload.length > options.limit) {
    toUpload = toUpload.slice(0, options.limit)
    console.log(`\n📋 --limit ${options.limit} 적용`)
  }

  // 총 용량
  const totalSize = toUpload.reduce((sum, f) => sum + f.size, 0)
  console.log(`\n📦 업로드 대상: ${toUpload.length}개 (${formatSize(totalSize)})`)

  // Dry run 모드
  if (options.dryRun) {
    console.log('\n🔍 [DRY RUN] 업로드 대상 목록:\n')
    toUpload.forEach((file, idx) => {
      console.log(`  ${idx + 1}. [${file.folderName}] ${file.name}`)
      console.log(`     크기: ${formatSize(file.size)}`)
    })
    return
  }

  // 업로드 시작
  console.log('\n🚀 업로드 시작...\n')

  let success = 0
  let failed = 0
  let updated = 0
  let skipped = 0
  const startTime = Date.now()

  for (let i = 0; i < toUpload.length; i++) {
    const file = toUpload[i]
    const title = extractTitle(file.name)

    console.log('─'.repeat(60))
    console.log(`[${i + 1}/${toUpload.length}] ${file.folderName}/${file.name}`)
    console.log(`   크기: ${formatSize(file.size)}`)

    // 중복 체크
    const duplicate = await checkDuplicate(title)
    if (duplicate.hasCloudflare) {
      console.log('   ⏭️  이미 Cloudflare에 업로드됨 (건너뜀)\n')
      skipped++
      continue
    }

    const localPath = path.join(TEMP_DIR, file.name)

    try {
      // 1. rclone 다운로드
      console.log('   📥 다운로드 중...')
      await rcloneDownload(file.path, localPath, folderId)
      console.log('   ✅ 다운로드 완료')

      // 2. Cloudflare 업로드
      console.log('   ☁️  Cloudflare 업로드 중...')
      const cloudflareUid = await uploadToCloudflare(localPath, title)
      console.log(`   ✅ UID: ${cloudflareUid}`)

      // 3. DB 저장
      const result = await saveToDatabase(title, cloudflareUid, unit, duplicate.id)
      console.log(`   💾 DB ${result.updated ? '업데이트' : '저장'} 완료`)

      success++
      if (result.updated) updated++
    } catch (err) {
      console.log(`   ❌ 실패: ${err instanceof Error ? err.message : String(err)}`)
      failed++
    } finally {
      // 임시 파일 정리
      try {
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath)
        }
      } catch {}
    }

    // 진행률 표시
    const elapsed = (Date.now() - startTime) / 1000
    const avgTime = elapsed / (i + 1)
    const remaining = avgTime * (toUpload.length - i - 1)
    console.log(`   ⏱️  경과: ${formatDuration(elapsed)}, 예상 잔여: ${formatDuration(remaining)}`)
    console.log('')
  }

  // 최종 결과
  const totalElapsed = (Date.now() - startTime) / 1000

  console.log('═'.repeat(60))
  console.log('📊 최종 결과:')
  console.log(`   ✅ 성공: ${success}개 (신규: ${success - updated}, 업데이트: ${updated})`)
  console.log(`   ❌ 실패: ${failed}개`)
  console.log(`   ⏭️  건너뜀: ${skipped}개`)
  console.log(`   ⏱️  총 소요 시간: ${formatDuration(totalElapsed)}`)

  if (success > 0) {
    console.log(`\n⏳ Cloudflare 인코딩 진행 중...`)
    console.log(`   https://dash.cloudflare.com/${CLOUDFLARE_ACCOUNT_ID}/stream`)
  }

  console.log('═'.repeat(60))
}

main().catch(err => {
  console.error('\n❌ 오류:', err.message)
  process.exit(1)
})
