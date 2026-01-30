/**
 * 이미 다운로드된 VOD 파일을 Cloudflare에 업로드
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 이미 다운로드된 파일 경로
const TEMP_DIR = '/private/var/folders/z0/0tcbss795xsdp75jmr_t9_kh0000gn/T/rg-vod-upload'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

async function uploadToCloudflare(filePath: string, title: string): Promise<string> {
  const fileSize = fs.statSync(filePath).size
  console.log(`☁️  Cloudflare 업로드 시작 (${formatBytes(fileSize)})...`)

  // TUS 초기화
  const initRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(fileSize),
        'Upload-Metadata': `name ${Buffer.from(title).toString('base64')}`,
      },
    }
  )

  if (!initRes.ok) {
    throw new Error(`Cloudflare 초기화 실패: ${await initRes.text()}`)
  }

  const uploadUrl = initRes.headers.get('location')!
  const uid = initRes.headers.get('stream-media-id')!
  console.log(`UID: ${uid}`)

  // 청크 업로드 (50MB씩)
  const chunkSize = 50 * 1024 * 1024
  const fd = fs.openSync(filePath, 'r')
  const buffer = Buffer.alloc(chunkSize)
  let uploadedBytes = 0
  let lastLogTime = Date.now()

  while (uploadedBytes < fileSize) {
    const bytesRead = fs.readSync(fd, buffer, 0, chunkSize, uploadedBytes)
    const chunk = buffer.slice(0, bytesRead)

    let retries = 3
    while (retries > 0) {
      try {
        const patchRes = await fetch(uploadUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/offset+octet-stream',
            'Upload-Offset': String(uploadedBytes),
            'Tus-Resumable': '1.0.0',
          },
          body: chunk,
        })

        if (!patchRes.ok) {
          throw new Error(`HTTP ${patchRes.status}`)
        }
        break
      } catch (e) {
        retries--
        if (retries === 0) {
          fs.closeSync(fd)
          throw new Error(`청크 업로드 실패: ${(e as Error).message}`)
        }
        console.log(`\n⚠️  재시도 중... (${3 - retries}/3)`)
        await new Promise(r => setTimeout(r, 2000))
      }
    }

    uploadedBytes += bytesRead
    const percent = ((uploadedBytes / fileSize) * 100).toFixed(1)

    if (Date.now() - lastLogTime > 2000) {
      process.stdout.write(`\r☁️  업로드: ${percent}% (${formatBytes(uploadedBytes)} / ${formatBytes(fileSize)})   `)
      lastLogTime = Date.now()
    }
  }

  fs.closeSync(fd)
  console.log(`\n✅ Cloudflare 업로드 완료`)

  return uid
}

async function registerToDatabase(uid: string, title: string) {
  const { data, error } = await supabase
    .from('media_content')
    .insert({
      content_type: 'vod',
      title,
      video_url: `https://iframe.videodelivery.net/${uid}`,
      cloudflare_uid: uid,
      thumbnail_url: `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`,
      unit: 'excel',
      is_featured: false,
      view_count: 0,
    })
    .select()
    .single()

  if (error) throw new Error(`DB 등록 실패: ${error.message}`)
  return data
}

async function checkDuplicate(title: string): Promise<boolean> {
  const { data } = await supabase
    .from('media_content')
    .select('id')
    .eq('title', title)
    .limit(1)
  return (data && data.length > 0)
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎬 다운로드된 VOD → Cloudflare 업로드')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // 파일 목록 확인
  const files = fs.readdirSync(TEMP_DIR).filter(f => f.endsWith('.mp4'))

  if (files.length === 0) {
    console.log('⚠️  업로드할 파일이 없습니다.')
    return
  }

  for (const file of files) {
    const filePath = path.join(TEMP_DIR, file)
    const title = file.replace(/\.mp4$/i, '')

    console.log(`\n📁 ${file}`)

    // 중복 체크
    if (await checkDuplicate(title)) {
      console.log('⚠️  이미 등록됨. 건너뜀.')
      continue
    }

    try {
      const uid = await uploadToCloudflare(filePath, title)
      const dbRecord = await registerToDatabase(uid, title)
      console.log(`✅ DB 등록 완료 (id: ${dbRecord.id})`)

      // 업로드 완료 후 파일 삭제
      fs.unlinkSync(filePath)
      console.log('🗑️  임시 파일 삭제')
    } catch (error) {
      console.error(`❌ 실패: ${(error as Error).message}`)
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('완료!')
}

main().catch(console.error)
