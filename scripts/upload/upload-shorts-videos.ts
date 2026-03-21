/**
 * 쇼츠 영상 업로드 스크립트
 *
 * 원본 파일명을 제목으로 사용하여 media_content 테이블에 shorts로 추가
 *
 * 사용법:
 * npx tsx scripts/upload-shorts-videos.ts
 * npx tsx scripts/upload-shorts-videos.ts --dry-run
 * npx tsx scripts/upload-shorts-videos.ts --limit 5
 */

import { getServiceClient } from '../lib/supabase'
import * as fs from 'fs'
import * as path from 'path'
import * as tus from 'tus-js-client'

// Supabase 클라이언트
const supabase = getServiceClient()

// Cloudflare 설정
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || ''
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || ''
const CLOUDFLARE_STREAM_API = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`

// 직캠 폴더 경로
const FANCAM_FOLDER = path.join(__dirname, 'downloads/직캠')

interface VideoFile {
  filePath: string
  fileName: string
  title: string // 확장자 제외한 원본 파일명
  unit: 'excel' | 'crew'
}

interface UploadResult {
  file: VideoFile
  success: boolean
  cloudflareUid?: string
  mediaId?: number
  error?: string
}

/**
 * 파일명에서 unit 추론
 * 대부분 엑셀부 영상으로 판단
 */
function inferUnit(fileName: string): 'excel' | 'crew' {
  // 크루부 멤버 이름이 포함되어 있으면 crew
  const crewMembers = ['퀸로니', '키키', '한백설', '한세아', '해린', '홍서하']
  for (const member of crewMembers) {
    if (fileName.includes(member)) {
      return 'crew'
    }
  }
  return 'excel'
}

/**
 * 이미 업로드된 영상인지 확인 (제목으로)
 */
async function isAlreadyUploaded(title: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('media_content')
    .select('id')
    .eq('title', title)
    .eq('content_type', 'shorts')
    .limit(1)

  return !error && data && data.length > 0
}

/**
 * TUS 프로토콜로 Cloudflare Stream에 업로드
 */
async function uploadWithTus(
  filePath: string,
  fileName: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const fileSize = fs.statSync(filePath).size
  const fileStream = fs.createReadStream(filePath)

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(fileStream as unknown as tus.Upload['file'], {
      endpoint: CLOUDFLARE_STREAM_API,
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
      chunkSize: 50 * 1024 * 1024, // 50MB chunks
      retryDelays: [0, 3000, 5000, 10000, 20000],
      metadata: {
        filename: fileName,
        filetype: 'video/mp4',
      },
      uploadSize: fileSize,
      onError: (error) => {
        reject(error)
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percent = Math.round((bytesUploaded / bytesTotal) * 100)
        if (onProgress) onProgress(percent)
      },
      onSuccess: () => {
        const uploadUrl = upload.url || ''
        // Extract UID from URL
        const uidMatch = uploadUrl.match(/\/(?:stream|media)\/([a-f0-9]+)/)
        if (uidMatch) {
          resolve(uidMatch[1])
        } else {
          reject(new Error(`Failed to extract UID from URL: ${uploadUrl}`))
        }
      },
    })
    upload.start()
  })
}

/**
 * DB에 쇼츠 기록 추가
 */
async function insertShortsRecord(
  title: string,
  cloudflareUid: string,
  unit: 'excel' | 'crew'
): Promise<number | null> {
  const videoUrl = `https://iframe.videodelivery.net/${cloudflareUid}`
  const thumbnailUrl = `https://videodelivery.net/${cloudflareUid}/thumbnails/thumbnail.jpg?time=7s`

  const { data, error } = await supabase
    .from('media_content')
    .insert({
      content_type: 'shorts',
      title,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      cloudflare_uid: cloudflareUid,
      unit,
      is_featured: false,
    })
    .select('id')
    .single()

  if (error) {
    console.error(`❌ DB 삽입 실패:`, error.message)
    return null
  }
  return data.id
}

/**
 * 파일 목록 수집
 */
