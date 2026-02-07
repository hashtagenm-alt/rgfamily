/**
 * 쇼츠 영상 트랜스코딩 후 업로드 스크립트
 *
 * 4K 세로 영상을 1080p로 트랜스코딩 후 Cloudflare Stream에 업로드
 *
 * 사용법:
 * npx tsx scripts/upload-shorts-transcoded.ts
 * npx tsx scripts/upload-shorts-transcoded.ts --dry-run
 * npx tsx scripts/upload-shorts-transcoded.ts --limit 5
 */

import { getServiceClient } from './lib/supabase'
import * as fs from 'fs'
import * as path from 'path'
import * as tus from 'tus-js-client'
import { execSync } from 'child_process'

// Supabase 클라이언트
const supabase = getServiceClient()

// Cloudflare 설정
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || ''
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || ''
const CLOUDFLARE_STREAM_API = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`

// 직캠 폴더 경로
const FANCAM_FOLDER = path.join(__dirname, 'downloads/직캠')
const TEMP_FOLDER = path.join(__dirname, 'downloads/temp')

interface VideoFile {
  filePath: string
  fileName: string
  title: string
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
 */
function inferUnit(fileName: string): 'excel' | 'crew' {
  const crewMembers = ['퀸로니', '키키', '한백설', '한세아', '해린', '홍서하']
  for (const member of crewMembers) {
    if (fileName.includes(member)) {
      return 'crew'
    }
  }
  return 'excel'
}

/**
 * 이미 업로드된 영상인지 확인
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
 * FFmpeg로 1080p 세로 영상으로 트랜스코딩
 */
function transcodeVideo(inputPath: string, outputPath: string): boolean {
  try {
    // 1080x1920 (세로 1080p), Apple Silicon VideoToolbox 하드웨어 가속
    const cmd = `ffmpeg -y -i "${inputPath}" -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" -c:v h264_videotoolbox -profile:v main -b:v 8M -c:a aac -b:a 128k -movflags +faststart "${outputPath}"`

    execSync(cmd, { stdio: 'pipe' })
    return true
  } catch (err) {
    console.error('트랜스코딩 실패:', err)
    return false
  }
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
      chunkSize: 50 * 1024 * 1024,
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
    if (fileName.startsWith('MVI_')) {
      console.log(`⏭️ 스킵 (MVI 파일): ${fileName}`)
      continue
    }

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
 * 단일 파일 처리 (트랜스코딩 + 업로드)
 */
async function processFile(file: VideoFile, dryRun: boolean): Promise<UploadResult> {
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

  // 임시 폴더 생성
  if (!fs.existsSync(TEMP_FOLDER)) {
    fs.mkdirSync(TEMP_FOLDER, { recursive: true })
  }

  const tempPath = path.join(TEMP_FOLDER, `temp_${file.fileName}`)

  try {
    // 1. 트랜스코딩
    console.log(`   🔄 트랜스코딩 중 (1080p)...`)
    const transcoded = transcodeVideo(file.filePath, tempPath)
    if (!transcoded) {
      return { file, success: false, error: '트랜스코딩 실패' }
    }
    console.log(`   ✅ 트랜스코딩 완료`)

    // 2. Cloudflare 업로드
    console.log(`   ⬆️ Cloudflare 업로드 중...`)
    const cloudflareUid = await uploadWithTus(tempPath, file.fileName, (percent) => {
      process.stdout.write(`\r   진행률: ${percent}%`)
    })
    console.log(`\n   ✅ Cloudflare UID: ${cloudflareUid}`)

    // 3. DB에 기록
    const mediaId = await insertShortsRecord(file.title, cloudflareUid, file.unit)
    if (!mediaId) {
      return { file, success: false, cloudflareUid, error: 'DB 삽입 실패' }
    }
    console.log(`   ✅ DB 기록 완료 (media_id: ${mediaId})`)

    // 4. 임시 파일 삭제
    fs.unlinkSync(tempPath)

    return { file, success: true, cloudflareUid, mediaId }
  } catch (err) {
    // 임시 파일 정리
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath)
    }
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.log(`   ❌ 실패: ${errorMsg}`)
    return { file, success: false, error: errorMsg }
  }
}

/**
 * 메인 함수
 */
async function main() {
  console.log('=== 쇼츠 영상 트랜스코딩 + 업로드 ===\n')

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
    return
  }

  // 파일 목록 수집
  const files = collectVideoFiles()
  console.log(`📁 발견된 파일: ${files.length}개`)

  if (files.length === 0) {
    console.log('업로드할 파일이 없습니다.')
    return
  }

  // 처리 실행
  const results: UploadResult[] = []
  const filesToProcess = files.slice(0, limit)

  console.log(`\n⬆️ 처리 시작 (${filesToProcess.length}개)...`)

  for (const file of filesToProcess) {
    const result = await processFile(file, dryRun)
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
