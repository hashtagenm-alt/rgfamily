/**
 * 쇼츠 영상 리인코딩 업로드 파이프라인
 *
 * Google Drive → rclone 다운로드 → FFmpeg 리인코딩 → Cloudflare Stream TUS 업로드 → DB 등록
 *
 * 원본 영상 비트레이트가 200Mbps+ 로 Cloudflare Stream 인코딩 한도 초과 시
 * 해상도는 유지하면서 비트레이트만 낮춰서 업로드
 *
 * FFmpeg 설정:
 *   - 해상도 유지 (2160x3840 세로 4K 그대로)
 *   - VideoToolbox 하드웨어 인코더 (Apple Silicon) → 실패 시 libx264 폴백
 *   - 목표 비트레이트 ~40Mbps (Cloudflare 한도 이내)
 *   - 오디오: AAC 128kbps
 *
 * 사용법:
 *   npx tsx scripts/upload-shorts-reencode.ts --dry-run          # 목록 확인만
 *   npx tsx scripts/upload-shorts-reencode.ts --limit 3          # 3개만 처리
 *   npx tsx scripts/upload-shorts-reencode.ts                    # 전체 업로드
 *   npx tsx scripts/upload-shorts-reencode.ts --skip-download    # 이미 다운로드된 파일 사용
 *   npx tsx scripts/upload-shorts-reencode.ts --skip-encode      # 이미 인코딩된 파일 사용
 */

import { getServiceClient } from '../lib/supabase'
import * as fs from 'fs'
import * as path from 'path'
import * as tus from 'tus-js-client'
import { execSync, exec } from 'child_process'

// ==================== 설정 ====================

