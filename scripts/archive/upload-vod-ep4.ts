#!/usr/bin/env npx tsx
/**
 * 4화 VOD 업로드
 */

import { getServiceClient } from './lib/supabase'
import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const supabase = getServiceClient()

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!
const GDRIVE_FOLDER_ID = '18TWcpi2Yp3mUbDJywyKPT-AVaP1cucv-'
const DOWNLOAD_DIR = path.join(process.cwd(), 'scripts/downloads/vod')

const TARGET = {
  episode: 4,
  file: '엑셀부 시즌1_04화 명품데이.mp4',
  title: '[RG FAMILY] 시즌1 / 04화 명품데이',
  episodeId: 15
}

function log(emoji: string, msg: string) {
  console.log(`[${new Date().toLocaleTimeString('ko-KR')}] ${emoji} ${msg}`)
}

function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

async function downloadFromGDrive(fileName: string, localPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    log('📥', `다운로드 시작: ${fileName}`)

    const args = [
      'copy',
      `gdrive:${fileName}`,
      path.dirname(localPath),
      `--drive-root-folder-id=${GDRIVE_FOLDER_ID}`,
      '--progress',
      '--transfers', '4',
      '--drive-chunk-size', '128M',
    ]

    const proc = spawn('rclone', args)
    let lastLog = Date.now()

    proc.stderr.on('data', (data) => {
      const str = data.toString()
      if (Date.now() - lastLog > 30000) {
        const match = str.match(/(\d+)%/)
        if (match) {
          log('📥', `다운로드: ${match[1]}%`)
          lastLog = Date.now()
        }
      }
    })

    proc.on('close', (code) => {
      if (code === 0) {
        log('✅', `다운로드 완료`)
        resolve(true)
      } else {
        log('❌', `다운로드 실패 (code: ${code})`)
        resolve(false)
      }
    })
  })
}

async function uploadToCloudflare(filePath: string, title: string): Promise<string | null> {
  const fileSize = fs.statSync(filePath).size
  log('☁️', `Cloudflare 업로드 시작: ${formatSize(fileSize)}`)

  try {
    const createResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Tus-Resumable': '1.0.0',
          'Upload-Length': String(fileSize),
          'Upload-Metadata': `name ${Buffer.from(title).toString('base64')}`,
        },
      }
    )

    if (createResponse.status !== 201) {
      log('❌', `TUS 세션 실패: ${createResponse.status}`)
      return null
    }

    const tusUrl = createResponse.headers.get('Location')!
    const uid = createResponse.headers.get('stream-media-id') ||
                tusUrl.match(/\/([a-f0-9]{32})\??/)?.[1] || ''

    log('📤', `TUS 세션: ${uid}`)

    const CHUNK_SIZE = 50 * 1024 * 1024
    const fd = fs.openSync(filePath, 'r')
    let offset = 0
    let lastLogPercent = 0

    try {
      while (offset < fileSize) {
        const readSize = Math.min(CHUNK_SIZE, fileSize - offset)
        const buffer = Buffer.alloc(readSize)
        fs.readSync(fd, buffer, 0, readSize, offset)

        const patchResponse = await fetch(tusUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
            'Tus-Resumable': '1.0.0',
            'Upload-Offset': String(offset),
            'Content-Type': 'application/offset+octet-stream',
            'Content-Length': String(readSize),
          },
          body: buffer,
        })

        if (patchResponse.status !== 204) {
          log('❌', `청크 실패: offset=${offset}`)
          return null
        }

        const newOffset = patchResponse.headers.get('Upload-Offset')
        offset = newOffset ? parseInt(newOffset, 10) : offset + readSize

        const percent = Math.round((offset / fileSize) * 100)
        if (percent >= lastLogPercent + 5) {
          log('📤', `업로드: ${percent}%`)
          lastLogPercent = percent
        }
      }
    } finally {
      fs.closeSync(fd)
    }

    log('✅', `업로드 완료: ${uid}`)
    return uid

  } catch (err: any) {
    log('❌', `오류: ${err.message}`)
    return null
  }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📹 VOD 업로드 - 4화 명품데이')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    log('❌', 'Cloudflare 환경변수 없음')
    process.exit(1)
  }

  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })
  }

  const localPath = path.join(DOWNLOAD_DIR, TARGET.file)

  // 1. 다운로드
  if (fs.existsSync(localPath)) {
    log('📁', `파일 존재: ${formatSize(fs.statSync(localPath).size)}`)
  } else {
    const ok = await downloadFromGDrive(TARGET.file, localPath)
    if (!ok) process.exit(1)
  }

  // 2. 업로드
  const uid = await uploadToCloudflare(localPath, TARGET.title)
  if (!uid) process.exit(1)

  // 3. DB 저장
  const videoUrl = `https://customer-stream.cloudflarestream.com/${uid}/manifest/video.m3u8`
  const { error } = await supabase
    .from('media_content')
    .insert({
      title: TARGET.title,
      content_type: 'vod',
      video_url: videoUrl,
      cloudflare_uid: uid,
      episode_id: TARGET.episodeId,
    })

  if (error) {
    log('❌', `DB 실패: ${error.message}`)
  } else {
    log('✅', 'DB 저장 완료')
  }

  // 4. 로컬 삭제
  if (fs.existsSync(localPath)) {
    fs.unlinkSync(localPath)
    log('🗑️', '로컬 파일 삭제')
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log('🎉', '4화 업로드 완료!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(err => {
  log('❌', err.message)
  process.exit(1)
})
