/**
 * Google Drive 폴더 → Cloudflare Stream → media_content (Shorts)
 *
 * 사용법:
 *   npx tsx scripts/gdrive-shorts-upload.ts --folder-id FOLDER_ID
 *   npx tsx scripts/gdrive-shorts-upload.ts --folder-id FOLDER_ID --dry-run
 */

import { getServiceClient } from './lib/supabase'
import puppeteer, { Browser, Page } from 'puppeteer'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import dotenv from 'dotenv'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

const supabase = getServiceClient()
const TEMP_DIR = path.join(os.tmpdir(), 'rg-shorts-upload')

interface DriveItem {
  id: string
  name: string
  type: 'folder' | 'file'
}

interface UploadOptions {
  folderId: string
  dryRun: boolean
  limit?: number
  unit?: 'excel' | 'crew'
}

// Google Drive 아이템 조회
async function getDriveItems(page: Page, folderId: string): Promise<DriveItem[]> {
  const folderUrl = `https://drive.google.com/drive/folders/${folderId}`

  await page.goto(folderUrl, { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise(resolve => setTimeout(resolve, 3000))

  // 스크롤
  let previousHeight = 0
  for (let i = 0; i < 10; i++) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight)
    if (currentHeight === previousHeight) break
    previousHeight = currentHeight
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  const items = await page.evaluate(() => {
    const results: { id: string; name: string; type: 'folder' | 'file' }[] = []
    document.querySelectorAll('[data-id]').forEach((el) => {
      const id = el.getAttribute('data-id')
      if (!id || id.length < 10) return

      const nameEl = el.querySelector('[data-tooltip]') as HTMLElement
      const name = nameEl?.getAttribute('data-tooltip') ||
                   nameEl?.textContent?.trim() ||
                   el.textContent?.trim().split('\n')[0] || ''

      if (!name) return

      const cleanName = name
        .replace(/\s+동영상$/i, '')
        .replace(/\s+이미지$/i, '')
        .replace(/\s+문서$/i, '')
        .trim()

      const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']
      const isVideo = videoExtensions.some(ext => cleanName.toLowerCase().endsWith(ext))

      if (isVideo) {
        results.push({ id, name: cleanName, type: 'file' })
      } else if (!cleanName.includes('.')) {
        results.push({ id, name: cleanName, type: 'folder' })
      }
    })
    return results
  })

  return items.filter((item, idx, self) => idx === self.findIndex(i => i.id === item.id))
}

// Google Drive 파일 다운로드
async function downloadFromGoogleDrive(
  browser: Browser,
  fileId: string,
  fileName: string
): Promise<string> {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }

  const downloadPath = path.join(TEMP_DIR, fileName)

  if (fs.existsSync(downloadPath)) {
    const stats = fs.statSync(downloadPath)
    if (stats.size > 1000) return downloadPath
    fs.unlinkSync(downloadPath)
  }

  const page = await browser.newPage()

  try {
    const client = await page.createCDPSession()
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: TEMP_DIR,
    })

    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
    await page.goto(downloadUrl, { waitUntil: 'networkidle2', timeout: 120000 })

    await new Promise(resolve => setTimeout(resolve, 2000))

    // 바이러스 스캔 경고 처리
    const confirmButton = await page.$('a[id="uc-download-link"]')
    if (confirmButton) {
      await confirmButton.click()
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    const formButton = await page.$('form button, form input[type="submit"]')
    if (formButton) {
      await formButton.click()
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    // 다운로드 완료 대기
    let attempts = 0
    const maxAttempts = 120

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))

      const files = fs.readdirSync(TEMP_DIR)
      const downloadedFile = files.find(f =>
        !f.endsWith('.crdownload') && !f.endsWith('.tmp') && f !== '.DS_Store'
      )

      if (downloadedFile) {
        const currentPath = path.join(TEMP_DIR, downloadedFile)
        const stats = fs.statSync(currentPath)

        if (stats.size > 1000) {
          if (downloadedFile !== fileName) {
            fs.renameSync(currentPath, downloadPath)
          }
          return downloadPath
        }
      }

      attempts++
    }

    throw new Error('다운로드 타임아웃')
  } finally {
    await page.close()
  }
}

// Cloudflare Stream 업로드
async function uploadToCloudflare(filePath: string, title: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath)
  const blob = new Blob([fileBuffer])

  const formData = new FormData()
  formData.append('file', blob, path.basename(filePath))

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
      body: formData,
    }
  )

  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(`Cloudflare 업로드 실패: ${data.errors?.[0]?.message || JSON.stringify(data.errors)}`)
  }

  return data.result.uid
}

