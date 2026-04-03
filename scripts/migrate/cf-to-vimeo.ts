/**
 * Cloudflare Stream -> Vimeo 마이그레이션 스크립트
 *
 * 백업 파일에서 cloudflare_uid를 읽어 Cloudflare에서 다운로드 후 Vimeo에 업로드.
 * 완료된 항목은 cf-vimeo-mapping.json에 저장하여 중단 후 재개 가능.
 *
 * 사용법:
 *   npx tsx scripts/migrate/cf-to-vimeo.ts
 *   npx tsx scripts/migrate/cf-to-vimeo.ts --dry-run
 *   npx tsx scripts/migrate/cf-to-vimeo.ts --table signature_videos
 *   npx tsx scripts/migrate/cf-to-vimeo.ts --table media_content
 *
 * 환경변수:
 *   .env.local에서 자동 로드
 *   VIMEO_ACCESS_TOKEN=7edb04f53f678528c04677fcb23f5dd6
 *
 * 대상 Supabase:
 *   https://yrhilxqwryvavookoqxu.supabase.co (새 DB)
 */

import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'
import * as os from 'os'
import { execSync } from 'child_process'
import { createClient } from '@supabase/supabase-js'
import * as tus from 'tus-js-client'

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// ============================================================
// 환경변수
// ============================================================
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!
const VIMEO_ACCESS_TOKEN = process.env.VIMEO_ACCESS_TOKEN ?? '7edb04f53f678528c04677fcb23f5dd6'

// 새 Supabase (마이그레이션 대상)
const NEW_SUPABASE_URL = 'https://yrhilxqwryvavookoqxu.supabase.co'
const NEW_SUPABASE_SERVICE_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY ?? 'sb_secret_AGAFkHk1AezPMg_5zglzHQ_1ogrhJ4l'

// ============================================================
// 설정
// ============================================================
const BACKUP_DIR = path.resolve(process.cwd(), 'backups/2026-03-26-full')
const MAPPING_FILE = path.resolve(__dirname, 'cf-vimeo-mapping.json')
const TEMP_DIR = path.join(os.tmpdir(), 'cf-vimeo-migrate')
const BATCH_SIZE = 5
const MAX_RETRY = 3
const RETRY_DELAY_MS = 5000

// FFmpeg 압축 설정 (H.265, CRF 28 = 고품질 + 작은 용량)
// CRF: 낮을수록 고화질 (18~28 권장, 28 = 스트리밍 최적)
const FFMPEG_CRF = 28

// ============================================================
// 타입 정의
// ============================================================
interface SignatureVideo {
  id: number
  signature_id: number
  member_id: number
  video_url: string
  created_at: string
  cloudflare_uid: string
  is_published: boolean
  title?: string
}

interface MediaContent {
  id: number
  content_type: 'vod' | 'shorts'
  title: string
  description: string | null
  thumbnail_url: string | null
  video_url: string
  unit: string
  duration: number
  view_count: number
  is_featured: boolean
  created_at: string
  cloudflare_uid: string
  parent_id: number | null
  part_number: number | null
  total_parts: number | null
  is_published: boolean
}

interface MigrateItem {
  source: 'signature_videos' | 'media_content'
  recordId: number
  cloudflareUid: string
  title: string
}

interface MappingEntry {
  vimeoId: string
  vimeoUrl: string
  migratedAt: string
  source: string
  recordId: number
  title: string
}

type MappingFile = Record<string, MappingEntry>

// ============================================================
// 매핑 파일 로드/저장
// ============================================================
function loadMapping(): MappingFile {
  if (fs.existsSync(MAPPING_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf-8'))
    } catch {
      console.warn('⚠️  매핑 파일 파싱 실패. 새로 시작합니다.')
    }
  }
  return {}
}

function saveMapping(mapping: MappingFile): void {
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2), 'utf-8')
}

