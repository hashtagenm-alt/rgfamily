/**
 * 트랜스코딩된 쇼츠를 원본 4K로 재업로드 (v2 - 수동 TUS)
 *
 * 문제: upload-shorts-transcoded.ts로 올린 쇼츠가 4K → 1080p 8Mbps로 다운스케일됨
 * 해결: 원본 파일을 직접 업로드하여 Cloudflare에서 4K 유지
 *
 * 변경: tus-js-client 대신 ep6-upload-parts.ts에서 검증된 수동 TUS(fetch) 사용
 *
 * 사용법:
 *   npx tsx scripts/reupload-shorts-4k.ts --dry-run
 *   npx tsx scripts/reupload-shorts-4k.ts
 *   npx tsx scripts/reupload-shorts-4k.ts --skip 3   # 처음 3개 건너뛰기
 */

import { getServiceClient } from './lib/supabase'
import * as fs from 'fs'
import * as path from 'path'

const supabase = getServiceClient()

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!
const CLOUDFLARE_STREAM_API = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`

const FANCAM_FOLDER = path.join(__dirname, 'downloads/직캠')

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * 수동 TUS 프로토콜 업로드 (ep6-upload-parts.ts 방식)
 */
async function uploadManualTus(filePath: string, title: string): Promise<string> {
  const fileSize = fs.statSync(filePath).size
  console.log(`   파일 크기: ${formatSize(fileSize)}`)

  // 1. TUS 업로드 URL 생성
  const createRes = await fetch(
    `${CLOUDFLARE_STREAM_API}?direct_user=true`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': fileSize.toString(),
        'Upload-Metadata': `name ${Buffer.from(title).toString('base64')}, maxDurationSeconds ${Buffer.from('600').toString('base64')}`,
      },
    }
  )

  if (!createRes.ok) {
    const text = await createRes.text()
    throw new Error(`TUS 생성 실패: ${createRes.status} - ${text}`)
  }

  const uploadUrl = createRes.headers.get('location')
  const streamMediaId = createRes.headers.get('stream-media-id')

  if (!uploadUrl || !streamMediaId) {
    throw new Error('업로드 URL 또는 미디어 ID를 받지 못함')
  }

  console.log(`   Cloudflare UID: ${streamMediaId}`)

  // 2. 청크 업로드 (50MB 단위)
  const CHUNK_SIZE = 50 * 1024 * 1024
  let uploadedBytes = 0

  const fileHandle = await fs.promises.open(filePath, 'r')
  const buffer = Buffer.alloc(CHUNK_SIZE)

  try {
    while (uploadedBytes < fileSize) {
      const { bytesRead } = await fileHandle.read(buffer, 0, CHUNK_SIZE, uploadedBytes)
      if (bytesRead === 0) break

      const chunk = buffer.subarray(0, bytesRead)

      let retries = 5
      while (retries > 0) {
        try {
          const res = await fetch(uploadUrl, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/offset+octet-stream',
              'Upload-Offset': uploadedBytes.toString(),
              'Tus-Resumable': '1.0.0',
            },
            body: chunk,
          })

          if (!res.ok) {
            throw new Error(`청크 업로드 실패: ${res.status}`)
          }

          uploadedBytes = parseInt(res.headers.get('upload-offset') || '0')
          const percent = Math.round((uploadedBytes / fileSize) * 100)
          process.stdout.write(`\r   업로드: ${percent}% (${formatSize(uploadedBytes)} / ${formatSize(fileSize)})    `)
          break
        } catch (err) {
          retries--
          if (retries === 0) throw err
          console.log(`\n   청크 재시도... (${5 - retries}/5)`)
          await sleep(5000)
        }
      }
    }
  } finally {
    await fileHandle.close()
  }

  console.log('\n   업로드 완료!')
  return streamMediaId
}

/**
 * Cloudflare Stream에서 영상 삭제
 */
async function deleteFromCloudflare(uid: string): Promise<boolean> {
  try {
    const res = await fetch(`${CLOUDFLARE_STREAM_API}/${uid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` },
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Cloudflare 영상 처리 완료 대기
 */
async function waitForReady(uid: string, maxAttempts = 60): Promise<{ ready: boolean; duration?: number }> {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(5000)

    try {
      const res = await fetch(`${CLOUDFLARE_STREAM_API}/${uid}`, {
        headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` },
      })

      if (!res.ok) continue

      const json = await res.json()
      const state = json.result?.status?.state

      if (state === 'ready') {
        return { ready: true, duration: json.result?.duration }
      }

      if (state === 'error') {
        console.log(`\n   인코딩 오류: ${json.result?.status?.errorReasonText}`)
        return { ready: false }
      }

      const pct = json.result?.status?.pctComplete || '?'
      process.stdout.write(`\r   인코딩: ${pct}%   `)
    } catch {
      // retry
    }
  }

  console.log('\n   인코딩 대기 시간 초과 (DB는 업데이트)')
  return { ready: false }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const skipIdx = args.indexOf('--skip')
  const skipCount = skipIdx !== -1 ? parseInt(args[skipIdx + 1]) : 0

  console.log('═══════════════════════════════════════════════════════════')
  console.log('🎬 쇼츠 4K 원본 재업로드 v2 (수동 TUS)')
  if (dryRun) console.log('   🔵 DRY-RUN 모드')
  if (skipCount > 0) console.log(`   ⏭️ 처음 ${skipCount}개 건너뛰기`)
  console.log('═══════════════════════════════════════════════════════════\n')

  // 1. DB에서 현재 쇼츠 목록 조회
  const { data: shorts, error } = await supabase
    .from('media_content')
    .select('id, title, cloudflare_uid')
    .eq('content_type', 'shorts')
    .order('id', { ascending: true })

  if (error || !shorts) {
    console.error('DB 조회 실패:', error)
    return
  }

  // 2. 4K인 것 제외
  const skip4K = new Set(['청아 70000(레네다)', '청아 10092(르신)'])
  const toReupload = shorts
    .filter(s => !skip4K.has(s.title))
    .slice(skipCount)

  console.log(`🔄 재업로드 대상: ${toReupload.length}개\n`)

  let success = 0
  let failed = 0

  for (let i = 0; i < toReupload.length; i++) {
    const short = toReupload[i]
    const localFile = path.join(FANCAM_FOLDER, `${short.title}.mp4`)

    console.log(`────────────────────────────────────────`)
    console.log(`📹 [${i + 1}/${toReupload.length}] ${short.title}`)
    console.log(`   DB ID: ${short.id} | 기존 UID: ${short.cloudflare_uid}`)

    if (!fs.existsSync(localFile)) {
      console.log(`   ⚠️ 원본 파일 없음, 스킵`)
      failed++
      continue
    }

    if (dryRun) {
      const fileSize = fs.statSync(localFile).size
      console.log(`   원본: ${formatSize(fileSize)} → 재업로드 예정`)
      success++
      continue
    }

    try {
      // 3. 수동 TUS 업로드
      const newUid = await uploadManualTus(localFile, `${short.title}.mp4`)

      // 4. 인코딩 대기 (최대 5분)
      console.log(`   인코딩 대기 중...`)
      const status = await waitForReady(newUid, 60)

      if (status.ready) {
        console.log(`\n   인코딩 완료 (${status.duration?.toFixed(1)}s)`)
      }

      // 5. DB 업데이트
      const videoUrl = `https://iframe.videodelivery.net/${newUid}`
      const thumbnailUrl = `https://videodelivery.net/${newUid}/thumbnails/thumbnail.jpg?time=7s`

      const { error: updateError } = await supabase
        .from('media_content')
        .update({
          cloudflare_uid: newUid,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
        })
        .eq('id', short.id)

      if (updateError) {
        console.log(`   DB 업데이트 실패: ${updateError.message}`)
        failed++
        continue
      }

      console.log(`   DB 업데이트 완료`)

      // 6. 기존 Cloudflare 영상 삭제
      if (short.cloudflare_uid) {
        const deleted = await deleteFromCloudflare(short.cloudflare_uid)
        console.log(`   기존 영상 삭제: ${deleted ? '성공' : '실패'} (${short.cloudflare_uid})`)
      }

      success++

      // 파일 간 10초 대기 (Cloudflare 부하 방지)
      if (i < toReupload.length - 1) {
        console.log(`   다음 파일까지 10초 대기...\n`)
        await sleep(10000)
      }
    } catch (err) {
      console.error(`   실패: ${err instanceof Error ? err.message : String(err)}`)
      failed++

      // 실패 시 30초 대기 후 재시도
      if (i < toReupload.length - 1) {
        console.log(`   30초 대기 후 다음 파일 시도...\n`)
        await sleep(30000)
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log(`📊 결과: ${success}개 성공, ${failed}개 실패`)
  console.log('═══════════════════════════════════════════════════════════')
}

main().catch(console.error)
