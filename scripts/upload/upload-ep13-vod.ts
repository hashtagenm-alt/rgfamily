#!/usr/bin/env npx tsx
/**
 * 13화 VOD 업로드 스크립트 (팀 데스매치)
 *
 * 소스 파일 1개 (82GB) → FFmpeg -c copy로 3시간 단위 분할 → 4파트
 *
 * 사용법:
 *   npx tsx scripts/upload-ep13-vod.ts --dry-run     # 분할 계획 확인
 *   npx tsx scripts/upload-ep13-vod.ts --split-only   # 분할만 실행 (확인용)
 *   npx tsx scripts/upload-ep13-vod.ts --skip-split   # 분할 스킵, 업로드만 (이미 분할된 경우)
 *   npx tsx scripts/upload-ep13-vod.ts                # 전체 실행 (분할+업로드+임시삭제)
 *   npx tsx scripts/upload-ep13-vod.ts --keep-files   # 업로드 후 임시파일 유지
 *   npx tsx scripts/upload-ep13-vod.ts --start-part 3 # 3번 파트부터 재개
 */

import { getServiceClient } from '../lib/supabase'
import { spawn, execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const supabase = getServiceClient()

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

// 분할 설정
const SEGMENT_DURATION = 3 * 60 * 60 // 3시간 (초)
const TEMP_DIR = path.join(os.tmpdir(), 'rg-vod-ep13')

// 13화 소스 파일 경로
const SOURCE_FILE = '/Users/bagjaeseog/Downloads/2026-02-19 13-51-41.mp4'

const BASE_TITLE = '엑셀부 시즌1_13화 팀 데스매치'

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
// 파트 정보 계산
// ============================================

interface PartInfo {
  partNumber: number
  label: string
  startTime: number
  splitDuration: number
  uploadPath: string
}

function calculateParts(totalDuration: number): PartInfo[] {
  const parts: PartInfo[] = []

  let currentTime = 0
  let partNumber = 1
  while (currentTime < totalDuration) {
    const remaining = totalDuration - currentTime
    const duration = (remaining <= SEGMENT_DURATION * 1.3) ? remaining : SEGMENT_DURATION

    parts.push({
      partNumber,
      label: `${formatDuration(currentTime)} ~ ${formatDuration(currentTime + duration)}`,
      startTime: currentTime,
      splitDuration: duration,
      uploadPath: path.join(TEMP_DIR, `ep13_part${partNumber}.mp4`),
    })

    currentTime += duration
    partNumber++
  }

  return parts
}

// ============================================
// FFmpeg 분할 (무압축 스트림 복사)
// ============================================

function splitSegment(part: PartInfo): Promise<void> {
  return new Promise((resolve, reject) => {
    const splitStart = Date.now()

    log('✂️', `Part ${part.partNumber} 분할 시작 (-c copy, 무압축)`)
    console.log(`   범위: ${part.label}`)

    const args = [
      '-ss', String(part.startTime),
      '-i', SOURCE_FILE,
      '-t', String(part.splitDuration),
      '-c', 'copy',
      '-avoid_negative_ts', 'make_zero',
      '-movflags', '+faststart',
      '-y', part.uploadPath,
    ]

    const ffmpeg = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] })

    let lastUpdate = Date.now()

    ffmpeg.stderr.on('data', (data: Buffer) => {
      const line = data.toString()
      const timeMatch = line.match(/time=(\d+):(\d+):(\d+)/)
      const speedMatch = line.match(/speed=\s*([\d.]+)x/)

      if (timeMatch) {
        const currentSecs = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3])
        const percent = Math.floor((currentSecs / part.splitDuration) * 100)
        const speed = speedMatch ? parseFloat(speedMatch[1]) : 0

        const now = Date.now()
        if (now - lastUpdate > 2000) {
          const remaining = speed > 0 ? (part.splitDuration - currentSecs) / speed : 0
          process.stdout.write(`\r   ${progressBar(Math.min(percent, 100))} ${formatDuration(currentSecs)}/${formatDuration(part.splitDuration)} | ${speed.toFixed(1)}x | ETA: ${formatDuration(remaining)}`)
          lastUpdate = now
        }
      }
    })

    ffmpeg.on('close', (code: number | null) => {
      console.log()
      const elapsed = (Date.now() - splitStart) / 1000

      if (code === 0) {
        const size = fs.statSync(part.uploadPath).size
        log('✅', `Part ${part.partNumber} 분할 완료 (${formatSize(size)}, ${formatDuration(elapsed)})`)
        resolve()
      } else {
        reject(new Error(`Part ${part.partNumber} 분할 실패: exit code ${code}`))
      }
    })

    ffmpeg.on('error', reject)
  })
}

