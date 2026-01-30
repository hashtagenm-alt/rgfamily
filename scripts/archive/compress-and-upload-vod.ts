/**
 * VOD 압축 + Cloudflare 업로드 통합 스크립트
 *
 * Apple Silicon VideoToolbox로 압축 후 바로 Cloudflare Stream 업로드
 *
 * 사용법:
 *   npx tsx scripts/compress-and-upload-vod.ts <입력파일> [옵션]
 *
 * 옵션:
 *   --title <제목>      VOD 제목 (기본: 파일명)
 *   --unit <excel|crew> 유닛 (기본: excel)
 *   --target-size <GB>  목표 크기 (기본: 28GB)
 *   --codec <h264|hevc> 코덱 (기본: h264)
 *   --keep-compressed   압축 파일 보관 (기본: 삭제)
 *   --skip-compress     이미 압축된 파일 (압축 건너뛰기)
 *   --dry-run           실행하지 않고 확인만
 *
 * 예시:
 *   npx tsx scripts/compress-and-upload-vod.ts ~/Videos/stream.mp4 --title "1회차 방송"
 *   npx tsx scripts/compress-and-upload-vod.ts ~/Videos/stream.mp4 --unit crew --codec hevc
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

const TEMP_DIR = path.join(os.tmpdir(), 'rg-vod-compress')
const CLOUDFLARE_MAX_SIZE = 30 * 1024 * 1024 * 1024 // 30GB

// ============================================
// 타입
// ============================================

interface Options {
  input: string
  title: string
  unit: 'excel' | 'crew'
  targetSizeGB: number
  codec: 'h264' | 'hevc'
  keepCompressed: boolean
  skipCompress: boolean
  dryRun: boolean
}

// ============================================
// 유틸리티
// ============================================

function formatSize(bytes: number): string {
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

function getVideoDuration(filePath: string): number {
  try {
    const result = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: 'utf-8' }
    )
    return parseFloat(result.trim())
  } catch {
    return 0
  }
}

function calculateTargetBitrate(durationSeconds: number, targetSizeGB: number): number {
  const targetBytes = targetSizeGB * 1024 * 1024 * 1024
  const audioBitrate = 128 * 1000
  const audioBytes = (audioBitrate / 8) * durationSeconds
  const videoBytesTarget = targetBytes - audioBytes
  return Math.floor((videoBytesTarget * 8) / durationSeconds / 1000)
}

// ============================================
// 압축
// ============================================

async function compressVideo(input: string, output: string, options: Options): Promise<void> {
  console.log('\n📦 1단계: 압축 중...')

  const duration = getVideoDuration(input)
  const targetBitrate = calculateTargetBitrate(duration, options.targetSizeGB)
  const encoder = options.codec === 'hevc' ? 'hevc_videotoolbox' : 'h264_videotoolbox'

  console.log(`   인코더: ${encoder}`)
  console.log(`   목표 비트레이트: ${(targetBitrate / 1000).toFixed(1)} Mbps`)

  const ffmpegArgs = [
    '-i', input,
    '-c:v', encoder,
    '-b:v', `${targetBitrate}k`,
    '-profile:v', options.codec === 'hevc' ? 'main' : 'high',
    '-allow_sw', '0',
    '-realtime', '0',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ac', '2',
    '-movflags', '+faststart',
    '-y',
    output,
  ]

  const startTime = Date.now()

  await new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'pipe', 'pipe'] })

    ffmpeg.stderr.on('data', (data) => {
      const line = data.toString()
      const timeMatch = line.match(/time=(\d+):(\d+):(\d+)/)
      const speedMatch = line.match(/speed=\s*([\d.]+)x/)

      if (timeMatch && speedMatch) {
        const hours = parseInt(timeMatch[1])
        const mins = parseInt(timeMatch[2])
        const secs = parseInt(timeMatch[3])
        const currentSecs = hours * 3600 + mins * 60 + secs
        const percent = Math.min((currentSecs / duration) * 100, 100).toFixed(1)
        const speed = speedMatch[1]

        process.stdout.write(`\r   진행: ${percent}% | 속도: ${speed}x`)
      }
    })

    ffmpeg.on('close', (code) => {
      const elapsed = (Date.now() - startTime) / 1000
      console.log(`\n   ✅ 압축 완료 (${formatDuration(elapsed)})`)
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg 종료 코드: ${code}`))
    })

    ffmpeg.on('error', reject)
  })
}

// ============================================
// Cloudflare 업로드
// ============================================

async function uploadToCloudflare(filePath: string, title: string): Promise<string> {
  console.log('\n☁️  2단계: Cloudflare 업로드 중...')

  const stats = fs.statSync(filePath)
  const fileSize = stats.size

  console.log(`   파일 크기: ${formatSize(fileSize)}`)

  // TUS 업로드 초기화
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
    throw new Error(`TUS 초기화 실패: ${await initRes.text()}`)
  }

  const uploadUrl = initRes.headers.get('location')!
  const uid = initRes.headers.get('stream-media-id')!

  console.log(`   UID: ${uid}`)

  // 청크 업로드
  const chunkSize = 100 * 1024 * 1024 // 100MB 청크
  const fd = fs.openSync(filePath, 'r')
  const buffer = Buffer.alloc(chunkSize)
  let offset = 0
  const startTime = Date.now()

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

          if (!patchRes.ok) throw new Error(`HTTP ${patchRes.status}`)
          break
        } catch (e) {
          retries--
          if (retries === 0) throw e
          console.log(`\n   ⚠️  재시도 중...`)
          await new Promise(r => setTimeout(r, 3000))
        }
      }

      offset += bytesRead
      const percent = Math.round((offset / fileSize) * 100)
      const elapsed = (Date.now() - startTime) / 1000
      const speed = offset / elapsed / 1024 / 1024 // MB/s
      const remaining = (fileSize - offset) / (speed * 1024 * 1024)

      process.stdout.write(`\r   업로드: ${percent}% | ${speed.toFixed(1)} MB/s | 남은 시간: ${formatDuration(remaining)}`)
    }
  } finally {
    fs.closeSync(fd)
  }

  console.log(`\n   ✅ 업로드 완료`)

  return uid
}

// ============================================
// DB 저장
// ============================================

async function saveToDatabase(title: string, cloudflareUid: string, unit: 'excel' | 'crew') {
  console.log('\n💾 3단계: DB 저장 중...')

  const videoUrl = `https://iframe.videodelivery.net/${cloudflareUid}`
  const thumbnailUrl = `https://videodelivery.net/${cloudflareUid}/thumbnails/thumbnail.jpg?width=640&height=360&fit=crop`

  // 중복 확인
  const { data: existing } = await supabase
    .from('media_content')
    .select('id')
    .eq('title', title)
    .limit(1)

  if (existing && existing.length > 0) {
    await supabase
      .from('media_content')
      .update({ cloudflare_uid: cloudflareUid, video_url: videoUrl, thumbnail_url: thumbnailUrl })
      .eq('id', existing[0].id)
    console.log(`   ✅ 업데이트 완료 (ID: ${existing[0].id})`)
  } else {
    const { data } = await supabase
      .from('media_content')
      .insert({
        content_type: 'vod',
        title,
        video_url: videoUrl,
        cloudflare_uid: cloudflareUid,
        thumbnail_url: thumbnailUrl,
        unit,
        is_featured: false,
        view_count: 0,
      })
      .select()
      .single()
    console.log(`   ✅ 신규 저장 완료 (ID: ${data?.id})`)
  }
}

// ============================================
// 인수 파싱
// ============================================

function parseArgs(): Options {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0].startsWith('--')) {
    console.log(`
사용법: npx tsx scripts/compress-and-upload-vod.ts <입력파일> [옵션]

옵션:
  --title <제목>      VOD 제목 (기본: 파일명)
  --unit <excel|crew> 유닛 (기본: excel)
  --target-size <GB>  목표 크기 (기본: 28GB)
  --codec <h264|hevc> 코덱 (기본: h264)
  --keep-compressed   압축 파일 보관
  --skip-compress     이미 30GB 이하면 압축 건너뛰기
  --dry-run           실행하지 않고 확인만
`)
    process.exit(1)
  }

  const input = args[0]
  const baseName = path.basename(input, path.extname(input))

  const options: Options = {
    input,
    title: baseName,
    unit: 'excel',
    targetSizeGB: 28,
    codec: 'h264',
    keepCompressed: false,
    skipCompress: false,
    dryRun: false,
  }

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--title': options.title = args[++i]; break
      case '--unit': options.unit = args[++i] as 'excel' | 'crew'; break
      case '--target-size': options.targetSizeGB = parseFloat(args[++i]); break
      case '--codec': options.codec = args[++i] as 'h264' | 'hevc'; break
      case '--keep-compressed': options.keepCompressed = true; break
      case '--skip-compress': options.skipCompress = true; break
      case '--dry-run': options.dryRun = true; break
    }
  }

  return options
}

// ============================================
// 메인
// ============================================

async function main() {
  console.log('═'.repeat(60))
  console.log('🎬 VOD 압축 + Cloudflare 업로드')
  console.log('═'.repeat(60))

  const options = parseArgs()

  // 입력 확인
  if (!fs.existsSync(options.input)) {
    console.error(`\n❌ 파일을 찾을 수 없습니다: ${options.input}`)
    process.exit(1)
  }

  const inputStats = fs.statSync(options.input)
  const inputSize = inputStats.size
  const duration = getVideoDuration(options.input)

  console.log(`\n📁 입력:`)
  console.log(`   파일: ${options.input}`)
  console.log(`   크기: ${formatSize(inputSize)}`)
  console.log(`   길이: ${formatDuration(duration)}`)
  console.log(`   제목: ${options.title}`)
  console.log(`   유닛: ${options.unit}`)

  // 압축 필요 여부 확인
  const needsCompression = inputSize > CLOUDFLARE_MAX_SIZE && !options.skipCompress

  if (needsCompression) {
    console.log(`\n⚠️  파일이 30GB를 초과하여 압축이 필요합니다.`)
    console.log(`   목표 크기: ${options.targetSizeGB}GB`)
    console.log(`   코덱: ${options.codec === 'hevc' ? 'HEVC (H.265)' : 'H.264'} VideoToolbox`)
  } else if (options.skipCompress) {
    console.log(`\n✅ --skip-compress 옵션으로 압축 건너뛰기`)
  } else {
    console.log(`\n✅ 30GB 이하로 압축 불필요`)
  }

  if (options.dryRun) {
    console.log('\n🔍 [DRY RUN] 실행하지 않음')
    return
  }

  // 임시 폴더 생성
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }

  const startTime = Date.now()
  let fileToUpload = options.input

  try {
    // 1. 압축 (필요시)
    if (needsCompression) {
      const compressedPath = path.join(TEMP_DIR, `${Date.now()}_compressed.mp4`)
      await compressVideo(options.input, compressedPath, options)

      const compressedSize = fs.statSync(compressedPath).size
      console.log(`\n   압축 결과: ${formatSize(inputSize)} → ${formatSize(compressedSize)}`)

      if (compressedSize > CLOUDFLARE_MAX_SIZE) {
        throw new Error(`압축 후에도 30GB 초과 (${formatSize(compressedSize)}). --target-size를 낮춰주세요.`)
      }

      fileToUpload = compressedPath
    }

    // 2. Cloudflare 업로드
    const cloudflareUid = await uploadToCloudflare(fileToUpload, options.title)

    // 3. DB 저장
    await saveToDatabase(options.title, cloudflareUid, options.unit)

    // 결과
    const totalElapsed = (Date.now() - startTime) / 1000

    console.log('\n' + '═'.repeat(60))
    console.log('✅ 완료!')
    console.log('═'.repeat(60))
    console.log(`   제목: ${options.title}`)
    console.log(`   Cloudflare UID: ${cloudflareUid}`)
    console.log(`   총 소요 시간: ${formatDuration(totalElapsed)}`)
    console.log(`\n   ⏳ Cloudflare 인코딩 진행 중...`)
    console.log(`   https://dash.cloudflare.com/${CLOUDFLARE_ACCOUNT_ID}/stream`)
    console.log('═'.repeat(60))

  } finally {
    // 임시 파일 정리
    if (fileToUpload !== options.input && !options.keepCompressed) {
      try {
        fs.unlinkSync(fileToUpload)
        console.log('\n🗑️  임시 파일 삭제됨')
      } catch {}
    } else if (options.keepCompressed && fileToUpload !== options.input) {
      console.log(`\n📁 압축 파일 보관: ${fileToUpload}`)
    }
  }
}

main().catch(err => {
  console.error('\n❌ 오류:', err.message)
  process.exit(1)
})
