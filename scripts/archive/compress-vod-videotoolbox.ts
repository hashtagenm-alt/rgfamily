/**
 * VOD 영상 압축 스크립트 (Apple Silicon VideoToolbox 최적화)
 *
 * M4 Pro 하드웨어 가속으로 80GB → 30GB 이하 압축
 *
 * 사용법:
 *   npx tsx scripts/compress-vod-videotoolbox.ts <입력파일> [옵션]
 *
 * 옵션:
 *   --output <경로>     출력 파일 경로 (기본: input_compressed.mp4)
 *   --target-size <GB>  목표 크기 (기본: 28GB, Cloudflare 30GB 제한 대비 여유)
 *   --codec <h264|hevc> 코덱 선택 (기본: h264, hevc는 더 작지만 약간 느림)
 *   --preview           처음 1분만 테스트 압축
 *   --dry-run           명령어만 출력
 *
 * 예시:
 *   npx tsx scripts/compress-vod-videotoolbox.ts /path/to/video.mp4
 *   npx tsx scripts/compress-vod-videotoolbox.ts /path/to/video.mp4 --codec hevc --target-size 25
 *   npx tsx scripts/compress-vod-videotoolbox.ts /path/to/video.mp4 --preview
 */

import { spawn, execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

// ============================================
// 설정
// ============================================

interface Options {
  input: string
  output: string
  targetSizeGB: number
  codec: 'h264' | 'hevc'
  preview: boolean
  dryRun: boolean
}

// ============================================
// 유틸리티
// ============================================

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
  if (hrs > 0) return `${hrs}시간 ${mins}분 ${secs}초`
  if (mins > 0) return `${mins}분 ${secs}초`
  return `${secs}초`
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

function getVideoInfo(filePath: string): { width: number; height: number; bitrate: number } {
  try {
    const result = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,bit_rate -of json "${filePath}"`,
      { encoding: 'utf-8' }
    )
    const data = JSON.parse(result)
    const stream = data.streams?.[0] || {}
    return {
      width: stream.width || 1920,
      height: stream.height || 1080,
      bitrate: parseInt(stream.bit_rate) || 0,
    }
  } catch {
    return { width: 1920, height: 1080, bitrate: 0 }
  }
}

function calculateTargetBitrate(fileSizeBytes: number, durationSeconds: number, targetSizeGB: number): number {
  // 목표 크기에서 오디오 비트레이트 (128kbps) 제외
  const targetBytes = targetSizeGB * 1024 * 1024 * 1024
  const audioBitrate = 128 * 1000 // 128 kbps
  const audioBytes = (audioBitrate / 8) * durationSeconds
  const videoBytesTarget = targetBytes - audioBytes

  // 비트레이트 계산 (bps → kbps)
  const videoBitrate = Math.floor((videoBytesTarget * 8) / durationSeconds / 1000)

  return videoBitrate
}

// ============================================
// 인수 파싱
// ============================================

function parseArgs(): Options {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0].startsWith('--')) {
    console.log(`
사용법: npx tsx scripts/compress-vod-videotoolbox.ts <입력파일> [옵션]

옵션:
  --output <경로>     출력 파일 경로
  --target-size <GB>  목표 크기 (기본: 28GB)
  --codec <h264|hevc> 코덱 선택 (기본: h264)
  --preview           처음 1분만 테스트 압축
  --dry-run           명령어만 출력

예시:
  npx tsx scripts/compress-vod-videotoolbox.ts ~/Videos/vod.mp4
  npx tsx scripts/compress-vod-videotoolbox.ts ~/Videos/vod.mp4 --codec hevc
  npx tsx scripts/compress-vod-videotoolbox.ts ~/Videos/vod.mp4 --preview
`)
    process.exit(1)
  }

  const input = args[0]
  const options: Options = {
    input,
    output: '',
    targetSizeGB: 28, // Cloudflare 30GB 제한 대비 여유
    codec: 'h264',
    preview: false,
    dryRun: false,
  }

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--output':
        options.output = args[++i]
        break
      case '--target-size':
        options.targetSizeGB = parseFloat(args[++i])
        break
      case '--codec':
        options.codec = args[++i] as 'h264' | 'hevc'
        break
      case '--preview':
        options.preview = true
        break
      case '--dry-run':
        options.dryRun = true
        break
    }
  }

  // 기본 출력 경로
  if (!options.output) {
    const dir = path.dirname(input)
    const ext = path.extname(input)
    const name = path.basename(input, ext)
    const suffix = options.preview ? '_preview' : '_compressed'
    options.output = path.join(dir, `${name}${suffix}${ext}`)
  }

  return options
}

// ============================================
// 메인
// ============================================

async function main() {
  console.log('═'.repeat(60))
  console.log('🎬 VOD 압축 (Apple Silicon VideoToolbox)')
  console.log('═'.repeat(60))

  const options = parseArgs()

  // 입력 파일 확인
  if (!fs.existsSync(options.input)) {
    console.error(`\n❌ 파일을 찾을 수 없습니다: ${options.input}`)
    process.exit(1)
  }

  const inputStats = fs.statSync(options.input)
  const inputSize = inputStats.size
  const duration = getVideoDuration(options.input)
  const videoInfo = getVideoInfo(options.input)

  console.log(`\n📁 입력 파일:`)
  console.log(`   경로: ${options.input}`)
  console.log(`   크기: ${formatSize(inputSize)}`)
  console.log(`   길이: ${formatDuration(duration)}`)
  console.log(`   해상도: ${videoInfo.width}x${videoInfo.height}`)
  console.log(`   현재 비트레이트: ${videoInfo.bitrate ? `${(videoInfo.bitrate / 1000000).toFixed(1)} Mbps` : '알 수 없음'}`)

  // 목표 비트레이트 계산
  const effectiveDuration = options.preview ? 60 : duration
  const effectiveTargetSize = options.preview ? options.targetSizeGB * (60 / duration) : options.targetSizeGB
  const targetBitrate = calculateTargetBitrate(inputSize, duration, options.targetSizeGB)

  console.log(`\n🎯 압축 설정:`)
  console.log(`   목표 크기: ${options.targetSizeGB}GB`)
  console.log(`   목표 비트레이트: ${(targetBitrate / 1000).toFixed(1)} Mbps`)
  console.log(`   코덱: ${options.codec === 'hevc' ? 'HEVC (H.265)' : 'H.264'} VideoToolbox`)
  console.log(`   출력: ${options.output}`)
  if (options.preview) {
    console.log(`   ⚠️  미리보기 모드: 처음 1분만 압축`)
  }

  // 예상 압축률
  const compressionRatio = (options.targetSizeGB * 1024 * 1024 * 1024) / inputSize * 100
  console.log(`\n📊 예상:`)
  console.log(`   압축률: ${compressionRatio.toFixed(1)}%`)
  console.log(`   예상 출력 크기: ~${options.targetSizeGB}GB`)

  // FFmpeg 명령어 구성
  const encoder = options.codec === 'hevc' ? 'hevc_videotoolbox' : 'h264_videotoolbox'

  const ffmpegArgs = [
    '-i', options.input,
    '-c:v', encoder,
    '-b:v', `${targetBitrate}k`,
    // VideoToolbox 품질 옵션
    '-profile:v', options.codec === 'hevc' ? 'main' : 'high',
    '-allow_sw', '0', // 하드웨어만 사용
    '-realtime', '0', // 실시간이 아닌 최대 속도
    // 오디오 설정
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ac', '2',
    // 출력 설정
    '-movflags', '+faststart', // 스트리밍 최적화
    '-y', // 덮어쓰기
  ]

  // 미리보기 모드
  if (options.preview) {
    ffmpegArgs.push('-t', '60') // 60초만
  }

  ffmpegArgs.push(options.output)

  const fullCommand = `ffmpeg ${ffmpegArgs.map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`

  console.log(`\n📋 FFmpeg 명령어:`)
  console.log(`   ${fullCommand}`)

  if (options.dryRun) {
    console.log('\n🔍 [DRY RUN] 실행하지 않음')
    return
  }

  // 압축 실행
  console.log('\n🚀 압축 시작...\n')
  const startTime = Date.now()

  await new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'pipe', 'pipe'] })

    let lastProgress = ''

    ffmpeg.stderr.on('data', (data) => {
      const line = data.toString()

      // 진행률 파싱
      const timeMatch = line.match(/time=(\d+):(\d+):(\d+)\.(\d+)/)
      const speedMatch = line.match(/speed=\s*([\d.]+)x/)

      if (timeMatch) {
        const hours = parseInt(timeMatch[1])
        const mins = parseInt(timeMatch[2])
        const secs = parseInt(timeMatch[3])
        const currentSecs = hours * 3600 + mins * 60 + secs
        const totalSecs = options.preview ? 60 : duration
        const percent = Math.min((currentSecs / totalSecs) * 100, 100).toFixed(1)
        const speed = speedMatch ? speedMatch[1] : '?'

        const remainingSecs = totalSecs - currentSecs
        const eta = speedMatch ? remainingSecs / parseFloat(speedMatch[1]) : 0

        const progress = `진행: ${percent}% | 속도: ${speed}x | 남은 시간: ${formatDuration(eta)}`

        if (progress !== lastProgress) {
          process.stdout.write(`\r   ${progress}      `)
          lastProgress = progress
        }
      }
    })

    ffmpeg.on('close', (code) => {
      console.log('\n')
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`FFmpeg 종료 코드: ${code}`))
      }
    })

    ffmpeg.on('error', reject)
  })

  // 결과 확인
  const outputStats = fs.statSync(options.output)
  const outputSize = outputStats.size
  const elapsed = (Date.now() - startTime) / 1000

  console.log('═'.repeat(60))
  console.log('✅ 압축 완료!')
  console.log('═'.repeat(60))
  console.log(`\n📊 결과:`)
  console.log(`   입력: ${formatSize(inputSize)}`)
  console.log(`   출력: ${formatSize(outputSize)}`)
  console.log(`   압축률: ${((outputSize / inputSize) * 100).toFixed(1)}%`)
  console.log(`   절감: ${formatSize(inputSize - outputSize)}`)
  console.log(`   소요 시간: ${formatDuration(elapsed)}`)
  console.log(`\n📁 출력 파일: ${options.output}`)

  // Cloudflare 업로드 가능 여부
  const cloudflareLimit = 30 * 1024 * 1024 * 1024
  if (outputSize <= cloudflareLimit) {
    console.log(`\n☁️  Cloudflare Stream 업로드 가능! (${formatSize(outputSize)} < 30GB)`)
  } else {
    console.log(`\n⚠️  여전히 30GB 초과 (${formatSize(outputSize)}). --target-size를 낮춰주세요.`)
  }

  console.log('═'.repeat(60))
}

main().catch(err => {
  console.error('\n❌ 오류:', err.message)
  process.exit(1)
})