// ============================================
// Cloudflare TUS 업로드 (50MB 청크, 10회 재시도, 409 핸들링)
// ============================================

async function uploadToCloudflare(filePath: string, title: string): Promise<string> {
  const uploadStart = Date.now()
  const fileSize = fs.statSync(filePath).size
  log('☁️', `업로드 시작: ${title} (${formatSize(fileSize)})`)

  // TUS 세션 생성
  const initRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(fileSize),
        'Upload-Metadata': `name ${Buffer.from(title).toString('base64')}, maxDurationSeconds ${Buffer.from('36000').toString('base64')}`,
      },
    }
  )

  if (!initRes.ok) {
    const errText = await initRes.text()
    throw new Error(`TUS 초기화 실패: ${initRes.status} - ${errText}`)
  }

  const uploadUrl = initRes.headers.get('location')!
  const uid = initRes.headers.get('stream-media-id')!

  log('📤', `TUS 세션 생성됨 (UID: ${uid})`)

  // 청크 업로드 (50MB, 10회 재시도)
  const CHUNK_SIZE = 50 * 1024 * 1024
  const MAX_RETRIES = 10
  const fd = fs.openSync(filePath, 'r')
  let offset = 0
  let lastUpdate = Date.now()

  try {
    while (offset < fileSize) {
      const readSize = Math.min(CHUNK_SIZE, fileSize - offset)
      const buffer = Buffer.alloc(readSize)
      fs.readSync(fd, buffer, 0, readSize, offset)

      let success = false
      for (let retry = 0; retry < MAX_RETRIES; retry++) {
        try {
          const res = await fetch(uploadUrl, {
            method: 'PATCH',
            headers: {
              'Tus-Resumable': '1.0.0',
              'Upload-Offset': String(offset),
              'Content-Type': 'application/offset+octet-stream',
              'Content-Length': String(readSize),
            },
            body: buffer,
          })

          if (res.ok || res.status === 204) {
            const newOffset = res.headers.get('Upload-Offset')
            if (newOffset) offset = parseInt(newOffset, 10)
            else offset += readSize
            success = true
            break
          }

          // 409 Conflict → offset 불일치, HEAD로 현재 offset 확인
          if (res.status === 409) {
            log('⚠️', `409 Conflict at offset ${offset}, HEAD로 실제 offset 확인...`)
            const headRes = await fetch(uploadUrl, {
              method: 'HEAD',
              headers: { 'Tus-Resumable': '1.0.0' },
            })
            const serverOffset = headRes.headers.get('Upload-Offset')
            if (serverOffset) {
              offset = parseInt(serverOffset, 10)
              log('🔄', `서버 offset: ${offset} (${formatSize(offset)})으로 재개`)
              success = true
              break
            }
          }

          log('⚠️', `청크 응답 ${res.status}, 재시도 ${retry + 1}/${MAX_RETRIES}...`)
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          log('⚠️', `네트워크 오류 (${msg}), 재시도 ${retry + 1}/${MAX_RETRIES}...`)
        }
        await new Promise(r => setTimeout(r, 3000 * (retry + 1)))
      }

      if (!success) throw new Error(`업로드 실패: ${MAX_RETRIES}회 재시도 후에도 실패 (offset: ${offset})`)

      const percent = Math.floor((offset / fileSize) * 100)
      const elapsed = (Date.now() - uploadStart) / 1000
      const speed = offset / elapsed / 1024 / 1024

      const now = Date.now()
      if (now - lastUpdate > 3000) {
        const eta = speed > 0 ? (fileSize - offset) / (speed * 1024 * 1024) : 0
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
// DB 즉시 저장 (파트별 업로드 완료 즉시 저장)
// ============================================

let parentId: number | null = null

async function savePartToDatabase(
  partInfo: { uid: string; partNumber: number; duration: number },
  totalParts: number,
) {
  if (partInfo.partNumber === 1) {
    const { data: parent, error } = await supabase
      .from('media_content')
      .insert({
        content_type: 'vod',
        title: BASE_TITLE,
        video_url: `https://iframe.videodelivery.net/${partInfo.uid}`,
        cloudflare_uid: partInfo.uid,
        thumbnail_url: `https://videodelivery.net/${partInfo.uid}/thumbnails/thumbnail.jpg`,
        unit: 'excel',
        is_featured: false,
        view_count: 0,
        part_number: 1,
        total_parts: totalParts,
        duration: Math.round(partInfo.duration),
      })
      .select()
      .single()

    if (error) throw new Error(`Part 1 DB 저장 실패: ${error.message}`)
    parentId = parent.id
    log('💾', `Part 1 DB 저장 완료 (Parent ID: ${parentId})`)
    return parentId
  }

  if (parentId === null) throw new Error(`Part ${partInfo.partNumber} 저장 실패: Parent ID 없음`)

  const { error } = await supabase
    .from('media_content')
    .insert({
      content_type: 'vod',
      title: `${BASE_TITLE} (Part ${partInfo.partNumber})`,
      video_url: `https://iframe.videodelivery.net/${partInfo.uid}`,
      cloudflare_uid: partInfo.uid,
      thumbnail_url: `https://videodelivery.net/${partInfo.uid}/thumbnails/thumbnail.jpg`,
      unit: 'excel',
      is_featured: false,
      view_count: 0,
      parent_id: parentId,
      part_number: partInfo.partNumber,
      total_parts: totalParts,
      duration: Math.round(partInfo.duration),
    })

  if (error) {
    log('⚠️', `Part ${partInfo.partNumber} DB 저장 실패: ${error.message}`)
  } else {
    log('💾', `Part ${partInfo.partNumber} DB 저장 완료`)
  }

  return parentId
}

// ============================================
// 메인
// ============================================

async function main() {
  console.log('═'.repeat(60))
  console.log('🎬 13화 VOD 업로드 (팀 데스매치)')
  console.log('═'.repeat(60))

  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const splitOnly = args.includes('--split-only')
  const skipSplit = args.includes('--skip-split')
  const keepFiles = args.includes('--keep-files')
  const startPartIdx = args.indexOf('--start-part')
  const startPart = startPartIdx !== -1 ? parseInt(args[startPartIdx + 1]) : 1
  const parentIdIdx = args.indexOf('--parent-id')
  if (parentIdIdx !== -1) parentId = parseInt(args[parentIdIdx + 1])

  if (dryRun) {
    console.log('🔍 DRY-RUN 모드 (실제 실행 없음)\n')
  }
  if (splitOnly) {
    console.log('✂️  SPLIT-ONLY 모드 (분할만 실행, 업로드 안 함)\n')
  }

  // 환경변수 확인 (split-only 모드에서는 불필요)
  if (!dryRun && !splitOnly && (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN)) {
    log('❌', 'CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN 환경변수 필요')
    process.exit(1)
  }

  // 소스 파일 존재 확인
  if (!fs.existsSync(SOURCE_FILE)) {
    log('❌', `파일 없음: ${SOURCE_FILE}`)
    process.exit(1)
  }
  const fileSize = fs.statSync(SOURCE_FILE).size
  log('📁', `소스: ${path.basename(SOURCE_FILE)} (${formatSize(fileSize)})`)

  // 영상 길이 확인
  log('📊', '영상 길이 확인...')
  let totalDuration: number
  try {
    totalDuration = getVideoDuration(SOURCE_FILE)
  } catch {
    log('⚠️', '길이 확인 실패 - 예상값(40362s = 11h12m) 사용')
    totalDuration = 40362
  }
  log('📊', `영상 길이: ${formatDuration(totalDuration)}`)

  // 파트 계산
  const parts = calculateParts(totalDuration)

  console.log('\n' + '─'.repeat(60))
  console.log('📋 업로드 계획')
  console.log('─'.repeat(60))
  console.log(`   제목: ${BASE_TITLE}`)
  console.log(`   총 ${parts.length}파트`)
  for (const part of parts) {
    const skip = part.partNumber < startPart ? ' [SKIP]' : ''
    console.log(`   Part ${part.partNumber}: ${part.label}${skip}`)
  }

  if (dryRun) {
    console.log('\n🔍 [DRY-RUN] 실제 실행하지 않음')
    return
  }

  // 임시 디렉토리 생성
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }

  globalStartTime = Date.now()

  // 순차 처리
  for (const part of parts) {
    if (part.partNumber < startPart) {
      log('⏭️', `Part ${part.partNumber} 스킵 (--start-part ${startPart})`)
      continue
    }

    console.log('\n' + '═'.repeat(60))
    log('🎬', `Part ${part.partNumber}/${parts.length} 처리`)
    console.log('═'.repeat(60))

    // 1. FFmpeg 분할
    if (!skipSplit) {
      if (fs.existsSync(part.uploadPath)) {
        const existingSize = fs.statSync(part.uploadPath).size
        log('📁', `분할 파일 이미 존재: ${formatSize(existingSize)} - 분할 스킵`)
      } else {
        await splitSegment(part)
      }
    }

    // 2. 파일 확인
    if (!fs.existsSync(part.uploadPath)) {
      log('❌', `파일 없음: ${part.uploadPath}`)
      process.exit(1)
    }

    const partFileSize = fs.statSync(part.uploadPath).size
    log('📊', `파일: ${formatSize(partFileSize)}`)

    // split-only 모드: 분할만 하고 업로드 안 함
    if (splitOnly) {
      log('✂️', `Part ${part.partNumber} 분할 완료 → ${part.uploadPath}`)
      continue
    }

    // Cloudflare 30GB 제한 확인
    const MAX_SIZE = 30 * 1024 * 1024 * 1024
    if (partFileSize > MAX_SIZE) {
      log('❌', `파일 크기 초과! ${formatSize(partFileSize)} > 30GB 제한`)
      process.exit(1)
    }

    // 3. 파일 길이 확인
    let duration: number
    try {
      duration = getVideoDuration(part.uploadPath)
    } catch {
      duration = part.splitDuration
      log('⚠️', `길이 확인 실패 - 예상값 사용: ${formatDuration(duration)}`)
    }

    // 4. Cloudflare 업로드
    const partTitle = `${BASE_TITLE} (Part ${part.partNumber}/${parts.length})`
    const uid = await uploadToCloudflare(part.uploadPath, partTitle)

    // 5. 즉시 DB 저장
    await savePartToDatabase(
      { uid, partNumber: part.partNumber, duration },
      parts.length,
    )

    // 6. 임시 파일 삭제 (--keep-files면 유지)
    if (!keepFiles && fs.existsSync(part.uploadPath)) {
      const tempSize = fs.statSync(part.uploadPath).size
      fs.unlinkSync(part.uploadPath)
      log('🗑️', `임시 파일 삭제 (${formatSize(tempSize)} 확보)`)
    }
  }

  // 최종 결과
  const totalElapsed = (Date.now() - globalStartTime) / 1000
  console.log('\n' + '═'.repeat(60))

  if (splitOnly) {
    console.log('📊 분할 완료')
    console.log('═'.repeat(60))
    console.log(`   📂 임시 폴더: ${TEMP_DIR}`)
    console.log(`   🎬 ${parts.length}개 파트 분할 완료`)
    for (const part of parts) {
      if (fs.existsSync(part.uploadPath)) {
        const size = fs.statSync(part.uploadPath).size
        console.log(`   Part ${part.partNumber}: ${formatSize(size)} → ${part.uploadPath}`)
      }
    }
    console.log(`   ⏱️  총 소요: ${formatDuration(totalElapsed)}`)
    console.log(`\n   ✅ 확인 후 업로드: npx tsx scripts/upload-ep13-vod.ts --skip-split`)
  } else {
    console.log('📊 최종 결과')
    console.log('═'.repeat(60))
    console.log(`   🎬 ${BASE_TITLE}`)
    console.log(`   📦 ${parts.length}개 파트 업로드 + DB 저장 완료`)
    console.log(`   🆔 Parent ID: ${parentId}`)
    console.log(`   ⏱️  총 소요: ${formatDuration(totalElapsed)}`)
    console.log(`   ⏳ Cloudflare 인코딩 진행 중...`)
    if (CLOUDFLARE_ACCOUNT_ID) {
      console.log(`   https://dash.cloudflare.com/${CLOUDFLARE_ACCOUNT_ID}/stream`)
    }
  }
  console.log('═'.repeat(60))
}

main().catch(err => {
  console.error('\n❌ 오류:', err.message)
  process.exit(1)
})
