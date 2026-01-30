/**
 * Google Drive → Cloudflare Stream 직접 업로드 (로컬 다운로드 없음)
 *
 * Google Drive 파일을 "링크가 있는 모든 사용자"로 공유하면
 * Cloudflare가 직접 URL에서 영상을 가져옵니다.
 *
 * 사용법:
 *   npx tsx scripts/gdrive-to-cloudflare-direct.ts --file-id FILE_ID --title "제목"
 *   npx tsx scripts/gdrive-to-cloudflare-direct.ts --file-ids "ID1,ID2,ID3"
 *   npx tsx scripts/gdrive-to-cloudflare-direct.ts --file-list files.txt
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as readline from 'readline'
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

interface FileInfo {
  id: string
  title: string
}

interface UploadOptions {
  files: FileInfo[]
  contentType: 'vod' | 'shorts'
  unit?: 'excel' | 'crew'
  dryRun: boolean
}

// ============================================
// Google Drive 직접 다운로드 URL 생성
// ============================================

function getGoogleDriveDirectUrl(fileId: string): string {
  // 방법 1: 직접 다운로드 URL (작은 파일용)
  // return `https://drive.google.com/uc?export=download&id=${fileId}`

  // 방법 2: 구글 드라이브 viewer URL (더 안정적)
  return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`
}

// ============================================
// Cloudflare Stream URL Copy (직접 전송)
// ============================================

async function uploadFromUrl(
  url: string,
  meta: { name: string }
): Promise<{ uid: string; status: string }> {
  console.log(`   URL: ${url}`)

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
        meta: {
          name: meta.name,
        },
        // 큰 파일 허용
        requireSignedURLs: false,
        allowedOrigins: ['rgfamily.kr', 'www.rgfamily.kr', 'localhost:3000'],
      }),
    }
  )

  const data = await response.json()

  if (!response.ok || !data.success) {
    const errorMsg = data.errors?.[0]?.message || JSON.stringify(data.errors) || 'Unknown error'
    throw new Error(`Cloudflare 업로드 실패: ${errorMsg}`)
  }

  return {
    uid: data.result.uid,
    status: data.result.status?.state || 'queued',
  }
}

// ============================================
// Cloudflare 영상 상태 확인
// ============================================

async function checkVideoStatus(uid: string): Promise<string> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
    {
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
    }
  )

  const data = await response.json()
  return data.result?.status?.state || 'unknown'
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
// 파일 목록 파싱
// ============================================

function parseFileList(filePath: string): FileInfo[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())

  return lines.map(line => {
    const parts = line.split('|').map(s => s.trim())
    if (parts.length >= 2) {
      return { id: parts[0], title: parts[1] }
    }
    // ID만 있는 경우 ID를 제목으로 사용
    return { id: parts[0], title: parts[0] }
  })
}

function parseArgs(): UploadOptions {
  const args = process.argv.slice(2)
  const options: UploadOptions = {
    files: [],
    contentType: 'vod',
    dryRun: false,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file-id':
        const fileId = args[++i]
        const title = args[i + 1] === '--title' ? args[i + 2] : fileId
        options.files.push({ id: fileId, title })
        break
      case '--title':
        // --file-id에서 처리
        i++
        break
      case '--file-ids':
        const ids = args[++i].split(',')
        ids.forEach(id => options.files.push({ id: id.trim(), title: id.trim() }))
        break
      case '--file-list':
        options.files = parseFileList(args[++i])
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
    }
  }

  return options
}

// ============================================
// 인터랙티브 파일 입력
// ============================================

async function interactiveInput(): Promise<FileInfo[]> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const question = (prompt: string): Promise<string> => {
    return new Promise(resolve => rl.question(prompt, resolve))
  }

  console.log('\n📋 파일 정보를 입력하세요. (빈 줄 입력시 종료)\n')
  console.log('형식: 파일ID | 제목')
  console.log('예시: 1abc123xyz | 시즌1 1화 풀영상\n')

  const files: FileInfo[] = []

  while (true) {
    const input = await question(`[${files.length + 1}] `)

    if (!input.trim()) {
      break
    }

    const parts = input.split('|').map(s => s.trim())
    if (parts.length >= 2) {
      files.push({ id: parts[0], title: parts[1] })
    } else if (parts[0]) {
      files.push({ id: parts[0], title: parts[0] })
    }
  }

  rl.close()
  return files
}

// ============================================
// 메인 로직
// ============================================

async function processFile(
  file: FileInfo,
  options: UploadOptions,
  index: number,
  total: number
) {
  console.log(`\n[${index + 1}/${total}] ${file.title}`)
  console.log(`   파일 ID: ${file.id}`)

  // 중복 체크
  const isDuplicate = await checkDuplicate(file.title)
  if (isDuplicate) {
    console.log('   ⚠️  이미 등록된 제목입니다. 건너뜀.')
    return { skipped: true }
  }

  if (options.dryRun) {
    console.log('   [DRY RUN] 실제 업로드 건너뜀')
    return { skipped: false }
  }

  // Google Drive 직접 URL 생성
  const directUrl = getGoogleDriveDirectUrl(file.id)

  // Cloudflare에 URL 전송
  const result = await uploadFromUrl(directUrl, { name: file.title })

  console.log(`   ✅ Cloudflare UID: ${result.uid}`)
  console.log(`   📊 상태: ${result.status} (인코딩 중...)`)

  // DB에 등록
  const dbRecord = await registerToDatabase(
    result.uid,
    file.title,
    options.contentType,
    options.unit
  )

  console.log(`   ✅ DB 등록 완료 (id: ${dbRecord.id})`)

  return { skipped: false, uid: result.uid }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🚀 Google Drive → Cloudflare Stream 직접 전송')
  console.log('   (로컬 다운로드 없이 URL로 직접 업로드)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // 환경변수 체크
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('\n❌ Cloudflare 환경변수가 설정되지 않았습니다.')
    process.exit(1)
  }

  let options = parseArgs()

  // 파일이 없으면 인터랙티브 모드
  if (options.files.length === 0) {
    console.log('\n⚠️  파일이 지정되지 않았습니다.')
    console.log('\n사용법:')
    console.log('  npx tsx scripts/gdrive-to-cloudflare-direct.ts --file-id FILE_ID --title "제목"')
    console.log('  npx tsx scripts/gdrive-to-cloudflare-direct.ts --file-ids "ID1,ID2,ID3"')
    console.log('  npx tsx scripts/gdrive-to-cloudflare-direct.ts --file-list files.txt')
    console.log('\n옵션:')
    console.log('  --content-type vod   vod 또는 shorts (기본: vod)')
    console.log('  --unit excel         excel 또는 crew')
    console.log('  --dry-run            테스트 실행')
    console.log('\n📝 files.txt 형식:')
    console.log('  파일ID1 | 제목1')
    console.log('  파일ID2 | 제목2')
    console.log('\n⚠️  중요: Google Drive 파일을 "링크가 있는 모든 사용자"로 공유해야 합니다!')

    // 인터랙티브 입력 시도
    const files = await interactiveInput()
    if (files.length === 0) {
      console.log('\n업로드할 파일이 없습니다.')
      return
    }
    options.files = files
  }

  console.log(`\n📁 업로드할 파일: ${options.files.length}개`)

  if (options.dryRun) {
    console.log('🔍 [DRY RUN 모드] 실제 업로드 없이 테스트만 진행합니다.')
  }

  // 파일 목록 출력
  console.log('\n파일 목록:')
  options.files.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.title} (ID: ${f.id})`)
  })

  // 파일 처리
  let success = 0
  let failed = 0
  let skipped = 0
  const uploadedUids: string[] = []

  for (let i = 0; i < options.files.length; i++) {
    try {
      const result = await processFile(options.files[i], options, i, options.files.length)
      if (result.skipped) {
        skipped++
      } else {
        success++
        if (result.uid) {
          uploadedUids.push(result.uid)
        }
      }
    } catch (error) {
      console.error(`   ❌ 실패: ${(error as Error).message}`)
      failed++
    }
  }

  // 결과 출력
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📊 결과: 성공 ${success}개, 실패 ${failed}개, 건너뜀 ${skipped}개`)

  if (uploadedUids.length > 0) {
    console.log('\n📹 업로드된 영상 (인코딩 진행 중):')
    uploadedUids.forEach(uid => {
      console.log(`   https://dash.cloudflare.com/stream/${uid}`)
    })
    console.log('\n⏳ Cloudflare에서 인코딩 완료까지 몇 분 소요됩니다.')
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch((error) => {
  console.error('\n❌ 오류 발생:', error.message)
  process.exit(1)
})
