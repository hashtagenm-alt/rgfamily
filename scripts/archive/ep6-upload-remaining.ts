/**
 * EP6 Part 2, 3 업로드 (Part 1은 이미 완료)
 */

import { getServiceClient } from './lib/supabase'
import * as fs from 'fs'
import dotenv from 'dotenv'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

const supabase = getServiceClient()

const SPLIT_DIR = '/var/folders/z0/0tcbss795xsdp75jmr_t9_kh0000gn/T/rg-vod-split-ep6'
const TITLE = '엑셀부 시즌1_06화'

// Part 1 UID (이미 업로드됨)
const PART1_UID = '362bf90242fe0f0ecf3a83326c4963e0'

interface PartInfo {
  partNumber: number
  filePath: string
  uid?: string
}

const PARTS: PartInfo[] = [
  { partNumber: 2, filePath: `${SPLIT_DIR}/엑셀부_시즌1_06화_Part2.mp4` },
  { partNumber: 3, filePath: `${SPLIT_DIR}/엑셀부_시즌1_06화_Part3.mp4` },
]

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`
}

async function uploadToCloudflare(filePath: string, title: string): Promise<string> {
  const fileSize = fs.statSync(filePath).size
  console.log(`   파일 크기: ${formatSize(fileSize)}`)

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

  const CHUNK_SIZE = 50 * 1024 * 1024
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

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('🎬 EP6 Part 2, 3 업로드')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`   Part 1 UID: ${PART1_UID} (이미 업로드됨)`)
  console.log('')

  const results: { part: number; uid: string }[] = [
    { part: 1, uid: PART1_UID }
  ]

  for (const part of PARTS) {
    console.log(`────────────────────────────────────────────────────────────`)
    console.log(`📺 Part ${part.partNumber}/3 업로드 시작`)
    console.log('')

    try {
      const uid = await uploadToCloudflare(part.filePath, `${TITLE} (Part ${part.partNumber})`)
      results.push({ part: part.partNumber, uid })
      console.log('')
    } catch (err) {
      console.error(`\n❌ Part ${part.partNumber} 실패:`, err)
      process.exit(1)
    }
  }

  console.log('═══════════════════════════════════════════════════════════')
  console.log('✅ 모든 파트 업로드 완료!')
  console.log('')
  console.log('📋 UID 목록 (나중에 DB 저장용):')
  results.forEach(r => console.log(`   Part ${r.part}: ${r.uid}`))
  console.log('═══════════════════════════════════════════════════════════')
}

main().catch(console.error)
