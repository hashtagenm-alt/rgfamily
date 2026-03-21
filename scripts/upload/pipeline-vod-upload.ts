/**
 * VOD 파이프라인 최적화 업로드
 *
 * 압축하는 동안 다음 영상을 미리 다운로드하여 시간 단축
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │ 시간  │ 작업 1        │ 작업 2        │ 작업 3          │
 * ├───────┼───────────────┼───────────────┼─────────────────┤
 * │ 0분   │ 02화 다운로드 │               │                 │
 * │ 15분  │ 02화 압축     │ 03화 다운로드 │                 │
 * │ 60분  │ 02화 업로드   │ 03화 압축     │ 04화 다운로드   │
 * │ 70분  │               │ 03화 업로드   │ 04화 압축       │
 * │ ...   │               │               │                 │
 * └───────┴───────────────┴───────────────┴─────────────────┘
 *
 * 사용법:
 *   npx tsx scripts/pipeline-vod-upload.ts --start 2 --end 5
 *   npx tsx scripts/pipeline-vod-upload.ts --dry-run
 */

import { getServiceClient } from '../lib/supabase'
import { spawn, execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import dotenv from 'dotenv'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

const supabase = getServiceClient()

const GDRIVE_FOLDER_ID = '1SYjStc0DAk8NFIe8zj6ZHGd9TVtzfF9X'
const RCLONE_OPTS = ['--drive-root-folder-id=' + GDRIVE_FOLDER_ID]
const TEMP_DIR = path.join(os.tmpdir(), 'rg-vod-pipeline')
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

function log(prefix: string, message: string) {
  const time = new Date().toLocaleTimeString('ko-KR')
  console.log(`[${time}] ${prefix} ${message}`)
}

function rcloneLsJson(): any[] {
  try {
    const result = execSync(
      ['rclone', 'lsjson', 'gdrive:', ...RCLONE_OPTS].join(' '),
      { encoding: 'utf-8', timeout: 60000 }
    )
    return JSON.parse(result)
  } catch {
    return []
  }
}

// ============================================
// 다운로드 (비동기)
// ============================================

function downloadVideo(fileName: string, localPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = ['copy', `gdrive:${fileName}`, path.dirname(localPath), ...RCLONE_OPTS, '--progress', '--transfers', '4']
    const proc = spawn('rclone', args)

    let lastPercent = 0

    proc.stderr.on('data', (data) => {
      const match = data.toString().match(/(\d+)%/)
      if (match) {
        const percent = parseInt(match[1])
        if (percent > lastPercent + 5) {
          log('📥', `다운로드 ${percent}% - ${fileName}`)
          lastPercent = percent
        }
      }
    })

    proc.on('close', (code) => {
      if (code === 0) {
        log('✅', `다운로드 완료 - ${fileName}`)
        resolve()
      } else {
        reject(new Error(`다운로드 실패: ${code}`))
      }
    })

    proc.on('error', reject)
  })
}

// ============================================
// 압축 (비동기)
// ============================================

function compressVideo(inputPath: string, outputPath: string, estimatedDuration: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const targetBytes = TARGET_SIZE_GB * 1024 * 1024 * 1024
    const videoBitrate = Math.floor(((targetBytes - (128000 / 8 * estimatedDuration)) * 8) / estimatedDuration / 1000)

    log('🗜️', `압축 시작 (${(videoBitrate / 1000).toFixed(1)} Mbps) - ${path.basename(inputPath)}`)

    const args = [
      '-i', inputPath,
      '-c:v', 'h264_videotoolbox',
      '-b:v', `${videoBitrate}k`,
      '-profile:v', 'high',
      '-allow_sw', '0',
      '-realtime', '0',
      '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
      '-movflags', '+faststart',
      '-y', outputPath,
    ]

    const ffmpeg = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] })

    let lastPercent = 0

    ffmpeg.stderr.on('data', (data) => {
      const line = data.toString()
      const timeMatch = line.match(/time=(\d+):(\d+):(\d+)/)
      const speedMatch = line.match(/speed=\s*([\d.]+)x/)

      if (timeMatch && speedMatch) {
        const currentSecs = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3])
        const percent = Math.floor((currentSecs / estimatedDuration) * 100)

        if (percent > lastPercent + 5) {
          log('🗜️', `압축 ${percent}% (${speedMatch[1]}x) - ${path.basename(inputPath)}`)
          lastPercent = percent
        }
      }
    })

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        log('✅', `압축 완료 - ${path.basename(inputPath)}`)
        resolve()
      } else {
        reject(new Error(`압축 실패: ${code}`))
      }
    })

    ffmpeg.on('error', reject)
  })
}

// ============================================
// Cloudflare 업로드 (비동기)
// ============================================

