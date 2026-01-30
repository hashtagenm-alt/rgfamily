/**
 * VOD 스트리밍 압축 + 업로드 (디스크 절약 버전)
 *
 * 다운로드와 압축을 동시에 진행 (파이프라인)
 * - 다운로드: rclone cat → 메모리 스트림
 * - 압축: FFmpeg가 스트림에서 직접 읽음
 * - 저장: 압축된 파일만 디스크에 저장 (28GB)
 * - 업로드: 압축 완료 후 Cloudflare로 전송
 *
 * 디스크 사용량: 80GB → 28GB (66% 절약)
 *
 * 사용법:
 *   npx tsx scripts/stream-compress-upload-vod.ts --start 2 --end 5
 *   npx tsx scripts/stream-compress-upload-vod.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import { spawn, execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const GDRIVE_FOLDER_ID = '1SYjStc0DAk8NFIe8zj6ZHGd9TVtzfF9X'
const RCLONE_BASE = 'gdrive:'
const RCLONE_OPTS = ['--drive-root-folder-id=' + GDRIVE_FOLDER_ID]

const TEMP_DIR = path.join(os.tmpdir(), 'rg-vod-stream')
const TARGET_SIZE_GB = 28

// ============================================
// 유틸리티
// ============================================

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

function rcloneLsJson(): any[] {
  try {
    const result = execSync(
      ['rclone', 'lsjson', RCLONE_BASE, ...RCLONE_OPTS].join(' '),
      { encoding: 'utf-8', timeout: 60000 }
    )
    return JSON.parse(result)
  } catch {
    return []
  }
}

// ============================================
// 스트리밍 다운로드 + 압축 (파이프라인)
// ============================================

async function streamCompressVideo(
  fileName: string,
  outputPath: string,
  originalSize: number,
  estimatedDuration: number
): Promise<void> {
  console.log(`\n   🔄 스트리밍 압축 시작 (다운로드 + 압축 동시 진행)`)
  console.log(`   원본: ${formatSize(originalSize)} → 목표: ${TARGET_SIZE_GB}GB`)

  // 목표 비트레이트 계산
  const targetBytes = TARGET_SIZE_GB * 1024 * 1024 * 1024
  const audioBitrate = 128 * 1000
  const audioBytes = (audioBitrate / 8) * estimatedDuration
  const videoBitrate = Math.floor(((targetBytes - audioBytes) * 8) / estimatedDuration / 1000)

  console.log(`   비트레이트: ${(videoBitrate / 1000).toFixed(1)} Mbps`)

  const startTime = Date.now()

  await new Promise<void>((resolve, reject) => {
    // 1. rclone cat: Google Drive에서 스트리밍 다운로드
    const rclone = spawn('rclone', [
      'cat',
      `${RCLONE_BASE}${fileName}`,
      ...RCLONE_OPTS,
    ])

    // 2. FFmpeg: stdin에서 읽어서 압축
    const ffmpeg = spawn('ffmpeg', [
      '-i', 'pipe:0',           // stdin에서 입력
      '-c:v', 'h264_videotoolbox',
      '-b:v', `${videoBitrate}k`,
      '-profile:v', 'high',
      '-allow_sw', '0',
      '-realtime', '0',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ac', '2',
      '-movflags', '+faststart',
      '-y',
      outputPath,
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    // rclone stdout → ffmpeg stdin (파이프 연결)
    rclone.stdout.pipe(ffmpeg.stdin)

    // 다운로드 진행률
    let downloadedBytes = 0
    rclone.stdout.on('data', (chunk) => {
      downloadedBytes += chunk.length
    })

    // 압축 진행률
    ffmpeg.stderr.on('data', (data) => {
      const line = data.toString()
      const timeMatch = line.match(/time=(\d+):(\d+):(\d+)/)
      const speedMatch = line.match(/speed=\s*([\d.]+)x/)

      if (timeMatch && speedMatch) {
        const currentSecs = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3])
        const percent = Math.min((currentSecs / estimatedDuration) * 100, 100).toFixed(1)
        const speed = speedMatch[1]
        const dlPercent = Math.min((downloadedBytes / originalSize) * 100, 100).toFixed(1)

        process.stdout.write(`\r   📥 다운: ${dlPercent}% | 🗜️ 압축: ${percent}% | ⚡ ${speed}x   `)
      }
    })

    // 에러 처리
    rclone.on('error', (err) => {
      ffmpeg.kill()
      reject(new Error(`rclone 오류: ${err.message}`))
    })

    ffmpeg.on('error', (err) => {
      rclone.kill()
      reject(new Error(`FFmpeg 오류: ${err.message}`))
    })

    rclone.on('close', (code) => {
      if (code !== 0) {
        ffmpeg.kill()
        reject(new Error(`rclone 종료: ${code}`))
      }
    })

    ffmpeg.on('close', (code) => {
      const elapsed = (Date.now() - startTime) / 1000
      console.log(`\n   ✅ 완료 (${formatDuration(elapsed)})`)

      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`FFmpeg 종료: ${code}`))
      }
    })
  })
}

// ============================================
// Cloudflare 업로드
// ============================================

async function uploadToCloudflare(filePath: string, title: string): Promise<string> {
  console.log(`\n   ☁️  Cloudflare 업로드...`)

  const stats = fs.statSync(filePath)
  const fileSize = stats.size

  console.log(`   크기: ${formatSize(fileSize)}`)

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

  if (!initRes.ok) throw new Error(`TUS 초기화 실패`)

  const uploadUrl = initRes.headers.get('location')!
  const uid = initRes.headers.get('stream-media-id')!

  // 청크 업로드
  const chunkSize = 100 * 1024 * 1024
  const fd = fs.openSync(filePath, 'r')
  const buffer = Buffer.alloc(chunkSize)
  let offset = 0
  const startTime = Date.now()

  try {
    while (offset < fileSize) {
      const bytesRead = fs.readSync(fd, buffer, 0, chunkSize, offset)
      const chunk = buffer.subarray(0, bytesRead)

      const patchRes = await fetch(uploadUrl, {
        method: 'PATCH',
        headers: {
          'Tus-Resumable': '1.0.0',
          'Upload-Offset': String(offset),
          'Content-Type': 'application/offset+octet-stream',
        },
        body: chunk,
      })

      if (!patchRes.ok) throw new Error(`업로드 실패: ${patchRes.status}`)

      offset += bytesRead
      const percent = Math.round((offset / fileSize) * 100)
      const elapsed = (Date.now() - startTime) / 1000
      const speed = offset / elapsed / 1024 / 1024

      process.stdout.write(`\r   ☁️  업로드: ${percent}% | ${speed.toFixed(1)} MB/s   `)
    }
  } finally {
    fs.closeSync(fd)
  }

  console.log(`\n   ✅ 업로드 완료 (UID: ${uid})`)
  return uid
}

// ============================================
// DB 저장
// ============================================

async function saveToDatabase(title: string, cloudflareUid: string) {
  const videoUrl = `https://iframe.videodelivery.net/${cloudflareUid}`
  const thumbnailUrl = `https://videodelivery.net/${cloudflareUid}/thumbnails/thumbnail.jpg`

  const { data: existing } = await supabase
    .from('media_content')
    .select('id')
    .eq('title', title)
    .limit(1)

  if (existing?.length) {
    await supabase
      .from('media_content')
      .update({ cloudflare_uid: cloudflareUid, video_url: videoUrl, thumbnail_url: thumbnailUrl })
      .eq('id', existing[0].id)
  } else {
    await supabase.from('media_content').insert({
      content_type: 'vod',
      title,
      video_url: videoUrl,
      cloudflare_uid: cloudflareUid,
      thumbnail_url: thumbnailUrl,
      unit: 'excel',
      is_featured: false,
      view_count: 0,
    })
  }
  console.log(`   💾 DB 저장 완료`)
}

// ============================================
// 메인
// ============================================

async function main() {
  console.log('═'.repeat(60))
  console.log('🚀 VOD 스트리밍 압축 + 업로드 (디스크 절약 버전)')
  console.log('   다운로드 + 압축 동시 진행 (파이프라인)')
  console.log('═'.repeat(60))

  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const startIdx = args.indexOf('--start')
  const endIdx = args.indexOf('--end')
  const startEp = startIdx !== -1 ? parseInt(args[startIdx + 1]) : 2
  const endEp = endIdx !== -1 ? parseInt(args[endIdx + 1]) : 5

  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }

  console.log(`\n📋 설정: ${startEp}화 ~ ${endEp}화, 목표 ${TARGET_SIZE_GB}GB`)

  const files = rcloneLsJson()
    .filter((f: any) => !f.IsDir && f.Name.endsWith('.mp4'))
    .sort((a: any, b: any) => a.Name.localeCompare(b.Name))

  const episodePattern = /(\d{2})화/
  const toProcess = files.filter((f: any) => {
    const match = f.Name.match(episodePattern)
    if (!match) return false
    const ep = parseInt(match[1])
    return ep >= startEp && ep <= endEp
  })

  console.log(`\n📂 처리 대상: ${toProcess.length}개`)
  toProcess.forEach((f: any, i: number) => {
    console.log(`   ${i + 1}. ${f.Name} (${formatSize(f.Size)})`)
  })

  // 디스크 절약량 계산
  const totalOriginal = toProcess.reduce((sum: number, f: any) => sum + f.Size, 0)
  const totalCompressed = toProcess.length * TARGET_SIZE_GB * 1024 * 1024 * 1024
  console.log(`\n💾 디스크 사용량:`)
  console.log(`   기존 방식: ${formatSize(totalOriginal + totalCompressed)} (다운로드+압축)`)
  console.log(`   스트리밍: ${formatSize(totalCompressed)} (압축 파일만)`)
  console.log(`   절약: ${formatSize(totalOriginal)} (${((totalOriginal / (totalOriginal + totalCompressed)) * 100).toFixed(0)}%)`)

  if (dryRun) {
    console.log('\n🔍 [DRY RUN] 실행하지 않음')
    return
  }

  const totalStartTime = Date.now()
  let success = 0

  for (let i = 0; i < toProcess.length; i++) {
    const file = toProcess[i]
    const title = file.Name.replace('.mp4', '')
    const outputPath = path.join(TEMP_DIR, `${Date.now()}_compressed.mp4`)

    // 예상 영상 길이 (12시간 = 43200초)
    const estimatedDuration = 43200

    console.log('\n' + '═'.repeat(60))
    console.log(`📺 [${i + 1}/${toProcess.length}] ${title}`)
    console.log('═'.repeat(60))

    try {
      // 1. 스트리밍 다운로드 + 압축 (동시)
      await streamCompressVideo(file.Name, outputPath, file.Size, estimatedDuration)

      // 2. 업로드
      const uid = await uploadToCloudflare(outputPath, title)

      // 3. DB 저장
      await saveToDatabase(title, uid)

      success++
    } catch (err) {
      console.error(`\n   ❌ 실패: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      try { fs.existsSync(outputPath) && fs.unlinkSync(outputPath) } catch {}
    }
  }

  const totalElapsed = (Date.now() - totalStartTime) / 1000

  console.log('\n' + '═'.repeat(60))
  console.log(`✅ 완료: ${success}/${toProcess.length}개 | 소요: ${formatDuration(totalElapsed)}`)
  console.log('═'.repeat(60))
}

main().catch(console.error)
