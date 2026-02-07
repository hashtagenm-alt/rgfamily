#!/usr/bin/env npx tsx
/**
 * 7화 VOD 업로드 스크립트 (중간직급전 & 난사데이)
 *
 * 소스 파일 4개 → 최종 5파트로 Cloudflare Stream 업로드 → DB 저장
 *
 * 파일1 (62.5GB, 9h9m) → FFmpeg -c copy로 3시간 단위 분할 → Part 1~3
 *   Part 1: 0h ~ 3h (~20GB)
 *   Part 2: 3h ~ 6h (~20GB)
 *   Part 3: 6h ~ 9h9m (~22GB)
 * 파일2 (4.2GB, 36m) → 그대로 업로드 → Part 4
 * 파일3 + 파일4 → FFmpeg concat (-c copy) → Part 5 (~16.7GB, 2h26m)
 *
 * 사용법:
 *   npx tsx scripts/upload-ep7-vod.ts --dry-run     # 분할 계획 확인
 *   npx tsx scripts/upload-ep7-vod.ts                # 전체 실행
 *   npx tsx scripts/upload-ep7-vod.ts --skip-split   # 분할/concat 스킵 (이미 완료된 경우)
 *   npx tsx scripts/upload-ep7-vod.ts --start-part 3 # 3번 파트부터 재개
 */

import { getServiceClient } from './lib/supabase'
import { spawn, execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const supabase = getServiceClient()

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

// 분할 설정
const SEGMENT_DURATION = 3 * 60 * 60 // 3시간 (초)
const TEMP_DIR = path.join(os.tmpdir(), 'rg-vod-ep7')

// 7화 소스 파일 경로
const SOURCE_DIR = '/Volumes/Untitled/07화 중간직급전&난사데이'
const SOURCE_FILES = {
  file1: '엑셀부 시즌1_07화 중간직급전 1.mp4',  // 62.5GB, 9h9m → 3파트 분할
  file2: '엑셀부 시즌1_07화 중간직급전 2.mp4',  // 4.2GB, 36m → 그대로
  file3: '엑셀부 시즌1_07화 중간직급전 3.mp4',  // 13GB, 1h54m → file4와 concat
  file4: '엑셀부 시즌1_07화 중간직급전 4.mp4',  // 3.7GB, 32m → file3와 concat
}

const BASE_TITLE = '엑셀부 시즌1_07화 중간직급전&난사데이'
const TOTAL_PARTS = 5

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
  label: string            // 표시용 설명
  sourceFiles: string[]    // 원본 파일 경로 (concat 시 복수)
  type: 'split' | 'passthrough' | 'concat'
  startTime?: number       // split: 시작 시간 (초)
  splitDuration?: number   // split: 길이 (초)
  uploadPath: string       // 업로드할 파일 경로
  isTempFile: boolean      // 업로드 후 삭제 여부
}

