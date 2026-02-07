#!/usr/bin/env npx tsx
/**
 * 로컬 VOD 분할 업로드 스크립트
 *
 * 로컬 파일 → 3시간 단위 분할 (무압축 -c copy) → Cloudflare Stream 업로드 → DB 저장
 * 기존 2화/3화 업로드 패턴(parent_id/part_number/total_parts) 유지
 *
 * 사용법:
 *   npx tsx scripts/upload-local-vod.ts                    # 전체 실행
 *   npx tsx scripts/upload-local-vod.ts --dry-run          # 미리보기
 *   npx tsx scripts/upload-local-vod.ts --episode 1        # 1화만
 *   npx tsx scripts/upload-local-vod.ts --episode 4        # 4화만
 */

import { getServiceClient } from './lib/supabase'
import { spawn, execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const supabase = getServiceClient()

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

// 분할 설정: 3시간 단위 → 파트당 ~22GB (Cloudflare 30GB 제한 이내)
const SEGMENT_DURATION = 3 * 60 * 60  // 3시간 (초)
const TEMP_DIR = path.join(os.tmpdir(), 'rg-vod-local')

// 업로드 대상
const TARGETS = [
  {
    episode: 1,
    inputPath: '/Volumes/Untitled/엑셀부 시즌1_01화 첫 직급전.mp4',
    title: '엑셀부 시즌1_01화 첫 직급전',
    unit: 'excel' as const,
  },
  {
    episode: 4,
    inputPath: '/Volumes/Untitled/엑셀부 시즌1_04화 명품데이.mp4',
    title: '엑셀부 시즌1_04화 명품데이',
    unit: 'excel' as const,
  },
  {
    episode: 5,
    inputPath: '/Volumes/1테라ssd/엑셀부 시즌1_05화 3 vs 9.mp4',
    title: '엑셀부 시즌1_05화 3 vs 9',
    unit: 'excel' as const,
  },
]

// ============================================
// 유틸리티
// ============================================

let globalStartTime = Date.now()

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
  const elapsed = formatDuration((Date.now() - globalStartTime) / 1000)
  const time = new Date().toLocaleTimeString('ko-KR')
  console.log(`[${time}] [${elapsed}] ${prefix} ${message}`)
}

