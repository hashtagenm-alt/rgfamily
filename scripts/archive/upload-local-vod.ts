/**
 * 로컬 VOD 파일 → Cloudflare Stream 업로드
 *
 * 사용법:
 *   npx tsx scripts/upload-local-vod.ts --folder /path/to/videos
 *   npx tsx scripts/upload-local-vod.ts --folder /path/to/videos --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// ============================================
// 설정
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 지원하는 영상 확장자
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']

// ============================================
// 타입 정의
// ============================================

interface UploadOptions {
  folder: string
  contentType: 'vod' | 'shorts'
  unit?: 'excel' | 'crew'
  dryRun: boolean
  limit?: number
}

interface LocalFile {
  path: string
  name: string
  size: number
}

interface CloudflareUploadResult {
  uid: string
  status: string
}

// ============================================
// 로컬 파일 목록 조회
// ============================================

function getVideoFiles(folderPath: string, limit?: number): LocalFile[] {
  const absolutePath = path.resolve(folderPath)

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`폴더를 찾을 수 없습니다: ${absolutePath}`)
  }

  const files = fs.readdirSync(absolutePath)
  const videoFiles: LocalFile[] = []

  for (const file of files) {
    const ext = path.extname(file).toLowerCase()
    if (VIDEO_EXTENSIONS.includes(ext)) {
      const filePath = path.join(absolutePath, file)
      const stats = fs.statSync(filePath)

      videoFiles.push({
        path: filePath,
        name: file,
        size: stats.size,
      })

      if (limit && videoFiles.length >= limit) {
        break
      }
    }
  }

  // 파일명 기준 정렬
  videoFiles.sort((a, b) => a.name.localeCompare(b.name))

  return videoFiles
}

// ============================================
// Cloudflare Stream 업로드 (TUS)
// ============================================

async function uploadToCloudflare(
  filePath: string,
  meta: Record<string, string>
): Promise<CloudflareUploadResult> {
  const fileSize = fs.statSync(filePath).size

  // 1. TUS 업로드 URL 생성
  const initRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(fileSize),
        'Upload-Metadata': Object.entries(meta)
          .map(([k, v]) => `${k} ${Buffer.from(v).toString('base64')}`)
          .join(','),
      },
    }
  )

  if (!initRes.ok) {
    const errorText = await initRes.text()
    throw new Error(`Cloudflare TUS 초기화 실패: ${initRes.status} - ${errorText}`)
  }

  const uploadUrl = initRes.headers.get('location')
  const streamMediaId = initRes.headers.get('stream-media-id')

  if (!uploadUrl || !streamMediaId) {
    throw new Error('Cloudflare 업로드 URL을 받지 못했습니다')
  }

  console.log(`   Cloudflare UID: ${streamMediaId}`)

  // 2. 청크 업로드 (5MB씩)
  const chunkSize = 5 * 1024 * 1024 // 5MB
  const fileStream = fs.createReadStream(filePath, { highWaterMark: chunkSize })
  let uploadedBytes = 0

  for await (const chunk of fileStream) {
    const buffer = chunk as Buffer

    const patchRes = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/offset+octet-stream',
        'Upload-Offset': String(uploadedBytes),
        'Tus-Resumable': '1.0.0',
      },
      body: buffer,
    })

    if (!patchRes.ok) {
      throw new Error(`Cloudflare 청크 업로드 실패: ${patchRes.status}`)
    }

    uploadedBytes += buffer.length
    const percent = ((uploadedBytes / fileSize) * 100).toFixed(1)
    process.stdout.write(`\r   업로드 중: ${percent}% (${formatBytes(uploadedBytes)} / ${formatBytes(fileSize)})`)
  }

  console.log('\n   업로드 완료!')

  return {
    uid: streamMediaId,
    status: 'queued',
  }
}

// ============================================
// Supabase media_content 등록
// ============================================

async function registerToDatabase(
  uid: string,
  title: string,
  contentType: 'vod' | 'shorts',
  unit?: 'excel' | 'crew',
  description?: string
) {
  const { data, error } = await supabase
    .from('media_content')
    .insert({
      content_type: contentType,
      title,
      description: description || null,
      video_url: `https://iframe.videodelivery.net/${uid}`,
      cloudflare_uid: uid,
      thumbnail_url: `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`,
      unit: unit || null,
      is_featured: false,
      view_count: 0,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`DB 등록 실패: ${error.message}`)
  }

  return data
}

// ============================================
// 중복 체크
// ============================================

async function checkDuplicate(title: string): Promise<boolean> {
  const { data } = await supabase
    .from('media_content')
    .select('id')
    .eq('title', title)
    .limit(1)

  return (data && data.length > 0)
}

// ============================================
// 유틸리티
// ============================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function parseArgs(): UploadOptions {
  const args = process.argv.slice(2)
  const options: UploadOptions = {
    folder: '',
    contentType: 'vod',
    dryRun: false,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--folder':
        options.folder = args[++i]
        break
      case '--content-type':
        options.contentType = args[++i] as 'vod' | 'shorts'
        break
      case '--unit':
        options.unit = args[++i] as 'excel' | 'crew'
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--limit':
        options.limit = parseInt(args[++i], 10)
        break
    }
  }

  return options
}

// ============================================
// 메인 로직
// ============================================

async function processFile(
  file: LocalFile,
  options: UploadOptions,
  index: number,
  total: number
) {
  // 파일명에서 제목 추출 (확장자 제거)
  const title = file.name.replace(/\.[^/.]+$/, '')

  console.log(`\n[${index + 1}/${total}] ${file.name}`)
  console.log(`   크기: ${formatBytes(file.size)}`)
  console.log(`   제목: ${title}`)

  // 중복 체크
  const isDuplicate = await checkDuplicate(title)
  if (isDuplicate) {
    console.log('   ⚠️  이미 등록된 제목입니다. 건너뜀.')
    return { skipped: true }
  }

  if (options.dryRun) {
    console.log('   [DRY RUN] 실제 업로드 건너뜀')
    return { skipped: false }
  }

  // 1. Cloudflare에 업로드
  const result = await uploadToCloudflare(file.path, {
    name: title,
    source: 'local',
  })

  // 2. DB에 등록
  const dbRecord = await registerToDatabase(
    result.uid,
    title,
    options.contentType,
    options.unit
  )

  console.log(`   ✅ DB 등록 완료 (id: ${dbRecord.id})`)

  return { skipped: false }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎬 로컬 VOD → Cloudflare Stream 업로드')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // 환경변수 체크
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('\n❌ Cloudflare 환경변수가 설정되지 않았습니다.')
    console.error('   .env.local에 CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN 추가 필요')
    process.exit(1)
  }

  const options = parseArgs()

  if (!options.folder) {
    console.error('\n❌ --folder 옵션을 지정해주세요.')
    console.error('\n사용법:')
    console.error('  npx tsx scripts/upload-local-vod.ts --folder /path/to/videos')
    console.error('\n옵션:')
    console.error('  --folder /path       영상 파일이 있는 폴더 경로 (필수)')
    console.error('  --content-type vod   vod 또는 shorts (기본: vod)')
    console.error('  --unit excel         excel 또는 crew')
    console.error('  --dry-run            테스트 실행 (실제 업로드 안 함)')
    console.error('  --limit 10           최대 업로드 수')
    console.error('\n예시:')
    console.error('  npx tsx scripts/upload-local-vod.ts --folder ~/Downloads/VOD --dry-run')
    console.error('  npx tsx scripts/upload-local-vod.ts --folder ~/Downloads/VOD --content-type vod')
    process.exit(1)
  }

  // 파일 목록 가져오기
  let files: LocalFile[]
  try {
    files = getVideoFiles(options.folder, options.limit)
    console.log(`\n📁 폴더: ${path.resolve(options.folder)}`)
    console.log(`📹 영상 파일: ${files.length}개`)
  } catch (error) {
    console.error(`\n❌ ${(error as Error).message}`)
    process.exit(1)
  }

  if (files.length === 0) {
    console.log('\n⚠️  업로드할 영상 파일이 없습니다.')
    console.log(`   지원 확장자: ${VIDEO_EXTENSIONS.join(', ')}`)
    return
  }

  // 파일 목록 출력
  console.log('\n파일 목록:')
  files.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.name} (${formatBytes(f.size)})`)
  })

  if (options.dryRun) {
    console.log('\n🔍 [DRY RUN 모드] 실제 업로드 없이 테스트만 진행합니다.')
  }

  // 파일 처리
  let success = 0
  let failed = 0
  let skipped = 0

  for (let i = 0; i < files.length; i++) {
    try {
      const result = await processFile(files[i], options, i, files.length)
      if (result.skipped) {
        skipped++
      } else {
        success++
      }
    } catch (error) {
      console.error(`   ❌ 실패: ${(error as Error).message}`)
      failed++
    }
  }

  // 결과 출력
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📊 결과: 성공 ${success}개, 실패 ${failed}개, 건너뜀 ${skipped}개`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch((error) => {
  console.error('\n❌ 오류 발생:', error.message)
  process.exit(1)
})
