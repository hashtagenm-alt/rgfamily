/**
 * 매칭된 깨진 영상 2개 업로드
 * - ID:172 sig2650 홍서하 ← 시즌1/홍서하/홍서하 솜사탕 2650 .mp4
 * - ID:202 sig1030 린아 ← 시즌1/린아/린아 1030 .mp4
 */

import { getServiceClient } from '../lib/supabase'
import { execFileSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const supabase = getServiceClient()
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!
const SEASON1_FOLDER_ID = '1sMgXm1z0L8CY_LP5MxzPO2Bf2arBHYL-'
const TEMP_DIR = path.join(os.tmpdir(), 'rg-matched-broken')

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

async function uploadViaTus(filePath: string, fileSize: number): Promise<string> {
  const createResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(fileSize),
        'Upload-Metadata': `name ${Buffer.from(path.basename(filePath)).toString('base64')}`,
      },
    }
  )

  if (createResponse.status !== 201) {
    const errText = await createResponse.text()
    throw new Error(`TUS 생성 실패: HTTP ${createResponse.status} - ${errText}`)
  }

  const tusUrl = createResponse.headers.get('Location')
  const streamMediaId = createResponse.headers.get('stream-media-id')
  if (!tusUrl) throw new Error('TUS URL 없음')

  const uid = streamMediaId || (tusUrl.match(/\/([a-f0-9]{32})\??/)?.[1] ?? '')
  const CHUNK_SIZE = 5 * 1024 * 1024
  const fd = fs.openSync(filePath, 'r')
  let offset = 0

  try {
    while (offset < fileSize) {
      const readSize = Math.min(CHUNK_SIZE, fileSize - offset)
      const buffer = Buffer.alloc(readSize)
      fs.readSync(fd, buffer, 0, readSize, offset)
      const patchResponse = await fetch(tusUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/offset+octet-stream',
          'Upload-Offset': String(offset),
          'Tus-Resumable': '1.0.0',
        },
        body: buffer,
      })
      if (patchResponse.status !== 204) throw new Error(`TUS 청크 실패: HTTP ${patchResponse.status}`)
      offset += readSize
      process.stdout.write(`\r   업로드: ${((offset / fileSize) * 100).toFixed(1)}% (${formatBytes(offset)} / ${formatBytes(fileSize)})`)
    }
  } finally {
    fs.closeSync(fd)
  }
  process.stdout.write('\n')
  return uid
}

async function uploadToCloudflare(filePath: string): Promise<string> {
  const fileSize = fs.statSync(filePath).size
  if (fileSize > 200 * 1024 * 1024) return uploadViaTus(filePath, fileSize)

  const fileBuffer = fs.readFileSync(filePath)
  const blob = new Blob([fileBuffer])
  const formData = new FormData()
  formData.append('file', blob, path.basename(filePath))

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` },
      body: formData,
    }
  )
  const data = await response.json()
  if (!response.ok || !data.success) throw new Error(`CF 업로드 실패: ${data.errors?.[0]?.message || JSON.stringify(data.errors)}`)
  return data.result.uid
}

interface Task {
  dbId: number
  drivePath: string
  label: string
}

const tasks: Task[] = [
  { dbId: 172, drivePath: '홍서하/홍서하 솜사탕 2650 .mp4', label: 'sig2650 홍서하' },
  { dbId: 202, drivePath: '린아/린아 1030 .mp4', label: 'sig1030 린아' },
]

async function main() {
  console.log('='.repeat(60))
  console.log('매칭된 깨진 영상 업로드')
  console.log('='.repeat(60))

  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })

  let success = 0
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]
    console.log(`\n[${i + 1}/${tasks.length}] ${t.label} (DB ID:${t.dbId})`)

    const localFile = path.join(TEMP_DIR, path.basename(t.drivePath))

    try {
      console.log('   다운로드 중...')
      execFileSync('rclone', [
        'copyto', `gdrive:${t.drivePath}`, localFile,
        '--drive-root-folder-id', SEASON1_FOLDER_ID, '--progress',
      ], { stdio: 'inherit', timeout: 600000 })

      console.log(`   파일: ${formatBytes(fs.statSync(localFile).size)}`)
      console.log('   Cloudflare 업로드 중...')
      const uid = await uploadToCloudflare(localFile)
      console.log(`   UID: ${uid}`)

      const videoUrl = `https://iframe.videodelivery.net/${uid}`
      const { error } = await supabase
        .from('signature_videos')
        .update({ cloudflare_uid: uid, video_url: videoUrl })
        .eq('id', t.dbId)
      if (error) throw new Error(`DB 업데이트 실패: ${error.message}`)
      console.log(`   DB 업데이트 완료`)
      success++
    } catch (err) {
      console.error(`   실패: ${err instanceof Error ? err.message : err}`)
    } finally {
      if (fs.existsSync(localFile)) try { fs.unlinkSync(localFile) } catch {}
    }

    if (i < tasks.length - 1) await new Promise(r => setTimeout(r, 1000))
  }

  console.log('\n' + '='.repeat(60))
  console.log(`결과: 성공 ${success}/${tasks.length}개`)
  console.log('='.repeat(60))
  try { fs.rmdirSync(TEMP_DIR) } catch {}
}

main().catch(err => { console.error(err); process.exit(1) })
