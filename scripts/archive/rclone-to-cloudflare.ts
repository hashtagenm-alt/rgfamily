/**
 * rclone → Cloudflare Stream 스트리밍 업로드
 * 로컬 저장 없이 rclone에서 직접 Cloudflare로 전송
 */

import { createClient } from '@supabase/supabase-js'
import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const RCLONE_REMOTE = 'gdrive:해시태그enm. 대표님 공유 폴더'
const TEMP_DIR = path.join(os.tmpdir(), 'rg-vod-upload')

// ============================================
// rclone으로 파일 목록 가져오기
// ============================================

async function getFileList(): Promise<{ name: string; size: number }[]> {
  return new Promise((resolve, reject) => {
    const rclone = spawn('rclone', ['lsjson', RCLONE_REMOTE, '--drive-shared-with-me'])
    let output = ''

    rclone.stdout.on('data', (data) => {
      output += data.toString()
    })

    rclone.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`rclone 실패: ${code}`))
        return
      }

      try {
        const files = JSON.parse(output)
          .filter((f: any) => !f.IsDir && f.Name.endsWith('.mp4'))
          .map((f: any) => ({ name: f.Name, size: f.Size }))
          .sort((a: any, b: any) => a.name.localeCompare(b.name))
        resolve(files)
      } catch (e) {
        reject(e)
      }
    })

    rclone.on('error', reject)
  })
}

// ============================================
// rclone으로 파일 다운로드 (임시 저장)
// ============================================

async function downloadWithRclone(fileName: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('   📥 rclone 다운로드 시작...')

    const rclone = spawn('rclone', [
      'copy',
      `${RCLONE_REMOTE}/${fileName}`,
      path.dirname(outputPath),
      '--drive-shared-with-me',
      '--progress',
    ])

    rclone.stderr.on('data', (data) => {
      const line = data.toString().trim()
      if (line.includes('Transferred:') || line.includes('%')) {
        process.stdout.write(`\r   📥 ${line.split('\n')[0]}`)
      }
    })

    rclone.on('close', (code) => {
      console.log('')
      if (code === 0) {
        console.log('   ✅ 다운로드 완료')
        resolve()
      } else {
        reject(new Error(`rclone 다운로드 실패: ${code}`))
      }
    })

    rclone.on('error', reject)
  })
}

// ============================================
// Cloudflare Stream 업로드
// ============================================

async function uploadToCloudflare(filePath: string, title: string): Promise<string> {
  const fileSize = fs.statSync(filePath).size
  console.log(`   ☁️  Cloudflare 업로드 시작 (${formatBytes(fileSize)})...`)

  // TUS 초기화
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
    throw new Error(`Cloudflare 초기화 실패: ${await initRes.text()}`)
  }

  const uploadUrl = initRes.headers.get('location')!
  const uid = initRes.headers.get('stream-media-id')!
  console.log(`   UID: ${uid}`)

  // 청크 업로드 (50MB씩 - 대용량 파일용)
  const chunkSize = 50 * 1024 * 1024
  const fd = fs.openSync(filePath, 'r')
  const buffer = Buffer.alloc(chunkSize)
  let uploadedBytes = 0
  let lastLogTime = Date.now()

  while (uploadedBytes < fileSize) {
    const bytesRead = fs.readSync(fd, buffer, 0, chunkSize, uploadedBytes)
    const chunk = buffer.slice(0, bytesRead)

    let retries = 3
    while (retries > 0) {
      try {
        const patchRes = await fetch(uploadUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/offset+octet-stream',
            'Upload-Offset': String(uploadedBytes),
            'Tus-Resumable': '1.0.0',
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
          fs.closeSync(fd)
          throw new Error(`청크 업로드 실패: ${(e as Error).message}`)
        }
        console.log(`\n   ⚠️  재시도 중... (${3 - retries}/3)`)
        await new Promise(r => setTimeout(r, 2000))
      }
    }

    uploadedBytes += bytesRead
    const percent = ((uploadedBytes / fileSize) * 100).toFixed(1)

    // 1초마다 로그 출력
    if (Date.now() - lastLogTime > 1000) {
      process.stdout.write(`\r   ☁️  업로드: ${percent}% (${formatBytes(uploadedBytes)} / ${formatBytes(fileSize)})   `)
      lastLogTime = Date.now()
    }
  }

  fs.closeSync(fd)
  console.log(`\n   ✅ Cloudflare 업로드 완료`)

  return uid
}

// ============================================
// DB 등록
// ============================================

async function registerToDatabase(uid: string, title: string) {
  const { data, error } = await supabase
    .from('media_content')
    .insert({
      content_type: 'vod',
      title,
      video_url: `https://iframe.videodelivery.net/${uid}`,
      cloudflare_uid: uid,
      thumbnail_url: `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`,
      unit: 'excel',
      is_featured: false,
      view_count: 0,
    })
    .select()
    .single()

  if (error) throw new Error(`DB 등록 실패: ${error.message}`)
  return data
}

async function checkDuplicate(title: string): Promise<boolean> {
  const { data } = await supabase
    .from('media_content')
    .select('id')
    .eq('title', title)
    .limit(1)
  return (data && data.length > 0)
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function extractTitle(filename: string): string {
  return filename.replace(/\.mp4$/i, '').trim()
}

// ============================================
// 메인
// ============================================

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎬 rclone → Cloudflare Stream 업로드')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // 임시 폴더 생성
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }

  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitArg = args.indexOf('--limit')
  const limit = limitArg !== -1 ? parseInt(args[limitArg + 1]) : 999

  // 파일 목록 가져오기
  console.log('\n🔍 파일 목록 조회 중...')
  const files = await getFileList()

  if (files.length === 0) {
    console.log('⚠️  파일이 없습니다.')
    return
  }

  const filesToProcess = files.slice(0, limit)

  console.log(`\n📁 처리할 파일: ${filesToProcess.length}개`)
  filesToProcess.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.name} (${formatBytes(f.size)})`)
  })

  if (dryRun) {
    console.log('\n🔍 [DRY RUN] 실제 업로드 없이 종료')
    return
  }

  let success = 0, failed = 0, skipped = 0

  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i]
    const title = extractTitle(file.name)

    console.log(`\n${'━'.repeat(50)}`)
    console.log(`[${i + 1}/${filesToProcess.length}] ${title}`)
    console.log(`   크기: ${formatBytes(file.size)}`)

    // 중복 체크
    if (await checkDuplicate(title)) {
      console.log('   ⚠️  이미 등록됨. 건너뜀.')
      skipped++
      continue
    }

    const outputPath = path.join(TEMP_DIR, file.name)

    try {
      // 1. rclone 다운로드
      await downloadWithRclone(file.name, outputPath)

      // 2. Cloudflare 업로드
      const uid = await uploadToCloudflare(outputPath, title)

      // 3. DB 등록
      const dbRecord = await registerToDatabase(uid, title)
      console.log(`   ✅ DB 등록 완료 (id: ${dbRecord.id})`)

      success++
    } catch (error) {
      console.error(`   ❌ 실패: ${(error as Error).message}`)
      failed++
    } finally {
      // 4. 임시 파일 삭제
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath)
        console.log('   🗑️  임시 파일 삭제')
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📊 결과: 성공 ${success}개, 실패 ${failed}개, 건너뜀 ${skipped}개`)

  if (success > 0) {
    console.log('\n⏳ Cloudflare에서 인코딩 진행 중...')
    console.log(`   https://dash.cloudflare.com/${CLOUDFLARE_ACCOUNT_ID}/stream`)
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
