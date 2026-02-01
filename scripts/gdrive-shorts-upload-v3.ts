/**
 * Google Drive 폴더 → Cloudflare Stream → media_content (Shorts) V3
 * - 파일 하나씩 확실하게 다운로드/업로드
 * - 손밍 관련 파일 제외
 * - 다운로드 폴더 완전 초기화 후 진행
 */

import puppeteer, { Browser, Page } from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
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
const TEMP_DIR = path.join(os.tmpdir(), 'rg-shorts-v3')

interface DriveItem {
  id: string
  name: string
}

// 폴더 완전 초기화
function cleanTempDir() {
  if (fs.existsSync(TEMP_DIR)) {
    fs.readdirSync(TEMP_DIR).forEach(f => {
      try { fs.unlinkSync(path.join(TEMP_DIR, f)) } catch {}
    })
  } else {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }
}

// Google Drive 파일 목록 조회
async function getDriveFiles(page: Page, folderId: string): Promise<DriveItem[]> {
  const folderUrl = `https://drive.google.com/drive/folders/${folderId}`
  await page.goto(folderUrl, { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise(resolve => setTimeout(resolve, 3000))

  // 스크롤해서 모든 파일 로드
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  const items = await page.evaluate(() => {
    const results: { id: string; name: string }[] = []
    document.querySelectorAll('[data-id]').forEach((el) => {
      const id = el.getAttribute('data-id')
      if (!id || id.length < 10) return

      const nameEl = el.querySelector('[data-tooltip]') as HTMLElement
      let name = nameEl?.getAttribute('data-tooltip') || ''

      if (!name) return

      name = name.replace(/\s+동영상$/i, '').trim()

      const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']
      if (videoExtensions.some(ext => name.toLowerCase().endsWith(ext))) {
        results.push({ id, name })
      }
    })
    return results
  })

  // 중복 제거
  const unique = items.filter((item, idx, self) =>
    idx === self.findIndex(i => i.id === item.id)
  )

  return unique.sort((a, b) => a.name.localeCompare(b.name))
}

// 단일 파일 다운로드 (새 페이지에서)
async function downloadFile(browser: Browser, fileId: string, fileName: string): Promise<string | null> {
  cleanTempDir()

  const page = await browser.newPage()

  try {
    const client = await page.createCDPSession()
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: TEMP_DIR,
    })

    // 직접 다운로드 URL
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
    await page.goto(downloadUrl, { waitUntil: 'networkidle2', timeout: 60000 })
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 바이러스 스캔 경고 - 다운로드 버튼 클릭
    const confirmLink = await page.$('a[id="uc-download-link"]')
    if (confirmLink) {
      await confirmLink.click()
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    // form 버튼 클릭 (대용량 파일)
    const formButton = await page.$('form#download-form input[type="submit"], form#download-form button')
    if (formButton) {
      await formButton.click()
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    // 다운로드 완료 대기 (최대 2분)
    for (let i = 0; i < 120; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000))

      const files = fs.readdirSync(TEMP_DIR).filter(f =>
        f !== '.DS_Store' && !f.endsWith('.crdownload') && !f.endsWith('.tmp')
      )

      if (files.length > 0) {
        const downloadedFile = files[0]
        const filePath = path.join(TEMP_DIR, downloadedFile)
        const stats = fs.statSync(filePath)

        if (stats.size > 10000) { // 10KB 이상
          return filePath
        }
      }
    }

    return null
  } finally {
    await page.close()
  }
}

// Cloudflare 업로드
async function uploadToCloudflare(filePath: string): Promise<string> {
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
  if (!response.ok || !data.success) {
    throw new Error(data.errors?.[0]?.message || 'Upload failed')
  }

  return data.result.uid
}

// DB 저장
async function saveToDb(cloudflareUid: string, title: string): Promise<number> {
  const { data, error } = await supabase
    .from('media_content')
    .insert({
      content_type: 'shorts',
      title: title,
      video_url: `https://iframe.videodelivery.net/${cloudflareUid}`,
      thumbnail_url: `https://videodelivery.net/${cloudflareUid}/thumbnails/thumbnail.jpg?time=7s&width=720&height=1280&fit=crop`,
      cloudflare_uid: cloudflareUid,
      unit: 'excel',
      duration: 60,
      view_count: 0,
      is_featured: false
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data.id
}

// 제목 추출 (확장자 제거)
function extractTitle(fileName: string): string {
  return fileName.replace(/\.(mp4|mov|avi|mkv|webm|m4v)$/i, '').trim()
}

async function main() {
  const folderId = process.argv[2]

  if (!folderId) {
    console.log('사용법: npx tsx scripts/gdrive-shorts-upload-v3.ts FOLDER_ID')
    process.exit(1)
  }

  console.log('═'.repeat(60))
  console.log('🎬 Google Drive → Cloudflare (손밍 제외)')
  console.log('═'.repeat(60))

  cleanTempDir()

  console.log('\n🌐 브라우저 시작...')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')

  try {
    console.log('📁 파일 목록 조회...')
    const files = await getDriveFiles(page, folderId)

    // 손밍 제외
    const filteredFiles = files.filter(f => !f.name.includes('손밍'))

    console.log(`   전체: ${files.length}개, 손밍 제외: ${filteredFiles.length}개\n`)

    let success = 0
    let failed = 0

    for (let i = 0; i < filteredFiles.length; i++) {
      const file = filteredFiles[i]
      const title = extractTitle(file.name)

      process.stdout.write(`[${i + 1}/${filteredFiles.length}] ${file.name}`)

      try {
        // 다운로드
        process.stdout.write(' 📥')
        const localPath = await downloadFile(browser, file.id, file.name)

        if (!localPath) {
          console.log(' ❌ 다운로드 실패')
          failed++
          continue
        }

        const fileSize = fs.statSync(localPath).size
        const sizeMB = (fileSize / 1024 / 1024).toFixed(1)
        process.stdout.write(`(${sizeMB}MB)`)

        // 200MB 초과 체크
        if (fileSize > 200 * 1024 * 1024) {
          console.log(' ❌ 크기 초과')
          fs.unlinkSync(localPath)
          failed++
          continue
        }

        // 업로드
        process.stdout.write(' ☁️')
        const uid = await uploadToCloudflare(localPath)

        // DB 저장
        process.stdout.write(' 💾')
        const id = await saveToDb(uid, title)

        // 정리
        fs.unlinkSync(localPath)

        console.log(` ✅ id:${id}`)
        success++

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(` ❌ ${msg.slice(0, 50)}`)
        failed++
      }

      // 다음 파일 전 대기
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    console.log('\n' + '═'.repeat(60))
    console.log(`📊 결과: 성공 ${success}개, 실패 ${failed}개`)
    console.log('═'.repeat(60))

  } finally {
    await browser.close()
    cleanTempDir()
  }
}

main().catch(err => {
  console.error('❌', err.message)
  process.exit(1)
})
