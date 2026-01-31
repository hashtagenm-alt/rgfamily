/**
 * VOD 분할 업로드 스크립트
 *
 * 긴 영상(12시간+)을 5시간 단위로 분할하여 Cloudflare Stream에 업로드
 * UI에서 연속 재생 가능하도록 parent_id로 연결
 *
 * 사용법:
 *   npx tsx scripts/split-vod-upload.ts --input "파일경로" --title "영상제목"
 *   npx tsx scripts/split-vod-upload.ts --episode 2  # 파이프라인 폴더에서 자동 검색
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

// 분할 설정
const SEGMENT_DURATION = 5 * 60 * 60  // 5시간 (초)
const TARGET_SIZE_GB = 14  // 5시간 기준 목표 크기
const TEMP_DIR = path.join(os.tmpdir(), 'rg-vod-split')

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
  return `${hrs}h ${mins}m`
}

function log(prefix: string, message: string) {
  const time = new Date().toLocaleTimeString('ko-KR')
  console.log(`[${time}] ${prefix} ${message}`)
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

// ============================================
// 영상 분할
// ============================================

interface SegmentInfo {
  partNumber: number
  startTime: number
  duration: number
  outputPath: string
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
  totalParts: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    // 타겟 비트레이트 계산 (파트당 목표 크기 기준)
    const targetBytes = TARGET_SIZE_GB * 1024 * 1024 * 1024
    const videoBitrate = Math.floor(((targetBytes - (128000 / 8 * segment.duration)) * 8) / segment.duration / 1000)

    log('🗜️', `Part ${segment.partNumber}/${totalParts} 압축 시작 (${formatDuration(segment.startTime)} ~ ${formatDuration(segment.startTime + segment.duration)})`)
    log('📊', `목표 비트레이트: ${(videoBitrate / 1000).toFixed(1)} Mbps`)

    const args = [
      '-ss', String(segment.startTime),
      '-i', inputPath,
      '-t', String(segment.duration),
      '-c:v', 'h264_videotoolbox',
      '-b:v', `${videoBitrate}k`,
      '-profile:v', 'high',
      '-allow_sw', '0',
      '-realtime', '0',
      '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
      '-movflags', '+faststart',
      '-y', segment.outputPath,
    ]

    const ffmpeg = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] })

    let lastPercent = 0

    ffmpeg.stderr.on('data', (data) => {
      const line = data.toString()
      const timeMatch = line.match(/time=(\d+):(\d+):(\d+)/)

      if (timeMatch) {
        const currentSecs = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3])
        const percent = Math.floor((currentSecs / segment.duration) * 100)

        if (percent > lastPercent + 10) {
          log('🗜️', `Part ${segment.partNumber} 압축 ${percent}%`)
          lastPercent = percent
        }
      }
    })

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        const size = fs.statSync(segment.outputPath).size
        log('✅', `Part ${segment.partNumber} 완료 (${formatSize(size)})`)
        resolve()
      } else {
        reject(new Error(`Part ${segment.partNumber} 압축 실패: ${code}`))
      }
    })

    ffmpeg.on('error', reject)
  })
}

// ============================================
// Cloudflare 업로드
// ============================================

async function uploadToCloudflare(filePath: string, title: string): Promise<string> {
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

  if (!initRes.ok) throw new Error(`TUS 초기화 실패`)

  const uploadUrl = initRes.headers.get('location')!
  const uid = initRes.headers.get('stream-media-id')!

  const chunkSize = 100 * 1024 * 1024
  const fd = fs.openSync(filePath, 'r')
  const buffer = Buffer.alloc(chunkSize)
  let offset = 0
  let lastPercent = 0

  try {
    while (offset < fileSize) {
      const bytesRead = fs.readSync(fd, buffer, 0, chunkSize, offset)
      const chunk = buffer.subarray(0, bytesRead)

      await fetch(uploadUrl, {
        method: 'PATCH',
        headers: {
          'Tus-Resumable': '1.0.0',
          'Upload-Offset': String(offset),
          'Content-Type': 'application/offset+octet-stream',
        },
        body: chunk,
      })

      offset += bytesRead
      const percent = Math.floor((offset / fileSize) * 100)

      if (percent > lastPercent + 10) {
        log('☁️', `업로드 ${percent}% - ${title}`)
        lastPercent = percent
      }
    }
  } finally {
    fs.closeSync(fd)
  }

  log('✅', `업로드 완료 (UID: ${uid}) - ${title}`)
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

  // 나머지 파트 저장 (parent_id 연결)
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
// 메인
// ============================================

async function main() {
  console.log('═'.repeat(60))
  console.log('🎬 VOD 분할 업로드')
  console.log('   긴 영상을 5시간 단위로 분할 후 Cloudflare에 업로드')
  console.log('═'.repeat(60))

  const args = process.argv.slice(2)
  let inputPath: string
  let title: string

  // 인자 파싱
  const inputIdx = args.indexOf('--input')
  const titleIdx = args.indexOf('--title')
  const episodeIdx = args.indexOf('--episode')

  if (episodeIdx !== -1) {
    // --episode 모드: 파이프라인 폴더에서 자동 검색
    const epNum = args[episodeIdx + 1]
    const pipelineDir = path.join(os.tmpdir(), 'rg-vod-pipeline')
    const files = fs.readdirSync(pipelineDir).filter(f => f.includes(`${epNum.padStart(2, '0')}화`) && f.endsWith('.mp4') && !f.includes('_compressed'))

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
    console.log('  npx tsx scripts/split-vod-upload.ts --input "파일경로" --title "영상제목"')
    console.log('  npx tsx scripts/split-vod-upload.ts --episode 2')
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
  const fileSize = fs.statSync(inputPath).size

  console.log(`\n📊 영상 정보:`)
  console.log(`   제목: ${title}`)
  console.log(`   길이: ${formatDuration(totalDuration)}`)
  console.log(`   크기: ${formatSize(fileSize)}`)

  // 분할 계획
  const baseName = title.replace(/[^\w가-힣]/g, '_')
  const segments = calculateSegments(totalDuration, baseName)

  console.log(`\n📋 분할 계획: ${segments.length}개 파트`)
  segments.forEach(seg => {
    console.log(`   Part ${seg.partNumber}: ${formatDuration(seg.startTime)} ~ ${formatDuration(seg.startTime + seg.duration)}`)
  })

  const startTime = Date.now()
  const uploadedParts: Array<{ uid: string; partNumber: number; duration: number }> = []

  // 각 파트 처리
  for (const segment of segments) {
    console.log('\n' + '─'.repeat(60))
    log('📺', `Part ${segment.partNumber}/${segments.length} 처리 시작`)

    try {
      // 1. 분할 및 압축
      await splitAndCompressSegment(inputPath, segment, segments.length)

      // 2. 업로드
      const partTitle = segments.length > 1
        ? `${title} (Part ${segment.partNumber}/${segments.length})`
        : title
      const uid = await uploadToCloudflare(segment.outputPath, partTitle)

      uploadedParts.push({
        uid,
        partNumber: segment.partNumber,
        duration: segment.duration,
      })

      // 3. 압축 파일 삭제 (디스크 절약)
      fs.unlinkSync(segment.outputPath)
      log('🗑️', `임시 파일 삭제`)

    } catch (err) {
      log('❌', `Part ${segment.partNumber} 실패: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

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
  console.log(`   ✅ 업로드: ${uploadedParts.length}/${segments.length}개 파트`)
  console.log(`   ⏱️  총 소요: ${formatDuration(totalElapsed)}`)
  console.log(`\n   ⏳ Cloudflare 인코딩 진행 중...`)
  console.log(`   https://dash.cloudflare.com/${CLOUDFLARE_ACCOUNT_ID}/stream`)
  console.log('═'.repeat(60))
}

main().catch(err => {
  console.error('\n❌ 오류:', err.message)
  process.exit(1)
})
