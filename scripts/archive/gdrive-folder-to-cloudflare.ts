/**
 * Google Drive 공개 폴더 → Cloudflare Stream 전체 업로드
 *
 * Google Drive 폴더가 "링크가 있는 모든 사용자"로 공유되어 있으면
 * puppeteer로 파일 목록을 추출하고 Cloudflare에 직접 업로드합니다.
 *
 * 사용법:
 *   npx tsx scripts/gdrive-folder-to-cloudflare.ts --folder-id FOLDER_ID
 *   npx tsx scripts/gdrive-folder-to-cloudflare.ts --folder-id FOLDER_ID --dry-run
 */

import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
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

// ============================================
// 타입 정의
// ============================================

interface DriveFile {
  id: string
  name: string
  type: string
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

  // User-Agent 설정
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  )

  const folderUrl = `https://drive.google.com/drive/folders/${folderId}`
  console.log(`   URL: ${folderUrl}`)

  await page.goto(folderUrl, { waitUntil: 'networkidle2', timeout: 60000 })

  // 페이지 로딩 대기
  await new Promise(resolve => setTimeout(resolve, 3000))

  // 스크롤하여 모든 파일 로드
  let previousHeight = 0
  let scrollAttempts = 0
  const maxScrollAttempts = 10

  while (scrollAttempts < maxScrollAttempts) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight)
    if (currentHeight === previousHeight) {
      break
    }
    previousHeight = currentHeight
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await new Promise(resolve => setTimeout(resolve, 1000))
    scrollAttempts++
  }

  // 파일 정보 추출 (data-id 속성에서 파일 ID 추출)
  const files = await page.evaluate(() => {
    const items: { id: string; name: string; type: string }[] = []

    // Google Drive의 파일 아이템 선택자
    const fileElements = document.querySelectorAll('[data-id]')

    fileElements.forEach((el) => {
      const id = el.getAttribute('data-id')
      if (!id || id.length < 10) return // 폴더 ID는 보통 긴 문자열

      // 파일명 추출 시도
      const nameEl = el.querySelector('[data-tooltip]') as HTMLElement
      const name = nameEl?.getAttribute('data-tooltip') ||
                   nameEl?.textContent ||
                   el.textContent?.trim().split('\n')[0] ||
                   id

      // 영상 파일 확장자 체크
      const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.MP4', '.MOV']
      const isVideo = videoExtensions.some(ext => name.toLowerCase().includes(ext.toLowerCase()))

      if (isVideo) {
        items.push({
          id,
          name: name.trim(),
          type: 'video',
        })
      }
    })

    return items
  })

  await browser.close()

  // 중복 제거
  const uniqueFiles = files.filter((file, index, self) =>
    index === self.findIndex(f => f.id === file.id)
  )

  console.log(`   ✅ ${uniqueFiles.length}개 영상 파일 발견`)

  return uniqueFiles
}

// ============================================
// Google Drive 직접 다운로드 URL
// ============================================

function getGoogleDriveDirectUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`
}

// ============================================
// Cloudflare Stream URL Copy
// ============================================

async function uploadToCloudflare(
  fileId: string,
  title: string
): Promise<{ uid: string; status: string }> {
  const url = getGoogleDriveDirectUrl(fileId)

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/copy`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        meta: { name: title },
        requireSignedURLs: false,
        allowedOrigins: ['rgfamily.kr', 'www.rgfamily.kr', 'localhost:3000'],
      }),
    }
  )

  const data = await response.json()

  if (!response.ok || !data.success) {
    const errorMsg = data.errors?.[0]?.message || JSON.stringify(data.errors)
    throw new Error(`Cloudflare 업로드 실패: ${errorMsg}`)
  }

  return {
    uid: data.result.uid,
    status: data.result.status?.state || 'queued',
  }
}

// ============================================
// Supabase media_content 등록
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
      description: null,
      video_url: `https://iframe.videodelivery.net/${uid}`,
      cloudflare_uid: uid,
      thumbnail_url: `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`,
      unit: unit || null,
      is_featured: false,
      view_count: 0,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`DB 등록 실패: ${error.message}`)
  }

  return data
}

// ============================================
// 중복 체크
// ============================================

async function checkDuplicate(title: string): Promise<boolean> {
  const { data } = await supabase
    .from('media_content')
    .select('id')
    .eq('title', title)
    .limit(1)

  return (data && data.length > 0)
}

// ============================================
// Args 파싱
// ============================================

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
// 파일명에서 제목 추출
// ============================================

