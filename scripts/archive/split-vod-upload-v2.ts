/**
 * VOD 분할 업로드 스크립트 v2
 *
 * 개선 사항:
 * - 파이프라인 병렬화: 압축과 업로드 동시 진행
 * - 30fps 변환 옵션 (--fast 플래그)
 * - 실시간 진행률 표시
 * - 예상 완료 시간 표시
 *
 * 사용법:
 *   npx tsx scripts/split-vod-upload-v2.ts --episode 3
 *   npx tsx scripts/split-vod-upload-v2.ts --episode 3 --fast     # 30fps 변환 (2배 빠름)
 *   npx tsx scripts/split-vod-upload-v2.ts --input "파일" --title "제목"
 */

import { getServiceClient } from './lib/supabase'
import { spawn, execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import dotenv from 'dotenv'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

const supabase = getServiceClient()

// 분할 설정
const SEGMENT_DURATION = 5 * 60 * 60  // 5시간 (초)
const TARGET_SIZE_GB = 14  // 5시간 기준 목표 크기
const TEMP_DIR = path.join(os.tmpdir(), 'rg-vod-split')

// 전역 상태
let startTime = Date.now()
let totalCompressTime = 0
let totalUploadTime = 0

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
  if (hrs > 0) return `${hrs}h ${mins}m`
  if (mins > 0) return `${mins}m ${secs}s`
  return `${secs}s`
}

function log(prefix: string, message: string) {
  const elapsed = formatDuration((Date.now() - startTime) / 1000)
  const time = new Date().toLocaleTimeString('ko-KR')
  console.log(`[${time}] [${elapsed}] ${prefix} ${message}`)
}

function clearLine() {
  process.stdout.write('\r\x1b[K')
}