// media_content에 저장
async function saveToMediaContent(
  cloudflareUid: string,
  title: string,
  unit: 'excel' | 'crew'
): Promise<number> {
  // 중복 확인
  const { data: existing } = await supabase
    .from('media_content')
    .select('id')
    .eq('cloudflare_uid', cloudflareUid)
    .limit(1)

  if (existing && existing.length > 0) {
    return existing[0].id
  }

  const videoUrl = `https://iframe.videodelivery.net/${cloudflareUid}`
  const thumbnailUrl = `https://videodelivery.net/${cloudflareUid}/thumbnails/thumbnail.jpg?time=7s`

  const { data, error } = await supabase
    .from('media_content')
    .insert({
      content_type: 'shorts',
      title: title,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      cloudflare_uid: cloudflareUid,
      unit: unit,
      duration: 60, // 숏츠 기본 1분
      view_count: 0,
      is_featured: false
    })
    .select()
    .single()

  if (error) throw new Error(`DB 저장 실패: ${error.message}`)
  return data.id
}

function parseArgs(): UploadOptions {
  const args = process.argv.slice(2)
  const options: UploadOptions = { folderId: '', dryRun: false, unit: 'excel' }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--folder-id': options.folderId = args[++i]; break
      case '--dry-run': options.dryRun = true; break
      case '--limit': options.limit = parseInt(args[++i], 10); break
      case '--unit': options.unit = args[++i] as 'excel' | 'crew'; break
    }
  }

  return options
}

function cleanupTempFiles() {
  if (fs.existsSync(TEMP_DIR)) {
    fs.readdirSync(TEMP_DIR).forEach(f => {
      try { fs.unlinkSync(path.join(TEMP_DIR, f)) } catch {}
    })
  }
}

function extractTitle(fileName: string): string {
  return fileName
    .replace(/\.(mp4|mov|avi|mkv|webm|m4v)$/i, '')
    .trim()
}

async function main() {
  console.log('═'.repeat(60))
  console.log('🎬 Google Drive → Cloudflare Stream (Shorts 업로드)')
  console.log('═'.repeat(60))

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('\n❌ Cloudflare 환경변수가 설정되지 않았습니다.')
    process.exit(1)
  }

  const options = parseArgs()

  if (!options.folderId) {
    console.log('\n사용법:')
    console.log('  npx tsx scripts/gdrive-shorts-upload.ts --folder-id FOLDER_ID')
    console.log('\n옵션:')
    console.log('  --dry-run       검증만 수행')
    console.log('  --limit <n>     처음 n개만 업로드')
    console.log('  --unit <unit>   excel 또는 crew (기본: excel)')
    process.exit(1)
  }

  console.log(`\n📂 폴더 ID: ${options.folderId}`)
  console.log(`📋 모드: ${options.dryRun ? '🔍 검증만' : '🚀 실제 업로드'}`)
  console.log(`📋 Unit: ${options.unit}`)
  if (options.limit) console.log(`📋 제한: ${options.limit}개`)

  cleanupTempFiles()

  console.log('\n🌐 브라우저 시작 중...')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  )

  try {
    console.log('\n📁 폴더 스캔 중...')
    const items = await getDriveItems(page, options.folderId)
    const videoFiles = items.filter(item => item.type === 'file')

    console.log(`   영상 파일: ${videoFiles.length}개`)

    if (videoFiles.length === 0) {
      console.log('\n⚠️ 업로드할 영상이 없습니다.')
      await browser.close()
      return
    }

    let toUpload = videoFiles
    if (options.limit && videoFiles.length > options.limit) {
      toUpload = videoFiles.slice(0, options.limit)
      console.log(`\n📋 --limit ${options.limit} 적용`)
    }

    if (options.dryRun) {
      console.log('\n🔍 [DRY RUN] 검증 완료')
      toUpload.forEach((file, idx) => {
        console.log(`  ${idx + 1}. ${file.name}`)
      })
      await browser.close()
      return
    }

    console.log('\n🚀 업로드 시작...\n')

    let success = 0
    let failed = 0

    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i]
      const title = extractTitle(file.name)
      process.stdout.write(`[${i + 1}/${toUpload.length}] ${file.name}`)

      try {
        // 1. 다운로드
        process.stdout.write(' 📥')
        const localPath = await downloadFromGoogleDrive(browser, file.id, file.name)

        // 2. Cloudflare 업로드
        process.stdout.write(' ☁️')
        const cloudflareUid = await uploadToCloudflare(localPath, title)

        // 3. DB 저장
        process.stdout.write(' 💾')
        const mediaId = await saveToMediaContent(cloudflareUid, title, options.unit!)

        // 4. 로컬 파일 삭제
        fs.unlinkSync(localPath)

        console.log(` ✅ (id: ${mediaId}, uid: ${cloudflareUid.substring(0, 8)}...)`)
        success++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(` ❌ ${msg}`)
        failed++
      }

      if (i < toUpload.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log('\n' + '═'.repeat(60))
    console.log(`📊 결과: 성공 ${success}개, 실패 ${failed}개`)
    console.log('═'.repeat(60))

  } finally {
    await browser.close()
    cleanupTempFiles()
  }
}

main().catch(err => {
  console.error('\n❌ 오류:', err.message)
  cleanupTempFiles()
  process.exit(1)
})
