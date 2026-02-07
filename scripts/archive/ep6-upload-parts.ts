/**
 * EP6 파트별 업로드 스크립트
 * 이미 압축된 파일들을 Cloudflare Stream에 업로드
 */

import { getServiceClient } from './lib/supabase'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

const supabase = getServiceClient()

const SPLIT_DIR = '/var/folders/z0/0tcbss795xsdp75jmr_t9_kh0000gn/T/rg-vod-split-ep6'
const TITLE = '엑셀부 시즌1_06화'

interface PartInfo {
  partNumber: number
  filePath: string
  duration: number // seconds
}

const PARTS: PartInfo[] = [
  { partNumber: 1, filePath: `${SPLIT_DIR}/엑셀부_시즌1_06화_Part1.mp4`, duration: 21600 }, // 6h
  { partNumber: 2, filePath: `${SPLIT_DIR}/엑셀부_시즌1_06화_Part2.mp4`, duration: 21600 }, // 6h
  { partNumber: 3, filePath: `${SPLIT_DIR}/엑셀부_시즌1_06화_Part3.mp4`, duration: 5496 }, // ~1.5h
]

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`
}

async function uploadToCloudflare(filePath: string, title: string): Promise<string> {
  const fileSize = fs.statSync(filePath).size
  console.log(`   파일 크기: ${formatSize(fileSize)}`)

  // 1. TUS 업로드 URL 생성
  const createRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': fileSize.toString(),
        'Upload-Metadata': `name ${Buffer.from(title).toString('base64')}, maxDurationSeconds ${Buffer.from('21600').toString('base64')}`,
      },
    }
  )

  if (!createRes.ok) {
    const text = await createRes.text()
    throw new Error(`TUS 업로드 생성 실패: ${createRes.status} - ${text}`)
  }

  const uploadUrl = createRes.headers.get('location')
  const streamMediaId = createRes.headers.get('stream-media-id')

  if (!uploadUrl || !streamMediaId) {
    throw new Error('업로드 URL 또는 미디어 ID를 받지 못했습니다')
  }

  console.log(`   Cloudflare UID: ${streamMediaId}`)

  // 2. 파일 스트리밍 업로드 (50MB 청크)
  const CHUNK_SIZE = 50 * 1024 * 1024 // 50MB
  let uploadedBytes = 0

  const fileHandle = await fs.promises.open(filePath, 'r')
  const buffer = Buffer.alloc(CHUNK_SIZE)

  try {
    while (uploadedBytes < fileSize) {
      const { bytesRead } = await fileHandle.read(buffer, 0, CHUNK_SIZE, uploadedBytes)
      if (bytesRead === 0) break

      const chunk = buffer.subarray(0, bytesRead)

      let retries = 3
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
          console.log(`\n   청크 재시도... (${3 - retries}/3)`)
          await new Promise(r => setTimeout(r, 5000))
        }
      }
    }
  } finally {
    await fileHandle.close()
  }

  console.log('\n   ✅ 업로드 완료!')
  return streamMediaId
}

async function waitForProcessing(uid: string): Promise<number> {
  console.log('   처리 대기 중...')

  for (let i = 0; i < 360; i++) { // 최대 30분
    await new Promise(r => setTimeout(r, 5000))

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
      {
        headers: { 'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}` },
      }
    )

    if (!res.ok) continue

    const data = await res.json()
    const status = data.result?.status?.state

    if (status === 'ready') {
      const duration = Math.round(data.result?.duration || 0)
      console.log(`   ✅ 처리 완료! (길이: ${Math.floor(duration / 60)}분 ${duration % 60}초)`)
      return duration
    }

    if (status === 'error') {
      throw new Error(`처리 실패: ${data.result?.status?.errorReasonText}`)
    }

    process.stdout.write(`\r   처리 중... ${data.result?.status?.pctComplete || 0}%    `)
  }

  throw new Error('처리 시간 초과')
}

async function saveToDatabase(uid: string, title: string, duration: number, partNumber: number, totalParts: number, parentId?: number) {
  const { data, error } = await supabase
    .from('media_content')
    .insert({
      content_type: 'vod',
      title: `${title} (Part ${partNumber})`,
      cloudflare_uid: uid,
      duration: Math.round(duration),
      parent_id: parentId || null,
      part_number: partNumber,
      total_parts: totalParts,
      unit: 'excel',
    })
    .select()
    .single()

  if (error) {
    console.error('   DB 저장 실패:', error.message)
    return null
  }

  console.log(`   ✅ DB 저장 완료 (ID: ${data.id})`)
  return data
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('🎬 EP6 파트별 업로드')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`   제목: ${TITLE}`)
  console.log(`   파트 수: ${PARTS.length}`)
  console.log('')

  // 파일 존재 확인
  for (const part of PARTS) {
    if (!fs.existsSync(part.filePath)) {
      console.error(`❌ 파일 없음: ${part.filePath}`)
      process.exit(1)
    }
    const size = fs.statSync(part.filePath).size
    console.log(`   Part ${part.partNumber}: ${formatSize(size)}`)
  }
  console.log('')

  let parentId: number | undefined

  for (const part of PARTS) {
    console.log(`────────────────────────────────────────────────────────────`)
    console.log(`📺 Part ${part.partNumber}/${PARTS.length} 업로드 시작`)
    console.log('')

    try {
      // 업로드
      const uid = await uploadToCloudflare(part.filePath, `${TITLE} (Part ${part.partNumber})`)

      // 처리 대기
      const duration = await waitForProcessing(uid)

      // DB 저장
      const saved = await saveToDatabase(uid, TITLE, duration, part.partNumber, PARTS.length, parentId)

      // 첫 번째 파트의 ID를 parent_id로 사용
      if (part.partNumber === 1 && saved) {
        parentId = saved.id
      }

      console.log('')
    } catch (err) {
      console.error(`\n❌ Part ${part.partNumber} 실패:`, err)
      process.exit(1)
    }
  }

  console.log('═══════════════════════════════════════════════════════════')
  console.log('✅ 모든 파트 업로드 완료!')
  console.log('═══════════════════════════════════════════════════════════')
}

main().catch(console.error)