function calculateParts(): PartInfo[] {
  const parts: PartInfo[] = []

  const file1Path = path.join(SOURCE_DIR, SOURCE_FILES.file1)
  const file2Path = path.join(SOURCE_DIR, SOURCE_FILES.file2)
  const file3Path = path.join(SOURCE_DIR, SOURCE_FILES.file3)
  const file4Path = path.join(SOURCE_DIR, SOURCE_FILES.file4)

  // 파일1 길이 확인
  log('📊', `파일1 길이 확인...`)
  let file1Duration: number
  try {
    file1Duration = getVideoDuration(file1Path)
  } catch {
    log('⚠️', '파일1 길이 확인 실패 - 예상값(9h9m = 32940s) 사용')
    file1Duration = 32940
  }
  log('📊', `파일1 길이: ${formatDuration(file1Duration)}`)

  // Part 1~3: 파일1 → 3시간 단위 분할 (마지막 파트가 나머지 흡수)
  let currentTime = 0
  let partNumber = 1
  while (currentTime < file1Duration) {
    const remaining = file1Duration - currentTime
    // 마지막 세그먼트: 남은 시간이 4시간 이하면 하나로 합침 (별도 파트 방지)
    const duration = (remaining <= SEGMENT_DURATION * 1.5) ? remaining : SEGMENT_DURATION

    parts.push({
      partNumber,
      label: `파일1 분할: ${formatDuration(currentTime)} ~ ${formatDuration(currentTime + duration)}`,
      sourceFiles: [file1Path],
      type: 'split',
      startTime: currentTime,
      splitDuration: duration,
      uploadPath: path.join(TEMP_DIR, `ep7_part${partNumber}.mp4`),
      isTempFile: true,
    })

    currentTime += duration
    partNumber++
  }

  // Part 4: 파일2 → 그대로
  parts.push({
    partNumber,
    label: `파일2 원본 그대로 (${SOURCE_FILES.file2})`,
    sourceFiles: [file2Path],
    type: 'passthrough',
    uploadPath: file2Path,
    isTempFile: false,
  })
  partNumber++

  // Part 5: 파일3 + 파일4 → concat
  parts.push({
    partNumber,
    label: `파일3 + 파일4 concat`,
    sourceFiles: [file3Path, file4Path],
    type: 'concat',
    uploadPath: path.join(TEMP_DIR, `ep7_part${partNumber}.mp4`),
    isTempFile: true,
  })

  return parts
}

// ============================================
// FFmpeg 분할 (무압축 스트림 복사)
// ============================================