function collectVideoFiles(): VideoFile[] {
  const files: VideoFile[] = []

  if (!fs.existsSync(FANCAM_FOLDER)) {
    console.error(`❌ 폴더 없음: ${FANCAM_FOLDER}`)
    return files
  }

  const fileNames = fs.readdirSync(FANCAM_FOLDER).filter((f) => f.endsWith('.mp4'))

  for (const fileName of fileNames) {
    // Skip MVI_* files
    if (fileName.startsWith('MVI_')) {
      console.log(`⏭️ 스킵 (MVI 파일): ${fileName}`)
      continue
    }

    // 원본 파일명 (확장자 제외)
    const title = fileName.replace(/\.mp4$/i, '')
    const unit = inferUnit(fileName)

    files.push({
      filePath: path.join(FANCAM_FOLDER, fileName),
      fileName,
      title,
      unit,
    })
  }

  return files
}

/**
 * 단일 파일 업로드
 */
async function uploadSingleFile(file: VideoFile, dryRun: boolean): Promise<UploadResult> {
  console.log(`\n📹 처리 중: ${file.fileName}`)
  console.log(`   제목: ${file.title}`)
  console.log(`   유닛: ${file.unit}`)

  // 이미 업로드된 영상인지 확인
  const alreadyExists = await isAlreadyUploaded(file.title)
  if (alreadyExists) {
    console.log(`   ⏭️ 이미 업로드됨, 스킵`)
    return { file, success: false, error: '이미 존재' }
  }

  if (dryRun) {
    console.log(`   🔵 [DRY-RUN] 업로드 예정`)
    return { file, success: true }
  }

  // Cloudflare Stream 업로드
  console.log(`   ⬆️ Cloudflare 업로드 중...`)
  try {
    const cloudflareUid = await uploadWithTus(file.filePath, file.fileName, (percent) => {
      process.stdout.write(`\r   진행률: ${percent}%`)
    })
    console.log(`\n   ✅ Cloudflare UID: ${cloudflareUid}`)

    // DB에 기록
    const mediaId = await insertShortsRecord(file.title, cloudflareUid, file.unit)
    if (!mediaId) {
      return { file, success: false, cloudflareUid, error: 'DB 삽입 실패' }
    }
    console.log(`   ✅ DB 기록 완료 (media_id: ${mediaId})`)

    return { file, success: true, cloudflareUid, mediaId }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.log(`   ❌ 업로드 실패: ${errorMsg}`)
    return { file, success: false, error: errorMsg }
  }
}

/**
 * 메인 함수
 */
async function main() {
  console.log('=== 쇼츠 영상 업로드 (media_content) ===\n')

  // 인자 파싱
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitIdx = args.indexOf('--limit')
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity

  if (dryRun) {
    console.log('🔵 DRY-RUN 모드: 실제 업로드 없음\n')
  }

  // Cloudflare 설정 확인
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('❌ Cloudflare 설정 없음')
    console.error('   CLOUDFLARE_ACCOUNT_ID와 CLOUDFLARE_API_TOKEN을 .env.local에 설정하세요')
    return
  }

  // 파일 목록 수집
  const files = collectVideoFiles()
  console.log(`📁 발견된 파일: ${files.length}개`)

  if (files.length === 0) {
    console.log('업로드할 파일이 없습니다.')
    return
  }

  // 업로드 실행
  const results: UploadResult[] = []
  const filesToProcess = files.slice(0, limit)

  console.log(`\n⬆️ 업로드 시작 (${filesToProcess.length}개)...`)

  for (const file of filesToProcess) {
    const result = await uploadSingleFile(file, dryRun)
    results.push(result)
  }

  // 결과 요약
  console.log('\n\n=== 결과 요약 ===')
  const successful = results.filter((r) => r.success && !r.error)
  const skipped = results.filter((r) => r.error === '이미 존재')
  const failed = results.filter((r) => !r.success && r.error !== '이미 존재')

  console.log(`✅ 성공: ${successful.length}개`)
  console.log(`⏭️ 스킵 (이미 존재): ${skipped.length}개`)
  console.log(`❌ 실패: ${failed.length}개`)

  if (failed.length > 0) {
    console.log('\n실패한 파일:')
    failed.forEach((r) => console.log(`  - ${r.file.fileName}: ${r.error}`))
  }
}

main().catch(console.error)