async function uploadToCloudflare(filePath: string, title: string): Promise<string> {
  log('☁️', `업로드 시작 - ${title}`)

  const stats = fs.statSync(filePath)
  const fileSize = stats.size

  const initRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(fileSize),
        'Upload-Metadata': `name ${Buffer.from(title).toString('base64')}, maxDurationSeconds ${Buffer.from('21600').toString('base64')}`,
      },
    }
  )

  if (!initRes.ok) throw new Error(`TUS 초기화 실패`)

  const uploadUrl = initRes.headers.get('location')!
  const uid = initRes.headers.get('stream-media-id')!

  const chunkSize = 100 * 1024 * 1024
  const fd = fs.openSync(filePath, 'r')
  const buffer = Buffer.alloc(chunkSize)
  let offset = 0
  let lastPercent = 0

  try {
    while (offset < fileSize) {
      const bytesRead = fs.readSync(fd, buffer, 0, chunkSize, offset)
      const chunk = buffer.subarray(0, bytesRead)

      await fetch(uploadUrl, {
        method: 'PATCH',
        headers: {
          'Tus-Resumable': '1.0.0',
          'Upload-Offset': String(offset),
          'Content-Type': 'application/offset+octet-stream',
        },
        body: chunk,
      })

      offset += bytesRead
      const percent = Math.floor((offset / fileSize) * 100)

      if (percent > lastPercent + 10) {
        log('☁️', `업로드 ${percent}% - ${title}`)
        lastPercent = percent
      }
    }
  } finally {
    fs.closeSync(fd)
  }

  log('✅', `업로드 완료 (UID: ${uid}) - ${title}`)
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
  log('💾', `DB 저장 - ${title}`)
}

// ============================================
// 메인 파이프라인
// ============================================

async function main() {
  console.log('═'.repeat(60))
  console.log('🚀 VOD 파이프라인 최적화 업로드')
  console.log('   압축 중 다음 영상 미리 다운로드')
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

  // 파일 목록
  const files = rcloneLsJson()
    .filter((f: any) => !f.IsDir && f.Name.endsWith('.mp4'))
    .sort((a: any, b: any) => a.Name.localeCompare(b.Name))

  const episodePattern = /(\d{2})화/
  const episodes = files.filter((f: any) => {
    const match = f.Name.match(episodePattern)
    if (!match) return false
    const ep = parseInt(match[1])
    return ep >= startEp && ep <= endEp
  })

  console.log(`\n📂 처리 대상: ${episodes.length}개`)
  episodes.forEach((f: any, i: number) => {
    console.log(`   ${i + 1}. ${f.Name} (${formatSize(f.Size)})`)
  })

  if (dryRun) {
    console.log('\n🔍 [DRY RUN] 파이프라인 시뮬레이션:\n')

    for (let i = 0; i < episodes.length; i++) {
      const current = episodes[i]
      const next = episodes[i + 1]

      console.log(`━━━ 단계 ${i + 1} ━━━`)
      console.log(`  🗜️  압축: ${current.Name}`)
      if (next) {
        console.log(`  📥 동시 다운로드: ${next.Name}`)
      }
      console.log(`  ☁️  업로드: ${current.Name}`)
      console.log('')
    }
    return
  }

  const startTime = Date.now()
  let success = 0

  // 첫 번째 영상 다운로드
  const firstEp = episodes[0]
  const firstDownloadPath = path.join(TEMP_DIR, firstEp.Name)

  log('🚀', '파이프라인 시작')
  log('📥', `첫 번째 다운로드: ${firstEp.Name}`)

  await downloadVideo(firstEp.Name, firstDownloadPath)

  // 파이프라인 루프
  for (let i = 0; i < episodes.length; i++) {
    const current = episodes[i]
    const next = episodes[i + 1]
    const title = current.Name.replace('.mp4', '')

    const downloadPath = path.join(TEMP_DIR, current.Name)
    const compressedPath = path.join(TEMP_DIR, `${title}_compressed.mp4`)

    console.log('\n' + '═'.repeat(60))
    log('📺', `[${i + 1}/${episodes.length}] ${title}`)
    console.log('═'.repeat(60))

    try {
      // 병렬 작업: 현재 영상 압축 + 다음 영상 다운로드
      const tasks: Promise<any>[] = []

      // 현재 영상 압축
      tasks.push(compressVideo(downloadPath, compressedPath, 43200))

      // 다음 영상 다운로드 (있으면)
      if (next) {
        const nextDownloadPath = path.join(TEMP_DIR, next.Name)
        log('📥', `동시 다운로드 시작: ${next.Name}`)
        tasks.push(downloadVideo(next.Name, nextDownloadPath))
      }

      // 병렬 실행
      await Promise.all(tasks)

      // 다운로드 원본 삭제 (디스크 절약)
      fs.unlinkSync(downloadPath)
      log('🗑️', `원본 삭제: ${current.Name}`)

      // 압축 파일 크기 확인
      const compressedSize = fs.statSync(compressedPath).size
      log('📊', `압축 결과: ${formatSize(current.Size)} → ${formatSize(compressedSize)}`)

      // 업로드
      const uid = await uploadToCloudflare(compressedPath, title)

      // DB 저장
      await saveToDatabase(title, uid)

      // 압축 파일 삭제
      fs.unlinkSync(compressedPath)
      log('🗑️', `압축 파일 삭제`)

      success++

    } catch (err) {
      log('❌', `실패: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 최종 결과
  const totalElapsed = (Date.now() - startTime) / 1000

  console.log('\n' + '═'.repeat(60))
  console.log('📊 최종 결과')
  console.log('═'.repeat(60))
  console.log(`   ✅ 성공: ${success}/${episodes.length}개`)
  console.log(`   ⏱️  총 소요: ${formatDuration(totalElapsed)}`)
  console.log(`\n   ⏳ Cloudflare 인코딩 진행 중...`)
  console.log(`   https://dash.cloudflare.com/${CLOUDFLARE_ACCOUNT_ID}/stream`)
  console.log('═'.repeat(60))
}

main().catch(err => {
  console.error('\n❌ 오류:', err.message)
  process.exit(1)
})