function splitSegment(part: PartInfo): Promise<void> {
  return new Promise((resolve, reject) => {
    const splitStart = Date.now()

    log('✂️', `Part ${part.partNumber} 분할 시작 (-c copy, 무압축)`)
    console.log(`   범위: ${formatDuration(part.startTime!)} ~ ${formatDuration(part.startTime! + part.splitDuration!)}`)

    const args = [
      '-ss', String(part.startTime),
      '-i', part.sourceFiles[0],
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
        const percent = Math.floor((currentSecs / part.splitDuration!) * 100)
        const speed = speedMatch ? parseFloat(speedMatch[1]) : 0

        const now = Date.now()
        if (now - lastUpdate > 2000) {
          const remaining = speed > 0 ? (part.splitDuration! - currentSecs) / speed : 0
          process.stdout.write(`\r   ${progressBar(Math.min(percent, 100))} ${formatDuration(currentSecs)}/${formatDuration(part.splitDuration!)} | ${speed.toFixed(1)}x | ETA: ${formatDuration(remaining)}`)
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
// FFmpeg concat (무압축 합치기)
// ============================================

function concatFiles(part: PartInfo): Promise<void> {
  return new Promise((resolve, reject) => {
    const concatStart = Date.now()

    log('🔗', `Part ${part.partNumber} concat 시작 (-c copy, 무압축)`)
    for (const f of part.sourceFiles) {
      console.log(`   + ${path.basename(f)}`)
    }

    // concat demuxer용 리스트 파일 생성
    const listFile = path.join(TEMP_DIR, `concat_part${part.partNumber}.txt`)
    const listContent = part.sourceFiles.map(f => `file '${f}'`).join('\n')
    fs.writeFileSync(listFile, listContent)

    const args = [
      '-f', 'concat',
      '-safe', '0',
      '-i', listFile,
      '-c', 'copy',
      '-movflags', '+faststart',
      '-y', part.uploadPath,
    ]

    const ffmpeg = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] })

    let lastUpdate = Date.now()

    ffmpeg.stderr.on('data', (data: Buffer) => {
      const line = data.toString()
      const timeMatch = line.match(/time=(\d+):(\d+):(\d+)/)
      const speedMatch = line.match(/speed=\s*([\d.]+)x/)

      if (timeMatch && speedMatch) {
        const now = Date.now()
        if (now - lastUpdate > 2000) {
          const currentSecs = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3])
          const speed = parseFloat(speedMatch[1])
          process.stdout.write(`\r   진행: ${formatDuration(currentSecs)} | ${speed.toFixed(1)}x`)
          lastUpdate = now
        }
      }
    })

    ffmpeg.on('close', (code: number | null) => {
      console.log()
      // 리스트 파일 정리
      if (fs.existsSync(listFile)) fs.unlinkSync(listFile)

      const elapsed = (Date.now() - concatStart) / 1000

      if (code === 0) {
        const size = fs.statSync(part.uploadPath).size
        log('✅', `Part ${part.partNumber} concat 완료 (${formatSize(size)}, ${formatDuration(elapsed)})`)
        resolve()
      } else {
        reject(new Error(`Part ${part.partNumber} concat 실패: exit code ${code}`))
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
// DB 저장 (parent-child 구조)
// ============================================

async function savePartsToDatabase(
  parts: Array<{ uid: string; partNumber: number; duration: number }>,
) {
  const totalParts = parts.length
  log('💾', `DB 저장 시작 (${totalParts}파트)`)

  // Part 1 저장 (대표 항목 = parent)
  const firstPart = parts[0]
  const { data: parent, error: parentError } = await supabase
    .from('media_content')
    .insert({
      content_type: 'vod',
      title: BASE_TITLE,
      video_url: `https://iframe.videodelivery.net/${firstPart.uid}`,
      cloudflare_uid: firstPart.uid,
      thumbnail_url: `https://videodelivery.net/${firstPart.uid}/thumbnails/thumbnail.jpg`,
      unit: 'excel',
      is_featured: false,
      view_count: 0,
      part_number: 1,
      total_parts: totalParts,
      duration: Math.round(firstPart.duration),
    })
    .select()
    .single()

  if (parentError) throw new Error(`Part 1 DB 저장 실패: ${parentError.message}`)
  log('💾', `Part 1 저장 (Parent ID: ${parent.id})`)

  // 나머지 파트 저장 (child)
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]
    const { error } = await supabase
      .from('media_content')
      .insert({
        content_type: 'vod',
        title: `${BASE_TITLE} (Part ${part.partNumber})`,
        video_url: `https://iframe.videodelivery.net/${part.uid}`,
        cloudflare_uid: part.uid,
        thumbnail_url: `https://videodelivery.net/${part.uid}/thumbnails/thumbnail.jpg`,
        unit: 'excel',
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
  console.log('🎬 7화 VOD 업로드 (중간직급전 & 난사데이) - 5파트')
  console.log('═'.repeat(60))

  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const skipSplit = args.includes('--skip-split')
  const startPartIdx = args.indexOf('--start-part')
  const startPart = startPartIdx !== -1 ? parseInt(args[startPartIdx + 1]) : 1

  if (dryRun) {
    console.log('🔍 DRY-RUN 모드 (실제 실행 없음)\n')
  }

  // 환경변수 확인
  if (!dryRun && (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN)) {
    log('❌', 'CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN 환경변수 필요')
    process.exit(1)
  }

  // 소스 파일 존재 확인
  const allSourceFiles = Object.values(SOURCE_FILES)
  for (const name of allSourceFiles) {
    const p = path.join(SOURCE_DIR, name)
    if (!fs.existsSync(p)) {
      log('❌', `파일 없음: ${p}`)
      process.exit(1)
    }
    const size = fs.statSync(p).size
    log('📁', `${name} (${formatSize(size)})`)
  }

  // 파트 계산
  const parts = calculateParts()

  console.log('\n' + '─'.repeat(60))
  console.log('📋 업로드 계획')
  console.log('─'.repeat(60))
  for (const part of parts) {
    const skip = part.partNumber < startPart ? ' [SKIP]' : ''
    console.log(`   Part ${part.partNumber}: ${part.label}${skip}`)
  }

  if (dryRun) {
    console.log('\n🔍 [DRY-RUN] 실제 실행하지 않음')
    console.log(`   총 ${parts.length}개 파트 업로드 예정`)
    console.log(`   DB title: ${BASE_TITLE}`)
    return
  }

  // 임시 디렉토리 생성
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }

  globalStartTime = Date.now()

  // 순차 처리: 분할/concat → 업로드 (파트 하나씩)
  const uploadedParts: Array<{ uid: string; partNumber: number; duration: number }> = []

  for (const part of parts) {
    if (part.partNumber < startPart) {
      log('⏭️', `Part ${part.partNumber} 스킵 (--start-part ${startPart})`)
      continue
    }

    console.log('\n' + '═'.repeat(60))
    log('🎬', `Part ${part.partNumber}/${parts.length} 처리`)
    console.log('═'.repeat(60))

    // 1. 파일 준비 (분할/concat/패스스루)
    if (!skipSplit) {
      if (part.type === 'split') {
        if (fs.existsSync(part.uploadPath)) {
          const existingSize = fs.statSync(part.uploadPath).size
          log('📁', `분할 파일 이미 존재: ${formatSize(existingSize)} - 분할 스킵`)
        } else {
          await splitSegment(part)
        }
      } else if (part.type === 'concat') {
        if (fs.existsSync(part.uploadPath)) {
          const existingSize = fs.statSync(part.uploadPath).size
          log('📁', `concat 파일 이미 존재: ${formatSize(existingSize)} - concat 스킵`)
        } else {
          await concatFiles(part)
        }
      }
    }

    // 2. 업로드할 파일 확인
    if (!fs.existsSync(part.uploadPath)) {
      log('❌', `업로드 파일 없음: ${part.uploadPath}`)
      process.exit(1)
    }

    const fileSize = fs.statSync(part.uploadPath).size
    log('📊', `업로드 파일: ${formatSize(fileSize)}`)

    // Cloudflare 30GB 제한 확인
    const MAX_SIZE = 30 * 1024 * 1024 * 1024
    if (fileSize > MAX_SIZE) {
      log('❌', `파일 크기 초과! ${formatSize(fileSize)} > 30GB 제한`)
      process.exit(1)
    }

    // 3. 파일 길이 확인
    let duration: number
    try {
      duration = getVideoDuration(part.uploadPath)
    } catch {
      duration = part.splitDuration || 0
      log('⚠️', `길이 확인 실패 - 예상값 사용: ${formatDuration(duration)}`)
    }

    // 4. Cloudflare 업로드
    const partTitle = `${BASE_TITLE} (Part ${part.partNumber}/${parts.length})`
    const uid = await uploadToCloudflare(part.uploadPath, partTitle)

    uploadedParts.push({
      uid,
      partNumber: part.partNumber,
      duration,
    })

    // 5. 임시 파일 삭제 (분할/concat으로 생성된 파일만)
    if (part.isTempFile && fs.existsSync(part.uploadPath)) {
      const tempSize = fs.statSync(part.uploadPath).size
      fs.unlinkSync(part.uploadPath)
      log('🗑️', `임시 파일 삭제 (${formatSize(tempSize)} 확보)`)
    }
  }

  // DB 저장
  if (uploadedParts.length > 0) {
    console.log('\n' + '═'.repeat(60))
    log('💾', 'DB 저장')
    console.log('═'.repeat(60))

    const parentId = await savePartsToDatabase(uploadedParts)
    log('✅', `DB 저장 완료 (Parent ID: ${parentId}, ${uploadedParts.length}파트)`)
  }

  // 최종 결과
  const totalElapsed = (Date.now() - globalStartTime) / 1000
  console.log('\n' + '═'.repeat(60))
  console.log('📊 최종 결과')
  console.log('═'.repeat(60))
  console.log(`   🎬 ${BASE_TITLE}`)
  console.log(`   📦 ${uploadedParts.length}개 파트 업로드 완료`)
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
