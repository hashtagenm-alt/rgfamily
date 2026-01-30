/**
 * rclone → Cloudflare Stream 시그니처 영상 업로드
 *
 * 사용법:
 *   npx tsx scripts/rclone-signature-upload.ts --dry-run
 *   npx tsx scripts/rclone-signature-upload.ts --limit 10
 *   npx tsx scripts/rclone-signature-upload.ts --member 가애
 *   npx tsx scripts/rclone-signature-upload.ts
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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Google Drive 폴더 ID (시그니처 영상 폴더)
const GDRIVE_FOLDER_ID = '1sMgXm1z0L8CY_LP5MxzPO2Bf2arBHYL-'
const RCLONE_BASE = 'gdrive:'
const RCLONE_OPTS = ['--drive-root-folder-id=' + GDRIVE_FOLDER_ID]

const TEMP_DIR = path.join(os.tmpdir(), 'rg-signature-upload')

// ============================================
// 타입
// ============================================

interface VideoTask {
  memberName: string
  memberId: number
  fileName: string
  sigNumber: number
  signatureId: number
  fileSize: number
}

interface UploadOptions {
  dryRun: boolean
  limit?: number
  memberFilter?: string
}

// ============================================
// rclone 유틸
// ============================================

function rcloneExec(args: string[]): string {
  const result = execSync(['rclone', ...args, ...RCLONE_OPTS].join(' '), {
    encoding: 'utf-8',
    timeout: 60000,
  })
  return result
}

function rcloneLsJson(remotePath: string): any[] {
  try {
    const result = rcloneExec(['lsjson', `${RCLONE_BASE}${remotePath}`])
    return JSON.parse(result)
  } catch (e) {
    return []
  }
}

async function rcloneDownload(remotePath: string, localPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      'copy',
      `${RCLONE_BASE}${remotePath}`,
      path.dirname(localPath),
      ...RCLONE_OPTS,
      '--progress',
    ]

    const proc = spawn('rclone', args)

    proc.stderr.on('data', (data) => {
      const line = data.toString().trim()
      if (line.includes('%')) {
        process.stdout.write(`\r   ${line.split('\n')[0].substring(0, 60)}`)
      }
    })

    proc.on('close', (code) => {
      process.stdout.write('\r' + ' '.repeat(70) + '\r')
      if (code === 0) resolve()
      else reject(new Error(`rclone 실패: code ${code}`))
    })

    proc.on('error', reject)
  })
}

// ============================================
// Cloudflare 업로드
// ============================================

const MAX_DIRECT_UPLOAD_SIZE = 200 * 1024 * 1024 // 200MB

async function uploadToCloudflare(filePath: string, title: string): Promise<string> {
  const stats = fs.statSync(filePath)

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

  // Stream-Media-Id 헤더에서 UID 추출
  const uid = initRes.headers.get('stream-media-id')

  // 2. 파일 청크 업로드
  const chunkSize = 50 * 1024 * 1024 // 50MB 청크
  const fileBuffer = fs.readFileSync(filePath)
  let offset = 0

  while (offset < fileSize) {
    const chunk = fileBuffer.subarray(offset, Math.min(offset + chunkSize, fileSize))

    const patchRes = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        'Tus-Resumable': '1.0.0',
        'Upload-Offset': String(offset),
        'Content-Type': 'application/offset+octet-stream',
        'Content-Length': String(chunk.length),
      },
      body: chunk,
    })

    if (!patchRes.ok) {
      throw new Error(`TUS 청크 업로드 실패: ${patchRes.status}`)
    }

    const newOffset = patchRes.headers.get('upload-offset')
    offset = newOffset ? parseInt(newOffset, 10) : offset + chunk.length

    const progress = Math.round((offset / fileSize) * 100)
    process.stdout.write(`\r   ☁️  업로드 중... ${progress}%`)
  }

  process.stdout.write('\r' + ' '.repeat(40) + '\r')

  if (!uid) {
    throw new Error('Cloudflare UID를 받지 못했습니다')
  }

  return uid
}

// ============================================
// DB 함수
// ============================================

async function loadDbMappings() {
  const { data: signatures } = await supabase.from('signatures').select('id, sig_number')
  const { data: members } = await supabase.from('organization').select('id, name')

  const sigMap = new Map<number, number>()
  signatures?.forEach(s => sigMap.set(s.sig_number, s.id))

  const memberMap = new Map<string, number>()
  members?.forEach(m => memberMap.set(m.name, m.id))

  return { sigMap, memberMap }
}

async function checkAlreadyUploaded(signatureId: number, memberId: number): Promise<boolean> {
  const { data } = await supabase
    .from('signature_videos')
    .select('cloudflare_uid')
    .eq('signature_id', signatureId)
    .eq('member_id', memberId)
    .limit(1)

  // cloudflare_uid가 이미 있으면 true
  return !!(data && data.length > 0 && data[0].cloudflare_uid)
}

async function saveToDatabase(signatureId: number, memberId: number, cloudflareUid: string) {
  const { data: existing } = await supabase
    .from('signature_videos')
    .select('id')
    .eq('signature_id', signatureId)
    .eq('member_id', memberId)
    .limit(1)

  if (existing && existing.length > 0) {
    await supabase
      .from('signature_videos')
      .update({ cloudflare_uid: cloudflareUid })
      .eq('id', existing[0].id)
    return { updated: true }
  }

  await supabase.from('signature_videos').insert({
    signature_id: signatureId,
    member_id: memberId,
    video_url: `https://iframe.videodelivery.net/${cloudflareUid}`,
    cloudflare_uid: cloudflareUid,
  })

  return { updated: false }
}

// ============================================
// 헬퍼
// ============================================

function parseSigNumber(fileName: string): number | null {
  const match = fileName.match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

function parseArgs(): UploadOptions {
  const args = process.argv.slice(2)
  const options: UploadOptions = { dryRun: false }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run': options.dryRun = true; break
      case '--limit': options.limit = parseInt(args[++i], 10); break
      case '--member': options.memberFilter = args[++i]; break
    }
  }

  return options
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

// ============================================
// 메인
// ============================================

async function main() {
  console.log('═'.repeat(60))
  console.log('🎬 rclone → Cloudflare Stream 시그니처 영상 업로드')
  console.log('═'.repeat(60))

  const options = parseArgs()

  console.log(`\n📋 모드: ${options.dryRun ? '🔍 검증만' : '🚀 실제 업로드'}`)
  if (options.limit) console.log(`📋 제한: ${options.limit}개`)
  if (options.memberFilter) console.log(`📋 멤버 필터: ${options.memberFilter}`)

  // 임시 폴더 생성
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }

  // DB 매핑 로드
  console.log('\n📊 DB 매핑 로드 중...')
  const { sigMap, memberMap } = await loadDbMappings()
  console.log(`   시그니처: ${sigMap.size}개, 멤버: ${memberMap.size}개`)

  // 멤버 폴더 목록
  console.log('\n📁 멤버 폴더 스캔 중...')
  const memberFolders = rcloneLsJson('')
    .filter((f: any) => f.IsDir)
    .map((f: any) => f.Name)
    .filter((name: string) => memberMap.has(name))

  console.log(`   ${memberFolders.length}개 멤버 폴더 발견`)

  // 멤버 필터 적용
  let foldersToProcess = memberFolders
  if (options.memberFilter) {
    foldersToProcess = memberFolders.filter((f: string) => f === options.memberFilter)
    if (foldersToProcess.length === 0) {
      console.log(`\n⚠️  멤버 '${options.memberFilter}' 폴더를 찾을 수 없습니다.`)
      console.log('   사용 가능한 멤버:', memberFolders.join(', '))
      return
    }
  }

  // 각 멤버 폴더의 영상 수집
  const tasks: VideoTask[] = []
  const errors: string[] = []

  for (const memberName of foldersToProcess) {
    const memberId = memberMap.get(memberName)!
    console.log(`\n🔍 ${memberName} 폴더 스캔 중...`)

    const files = rcloneLsJson(memberName)
      .filter((f: any) => !f.IsDir && f.Name.toLowerCase().endsWith('.mp4'))

    console.log(`   영상: ${files.length}개`)

    for (const file of files) {
      const sigNumber = parseSigNumber(file.Name)
      if (!sigNumber) {
        errors.push(`시그번호 파싱 실패: ${memberName}/${file.Name}`)
        continue
      }

      const signatureId = sigMap.get(sigNumber)
      if (!signatureId) {
        errors.push(`시그니처 미등록 (${sigNumber}): ${memberName}/${file.Name}`)
        continue
      }

      tasks.push({
        memberName,
        memberId,
        fileName: file.Name,
        sigNumber,
        signatureId,
        fileSize: file.Size,
      })
    }
  }

  // 결과 출력
  console.log('\n' + '─'.repeat(60))
  console.log(`✅ 유효한 업로드 태스크: ${tasks.length}개`)
  if (errors.length > 0) {
    console.log(`❌ 오류: ${errors.length}개`)
    errors.slice(0, 5).forEach(e => console.log(`   - ${e}`))
    if (errors.length > 5) console.log(`   ... 외 ${errors.length - 5}개`)
  }

  if (tasks.length === 0) return

  // 제한 적용
  let toUpload = tasks
  if (options.limit && tasks.length > options.limit) {
    toUpload = tasks.slice(0, options.limit)
    console.log(`\n📋 --limit ${options.limit} 적용`)
  }

  // 총 용량 계산
  const totalSize = toUpload.reduce((sum, t) => sum + t.fileSize, 0)
  console.log(`📦 총 용량: ${formatSize(totalSize)}`)

  if (options.dryRun) {
    console.log('\n🔍 [DRY RUN] 검증 완료')
    toUpload.slice(0, 20).forEach((task, idx) => {
      console.log(`  ${idx + 1}. ${task.memberName}/${task.fileName} (${formatSize(task.fileSize)}) → sig:${task.sigNumber}`)
    })
    if (toUpload.length > 20) console.log(`  ... 외 ${toUpload.length - 20}개`)
    return
  }

  // 업로드 시작
  console.log('\n🚀 업로드 시작...\n')

  let success = 0
  let failed = 0
  let updated = 0
  let skipped = 0

  for (let i = 0; i < toUpload.length; i++) {
    const task = toUpload[i]
    const displayName = `${task.memberName}/${task.fileName}`
    console.log(`[${i + 1}/${toUpload.length}] ${displayName} (${formatSize(task.fileSize)})`)

    // 이미 cloudflare_uid가 있으면 건너뛰기
    const alreadyUploaded = await checkAlreadyUploaded(task.signatureId, task.memberId)
    if (alreadyUploaded) {
      console.log('   ⏭️  이미 업로드됨 (건너뜀)\n')
      skipped++
      continue
    }

    const localPath = path.join(TEMP_DIR, task.fileName)

    try {
      // 1. rclone 다운로드
      process.stdout.write('   📥 다운로드 중...')
      await rcloneDownload(`${task.memberName}/${task.fileName}`, localPath)
      console.log(' 완료')

      // 2. Cloudflare 업로드
      process.stdout.write('   ☁️  업로드 중...')
      const cloudflareUid = await uploadToCloudflare(localPath, `${task.sigNumber}_${task.memberName}`)
      console.log(` ${cloudflareUid}`)

      // 3. DB 저장
      process.stdout.write('   💾 DB 저장 중...')
      const result = await saveToDatabase(task.signatureId, task.memberId, cloudflareUid)
      console.log(result.updated ? ' 업데이트' : ' 신규')

      // 4. 로컬 파일 삭제
      fs.unlinkSync(localPath)

      success++
      if (result.updated) updated++
    } catch (err) {
      console.log(`   ❌ ${err instanceof Error ? err.message : String(err)}`)
      failed++

      // 실패해도 로컬 파일 정리
      try { fs.unlinkSync(localPath) } catch {}
    }

    console.log('')
  }

  // 최종 결과
  console.log('═'.repeat(60))
  console.log(`📊 결과: 성공 ${success}개 (신규: ${success - updated}, 업데이트: ${updated}), 실패 ${failed}개, 건너뜀 ${skipped}개`)

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