function progressBar(percent: number, width = 30): string {
  const filled = Math.round(width * percent / 100)
  const empty = width - filled
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percent}%`
}

function getVideoDuration(filePath: string): number {
  try {
    const result = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: 'utf-8' }
    )
    return parseFloat(result.trim())
  } catch {
    throw new Error('영상 길이를 가져올 수 없습니다')
  }
}

function getVideoFrameRate(filePath: string): number {
  try {
    const result = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: 'utf-8' }
    )
    const [num, den] = result.trim().split('/')
    return Math.round(parseInt(num) / parseInt(den))
  } catch {
    return 30
  }
}

// ============================================
// 영상 분할
// ============================================

interface SegmentInfo {
  partNumber: number
  startTime: number
  duration: number
  outputPath: string
}

interface CompressOptions {
  fastMode: boolean  // 30fps 변환
}

function calculateSegments(totalDuration: number, baseName: string): SegmentInfo[] {
  const segments: SegmentInfo[] = []
  let currentTime = 0
  let partNumber = 1

  while (currentTime < totalDuration) {
    const remainingDuration = totalDuration - currentTime
    const segmentDuration = Math.min(SEGMENT_DURATION, remainingDuration)

    segments.push({
      partNumber,
      startTime: currentTime,
      duration: segmentDuration,
      outputPath: path.join(TEMP_DIR, `${baseName}_Part${partNumber}.mp4`)
    })

    currentTime += segmentDuration
    partNumber++
  }

  return segments
}

function splitAndCompressSegment(
  inputPath: string,
  segment: SegmentInfo,
  totalParts: number,
  options: CompressOptions
): Promise<{ duration: number; size: number }> {
  return new Promise((resolve, reject) => {
    const compressStart = Date.now()

    // 타겟 비트레이트 계산
    const targetBytes = TARGET_SIZE_GB * 1024 * 1024 * 1024
    const videoBitrate = Math.floor(((targetBytes - (128000 / 8 * segment.duration)) * 8) / segment.duration / 1000)

    log('🗜️', `Part ${segment.partNumber}/${totalParts} 압축 시작`)
    console.log(`   범위: ${formatDuration(segment.startTime)} ~ ${formatDuration(segment.startTime + segment.duration)}`)
    console.log(`   비트레이트: ${(videoBitrate / 1000).toFixed(1)} Mbps`)
    if (options.fastMode) console.log(`   모드: 🚀 FAST (30fps 변환)`)

    const args = [
      '-ss', String(segment.startTime),
      '-i', inputPath,
      '-t', String(segment.duration),
      '-c:v', 'h264_videotoolbox',
      '-b:v', `${videoBitrate}k`,
      '-profile:v', 'high',
      '-allow_sw', '0',
      '-realtime', '0',
    ]

    // Fast 모드: 30fps로 변환
    if (options.fastMode) {
      args.push('-r', '30')
    }

    args.push(
      '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
      '-movflags', '+faststart',
      '-y', segment.outputPath,
    )

    const ffmpeg = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] })

    let lastPercent = 0
    let lastUpdate = Date.now()

    ffmpeg.stderr.on('data', (data) => {
      const line = data.toString()
      const timeMatch = line.match(/time=(\d+):(\d+):(\d+)/)
      const speedMatch = line.match(/speed=\s*([\d.]+)x/)

      if (timeMatch) {
        const currentSecs = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3])
        const percent = Math.floor((currentSecs / segment.duration) * 100)
        const speed = speedMatch ? parseFloat(speedMatch[1]) : 0

        // 1초마다 또는 10% 단위로 업데이트
        const now = Date.now()
        if (now - lastUpdate > 1000 || percent >= lastPercent + 10) {
          const remaining = speed > 0 ? (segment.duration - currentSecs) / speed : 0
          clearLine()
          process.stdout.write(`   ${progressBar(percent)} ${formatDuration(currentSecs)}/${formatDuration(segment.duration)} | ${speed.toFixed(1)}x | ETA: ${formatDuration(remaining)}`)
          lastPercent = percent
          lastUpdate = now
        }
      }
    })

    ffmpeg.on('close', (code) => {
      console.log() // 줄바꿈
      const compressDuration = (Date.now() - compressStart) / 1000
      totalCompressTime += compressDuration

      if (code === 0) {
        const size = fs.statSync(segment.outputPath).size
        log('✅', `Part ${segment.partNumber} 압축 완료`)
        console.log(`   크기: ${formatSize(size)} | 소요: ${formatDuration(compressDuration)}`)
        resolve({ duration: segment.duration, size })
      } else {
        reject(new Error(`Part ${segment.partNumber} 압축 실패: exit code ${code}`))
      }
    })

    ffmpeg.on('error', reject)
  })
}

// ============================================
// Cloudflare 업로드 (개선)
// ============================================

async function uploadToCloudflare(filePath: string, title: string): Promise<string> {
  const uploadStart = Date.now()
  log('☁️', `업로드 시작 - ${title}`)

  const stats = fs.statSync(filePath)
  const fileSize = stats.size

  const initRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(fileSize),
        'Upload-Metadata': `name ${Buffer.from(title).toString('base64')}, maxDurationSeconds ${Buffer.from('21600').toString('base64')}`,
      },
    }
  )

  if (!initRes.ok) throw new Error(`TUS 초기화 실패: ${initRes.status}`)

  const uploadUrl = initRes.headers.get('location')!
  const uid = initRes.headers.get('stream-media-id')!

  // 청크 사이즈 증가 (100MB → 200MB)
  const chunkSize = 200 * 1024 * 1024
  const fd = fs.openSync(filePath, 'r')
  const buffer = Buffer.alloc(chunkSize)
  let offset = 0
  let lastUpdate = Date.now()

  try {
    while (offset < fileSize) {
      const bytesRead = fs.readSync(fd, buffer, 0, chunkSize, offset)
      const chunk = buffer.subarray(0, bytesRead)

      const res = await fetch(uploadUrl, {
        method: 'PATCH',
        headers: {
          'Tus-Resumable': '1.0.0',
          'Upload-Offset': String(offset),
          'Content-Type': 'application/offset+octet-stream',
        },
        body: chunk,
      })

      if (!res.ok) {
        throw new Error(`업로드 청크 실패: ${res.status}`)
      }

      offset += bytesRead
      const percent = Math.floor((offset / fileSize) * 100)
      const elapsed = (Date.now() - uploadStart) / 1000
      const speed = offset / elapsed / 1024 / 1024  // MB/s
      const eta = (fileSize - offset) / (offset / elapsed)

      // 1초마다 업데이트
      const now = Date.now()
      if (now - lastUpdate > 1000) {
        clearLine()
        process.stdout.write(`   ${progressBar(percent)} ${formatSize(offset)}/${formatSize(fileSize)} | ${speed.toFixed(1)} MB/s | ETA: ${formatDuration(eta)}`)
        lastUpdate = now
      }
    }
  } finally {
    fs.closeSync(fd)
  }

  console.log() // 줄바꿈
  const uploadDuration = (Date.now() - uploadStart) / 1000
  totalUploadTime += uploadDuration

  log('✅', `업로드 완료 (UID: ${uid})`)
  console.log(`   소요: ${formatDuration(uploadDuration)}`)

  return uid
}

// ============================================
// DB 저장
// ============================================

async function savePartsToDatabase(
  baseTitle: string,
  parts: Array<{ uid: string; partNumber: number; duration: number }>,
  unit: 'excel' | 'crew' = 'excel'
) {
  const totalParts = parts.length

  // Part 1 먼저 저장 (대표 항목)
  const firstPart = parts[0]
  const { data: parent, error: parentError } = await supabase
    .from('media_content')
    .insert({
      content_type: 'vod',
      title: baseTitle,
      video_url: `https://iframe.videodelivery.net/${firstPart.uid}`,
      cloudflare_uid: firstPart.uid,
      thumbnail_url: `https://videodelivery.net/${firstPart.uid}/thumbnails/thumbnail.jpg`,
      unit,
      is_featured: false,
      view_count: 0,
      part_number: 1,
      total_parts: totalParts,
      duration: firstPart.duration,
    })
    .select()
    .single()

  if (parentError) throw new Error(`Part 1 저장 실패: ${parentError.message}`)

  log('💾', `Part 1 저장 완료 (ID: ${parent.id})`)

  // 나머지 파트 저장
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]
    const { error } = await supabase
      .from('media_content')
      .insert({
        content_type: 'vod',
        title: `${baseTitle} (Part ${part.partNumber})`,
        video_url: `https://iframe.videodelivery.net/${part.uid}`,
        cloudflare_uid: part.uid,
        thumbnail_url: `https://videodelivery.net/${part.uid}/thumbnails/thumbnail.jpg`,
        unit,
        is_featured: false,
        view_count: 0,
        parent_id: parent.id,
        part_number: part.partNumber,
        total_parts: totalParts,
        duration: part.duration,
      })

    if (error) {
      log('⚠️', `Part ${part.partNumber} 저장 실패: ${error.message}`)
    } else {
      log('💾', `Part ${part.partNumber} 저장 완료`)
    }
  }

  return parent.id
}

