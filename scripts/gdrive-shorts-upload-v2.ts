/**
 * Google Drive 폴더 → Cloudflare Stream → media_content (Shorts) V2
 * - 대용량 파일 다운로드 개선
 * - TUS 프로토콜 사용하여 대용량 업로드 지원
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
const TEMP_DIR = path.join(os.tmpdir(), 'rg-shorts-upload-v2')

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
  retryOnly?: boolean
}

// 이미 업로드된 파일 목록 조회
async function getUploadedTitles(): Promise<Set<string>> {
  const { data } = await supabase
    .from('media_content')
    .select('title')
    .eq('content_type', 'shorts')

  const titles = new Set<string>()
  data?.forEach(item => {
    // "직캠(이름) 시그명" 형식에서 원본 파일명 추출
    const match = item.title.match(/^직캠\([^)]+\)\s+(.+)$/)
    if (match) {
      titles.add(match[1].toLowerCase())
    }
    titles.add(item.title.toLowerCase())
  })
  return titles
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

// Google Drive 파일 다운로드 (개선된 버전)
async function downloadFromGoogleDrive(
  browser: Browser,
  fileId: string,
  fileName: string
): Promise<string> {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }

  // 기존 파일 정리
  const files = fs.readdirSync(TEMP_DIR)
  files.forEach(f => {
    if (f !== '.DS_Store') {
      try { fs.unlinkSync(path.join(TEMP_DIR, f)) } catch {}
    }
  })

  const downloadPath = path.join(TEMP_DIR, fileName)

  const page = await browser.newPage()

  try {
    const client = await page.createCDPSession()
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: TEMP_DIR,
    })

    // 직접 파일 페이지로 이동
    const fileUrl = `https://drive.google.com/file/d/${fileId}/view`
    await page.goto(fileUrl, { waitUntil: 'networkidle2', timeout: 60000 })
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 다운로드 버튼 클릭 (더보기 메뉴 → 다운로드)
    // 또는 키보드 단축키 사용
    await page.keyboard.down('Shift')
    await page.keyboard.press('KeyD')
    await page.keyboard.up('Shift')

    await new Promise(resolve => setTimeout(resolve, 3000))

    // 바이러스 스캔 경고 페이지 처리
    const downloadAnywayButton = await page.$('a[href*="confirm="]')
    if (downloadAnywayButton) {
      await downloadAnywayButton.click()
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    // "무시하고 다운로드" 버튼 찾기
    const buttons = await page.$$('button')
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button)
      if (text?.includes('다운로드') || text?.includes('Download')) {
        await button.click()
        await new Promise(resolve => setTimeout(resolve, 3000))
        break
      }
    }

    // 다운로드 완료 대기
    let attempts = 0
    const maxAttempts = 180 // 3분

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

// TUS 프로토콜을 사용한 Cloudflare Stream 업로드 (대용량 지원)
async function uploadToCloudflareWithTus(filePath: string, title: string): Promise<string> {
  const fileSize = fs.statSync(filePath).size
  const fileName = path.basename(filePath)

  // 1. TUS 업로드 URL 생성
  const createResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(fileSize),
        'Upload-Metadata': `name ${Buffer.from(fileName).toString('base64')}`
      }
    }
  )

  if (!createResponse.ok) {
    // 일반 업로드로 폴백
    return uploadToCloudflareNormal(filePath, title)
  }

  const uploadUrl = createResponse.headers.get('location')
  if (!uploadUrl) {
    return uploadToCloudflareNormal(filePath, title)
  }

  // 2. 파일 업로드 (청크 단위)
  const fileBuffer = fs.readFileSync(filePath)
  const chunkSize = 50 * 1024 * 1024 // 50MB 청크
  let offset = 0

  while (offset < fileSize) {
    const chunk = fileBuffer.slice(offset, Math.min(offset + chunkSize, fileSize))

    const patchResponse = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/offset+octet-stream',
        'Upload-Offset': String(offset),
        'Tus-Resumable': '1.0.0'
      },
      body: chunk
    })

    if (!patchResponse.ok) {
      throw new Error(`TUS 업로드 실패: ${patchResponse.status}`)
    }

    offset += chunk.length
  }

  // 3. UID 추출
  const uidMatch = uploadUrl.match(/\/([a-f0-9]{32})$/)
  if (!uidMatch) {
    throw new Error('Cloudflare UID 추출 실패')
  }

  return uidMatch[1]
}

// 일반 Cloudflare Stream 업로드
async function uploadToCloudflareNormal(filePath: string, title: string): Promise<string> {
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
  const thumbnailUrl = `https://videodelivery.net/${cloudflareUid}/thumbnails/thumbnail.jpg?time=7s&width=720&height=1280&fit=crop`

  const { data, error } = await supabase
    .from('media_content')
    .insert({
      content_type: 'shorts',
      title: title,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      cloudflare_uid: cloudflareUid,
      unit: unit,
      duration: 60,
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
      case '--retry-only': options.retryOnly = true; break
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
  const baseName = fileName
    .replace(/\.(mp4|mov|avi|mkv|webm|m4v)$/i, '')
    .trim()

  // "시그명 이름" → "직캠(이름) 시그명" 형식으로 변환
  const bracketMatch = baseName.match(/^(.+?)\s*\(([^)]+)\)$/)
  if (bracketMatch) {
    return `직캠(${bracketMatch[2].trim()}) ${bracketMatch[1].trim()}`
  }

  const parts = baseName.split(' ')
  if (parts.length >= 2) {
    const dancerName = parts[parts.length - 1]
    const sigName = parts.slice(0, -1).join(' ')
    return `직캠(${dancerName}) ${sigName}`
  }

  return baseName
}

async function main() {
  console.log('═'.repeat(60))
  console.log('🎬 Google Drive → Cloudflare Stream (Shorts 업로드 V2)')
  console.log('═'.repeat(60))

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('\n❌ Cloudflare 환경변수가 설정되지 않았습니다.')
    process.exit(1)
  }

  const options = parseArgs()

  if (!options.folderId) {
    console.log('\n사용법:')
    console.log('  npx tsx scripts/gdrive-shorts-upload-v2.ts --folder-id FOLDER_ID')
    console.log('\n옵션:')
    console.log('  --dry-run       검증만 수행')
    console.log('  --limit <n>     처음 n개만 업로드')
    console.log('  --unit <unit>   excel 또는 crew (기본: excel)')
    console.log('  --retry-only    실패한 파일만 재시도')
    process.exit(1)
  }

  console.log(`\n📂 폴더 ID: ${options.folderId}`)
  console.log(`📋 모드: ${options.dryRun ? '🔍 검증만' : '🚀 실제 업로드'}`)
  console.log(`📋 Unit: ${options.unit}`)
  if (options.limit) console.log(`📋 제한: ${options.limit}개`)
  if (options.retryOnly) console.log(`📋 재시도 모드: 실패한 파일만`)

  cleanupTempFiles()

  // 이미 업로드된 파일 확인
  const uploadedTitles = await getUploadedTitles()
  console.log(`\n📊 이미 업로드된 파일: ${uploadedTitles.size}개`)

  console.log('\n🌐 브라우저 시작 중...')
  const browser = await puppeteer.launch({
    headless: false, // 디버깅을 위해 헤드리스 모드 끔
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  )

  try {
    console.log('\n📁 폴더 스캔 중...')
    const items = await getDriveItems(page, options.folderId)
    let videoFiles = items.filter(item => item.type === 'file')

    console.log(`   전체 영상 파일: ${videoFiles.length}개`)

    // 이미 업로드된 파일 제외
    if (options.retryOnly) {
      videoFiles = videoFiles.filter(file => {
        const baseName = file.name.replace(/\.(mp4|mov|avi|mkv|webm|m4v)$/i, '').toLowerCase()
        const parts = baseName.split(' ')
        const sigName = parts.length >= 2 ? parts.slice(0, -1).join(' ') : baseName
        return !uploadedTitles.has(baseName) && !uploadedTitles.has(sigName)
      })
      console.log(`   업로드 필요: ${videoFiles.length}개 (이미 업로드된 파일 제외)`)
    }

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
        const title = extractTitle(file.name)
        console.log(`  ${idx + 1}. ${file.name} → ${title}`)
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
        const fileSize = fs.statSync(localPath).size
        const fileSizeMB = (fileSize / 1024 / 1024).toFixed(1)
        process.stdout.write(`(${fileSizeMB}MB)`)

        // 2. Cloudflare 업로드 (TUS 사용)
        process.stdout.write(' ☁️')
        const cloudflareUid = await uploadToCloudflareWithTus(localPath, title)

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

      // 다음 파일 전 대기
      if (i < toUpload.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
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
