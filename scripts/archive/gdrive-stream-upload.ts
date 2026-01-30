/**
 * Google Drive → Cloudflare Stream 업로드 (파일 하나씩 처리)
 *
 * 파일을 하나씩 다운로드 → Cloudflare 업로드 → 삭제
 * 로컬에 한 번에 하나의 파일만 저장되므로 용량 효율적
 *
 * 사용법:
 *   npx tsx scripts/gdrive-stream-upload.ts --folder-id FOLDER_ID
 */

import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// ============================================
// 설정
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const TEMP_DIR = path.join(os.tmpdir(), 'rg-vod-upload')

// ============================================
// 타입 정의
// ============================================

interface DriveFile {
  id: string
  name: string
}

interface UploadOptions {
  folderId: string
  contentType: 'vod' | 'shorts'
  unit?: 'excel' | 'crew'
  dryRun: boolean
  limit?: number
}

// ============================================
// Puppeteer로 Google Drive 파일 목록 추출
// ============================================

async function getFilesFromGoogleDrive(folderId: string): Promise<DriveFile[]> {
  console.log('\n🔍 Google Drive 폴더 스캔 중...')

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  )

  const folderUrl = `https://drive.google.com/drive/folders/${folderId}`
  await page.goto(folderUrl, { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise(resolve => setTimeout(resolve, 3000))

  // 스크롤하여 모든 파일 로드
  let previousHeight = 0
  for (let i = 0; i < 10; i++) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight)
    if (currentHeight === previousHeight) break
    previousHeight = currentHeight
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // 파일 정보 추출
  const files = await page.evaluate(() => {
    const items: { id: string; name: string }[] = []
    const fileElements = document.querySelectorAll('[data-id]')

    fileElements.forEach((el) => {
      const id = el.getAttribute('data-id')
      if (!id || id.length < 10) return

      const nameEl = el.querySelector('[data-tooltip]') as HTMLElement
      const name = nameEl?.getAttribute('data-tooltip') ||
                   nameEl?.textContent ||
                   el.textContent?.trim().split('\n')[0] || id

      const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']
      const isVideo = videoExtensions.some(ext => name.toLowerCase().includes(ext.toLowerCase()))

      if (isVideo) {
        items.push({ id, name: name.trim() })
      }
    })

    return items
  })

  await browser.close()

  const uniqueFiles = files.filter((file, index, self) =>
    index === self.findIndex(f => f.id === file.id)
  )

  console.log(`   ✅ ${uniqueFiles.length}개 영상 파일 발견`)
  return uniqueFiles
}

// ============================================
// Puppeteer로 Google Drive 파일 다운로드
// ============================================

async function downloadFromGoogleDrive(
  fileId: string,
  fileName: string
): Promise<string> {
  // 임시 폴더 생성
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }

  const downloadPath = path.join(TEMP_DIR, fileName)

  console.log(`   📥 다운로드 시작...`)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()

  // 다운로드 경로 설정
  const client = await page.createCDPSession()
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: TEMP_DIR,
  })

  // 직접 다운로드 URL로 이동
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
  await page.goto(downloadUrl, { waitUntil: 'networkidle2', timeout: 120000 })

  // "바이러스 검사" 경고 페이지 처리
  await new Promise(resolve => setTimeout(resolve, 2000))

  // "계속 다운로드" 버튼 클릭 시도
  try {
    const downloadButton = await page.$('#uc-download-link')
    if (downloadButton) {
      await downloadButton.click()
      console.log(`   📥 큰 파일 다운로드 확인...`)
    }
  } catch {
    // 버튼이 없으면 직접 다운로드가 시작된 것
  }

  // 다운로드 완료 대기
  const maxWaitTime = 600000 // 10분
  const checkInterval = 5000
  let elapsed = 0

  while (elapsed < maxWaitTime) {
    await new Promise(resolve => setTimeout(resolve, checkInterval))
    elapsed += checkInterval

    // 다운로드 파일 확인
    const files = fs.readdirSync(TEMP_DIR)
    const downloadedFile = files.find(f =>
      !f.endsWith('.crdownload') && !f.endsWith('.tmp') && f !== '.DS_Store'
    )

    if (downloadedFile) {
      const fullPath = path.join(TEMP_DIR, downloadedFile)
      const stats = fs.statSync(fullPath)

      // 파일 크기가 계속 변하지 않으면 완료
      await new Promise(resolve => setTimeout(resolve, 2000))
      const newStats = fs.statSync(fullPath)

      if (stats.size === newStats.size && stats.size > 0) {
        await browser.close()
        console.log(`   ✅ 다운로드 완료: ${formatBytes(stats.size)}`)
        return fullPath
      }
    }

    const progressFiles = files.filter(f => f.endsWith('.crdownload'))
    if (progressFiles.length > 0) {
      process.stdout.write(`\r   📥 다운로드 중... (${Math.floor(elapsed / 1000)}초 경과)`)
    }
  }

  await browser.close()
  throw new Error('다운로드 시간 초과')
}

// ============================================
// Cloudflare Stream 업로드 (TUS)
// ============================================