function progressBar(percent: number, width = 30): string {
  const filled = Math.round(width * percent / 100)
  const empty = width - filled
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percent}%`
}

function getVideoDuration(filePath: string): number {
  const result = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
    { encoding: 'utf-8' }
  )
  return parseFloat(result.trim())
}

// ============================================
// 분할 계산
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
      outputPath: path.join(TEMP_DIR, `${baseName}_Part${partNumber}.mp4`),
    })

    currentTime += segmentDuration
    partNumber++
  }

  return segments
}

// ============================================
// 분할 (무압축 스트림 복사)
// ============================================

function splitSegment(
  inputPath: string,
  segment: SegmentInfo,
  totalParts: number,
): Promise<{ duration: number; size: number }> {
  return new Promise((resolve, reject) => {
    const splitStart = Date.now()

    log('✂️', `Part ${segment.partNumber}/${totalParts} 분할 시작 (-c copy, 무압축)`)
    console.log(`   범위: ${formatDuration(segment.startTime)} ~ ${formatDuration(segment.startTime + segment.duration)}`)

    const args = [
      '-ss', String(segment.startTime),
      '-i', inputPath,
      '-t', String(segment.duration),
      '-c', 'copy',
      '-avoid_negative_ts', 'make_zero',
      '-movflags', '+faststart',
      '-y', segment.outputPath,
    ]

    const ffmpeg = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] })

    let lastUpdate = Date.now()

    ffmpeg.stderr.on('data', (data) => {
      const line = data.toString()
      const timeMatch = line.match(/time=(\d+):(\d+):(\d+)/)
      const speedMatch = line.match(/speed=\s*([\d.]+)x/)

      if (timeMatch) {
        const currentSecs = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3])
        const percent = Math.floor((currentSecs / segment.duration) * 100)
        const speed = speedMatch ? parseFloat(speedMatch[1]) : 0

        const now = Date.now()
        if (now - lastUpdate > 2000) {
          const remaining = speed > 0 ? (segment.duration - currentSecs) / speed : 0
          process.stdout.write(`\r   ${progressBar(Math.min(percent, 100))} ${formatDuration(currentSecs)}/${formatDuration(segment.duration)} | ${speed.toFixed(1)}x | ETA: ${formatDuration(remaining)}`)
          lastUpdate = now
        }
      }
    })

    ffmpeg.on('close', (code) => {
      console.log()
      const elapsed = (Date.now() - splitStart) / 1000

      if (code === 0) {
        const size = fs.statSync(segment.outputPath).size
        log('✅', `Part ${segment.partNumber} 분할 완료 (${formatSize(size)}, ${formatDuration(elapsed)})`)
        resolve({ duration: segment.duration, size })
      } else {
        reject(new Error(`Part ${segment.partNumber} 분할 실패: exit code ${code}`))
      }
    })

    ffmpeg.on('error', reject)
  })
}

// ============================================
// Cloudflare TUS 업로드
// ============================================

async function uploadToCloudflare(filePath: string, title: string): Promise<string> {
  const uploadStart = Date.now()
  const fileSize = fs.statSync(filePath).size
  log('☁️', `업로드 시작: ${title} (${formatSize(fileSize)})`)

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

  const chunkSize = 100 * 1024 * 1024  // 100MB (안정성 향상)
  const MAX_RETRIES = 5
  const fd = fs.openSync(filePath, 'r')
  const buffer = Buffer.alloc(chunkSize)
  let offset = 0
  let lastUpdate = Date.now()

  try {
    while (offset < fileSize) {
      const bytesRead = fs.readSync(fd, buffer, 0, chunkSize, offset)
      const chunk = buffer.subarray(0, bytesRead)

      let success = false
      for (let retry = 0; retry < MAX_RETRIES; retry++) {
        try {
          const res = await fetch(uploadUrl, {
            method: 'PATCH',
            headers: {
              'Tus-Resumable': '1.0.0',
              'Upload-Offset': String(offset),
              'Content-Type': 'application/offset+octet-stream',
            },
            body: chunk,
          })

          if (res.ok) {
            success = true
            break
          }
          log('⚠️', `청크 응답 ${res.status}, 재시도 ${retry + 1}/${MAX_RETRIES}...`)
        } catch (err: any) {
          log('⚠️', `네트워크 오류 (${err.message}), 재시도 ${retry + 1}/${MAX_RETRIES}...`)
        }
        await new Promise(r => setTimeout(r, 3000 * (retry + 1)))
      }

      if (!success) throw new Error(`업로드 실패: ${MAX_RETRIES}회 재시도 후에도 실패 (offset: ${offset})`)

      offset += bytesRead
      const percent = Math.floor((offset / fileSize) * 100)
      const elapsed = (Date.now() - uploadStart) / 1000
      const speed = offset / elapsed / 1024 / 1024

      const now = Date.now()
      if (now - lastUpdate > 2000) {
        const eta = (fileSize - offset) / (offset / elapsed)
        process.stdout.write(`\r   ${progressBar(percent)} ${formatSize(offset)}/${formatSize(fileSize)} | ${speed.toFixed(1)} MB/s | ETA: ${formatDuration(eta)}`)
        lastUpdate = now
      }
    }
  } finally {
    fs.closeSync(fd)
  }

  console.log()
  const elapsed = (Date.now() - uploadStart) / 1000
  log('✅', `업로드 완료 (UID: ${uid}, ${formatDuration(elapsed)})`)
  return uid
}

// ============================================
// DB 저장 (기존 패턴 유지)
// ============================================

async function savePartsToDatabase(
  baseTitle: string,
  parts: Array<{ uid: string; partNumber: number; duration: number }>,
  unit: 'excel' | 'crew'
) {
  const totalParts = parts.length

  // Part 1 저장 (대표 항목)
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
      duration: Math.round(firstPart.duration),
    })
    .select()
    .single()

  if (parentError) throw new Error(`Part 1 DB 저장 실패: ${parentError.message}`)
  log('💾', `Part 1 저장 (ID: ${parent.id})`)

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
        duration: Math.round(part.duration),
      })

    if (error) {
      log('⚠️', `Part ${part.partNumber} DB 저장 실패: ${error.message}`)
    } else {
      log('💾', `Part ${part.partNumber} 저장`)
    }
  }

  return parent.id
}

// ============================================
// 메인
// ============================================

async function main() {
  console.log('═'.repeat(60))
  console.log('🎬 로컬 VOD 분할 업로드 (USB → 무압축 분할 → Cloudflare)')
  console.log('═'.repeat(60))

  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const episodeIdx = args.indexOf('--episode')
  const onlyEpisode = episodeIdx !== -1 ? parseInt(args[episodeIdx + 1]) : null

  // 환경변수 확인
  if (!dryRun && (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN)) {
    log('❌', 'CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN 환경변수 필요')
    process.exit(1)
  }

  // 대상 필터링
  const targets = onlyEpisode
    ? TARGETS.filter(t => t.episode === onlyEpisode)
    : TARGETS

  if (targets.length === 0) {
    log('❌', `${onlyEpisode}화를 찾을 수 없습니다`)
    process.exit(1)
  }

  // 파일 존재 확인
  for (const target of targets) {
    if (!fs.existsSync(target.inputPath)) {
      log('❌', `파일 없음: ${target.inputPath}`)
      process.exit(1)
    }
  }

  // 임시 디렉토리 생성
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }

  globalStartTime = Date.now()

  for (const target of targets) {
    console.log('\n' + '═'.repeat(60))
    log('🎬', `${target.episode}화 처리: ${target.title}`)
    console.log('═'.repeat(60))

    const fileSize = fs.statSync(target.inputPath).size
    const totalDuration = getVideoDuration(target.inputPath)

    console.log(`   파일: ${formatSize(fileSize)}`)
    console.log(`   길이: ${formatDuration(totalDuration)}`)

    // 분할 계획
    const baseName = target.title.replace(/[^\w가-힣]/g, '_')
    const segments = calculateSegments(totalDuration, baseName)

    console.log(`\n   📋 분할 계획: ${segments.length}개 파트`)
    segments.forEach(seg => {
      console.log(`      Part ${seg.partNumber}: ${formatDuration(seg.startTime)} ~ ${formatDuration(seg.startTime + seg.duration)}`)
    })

    if (dryRun) {
      console.log(`\n   🔍 [DRY-RUN] 실제 실행하지 않음`)
      continue
    }

    // 순차 처리: 압축 → 업로드 (파트 하나씩)
    const uploadedParts: Array<{ uid: string; partNumber: number; duration: number }> = []

    for (const segment of segments) {
      console.log('\n' + '─'.repeat(50))

      // 1. 무압축 분할
      const result = await splitSegment(target.inputPath, segment, segments.length)

      // 2. Cloudflare 업로드
      const partTitle = segments.length > 1
        ? `${target.title} (Part ${segment.partNumber}/${segments.length})`
        : target.title

      const uid = await uploadToCloudflare(segment.outputPath, partTitle)

      uploadedParts.push({
        uid,
        partNumber: segment.partNumber,
        duration: result.duration,
      })

      // 3. 임시 파일 삭제 (디스크 절약)
      fs.unlinkSync(segment.outputPath)
      log('🗑️', `임시 파일 삭제 (${formatSize(result.size)} 확보)`)
    }

    // DB 저장
    if (uploadedParts.length > 0) {
      console.log('\n' + '─'.repeat(50))
      const parentId = await savePartsToDatabase(target.title, uploadedParts, target.unit)
      log('✅', `${target.episode}화 DB 저장 완료 (Parent ID: ${parentId})`)
    }
  }

  // 최종 결과
  const totalElapsed = (Date.now() - globalStartTime) / 1000
  console.log('\n' + '═'.repeat(60))
  console.log('📊 최종 결과')
  console.log('═'.repeat(60))
  console.log(`   ⏱️  총 소요: ${formatDuration(totalElapsed)}`)
  console.log(`   ⏳ Cloudflare 인코딩 진행 중...`)
  if (CLOUDFLARE_ACCOUNT_ID) {
    console.log(`   https://dash.cloudflare.com/${CLOUDFLARE_ACCOUNT_ID}/stream`)
  }
  console.log('═'.repeat(60))
}

main().catch(err => {
  console.error('\n❌ 오류:', err.message)
  process.exit(1)
})
