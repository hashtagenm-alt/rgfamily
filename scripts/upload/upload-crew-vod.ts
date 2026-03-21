#!/usr/bin/env npx tsx
/**
 * 크루부 VOD 업로드 스크립트
 *
 * 로컬 파일 → Cloudflare Stream TUS 업로드 → DB 저장 (unit: 'crew')
 *
 * 사용법:
 *   npx tsx scripts/upload/upload-crew-vod.ts --dry-run     # 계획만 확인
 *   npx tsx scripts/upload/upload-crew-vod.ts                # 실행
 */

import { getServiceClient } from '../lib/supabase'
import * as fs from 'fs'

const supabase = getServiceClient()

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

const SOURCE_FILE = '/Volumes/SHARGE DISK/2026-03-15 18-15-05.mp4'
const TITLE = 'RG 크루 1화 시키면 한다'

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
  const filled = Math.round((width * percent) / 100)
  const empty = width - filled
  return `[${'='.repeat(filled)}${' '.repeat(empty)}] ${percent}%`
}

// ============================================
// Cloudflare TUS 업로드 (50MB 청크, 10회 재시도)
// ============================================

async function uploadToCloudflare(filePath: string, title: string): Promise<string> {
  const uploadStart = Date.now()
  const fileSize = fs.statSync(filePath).size
  log('>>>', `업로드 시작: ${title} (${formatSize(fileSize)})`)

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

  log('<<<', `TUS 세션 생성됨 (UID: ${uid})`)

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

          // 409 Conflict -> HEAD로 현재 offset 확인
          if (res.status === 409) {
            log('!!!', `409 Conflict at offset ${offset}, HEAD로 실제 offset 확인...`)
            const headRes = await fetch(uploadUrl, {
              method: 'HEAD',
              headers: { 'Tus-Resumable': '1.0.0' },
            })
            const serverOffset = headRes.headers.get('Upload-Offset')
            if (serverOffset) {
              offset = parseInt(serverOffset, 10)
              log('---', `서버 offset: ${offset} (${formatSize(offset)})으로 재개`)
              success = true
              break
            }
          }

          log('!!!', `청크 응답 ${res.status}, 재시도 ${retry + 1}/${MAX_RETRIES}...`)
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          log('!!!', `네트워크 오류 (${msg}), 재시도 ${retry + 1}/${MAX_RETRIES}...`)
        }
        await new Promise((r) => setTimeout(r, 3000 * (retry + 1)))
      }

      if (!success)
        throw new Error(`업로드 실패: ${MAX_RETRIES}회 재시도 후에도 실패 (offset: ${offset})`)

      const percent = Math.floor((offset / fileSize) * 100)
      const elapsed = (Date.now() - uploadStart) / 1000
      const speed = offset / elapsed / 1024 / 1024

      const now = Date.now()
      if (now - lastUpdate > 3000) {
        const eta = speed > 0 ? (fileSize - offset) / (speed * 1024 * 1024) : 0
        process.stdout.write(
          `\r   ${progressBar(percent)} ${formatSize(offset)}/${formatSize(fileSize)} | ${speed.toFixed(1)} MB/s | ETA: ${formatDuration(eta)}`
        )
        lastUpdate = now
      }
    }
  } finally {
    fs.closeSync(fd)
  }

  console.log()
  const elapsed = (Date.now() - uploadStart) / 1000
  log('OK ', `업로드 완료 (UID: ${uid}, ${formatDuration(elapsed)})`)
  return uid
}

// ============================================
// DB 저장
// ============================================

async function saveToDatabase(uid: string, duration: number) {
  const { data, error } = await supabase
    .from('media_content')
    .insert({
      content_type: 'vod',
      title: TITLE,
      video_url: `https://iframe.videodelivery.net/${uid}`,
      cloudflare_uid: uid,
      thumbnail_url: `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`,
      unit: 'crew',
      is_featured: false,
      is_published: true,
      view_count: 0,
      part_number: 1,
      total_parts: 1,
      duration: Math.round(duration),
    })
    .select()
    .single()

  if (error) throw new Error(`DB 저장 실패: ${error.message}`)
  log('DB ', `저장 완료 (ID: ${data.id})`)
  return data.id
}

// ============================================
// 메인
// ============================================

async function main() {
  console.log('='.repeat(60))
  console.log('  크루부 VOD 업로드')
  console.log('='.repeat(60))

  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  // 환경변수 확인
  if (!dryRun && (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN)) {
    log('ERR', 'CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN 환경변수 필요')
    process.exit(1)
  }

  // 소스 파일 확인
  if (!fs.existsSync(SOURCE_FILE)) {
    log('ERR', `파일 없음: ${SOURCE_FILE}`)
    process.exit(1)
  }

  const fileSize = fs.statSync(SOURCE_FILE).size
  const duration = 16037 // ffprobe 결과: 16036.93초 (~4h 27m)

  console.log()
  console.log(`   제목: ${TITLE}`)
  console.log(`   파일: ${SOURCE_FILE}`)
  console.log(`   크기: ${formatSize(fileSize)}`)
  console.log(`   길이: ${formatDuration(duration)}`)
  console.log(`   유닛: crew (크루부)`)
  console.log(`   분할: 불필요 (${formatSize(fileSize)} < 30GB)`)
  console.log()

  if (dryRun) {
    console.log('[DRY-RUN] 실제 실행하지 않음')
    return
  }

  globalStartTime = Date.now()

  // 1. Cloudflare 업로드
  const uid = await uploadToCloudflare(SOURCE_FILE, TITLE)

  // 2. DB 저장
  const dbId = await saveToDatabase(uid, duration)

  // 최종 결과
  const totalElapsed = (Date.now() - globalStartTime) / 1000
  console.log('\n' + '='.repeat(60))
  console.log('  완료')
  console.log('='.repeat(60))
  console.log(`   제목: ${TITLE}`)
  console.log(`   UID: ${uid}`)
  console.log(`   DB ID: ${dbId}`)
  console.log(`   소요: ${formatDuration(totalElapsed)}`)
  console.log(`   Cloudflare 인코딩 진행 중...`)
  if (CLOUDFLARE_ACCOUNT_ID) {
    console.log(`   https://dash.cloudflare.com/${CLOUDFLARE_ACCOUNT_ID}/stream`)
  }
  console.log('='.repeat(60))
}

main().catch((err) => {
  console.error('\nERR:', err.message)
  process.exit(1)
})