async function uploadToCloudflare(
  filePath: string,
  meta: Record<string, string>
): Promise<{ uid: string }> {
  const fileSize = fs.statSync(filePath).size
  console.log(`   ☁️  Cloudflare 업로드 시작 (${formatBytes(fileSize)})`)

  // TUS 업로드 초기화
  const initRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(fileSize),
        'Upload-Metadata': Object.entries(meta)
          .map(([k, v]) => `${k} ${Buffer.from(v).toString('base64')}`)
          .join(','),
      },
    }
  )

  if (!initRes.ok) {
    const errorText = await initRes.text()
    throw new Error(`Cloudflare 초기화 실패: ${errorText}`)
  }

  const uploadUrl = initRes.headers.get('location')
  const streamMediaId = initRes.headers.get('stream-media-id')

  if (!uploadUrl || !streamMediaId) {
    throw new Error('Cloudflare 업로드 URL 없음')
  }

  console.log(`   UID: ${streamMediaId}`)

  // 청크 업로드 (5MB씩)
  const chunkSize = 5 * 1024 * 1024
  const fileStream = fs.createReadStream(filePath, { highWaterMark: chunkSize })
  let uploadedBytes = 0

  for await (const chunk of fileStream) {
    const buffer = chunk as Buffer

    const patchRes = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/offset+octet-stream',
        'Upload-Offset': String(uploadedBytes),
        'Tus-Resumable': '1.0.0',
      },
      body: buffer,
    })

    if (!patchRes.ok) {
      throw new Error(`Cloudflare 청크 업로드 실패: ${patchRes.status}`)
    }

    uploadedBytes += buffer.length
    const percent = ((uploadedBytes / fileSize) * 100).toFixed(1)
    process.stdout.write(`\r   ☁️  업로드 중: ${percent}%`)
  }

  console.log('\n   ✅ Cloudflare 업로드 완료')

  return { uid: streamMediaId }
}

// ============================================
// Supabase 등록
// ============================================

async function registerToDatabase(
  uid: string,
  title: string,
  contentType: 'vod' | 'shorts',
  unit?: 'excel' | 'crew'
) {
  const { data, error } = await supabase
    .from('media_content')
    .insert({
      content_type: contentType,
      title,
      video_url: `https://iframe.videodelivery.net/${uid}`,
      cloudflare_uid: uid,
      thumbnail_url: `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`,
      unit: unit || null,
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

// ============================================
// 유틸리티
// ============================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function extractTitle(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, '')
    .replace(/ 동영상$/, '')
    .trim()
}

function parseArgs(): UploadOptions {
  const args = process.argv.slice(2)
  const options: UploadOptions = {
    folderId: '',
    contentType: 'vod',
    dryRun: false,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--folder-id':
        options.folderId = args[++i]
        break
      case '--content-type':
        options.contentType = args[++i] as 'vod' | 'shorts'
        break
      case '--unit':
        options.unit = args[++i] as 'excel' | 'crew'
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--limit':
        options.limit = parseInt(args[++i], 10)
        break
    }
  }

  return options
}

// ============================================
// 메인
// ============================================

async function processFile(
  file: DriveFile,
  options: UploadOptions,
  index: number,
  total: number
): Promise<{ success: boolean; uid?: string }> {
  const title = extractTitle(file.name)

  console.log(`\n${'━'.repeat(50)}`)
  console.log(`[${index + 1}/${total}] ${title}`)
  console.log(`   파일 ID: ${file.id}`)

  // 중복 체크
  if (await checkDuplicate(title)) {
    console.log('   ⚠️  이미 등록됨. 건너뜀.')
    return { success: false }
  }

  if (options.dryRun) {
    console.log('   [DRY RUN] 건너뜀')
    return { success: true }
  }

  let downloadedPath: string | null = null

  try {
    // 1. 다운로드
    downloadedPath = await downloadFromGoogleDrive(file.id, file.name)

    // 2. Cloudflare 업로드
    const result = await uploadToCloudflare(downloadedPath, { name: title })

    // 3. DB 등록
    const dbRecord = await registerToDatabase(result.uid, title, options.contentType, options.unit)
    console.log(`   ✅ DB 등록 완료 (id: ${dbRecord.id})`)

    return { success: true, uid: result.uid }
  } finally {
    // 4. 임시 파일 삭제 (항상 실행)
    if (downloadedPath && fs.existsSync(downloadedPath)) {
      fs.unlinkSync(downloadedPath)
      console.log('   🗑️  임시 파일 삭제')
    }
  }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎬 Google Drive → Cloudflare Stream 업로드')
  console.log('   (하나씩 다운로드 → 업로드 → 삭제)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('\n❌ Cloudflare 환경변수 없음')
    process.exit(1)
  }

  const options = parseArgs()

  if (!options.folderId) {
    console.error('\n사용법: npx tsx scripts/gdrive-stream-upload.ts --folder-id FOLDER_ID')
    process.exit(1)
  }

  // 파일 목록 추출
  let files = await getFilesFromGoogleDrive(options.folderId)

  if (files.length === 0) {
    console.log('\n⚠️  영상 파일 없음')
    return
  }

  if (options.limit) {
    files = files.slice(0, options.limit)
  }

  console.log('\n📁 파일 목록:')
  files.forEach((f, i) => console.log(`  ${i + 1}. ${extractTitle(f.name)}`))

  if (options.dryRun) {
    console.log('\n🔍 [DRY RUN]')
  }

  // 업로드 실행
  let success = 0, failed = 0
  const uids: string[] = []

  for (let i = 0; i < files.length; i++) {
    try {
      const result = await processFile(files[i], options, i, files.length)
      if (result.success) {
        success++
        if (result.uid) uids.push(result.uid)
      }
    } catch (error) {
      console.error(`   ❌ 실패: ${(error as Error).message}`)
      failed++
    }
  }

  // 결과
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📊 결과: 성공 ${success}개, 실패 ${failed}개`)

  if (uids.length > 0) {
    console.log('\n⏳ Cloudflare 인코딩 진행 중...')
    console.log(`   https://dash.cloudflare.com/${CLOUDFLARE_ACCOUNT_ID}/stream`)
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