// ============================================================
// Cloudflare Stream: 다운로드 URL 가져오기
// ============================================================
async function getCloudflareDownloadUrl(uid: string): Promise<string> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${uid}/downloads`

  // MP4 생성 요청 (이미 있으면 무시)
  await fetchJson(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  }).catch(() => {})

  // ready 될 때까지 폴링
  for (let i = 0; i < 60; i++) {
    const res = await fetchJson(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` },
    })
    const status = res.result?.default?.status
    const dlUrl = res.result?.default?.url
    if (status === 'ready' && dlUrl) return dlUrl
    if (status === 'error') throw new Error(`Cloudflare MP4 생성 실패: uid=${uid}`)
    process.stdout.write(`\r  ⏳ MP4 생성 중... (${status}, ${i * 10}초 경과)`)
    await sleep(10000)
  }
  throw new Error(`Cloudflare MP4 생성 타임아웃: uid=${uid}`)
}

// ============================================================
// Cloudflare Stream: 파일 다운로드
// ============================================================
async function downloadCloudflareVideo(uid: string, destPath: string): Promise<number> {
  const downloadUrl = await getCloudflareDownloadUrl(uid)

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)

    const request = (downloadUrl.startsWith('https://') ? https : http).get(downloadUrl, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        // 리다이렉트 처리
        file.close()
        fs.unlinkSync(destPath)
        const redirectUrl = res.headers.location!
        const redirectFile = fs.createWriteStream(destPath)
        https.get(redirectUrl, (redirectRes) => {
          redirectRes.pipe(redirectFile)
          redirectFile.on('finish', () => {
            redirectFile.close()
            const stat = fs.statSync(destPath)
            resolve(stat.size)
          })
          redirectFile.on('error', reject)
        }).on('error', reject)
        return
      }

      if (res.statusCode !== 200) {
        file.close()
        fs.unlink(destPath, () => {})
        reject(new Error(`다운로드 실패: HTTP ${res.statusCode}`))
        return
      }

      res.pipe(file)
      file.on('finish', () => {
        file.close()
        const stat = fs.statSync(destPath)
        resolve(stat.size)
      })
    })

    request.on('error', (err) => {
      fs.unlink(destPath, () => {})
      reject(err)
    })

    file.on('error', (err) => {
      fs.unlink(destPath, () => {})
      reject(err)
    })
  })
}

// ============================================================
// FFmpeg: H.265 압축
// ============================================================
function compressVideo(inputPath: string, outputPath: string): number {
  console.log(`  🗜️  FFmpeg 압축 중 (H.265, CRF ${FFMPEG_CRF})...`)
  const start = Date.now()

  execSync(
    `ffmpeg -y -i "${inputPath}" -c:v libx265 -crf ${FFMPEG_CRF} -preset fast -c:a aac -b:a 128k -movflags +faststart "${outputPath}" 2>/dev/null`,
    { stdio: 'pipe' }
  )

  const elapsed = ((Date.now() - start) / 1000).toFixed(0)
  const origSize = fs.statSync(inputPath).size
  const compSize = fs.statSync(outputPath).size
  const ratio = ((1 - compSize / origSize) * 100).toFixed(1)
  console.log(`  ✅ 압축 완료: ${formatBytes(origSize)} → ${formatBytes(compSize)} (-${ratio}%) [${elapsed}초]`)

  return compSize
}

// ============================================================
// Vimeo: 업로드 준비 (TUS 엔드포인트 생성)
// ============================================================
async function createVimeoUpload(title: string, fileSize: number): Promise<{ uploadLink: string; vimeoId: string }> {
  const body = JSON.stringify({
    upload: {
      approach: 'tus',
      size: fileSize,
    },
    name: title,
    privacy: {
      view: 'unlisted',
    },
  })

  const response = await fetchJson('https://api.vimeo.com/me/videos', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${VIMEO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.vimeo.*+json;version=3.4',
    },
    body,
  })

  if (!response.upload?.upload_link) {
    throw new Error(`Vimeo 업로드 준비 실패: ${JSON.stringify(response)}`)
  }

  // URI 예시: /videos/123456789
  const uriParts = response.uri?.split('/')
  const vimeoId = uriParts?.[uriParts.length - 1]
  if (!vimeoId || !/^\d+$/.test(vimeoId)) {
    throw new Error(`Vimeo ID 파싱 실패: uri=${response.uri}`)
  }

  return {
    uploadLink: response.upload.upload_link,
    vimeoId,
  }
}