// ============================================
// 파이프라인 처리 (핵심 개선)
// ============================================

async function processPipeline(
  inputPath: string,
  segments: SegmentInfo[],
  title: string,
  options: CompressOptions
): Promise<Array<{ uid: string; partNumber: number; duration: number }>> {
  const uploadedParts: Array<{ uid: string; partNumber: number; duration: number }> = []
  let pendingUpload: Promise<void> | null = null
  let pendingSegment: SegmentInfo | null = null

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const isLast = i === segments.length - 1

    console.log('\n' + '─'.repeat(60))
    log('📺', `Part ${segment.partNumber}/${segments.length} 처리 시작`)

    // 1. 현재 파트 압축
    const compressResult = await splitAndCompressSegment(inputPath, segment, segments.length, options)

    // 2. 이전 파트 업로드 완료 대기 (있으면)
    if (pendingUpload && pendingSegment) {
      log('⏳', `Part ${pendingSegment.partNumber} 업로드 완료 대기...`)
      await pendingUpload
    }

    // 3. 현재 파트 업로드 시작
    const partTitle = segments.length > 1
      ? `${title} (Part ${segment.partNumber}/${segments.length})`
      : title

    if (isLast) {
      // 마지막 파트: 동기 업로드
      const uid = await uploadToCloudflare(segment.outputPath, partTitle)
      uploadedParts.push({
        uid,
        partNumber: segment.partNumber,
        duration: compressResult.duration,
      })
      fs.unlinkSync(segment.outputPath)
      log('🗑️', `임시 파일 삭제`)
    } else {
      // 중간 파트: 비동기 업로드 (다음 압축과 병렬)
      const currentOutputPath = segment.outputPath
      const currentDuration = compressResult.duration
      const currentPartNumber = segment.partNumber

      pendingUpload = (async () => {
        const uid = await uploadToCloudflare(currentOutputPath, partTitle)
        uploadedParts.push({
          uid,
          partNumber: currentPartNumber,
          duration: currentDuration,
        })
        fs.unlinkSync(currentOutputPath)
        log('🗑️', `Part ${currentPartNumber} 임시 파일 삭제`)
      })()

      pendingSegment = segment
    }
  }

  return uploadedParts
}

// ============================================
// 메인
// ============================================

