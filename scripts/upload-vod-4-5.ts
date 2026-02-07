#!/usr/bin/env npx tsx
/**
 * 4화, 5화 VOD 업로드 스크립트
 *
 * Google Drive → 로컬 다운로드 → Cloudflare Stream 업로드
 *
 * 사용법:
 *   npx tsx scripts/upload-vod-4-5.ts
 *   npx tsx scripts/upload-vod-4-5.ts --dry-run
 */

import { getServiceClient } from './lib/supabase'
import { execSync, spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const supabase = getServiceClient()

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

const GDRIVE_FOLDER_ID = '18TWcpi2Yp3mUbDJywyKPT-AVaP1cucv-'
const DOWNLOAD_DIR = path.join(process.cwd(), 'scripts/downloads/vod')
const DRY_RUN = process.argv.includes('--dry-run')

// 업로드 대상
const TARGET_EPISODES = [
  { episode: 4, file: '엑셀부 시즌1_04화 명품데이.mp4', title: '[RG FAMILY] 시즌1 / 04화!', episodeId: 15 },
  { episode: 5, file: '엑셀부 시즌1_05화 3 vs 9.mp4', title: '[RG FAMILY] 시즌1 / 05화!', episodeId: 16 },
]

function log(emoji: string, msg: string) {
  console.log(`[${new Date().toLocaleTimeString('ko-KR')}] ${emoji} ${msg}`)
}

function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

// rclone으로 다운로드
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

    if (DRY_RUN) {
      log('🔍', `[DRY-RUN] rclone ${args.join(' ')}`)
      resolve(true)
      return
    }

    const proc = spawn('rclone', args)
    let lastLog = Date.now()

    proc.stderr.on('data', (data) => {
      const str = data.toString()
      // 10초마다 진행률 출력
      if (Date.now() - lastLog > 10000) {
        const match = str.match(/(\d+)%/)
        if (match) {
          log('📥', `다운로드 진행: ${match[1]}%`)
          lastLog = Date.now()
        }
      }
    })

    proc.on('close', (code) => {
      if (code === 0) {
        log('✅', `다운로드 완료: ${fileName}`)
        resolve(true)
      } else {
        log('❌', `다운로드 실패: ${fileName} (code: ${code})`)
        resolve(false)
      }
    })

    proc.on('error', (err) => {
      log('❌', `다운로드 오류: ${err.message}`)
      resolve(false)
    })
  })
}

// TUS 프로토콜로 Cloudflare 업로드
async function uploadToCloudflare(filePath: string, title: string): Promise<string | null> {
  const fileSize = fs.statSync(filePath).size
  log('☁️', `Cloudflare 업로드 시작: ${title} (${formatSize(fileSize)})`)

  if (DRY_RUN) {
    log('🔍', `[DRY-RUN] TUS 업로드: ${filePath}`)
    return 'dry-run-uid'
  }

  try {
    // 1. TUS 세션 생성
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
      const errText = await createResponse.text()
      log('❌', `TUS 세션 생성 실패: ${createResponse.status} - ${errText}`)
      return null
    }

    const tusUrl = createResponse.headers.get('Location')
    const uid = createResponse.headers.get('stream-media-id') ||
                tusUrl?.match(/\/([a-f0-9]{32})\??/)?.[1] || ''

    if (!tusUrl) {
      log('❌', 'TUS URL을 받지 못했습니다')
      return null
    }

    log('📤', `TUS 세션 생성됨: ${uid}`)

    // 2. 청크 업로드 (50MB 단위)
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
          const errText = await patchResponse.text()
          log('❌', `청크 업로드 실패: offset=${offset}, ${patchResponse.status} - ${errText}`)
          return null
        }

        const newOffset = patchResponse.headers.get('Upload-Offset')
        offset = newOffset ? parseInt(newOffset, 10) : offset + readSize

        const percent = Math.round((offset / fileSize) * 100)
        if (percent >= lastLogPercent + 5) {
          log('📤', `업로드 진행: ${percent}% (${formatSize(offset)} / ${formatSize(fileSize)})`)
          lastLogPercent = percent
        }
      }
    } finally {
      fs.closeSync(fd)
    }

    log('✅', `Cloudflare 업로드 완료: ${uid}`)
    return uid

  } catch (err: any) {
    log('❌', `업로드 오류: ${err.message}`)
    return null
  }
}

// DB에 저장
async function saveToDatabase(episodeId: number, title: string, uid: string): Promise<boolean> {
  if (DRY_RUN) {
    log('🔍', `[DRY-RUN] DB 저장: episode_id=${episodeId}, uid=${uid}`)
    return true
  }

  const videoUrl = `https://customer-stream.cloudflarestream.com/${uid}/manifest/video.m3u8`

  const { error } = await supabase
    .from('media_content')
    .insert({
      title,
      content_type: 'vod',
      video_url: videoUrl,
      cloudflare_uid: uid,
      episode_id: episodeId,
    })

  if (error) {
    log('❌', `DB 저장 실패: ${error.message}`)
    return false
  }

  log('✅', `DB 저장 완료: ${title}`)
  return true
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📹 VOD 업로드 (4화, 5화)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (DRY_RUN) {
    console.log('🔍 DRY-RUN 모드 (실제 업로드 없음)\n')
  }

  // 환경변수 확인
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    log('❌', 'Cloudflare 환경변수가 설정되지 않았습니다')
    process.exit(1)
  }

  // 다운로드 폴더 생성
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })
  }

  for (const target of TARGET_EPISODES) {
    console.log(`\n${'─'.repeat(55)}`)
    log('🎬', `${target.episode}화 처리 시작: ${target.file}`)
    console.log('─'.repeat(55))

    const localPath = path.join(DOWNLOAD_DIR, target.file)

    // 1. 다운로드 (이미 있으면 스킵)
    if (fs.existsSync(localPath)) {
      const size = fs.statSync(localPath).size
      log('📁', `파일 존재: ${formatSize(size)}`)
    } else {
      const downloaded = await downloadFromGDrive(target.file, localPath)
      if (!downloaded) {
        log('⏭️', `${target.episode}화 스킵 (다운로드 실패)`)
        continue
      }
    }

    // DRY-RUN이면 파일 없이 진행
    if (DRY_RUN) {
      log('🔍', `[DRY-RUN] Cloudflare 업로드: ${target.title}`)
      log('🔍', `[DRY-RUN] DB 저장: episode_id=${target.episodeId}`)
      log('🎉', `[DRY-RUN] ${target.episode}화 완료!`)
      continue
    }

    // 2. Cloudflare 업로드
    const uid = await uploadToCloudflare(localPath, target.title)
    if (!uid) {
      log('⏭️', `${target.episode}화 스킵 (업로드 실패)`)
      continue
    }

    // 3. DB 저장
    await saveToDatabase(target.episodeId, target.title, uid)

    // 4. 로컬 파일 삭제 (용량 절약)
    if (!DRY_RUN && fs.existsSync(localPath)) {
      log('🗑️', '로컬 파일 삭제 (용량 절약)')
      fs.unlinkSync(localPath)
    }

    log('🎉', `${target.episode}화 완료!`)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  log('✅', '모든 작업 완료')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(err => {
  log('❌', `오류: ${err.message}`)
  process.exit(1)
})