// ============================================================
// Vimeo: TUS 업로드
// ============================================================
async function uploadToVimeoTus(
  filePath: string,
  fileSize: number,
  uploadLink: string,
  label: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath)

    const upload = new tus.Upload(fileStream as any, {
      uploadUrl: uploadLink,
      chunkSize: 5 * 1024 * 1024, // 5MB 청크
      retryDelays: [0, 3000, 5000, 10000],
      uploadSize: fileSize,
      metadata: {},
      onError(error) {
        reject(new Error(`TUS 업로드 오류 (${label}): ${error.message}`))
      },
      onProgress(bytesUploaded, bytesTotal) {
        const percent = ((bytesUploaded / bytesTotal) * 100).toFixed(1)
        process.stdout.write(`\r  업로드 진행: ${percent}% (${formatBytes(bytesUploaded)} / ${formatBytes(bytesTotal)})`)
      },
      onSuccess() {
        process.stdout.write('\n')
        resolve()
      },
    })

    upload.start()
  })
}

// ============================================================
// 단일 항목 마이그레이션 (Cloudflare → Vimeo)
// ============================================================
async function migrateOne(
  item: MigrateItem,
  mapping: MappingFile,
  isDryRun: boolean
): Promise<{ vimeoId: string } | null> {
  const { cloudflareUid, title, source, recordId } = item

  // 이미 마이그레이션된 경우 건너뜀
  if (mapping[cloudflareUid]) {
    console.log(`  ⏭️  건너뜀 (이미 완료): ${cloudflareUid} → Vimeo ${mapping[cloudflareUid].vimeoId}`)
    return { vimeoId: mapping[cloudflareUid].vimeoId }
  }

  if (isDryRun) {
    console.log(`  [DRY RUN] ${source} #${recordId}: "${title}" (CF: ${cloudflareUid})`)
    return null
  }

  const tempFile = path.join(TEMP_DIR, `${cloudflareUid}.mp4`)

  try {
    // 1. Cloudflare에서 다운로드
    console.log(`  ⬇️  Cloudflare 다운로드 중: ${cloudflareUid}`)
    const fileSize = await downloadCloudflareVideo(cloudflareUid, tempFile)
    console.log(`  ✅ 다운로드 완료: ${formatBytes(fileSize)}`)

    // 2. Vimeo 업로드 준비
    console.log(`  ⬆️  Vimeo 업로드 준비 중: "${title}"`)
    const { uploadLink, vimeoId } = await createVimeoUpload(title, fileSize)
    console.log(`  📎 Vimeo ID: ${vimeoId}`)

    // 3. TUS 업로드 (원본)
    await uploadToVimeoTus(tempFile, fileSize, uploadLink, title)
    console.log(`  ✅ Vimeo 업로드 완료: ${vimeoId}`)

    // 4. 매핑 저장
    mapping[cloudflareUid] = {
      vimeoId,
      vimeoUrl: `https://vimeo.com/${vimeoId}`,
      migratedAt: new Date().toISOString(),
      source,
      recordId,
      title,
    }
    saveMapping(mapping)

    return { vimeoId }
  } finally {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
  }
}

