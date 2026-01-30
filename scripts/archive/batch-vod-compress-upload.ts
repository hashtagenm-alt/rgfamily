/**
 * VOD 배치 압축 + 업로드 (Google Drive → 압축 → Cloudflare)
 *
 * M4 Pro VideoToolbox 하드웨어 가속 사용
 *
 * 사용법:
 *   npx tsx scripts/batch-vod-compress-upload.ts --dry-run
 *   npx tsx scripts/batch-vod-compress-upload.ts --start 2 --end 5
 *   npx tsx scripts/batch-vod-compress-upload.ts
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

// Google Drive 폴더 ID (엑셀부 VOD)
const GDRIVE_FOLDER_ID = '1SYjStc0DAk8NFIe8zj6ZHGd9TVtzfF9X'
const RCLONE_BASE = 'gdrive:'
const RCLONE_OPTS = ['--drive-root-folder-id=' + GDRIVE_FOLDER_ID]

// 임시 폴더 (SSD 권장)
const TEMP_DIR = path.join(os.tmpdir(), 'rg-vod-batch')

// 압축 설정
const TARGET_SIZE_GB = 28 // Cloudflare 30GB 제한 대비 여유
const CODEC = 'h264' // h264_videotoolbox (hevc도 가능)

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

function getVideoDuration(filePath: string): number {
  try {
    const result = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: 'utf-8' }
    )
    return parseFloat(result.trim())
  } catch {
    return 43200 // 기본 12시간
  }
}

// ============================================
// rclone
// ============================================

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

async function rcloneDownload(fileName: string, localPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n   📥 다운로드: ${fileName}`)

    const args = ['copy', `${RCLONE_BASE}${fileName}`, path.dirname(localPath), ...RCLONE_OPTS, '--progress']
    const proc = spawn('rclone', args)

    let lastLog = Date.now()

    proc.stderr.on('data', (data) => {
      const line = data.toString()
      if (Date.now() - lastLog > 2000 && line.includes('%')) {
        const match = line.match(/(\d+)%/)
        if (match) {
          process.stdout.write(`\r   📥 다운로드: ${match[1]}%`)
          lastLog = Date.now()
        }
      }
    })

    proc.on('close', (code) => {
      if (code === 0) {
        console.log('\r   ✅ 다운로드 완료          ')
        resolve()
      } else {
        reject(new Error(`rclone 실패: ${code}`))
      }
    })

    proc.on('error', reject)
  })
}

// ============================================
// 압축 (VideoToolbox)
// ============================================

async function compressVideo(input: string, output: string, duration: number): Promise<void> {
  console.log(`\n   🗜️  압축 시작 (VideoToolbox ${CODEC})...`)

  // 목표 비트레이트 계산
  const targetBytes = TARGET_SIZE_GB * 1024 * 1024 * 1024
  const audioBitrate = 128 * 1000
  const audioBytes = (audioBitrate / 8) * duration
  const videoBitrate = Math.floor(((targetBytes - audioBytes) * 8) / duration / 1000)

  console.log(`   목표 비트레이트: ${(videoBitrate / 1000).toFixed(1)} Mbps`)

  const encoder = CODEC === 'hevc' ? 'hevc_videotoolbox' : 'h264_videotoolbox'

  const ffmpegArgs = [
    '-i', input,
    '-c:v', encoder,
    '-b:v', `${videoBitrate}k`,
    '-profile:v', CODEC === 'hevc' ? 'main' : 'high',
    '-allow_sw', '0',
    '-realtime', '0',
    '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
    '-movflags', '+faststart',
    '-y', output,
  ]

  const startTime = Date.now()

  await new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'pipe', 'pipe'] })

    ffmpeg.stderr.on('data', (data) => {
      const line = data.toString()
      const timeMatch = line.match(/time=(\d+):(\d+):(\d+)/)
      const speedMatch = line.match(/speed=\s*([\d.]+)x/)

      if (timeMatch && speedMatch) {
        const currentSecs = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3])
        const percent = Math.min((currentSecs / duration) * 100, 100).toFixed(1)
        const speed = speedMatch[1]
        const eta = (duration - currentSecs) / parseFloat(speed)

        process.stdout.write(`\r   🗜️  압축: ${percent}% | ${speed}x | ETA: ${formatDuration(eta)}   `)
      }
    })

    ffmpeg.on('close', (code) => {
      const elapsed = (Date.now() - startTime) / 1000
      console.log(`\n   ✅ 압축 완료 (${formatDuration(elapsed)})`)
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg 종료: ${code}`))
    })

    ffmpeg.on('error', reject)
  })
}

// ============================================
// Cloudflare 업로드
// ============================================

async function uploadToCloudflare(filePath: string, title: string): Promise<string> {
  console.log(`\n   ☁️  Cloudflare 업로드 시작...`)

  const stats = fs.statSync(filePath)
  const fileSize = stats.size

  console.log(`   파일 크기: ${formatSize(fileSize)}`)

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
    throw new Error(`TUS 초기화 실패: ${await initRes.text()}`)
  }

  const uploadUrl = initRes.headers.get('location')!
  const uid = initRes.headers.get('stream-media-id')!

  console.log(`   UID: ${uid}`)

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

      let retries = 3
      while (retries > 0) {
        try {
          const patchRes = await fetch(uploadUrl, {
            method: 'PATCH',
            headers: {
              'Tus-Resumable': '1.0.0',
              'Upload-Offset': String(offset),
              'Content-Type': 'application/offset+octet-stream',
            },
            body: chunk,
          })

          if (!patchRes.ok) throw new Error(`HTTP ${patchRes.status}`)
          break
        } catch (e) {
          retries--
          if (retries === 0) throw e
          console.log(`\n   ⚠️  재시도...`)
          await new Promise(r => setTimeout(r, 3000))
        }
      }

      offset += bytesRead
      const percent = Math.round((offset / fileSize) * 100)
      const elapsed = (Date.now() - startTime) / 1000
      const speed = offset / elapsed / 1024 / 1024
      const eta = (fileSize - offset) / (speed * 1024 * 1024)

      process.stdout.write(`\r   ☁️  업로드: ${percent}% | ${speed.toFixed(1)} MB/s | ETA: ${formatDuration(eta)}   `)
    }
  } finally {
    fs.closeSync(fd)
  }

  console.log(`\n   ✅ 업로드 완료`)

  return uid
}

// ============================================
// DB 저장
// ============================================

async function saveToDatabase(title: string, cloudflareUid: string) {
  const videoUrl = `https://iframe.videodelivery.net/${cloudflareUid}`
  const thumbnailUrl = `https://videodelivery.net/${cloudflareUid}/thumbnails/thumbnail.jpg?width=640&height=360&fit=crop`

  const { data: existing } = await supabase
    .from('media_content')
    .select('id')
    .eq('title', title)
    .limit(1)

  if (existing && existing.length > 0) {
    await supabase
      .from('media_content')
      .update({ cloudflare_uid: cloudflareUid, video_url: videoUrl, thumbnail_url: thumbnailUrl })
      .eq('id', existing[0].id)
    console.log(`   💾 DB 업데이트 (ID: ${existing[0].id})`)
  } else {
    const { data } = await supabase
      .from('media_content')
      .insert({
        content_type: 'vod',
        title,
        video_url: videoUrl,
        cloudflare_uid: cloudflareUid,
        thumbnail_url: thumbnailUrl,
        unit: 'excel',
        is_featured: false,
        view_count: 0,
      })
      .select()
      .single()
    console.log(`   💾 DB 저장 (ID: ${data?.id})`)
  }
}

// ============================================
// 메인
// ============================================

async function main() {
  console.log('═'.repeat(60))
  console.log('🎬 VOD 배치 압축 + 업로드 (M4 Pro VideoToolbox)')
  console.log('═'.repeat(60))

  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const startIdx = args.indexOf('--start')
  const endIdx = args.indexOf('--end')
  const startEp = startIdx !== -1 ? parseInt(args[startIdx + 1]) : 2
  const endEp = endIdx !== -1 ? parseInt(args[endIdx + 1]) : 5

  console.log(`\n📋 설정:`)
  console.log(`   처리 대상: ${startEp}화 ~ ${endEp}화`)
  console.log(`   목표 크기: ${TARGET_SIZE_GB}GB`)
  console.log(`   코덱: ${CODEC}_videotoolbox`)

  // 임시 폴더 생성
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }

  // 파일 목록 조회
  console.log('\n📂 Google Drive 스캔 중...')
  const files = rcloneLsJson()
    .filter((f: any) => !f.IsDir && f.Name.endsWith('.mp4'))
    .sort((a: any, b: any) => a.Name.localeCompare(b.Name))

  console.log(`   ${files.length}개 영상 발견\n`)

  // 에피소드 필터링 (예: 02화, 03화 등)
  const episodePattern = /(\d{2})화/
  const toProcess = files.filter((f: any) => {
    const match = f.Name.match(episodePattern)
    if (!match) return false
    const ep = parseInt(match[1])
    return ep >= startEp && ep <= endEp
  })

  console.log('📋 처리 대상:')
  toProcess.forEach((f: any, i: number) => {
    console.log(`   ${i + 1}. ${f.Name} (${formatSize(f.Size)})`)
  })

  if (dryRun) {
    console.log('\n🔍 [DRY RUN] 실행하지 않음')
    return
  }

  if (toProcess.length === 0) {
    console.log('\n⚠️  처리할 에피소드가 없습니다.')
    return
  }

  // 배치 처리
  const totalStartTime = Date.now()
  let success = 0
  let failed = 0

  for (let i = 0; i < toProcess.length; i++) {
    const file = toProcess[i]
    const title = file.Name.replace('.mp4', '')

    console.log('\n' + '═'.repeat(60))
    console.log(`📺 [${i + 1}/${toProcess.length}] ${title}`)
    console.log(`   원본 크기: ${formatSize(file.Size)}`)
    console.log('═'.repeat(60))

    const downloadPath = path.join(TEMP_DIR, file.Name)
    const compressedPath = path.join(TEMP_DIR, `${Date.now()}_compressed.mp4`)

    try {
      // 1. 다운로드
      await rcloneDownload(file.Name, downloadPath)

      // 2. 영상 정보
      const duration = getVideoDuration(downloadPath)
      console.log(`   영상 길이: ${formatDuration(duration)}`)

      // 3. 압축
      await compressVideo(downloadPath, compressedPath, duration)

      const compressedSize = fs.statSync(compressedPath).size
      console.log(`   압축 결과: ${formatSize(file.Size)} → ${formatSize(compressedSize)}`)

      // 다운로드 파일 삭제 (디스크 절약)
      fs.unlinkSync(downloadPath)

      // 4. Cloudflare 업로드
      const uid = await uploadToCloudflare(compressedPath, title)

      // 5. DB 저장
      await saveToDatabase(title, uid)

      success++
      console.log(`\n   ✅ ${title} 완료!`)

    } catch (err) {
      console.error(`\n   ❌ 실패: ${err instanceof Error ? err.message : String(err)}`)
      failed++
    } finally {
      // 임시 파일 정리
      try { fs.existsSync(downloadPath) && fs.unlinkSync(downloadPath) } catch {}
      try { fs.existsSync(compressedPath) && fs.unlinkSync(compressedPath) } catch {}
    }
  }

  // 최종 결과
  const totalElapsed = (Date.now() - totalStartTime) / 1000

  console.log('\n' + '═'.repeat(60))
  console.log('📊 최종 결과')
  console.log('═'.repeat(60))
  console.log(`   ✅ 성공: ${success}개`)
  console.log(`   ❌ 실패: ${failed}개`)
  console.log(`   ⏱️  총 소요 시간: ${formatDuration(totalElapsed)}`)

  if (success > 0) {
    console.log(`\n   ⏳ Cloudflare 인코딩 진행 중...`)
    console.log(`   https://dash.cloudflare.com/${CLOUDFLARE_ACCOUNT_ID}/stream`)
  }

  console.log('═'.repeat(60))
}

main().catch(err => {
  console.error('\n❌ 오류:', err.message)
  process.exit(1)
})