function extractTitle(filename: string): string {
  // 확장자 제거
  return filename.replace(/\.[^/.]+$/, '').trim()
}

// ============================================
// 메인 로직
// ============================================

async function processFile(
  file: DriveFile,
  options: UploadOptions,
  index: number,
  total: number
): Promise<{ skipped: boolean; uid?: string }> {
  const title = extractTitle(file.name)

  console.log(`\n[${index + 1}/${total}] ${file.name}`)
  console.log(`   파일 ID: ${file.id}`)
  console.log(`   제목: ${title}`)

  // 중복 체크
  const isDuplicate = await checkDuplicate(title)
  if (isDuplicate) {
    console.log('   ⚠️  이미 등록된 제목입니다. 건너뜀.')
    return { skipped: true }
  }

  if (options.dryRun) {
    console.log('   [DRY RUN] 실제 업로드 건너뜀')
    return { skipped: false }
  }

  // Cloudflare에 업로드
  const result = await uploadToCloudflare(file.id, title)
  console.log(`   ✅ Cloudflare UID: ${result.uid}`)

  // DB 등록
  const dbRecord = await registerToDatabase(result.uid, title, options.contentType, options.unit)
  console.log(`   ✅ DB 등록 완료 (id: ${dbRecord.id})`)

  return { skipped: false, uid: result.uid }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🚀 Google Drive 폴더 → Cloudflare Stream 전체 업로드')
  console.log('   (로컬 다운로드 없이 직접 전송)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // 환경변수 체크
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('\n❌ Cloudflare 환경변수가 설정되지 않았습니다.')
    process.exit(1)
  }

  const options = parseArgs()

  if (!options.folderId) {
    console.error('\n❌ --folder-id 옵션을 지정해주세요.')
    console.error('\n사용법:')
    console.error('  npx tsx scripts/gdrive-folder-to-cloudflare.ts --folder-id FOLDER_ID')
    console.error('\n옵션:')
    console.error('  --content-type vod   vod 또는 shorts (기본: vod)')
    console.error('  --unit excel         excel 또는 crew')
    console.error('  --dry-run            테스트 실행')
    console.error('  --limit 10           최대 업로드 수')
    console.error('\n폴더 ID 찾기:')
    console.error('  URL: https://drive.google.com/drive/folders/FOLDER_ID_HERE')
    console.error('\n⚠️  폴더가 "링크가 있는 모든 사용자"로 공유되어 있어야 합니다!')
    process.exit(1)
  }

  // Google Drive에서 파일 목록 추출
  let files: DriveFile[]
  try {
    files = await getFilesFromGoogleDrive(options.folderId)
  } catch (error) {
    console.error(`\n❌ Google Drive 접근 실패: ${(error as Error).message}`)
    process.exit(1)
  }

  if (files.length === 0) {
    console.log('\n⚠️  폴더에 영상 파일이 없습니다.')
    return
  }

  // limit 적용
  if (options.limit && files.length > options.limit) {
    files = files.slice(0, options.limit)
    console.log(`\n📋 --limit ${options.limit} 적용: ${files.length}개만 처리`)
  }

  // 파일 목록 출력
  console.log('\n📁 영상 파일 목록:')
  files.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.name}`)
  })

  if (options.dryRun) {
    console.log('\n🔍 [DRY RUN 모드] 실제 업로드 없이 테스트만 진행합니다.')
  }

  // 업로드 처리
  let success = 0
  let failed = 0
  let skipped = 0
  const uploadedUids: string[] = []

  for (let i = 0; i < files.length; i++) {
    try {
      const result = await processFile(files[i], options, i, files.length)
      if (result.skipped) {
        skipped++
      } else {
        success++
        if (result.uid) uploadedUids.push(result.uid)
      }
    } catch (error) {
      console.error(`   ❌ 실패: ${(error as Error).message}`)
      failed++
    }

    // API 제한 방지를 위한 딜레이
    if (!options.dryRun && i < files.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  // 결과 출력
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📊 결과: 성공 ${success}개, 실패 ${failed}개, 건너뜀 ${skipped}개`)

  if (uploadedUids.length > 0) {
    console.log('\n⏳ Cloudflare에서 인코딩 진행 중...')
    console.log('   인코딩 완료까지 영상 길이에 따라 몇 분~몇 시간 소요됩니다.')
    console.log('\n📺 Cloudflare Dashboard에서 확인:')
    console.log(`   https://dash.cloudflare.com/${CLOUDFLARE_ACCOUNT_ID}/stream`)
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch((error) => {
  console.error('\n❌ 오류 발생:', error.message)
  process.exit(1)
})