// ============================================================
// Supabase DB 업데이트 (새 DB)
// ============================================================
async function updateSupabaseRecord(
  supabase: any,
  source: 'signature_videos' | 'media_content',
  recordId: number,
  cloudflareUid: string,
  vimeoId: string,
  isDryRun: boolean
): Promise<void> {
  const vimeoEmbedUrl = `https://player.vimeo.com/video/${vimeoId}`

  if (isDryRun) {
    console.log(`  [DRY RUN] DB 업데이트: ${source} #${recordId} → vimeo_id=${vimeoId}`)
    return
  }

  const updateData: Record<string, string> = {
    vimeo_id: vimeoId,
    video_url: vimeoEmbedUrl,
  }

  const { error } = await (supabase.from(source) as any).update(updateData).eq('id', recordId)

  if (error) {
    throw new Error(`DB 업데이트 실패 (${source} #${recordId}): ${error.message}`)
  }

  console.log(`  ✅ DB 업데이트: ${source} #${recordId} → vimeo_id=${vimeoId}`)
}

// ============================================================
// 배치 처리 (재시도 포함)
// ============================================================
async function processBatch(
  batch: MigrateItem[],
  mapping: MappingFile,
  supabase: any,
  isDryRun: boolean
): Promise<{ success: number; failed: number; skipped: number }> {
  let success = 0
  let failed = 0
  let skipped = 0

  for (const item of batch) {
    console.log(`\n📹 [${item.source}] #${item.recordId}: "${item.title}"`)
    console.log(`   CF UID: ${item.cloudflareUid}`)

    // 이미 완료된 항목은 DB 업데이트만
    if (mapping[item.cloudflareUid]) {
      const existingVimeoId = mapping[item.cloudflareUid].vimeoId
      try {
        await updateSupabaseRecord(supabase, item.source, item.recordId, item.cloudflareUid, existingVimeoId, isDryRun)
        skipped++
      } catch (err: any) {
        console.error(`  ❌ DB 업데이트 실패: ${err.message}`)
        failed++
      }
      continue
    }

    let lastError: Error | null = null
    let succeeded = false

    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`  🔄 재시도 ${attempt}/${MAX_RETRY}...`)
          await sleep(RETRY_DELAY_MS)
        }

        const result = await migrateOne(item, mapping, isDryRun)

        if (result && !isDryRun) {
          await updateSupabaseRecord(supabase, item.source, item.recordId, item.cloudflareUid, result.vimeoId, isDryRun)
        }

        succeeded = true
        success++
        break
      } catch (err: any) {
        lastError = err
        console.error(`  ❌ 시도 ${attempt} 실패: ${err.message}`)
      }
    }

    if (!succeeded && !isDryRun) {
      console.error(`  ❌ 최종 실패 (${MAX_RETRY}회 시도): ${lastError?.message}`)
      failed++
    }
  }

  return { success, failed, skipped }
}