const supabase = getServiceClient()

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || ''
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || ''
const CLOUDFLARE_TUS_ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`

// Google Drive 쇼츠 폴더 ID
const GDRIVE_FOLDER_ID = '1kEUuHsY3Ob_lvuy5gw2zkmVjQO58l3b1'

// 로컬 폴더
const DOWNLOAD_DIR = path.join(__dirname, 'downloads/shorts')
const ENCODED_DIR = path.join(__dirname, 'downloads/shorts-encoded')

// TUS 청크 사이즈: 5MB
const TUS_CHUNK_SIZE = 5 * 1024 * 1024

// FFmpeg 비트레이트 설정 (Cloudflare Stream 최대 ~100Mbps)
const TARGET_VIDEO_BITRATE = '95M'   // 95Mbps 타겟 (최고 화질)
const MAX_VIDEO_BITRATE = '100M'     // 100Mbps 피크 (Cloudflare 한도)
const AUDIO_BITRATE = '192k'

// ==================== 타입 ====================

interface UploadResult {
  fileName: string
  title: string
  success: boolean
  cloudflareUid?: string
  mediaId?: number
  error?: string
  skipped?: boolean
  originalSize?: number
  encodedSize?: number
}

// ==================== 유틸리티 ====================

function inferUnit(fileName: string): 'excel' | 'crew' {
  const crewMembers = ['퀸로니', '키키', '한백설', '한세아', '해린', '홍서하']
  return crewMembers.some(m => fileName.includes(m)) ? 'crew' : 'excel'
}

function formatSize(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

async function isAlreadyUploaded(title: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('media_content')
    .select('id')
    .eq('title', title)
    .eq('content_type', 'shorts')
    .limit(1)
  return !error && !!data && data.length > 0
}

/** ffprobe로 비트레이트 확인 */
function getVideoBitrate(filePath: string): number {
  try {
    const output = execSync(
      `ffprobe -v quiet -print_format json -show_format "${filePath}"`,
      { encoding: 'utf8' }
    )
    const data = JSON.parse(output)
    return parseInt(data.format?.bit_rate || '0', 10)
  } catch {
    return 0
  }
}

// ==================== Step 1: rclone으로 Google Drive 파일 목록 조회 ====================

function listGdriveFiles(): { name: string; size: number }[] {
  console.log('📂 Google Drive 파일 목록 조회 중...')

  const output = execSync(
    `rclone lsjson "gdrive:" --drive-root-folder-id "${GDRIVE_FOLDER_ID}" --files-only --no-modtime`,
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  )

  const files = JSON.parse(output) as { Path: string; Name: string; Size: number; IsDir: boolean }[]
  return files
    .filter(f => !f.IsDir && f.Name.endsWith('.mp4'))
    .map(f => ({ name: f.Name, size: f.Size }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// ==================== Step 2: rclone으로 개별 파일 다운로드 ====================

function downloadFile(fileName: string): boolean {
  const localPath = path.join(DOWNLOAD_DIR, fileName)

  if (fs.existsSync(localPath)) {
    const stat = fs.statSync(localPath)
    if (stat.size > 0) {
      console.log(`   📁 이미 다운로드됨 (${formatSize(stat.size)})`)
      return true
    }
  }

  try {
    console.log(`   ⬇️  rclone 다운로드 중...`)
    execSync(
      `rclone copy "gdrive:${fileName}" "${DOWNLOAD_DIR}" --drive-root-folder-id "${GDRIVE_FOLDER_ID}" --progress`,
      { stdio: 'inherit', timeout: 600000 }
    )
    return fs.existsSync(localPath) && fs.statSync(localPath).size > 0
  } catch (err) {
    console.error(`   ❌ 다운로드 실패:`, err instanceof Error ? err.message : err)
    return false
  }
}

// ==================== Step 3: FFmpeg 리인코딩 ====================

function encodeFile(fileName: string): boolean {
  const inputPath = path.join(DOWNLOAD_DIR, fileName)
  const outputPath = path.join(ENCODED_DIR, fileName)

  // 이미 인코딩된 파일 존재 확인
  if (fs.existsSync(outputPath)) {
    const stat = fs.statSync(outputPath)
    if (stat.size > 0) {
      console.log(`   📁 이미 인코딩됨 (${formatSize(stat.size)})`)
      return true
    }
  }

  // 원본 비트레이트 확인
  const originalBitrate = getVideoBitrate(inputPath)
  const originalMbps = (originalBitrate / 1000000).toFixed(0)

  // 비트레이트가 이미 낮으면 인코딩 불필요 (100Mbps 이하)
  if (originalBitrate > 0 && originalBitrate < 100_000_000) {
    console.log(`   ⚡ 비트레이트 ${originalMbps}Mbps → 인코딩 불필요, 원본 사용`)
    fs.copyFileSync(inputPath, outputPath)
    return true
  }

  console.log(`   🎬 FFmpeg 리인코딩 (${originalMbps}Mbps → ~40Mbps)...`)

  // VideoToolbox 하드웨어 인코딩 시도
  const hwCmd = [
    'ffmpeg', '-y', '-i', `"${inputPath}"`,
    '-c:v', 'h264_videotoolbox',
    '-b:v', TARGET_VIDEO_BITRATE,
    '-maxrate', MAX_VIDEO_BITRATE,
    '-bufsize', '80M',
    '-profile:v', 'main',
    '-c:a', 'aac', '-b:a', AUDIO_BITRATE,
    '-movflags', '+faststart',
    `"${outputPath}"`
  ].join(' ')

  try {
    execSync(hwCmd, { stdio: 'inherit', timeout: 600000 })
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      return true
    }
  } catch {
    console.log(`   ⚠️  VideoToolbox 실패, libx264 소프트웨어 인코딩으로 전환...`)
    // 실패한 출력 파일 정리
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
  }

  // 소프트웨어 인코딩 폴백 (CRF 모드)
  const swCmd = [
    'ffmpeg', '-y', '-i', `"${inputPath}"`,
    '-c:v', 'libx264',
    '-crf', '20',
    '-preset', 'fast',
    '-profile:v', 'main',
    '-c:a', 'aac', '-b:a', AUDIO_BITRATE,
    '-movflags', '+faststart',
    `"${outputPath}"`
  ].join(' ')

  try {
    execSync(swCmd, { stdio: 'inherit', timeout: 1200000 }) // 20분 타임아웃
    return fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0
  } catch (err) {
    console.error(`   ❌ 인코딩 실패:`, err instanceof Error ? err.message : err)
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
    return false
  }
}

// ==================== Step 4: TUS 프로토콜로 Cloudflare Stream 업로드 ====================

async function uploadWithTus(filePath: string, fileName: string): Promise<string> {
  const fileSize = fs.statSync(filePath).size
  const fileStream = fs.createReadStream(filePath)

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(fileStream as unknown as tus.Upload['file'], {
      endpoint: CLOUDFLARE_TUS_ENDPOINT,
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
      chunkSize: TUS_CHUNK_SIZE,
      retryDelays: [0, 3000, 5000, 10000, 20000, 30000],
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
        const uploaded = formatSize(bytesUploaded)
        const total = formatSize(bytesTotal)
        process.stdout.write(`\r   ⬆️  ${percent}% (${uploaded} / ${total})`)
      },
      onSuccess: () => {
        process.stdout.write('\n')
        const uploadUrl = upload.url || ''
        const uidMatch = uploadUrl.match(/\/(?:stream|media)\/([a-f0-9]+)/)
        if (uidMatch) {
          resolve(uidMatch[1])
        } else {
          reject(new Error(`UID 추출 실패: ${uploadUrl}`))
        }
      },
    })
    upload.start()
  })
}

// ==================== Step 5: DB에 쇼츠 기록 추가 ====================

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
      is_published: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error(`   ❌ DB 삽입 실패:`, error.message)
    return null
  }
  return data.id
}

// ==================== 파이프라인: 단일 파일 처리 ====================

async function processFile(
  fileName: string,
  fileSize: number,
  index: number,
  total: number,
  options: { dryRun: boolean; skipDownload: boolean; skipEncode: boolean },
): Promise<UploadResult> {
  const title = fileName.replace(/\.mp4$/i, '')
  const unit = inferUnit(fileName)

  console.log(`\n━━━ [${index + 1}/${total}] ${fileName} (${formatSize(fileSize)}) ━━━`)
  console.log(`   제목: ${title} | 유닛: ${unit}`)

  // 1) 이미 업로드 확인
  const exists = await isAlreadyUploaded(title)
  if (exists) {
    console.log(`   ⏭️  이미 DB에 존재, 스킵`)
    return { fileName, title, success: false, skipped: true }
  }

  if (options.dryRun) {
    console.log(`   🔵 [DRY-RUN] 업로드 예정`)
    return { fileName, title, success: true }
  }

  // 2) rclone 다운로드
  if (!options.skipDownload) {
    const downloaded = downloadFile(fileName)
    if (!downloaded) {
      return { fileName, title, success: false, error: '다운로드 실패' }
    }
  }

  const originalPath = path.join(DOWNLOAD_DIR, fileName)
  const encodedPath = path.join(ENCODED_DIR, fileName)

  // --skip-encode 모드: 인코딩된 파일만 있으면 됨
  if (options.skipEncode) {
    if (!fs.existsSync(encodedPath)) {
      console.log(`   ⏭️  인코딩된 파일 없음, 스킵`)
      return { fileName, title, success: false, skipped: true }
    }
  } else {
    // 원본 파일 필요
    if (!fs.existsSync(originalPath)) {
      return { fileName, title, success: false, error: '로컬 파일 없음' }
    }

    // 3) FFmpeg 리인코딩
    const encoded = encodeFile(fileName)
    if (!encoded) {
      return { fileName, title, success: false, error: '인코딩 실패' }
    }
  }

  if (!fs.existsSync(encodedPath)) {
    return { fileName, title, success: false, error: '인코딩된 파일 없음' }
  }

  const originalSize = fs.existsSync(originalPath) ? fs.statSync(originalPath).size : fileSize
  const encodedSize = fs.statSync(encodedPath).size
  const ratio = ((1 - encodedSize / originalSize) * 100).toFixed(0)
  console.log(`   📊 크기: ${formatSize(originalSize)} → ${formatSize(encodedSize)} (${ratio}% 감소)`)

  // 4) Cloudflare TUS 업로드
  try {
    console.log(`   ⬆️  Cloudflare Stream 업로드 중 (${TUS_CHUNK_SIZE / 1024 / 1024}MB 청크)...`)
    const cloudflareUid = await uploadWithTus(encodedPath, fileName)
    console.log(`   ✅ Cloudflare UID: ${cloudflareUid}`)

    // 5) DB 기록
    const mediaId = await insertShortsRecord(title, cloudflareUid, unit)
    if (!mediaId) {
      return { fileName, title, success: false, cloudflareUid, error: 'DB 삽입 실패' }
    }
    console.log(`   ✅ DB 기록 완료 (media_id: ${mediaId})`)

    // 6) 로컬 파일 삭제 (원본 + 인코딩본 모두)
    if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath)
    if (fs.existsSync(encodedPath)) fs.unlinkSync(encodedPath)
    console.log(`   🗑️  로컬 파일 삭제 완료`)

    return { fileName, title, success: true, cloudflareUid, mediaId, originalSize, encodedSize }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`   ❌ 업로드 실패: ${errorMsg}`)
    return { fileName, title, success: false, error: errorMsg }
  }
}

// ==================== 메인 ====================

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║  쇼츠 업로드 (rclone + FFmpeg 리인코딩 + TUS)      ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')

  // 인자 파싱
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const skipDownload = args.includes('--skip-download')
  const skipEncode = args.includes('--skip-encode')
  const limitIdx = args.indexOf('--limit')
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity

  if (dryRun) console.log('🔵 DRY-RUN 모드: 실제 업로드 없음\n')
  if (skipDownload) console.log('⏩ SKIP-DOWNLOAD: 이미 다운로드된 파일만 처리\n')
  if (skipEncode) console.log('⏩ SKIP-ENCODE: 이미 인코딩된 파일만 업로드\n')

  // 설정 확인
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('❌ CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN 미설정')
    process.exit(1)
  }

  for (const cmd of ['rclone', 'ffmpeg', 'ffprobe']) {
    try {
      execSync(`which ${cmd}`, { stdio: 'pipe' })
    } catch {
      console.error(`❌ ${cmd}이 설치되어 있지 않습니다`)
      process.exit(1)
    }
  }

  // 폴더 생성
  for (const dir of [DOWNLOAD_DIR, ENCODED_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  // 1. Google Drive 파일 목록
  const gdriveFiles = listGdriveFiles()
  const totalSize = gdriveFiles.reduce((s, f) => s + f.size, 0)
  console.log(`📁 총 ${gdriveFiles.length}개 파일 (${formatSize(totalSize)})\n`)

  if (gdriveFiles.length === 0) {
    console.log('업로드할 파일이 없습니다.')
    return
  }

  // 2. 처리
  const filesToProcess = gdriveFiles.slice(0, limit)
  console.log(`⬆️  처리 대상: ${filesToProcess.length}개`)

  const results: UploadResult[] = []
  for (let i = 0; i < filesToProcess.length; i++) {
    const f = filesToProcess[i]
    const result = await processFile(f.name, f.size, i, filesToProcess.length, {
      dryRun,
      skipDownload,
      skipEncode,
    })
    results.push(result)
  }

  // 3. 결과 요약
  console.log('\n\n╔══════════════════════════════════════════════════════╗')
  console.log('║  결과 요약                                            ║')
  console.log('╚══════════════════════════════════════════════════════╝')

  const succeeded = results.filter(r => r.success && !r.skipped)
  const skipped = results.filter(r => r.skipped)
  const failed = results.filter(r => !r.success && !r.skipped)

  console.log(`✅ 성공: ${succeeded.length}개`)
  console.log(`⏭️  스킵 (이미 존재): ${skipped.length}개`)
  console.log(`❌ 실패: ${failed.length}개`)

  if (succeeded.length > 0) {
    const totalOriginal = succeeded.reduce((s, r) => s + (r.originalSize || 0), 0)
    const totalEncoded = succeeded.reduce((s, r) => s + (r.encodedSize || 0), 0)
    if (totalOriginal > 0) {
      console.log(`📊 총 크기: ${formatSize(totalOriginal)} → ${formatSize(totalEncoded)} (${((1 - totalEncoded / totalOriginal) * 100).toFixed(0)}% 절감)`)
    }
  }

  if (failed.length > 0) {
    console.log('\n실패 목록:')
    failed.forEach(r => console.log(`  - ${r.fileName}: ${r.error}`))
  }

  if (succeeded.length > 0) {
    console.log('\n성공 목록:')
    succeeded.forEach(r => console.log(`  - ${r.title} → ${r.cloudflareUid} (media_id: ${r.mediaId})`))
  }
}

main().catch(console.error)