async function main() {
  console.clear()
  console.log('═'.repeat(60))
  console.log('🎬 VOD 분할 업로드 v2')
  console.log('   파이프라인 병렬 처리 + 실시간 진행률')
  console.log('═'.repeat(60))

  const args = process.argv.slice(2)
  let inputPath: string
  let title: string

  // 옵션 파싱
  const fastMode = args.includes('--fast')
  const inputIdx = args.indexOf('--input')
  const titleIdx = args.indexOf('--title')
  const episodeIdx = args.indexOf('--episode')

  if (episodeIdx !== -1) {
    const epNum = args[episodeIdx + 1]
    const pipelineDir = path.join(os.tmpdir(), 'rg-vod-pipeline')
    const files = fs.readdirSync(pipelineDir).filter(f =>
      f.includes(`${epNum.padStart(2, '0')}화`) && f.endsWith('.mp4') && !f.includes('_compressed')
    )

    if (files.length === 0) {
      console.error(`❌ ${epNum}화 파일을 찾을 수 없습니다`)
      process.exit(1)
    }

    inputPath = path.join(pipelineDir, files[0])
    title = files[0].replace('.mp4', '')
  } else if (inputIdx !== -1 && titleIdx !== -1) {
    inputPath = args[inputIdx + 1]
    title = args[titleIdx + 1]
  } else {
    console.log('사용법:')
    console.log('  npx tsx scripts/split-vod-upload-v2.ts --episode 3')
    console.log('  npx tsx scripts/split-vod-upload-v2.ts --episode 3 --fast')
    console.log('  npx tsx scripts/split-vod-upload-v2.ts --input "파일" --title "제목"')
    console.log('\n옵션:')
    console.log('  --fast    30fps 변환 (인코딩 2배 빠름, 파일 크기 유사)')
    process.exit(1)
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${inputPath}`)
    process.exit(1)
  }

  // 임시 디렉토리 생성
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }

  // 영상 정보 분석
  const totalDuration = getVideoDuration(inputPath)
  const frameRate = getVideoFrameRate(inputPath)
  const fileSize = fs.statSync(inputPath).size

  console.log(`\n📊 영상 정보`)
  console.log('─'.repeat(40))
  console.log(`   제목: ${title}`)
  console.log(`   길이: ${formatDuration(totalDuration)}`)
  console.log(`   크기: ${formatSize(fileSize)}`)
  console.log(`   FPS: ${frameRate}`)

  // 분할 계획
  const baseName = title.replace(/[^\w가-힣]/g, '_')
  const segments = calculateSegments(totalDuration, baseName)

  console.log(`\n📋 분할 계획: ${segments.length}개 파트`)
  console.log('─'.repeat(40))
  segments.forEach(seg => {
    console.log(`   Part ${seg.partNumber}: ${formatDuration(seg.startTime)} ~ ${formatDuration(seg.startTime + seg.duration)}`)
  })

  console.log(`\n⚙️ 설정`)
  console.log('─'.repeat(40))
  console.log(`   모드: ${fastMode ? '🚀 FAST (30fps)' : '🎯 NORMAL (원본 fps)'}`)
  console.log(`   파이프라인: 압축과 업로드 병렬 처리`)

  // 예상 시간
  const estimatedCompressTime = fastMode
    ? segments.length * 35 * 60  // 35분/파트 (fast)
    : segments.length * 70 * 60  // 70분/파트 (normal)
  const estimatedUploadTime = segments.length * 10 * 60  // 10분/파트

  console.log(`\n⏱️ 예상 시간`)
  console.log('─'.repeat(40))
  console.log(`   압축: ~${formatDuration(estimatedCompressTime)}`)
  console.log(`   업로드: ~${formatDuration(estimatedUploadTime)}`)
  console.log(`   병렬화 효과: 업로드 시간 중첩`)
  console.log(`   총 예상: ~${formatDuration(estimatedCompressTime + estimatedUploadTime / segments.length)}`)

  startTime = Date.now()

  // 파이프라인 처리
  const uploadedParts = await processPipeline(inputPath, segments, title, { fastMode })

  // DB 저장
  if (uploadedParts.length > 0) {
    console.log('\n' + '─'.repeat(60))
    log('💾', 'DB에 저장 중...')

    try {
      const parentId = await savePartsToDatabase(title, uploadedParts)
      log('✅', `모든 파트 DB 저장 완료 (Parent ID: ${parentId})`)
    } catch (err) {
      log('❌', `DB 저장 실패: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 최종 결과
  const totalElapsed = (Date.now() - startTime) / 1000

  console.log('\n' + '═'.repeat(60))
  console.log('📊 최종 결과')
  console.log('═'.repeat(60))
  console.log(`   ✅ 완료: ${uploadedParts.length}/${segments.length}개 파트`)
  console.log(`   🗜️ 압축 시간: ${formatDuration(totalCompressTime)}`)
  console.log(`   ☁️ 업로드 시간: ${formatDuration(totalUploadTime)}`)
  console.log(`   ⏱️ 총 소요: ${formatDuration(totalElapsed)}`)
  console.log(`   💡 병렬화 절약: ~${formatDuration(Math.max(0, totalCompressTime + totalUploadTime - totalElapsed))}`)
  console.log(`\n   ⏳ Cloudflare 인코딩 진행 중...`)
  console.log(`   https://dash.cloudflare.com/${CLOUDFLARE_ACCOUNT_ID}/stream`)
  console.log('═'.repeat(60))
}

main().catch(err => {
  console.error('\n❌ 오류:', err.message)
  process.exit(1)
})