// ============================================================
// 백업 파일에서 마이그레이션 항목 수집
// ============================================================
function collectItems(targetTable?: string): MigrateItem[] {
  const items: MigrateItem[] = []

  const tables: Array<'signature_videos' | 'media_content'> = targetTable
    ? [targetTable as 'signature_videos' | 'media_content']
    : ['signature_videos', 'media_content']

  for (const table of tables) {
    const filePath = path.join(BACKUP_DIR, `${table}.json`)

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  백업 파일 없음: ${filePath}`)
      continue
    }

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    const rows: (SignatureVideo | MediaContent)[] = Array.isArray(raw) ? raw : []

    let count = 0
    for (const row of rows) {
      if (!row.cloudflare_uid) continue

      const title =
        table === 'media_content'
          ? (row as MediaContent).title
          : `시그니처_멤버${(row as SignatureVideo).member_id}_서명${(row as SignatureVideo).signature_id}`

      items.push({
        source: table,
        recordId: row.id,
        cloudflareUid: row.cloudflare_uid,
        title,
      })
      count++
    }

    console.log(`📂 ${table}: ${count}건 발견`)
  }

  return items
}

// ============================================================
// 유틸리티
// ============================================================
function fetchJson(url: string, options: RequestInit): Promise<any> {
  return fetch(url, options).then(async (res) => {
    const text = await res.text()
    try {
      return JSON.parse(text)
    } catch {
      throw new Error(`JSON 파싱 실패 (HTTP ${res.status}): ${text.slice(0, 200)}`)
    }
  })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ============================================================
// 메인
// ============================================================
async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry-run')
  const tableIdx = args.indexOf('--table')
  const targetTable = tableIdx !== -1 ? args[tableIdx + 1] : undefined
  const limitIdx = args.indexOf('--limit')
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : undefined

  console.log('═'.repeat(60))
  console.log('  Cloudflare Stream → Vimeo 마이그레이션')
  console.log('═'.repeat(60))

  if (isDryRun) {
    console.log('🔍 [DRY RUN] 실제 업로드/업데이트하지 않습니다.\n')
  }

  // 환경변수 검증
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('❌ CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN 환경변수가 필요합니다.')
    process.exit(1)
  }
  if (!VIMEO_ACCESS_TOKEN) {
    console.error('❌ VIMEO_ACCESS_TOKEN 환경변수가 필요합니다.')
    process.exit(1)
  }

  console.log(`🌐 Cloudflare Account: ${CLOUDFLARE_ACCOUNT_ID}`)
  console.log(`🎬 Vimeo Token: ${VIMEO_ACCESS_TOKEN.slice(0, 8)}...`)
  console.log(`🗄️  대상 DB: ${NEW_SUPABASE_URL}`)
  console.log(`📁 백업 경로: ${BACKUP_DIR}`)
  console.log(`📄 매핑 파일: ${MAPPING_FILE}`)

  // 백업 디렉토리 확인
  if (!fs.existsSync(BACKUP_DIR)) {
    console.error(`❌ 백업 디렉토리 없음: ${BACKUP_DIR}`)
    process.exit(1)
  }

  // 임시 디렉토리 생성
  if (!isDryRun) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }

  // Supabase 클라이언트 (새 DB)
  const supabase = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // 매핑 파일 로드
  const mapping = loadMapping()
  const alreadyDone = Object.keys(mapping).length
  if (alreadyDone > 0) {
    console.log(`\n♻️  이전 진행 기록: ${alreadyDone}건 이미 완료됨`)
  }

  // 마이그레이션 항목 수집
  console.log('\n' + '─'.repeat(60))
  const allItems = collectItems(targetTable)
  const items = limit ? allItems.slice(0, limit) : allItems
  const total = items.length

  if (total === 0) {
    console.log('\n✅ 마이그레이션할 항목이 없습니다.')
    return
  }

  console.log(`\n🚀 총 ${total}건 처리 예정 (배치 크기: ${BATCH_SIZE})`)
  console.log('─'.repeat(60))

  // 배치 처리
  let totalSuccess = 0
  let totalFailed = 0
  let totalSkipped = 0

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(items.length / BATCH_SIZE)

    console.log(`\n📦 배치 ${batchNum}/${totalBatches} (${i + 1}~${Math.min(i + BATCH_SIZE, total)}번째)`)

    const result = await processBatch(batch, mapping, supabase, isDryRun)
    totalSuccess += result.success
    totalFailed += result.failed
    totalSkipped += result.skipped

    // 배치 간 딜레이 (마지막 배치 제외)
    if (i + BATCH_SIZE < items.length) {
      console.log(`\n  ⏳ 다음 배치 전 2초 대기...`)
      await sleep(2000)
    }
  }

  // 최종 요약
  console.log('\n' + '═'.repeat(60))
  console.log('  마이그레이션 완료')
  console.log('═'.repeat(60))
  console.log(`✅ 성공: ${totalSuccess}건`)
  console.log(`⏭️  건너뜀 (기존 완료): ${totalSkipped}건`)
  console.log(`❌ 실패: ${totalFailed}건`)
  console.log(`📄 매핑 파일: ${MAPPING_FILE}`)

  if (totalFailed > 0) {
    console.log('\n⚠️  실패한 항목은 스크립트를 재실행하면 자동으로 재시도됩니다.')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('치명적 오류:', err)
  process.exit(1)
})
