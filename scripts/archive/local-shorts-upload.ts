/**
 * 로컬 폴더 → Cloudflare Stream → media_content (Shorts)
 *
 * 사용법:
 *   npx tsx scripts/local-shorts-upload.ts --folder /path/to/videos
 *   npx tsx scripts/local-shorts-upload.ts --folder /path/to/videos --dry-run
 */

import { getServiceClient } from './lib/supabase'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

const supabase = getServiceClient()

interface UploadOptions {
  folder: string
  dryRun: boolean
  limit?: number
  unit?: 'excel' | 'crew'
}

// 이미 업로드된 파일 목록 조회
async function getUploadedTitles(): Promise<Set<string>> {
  const { data } = await supabase
    .from('media_content')
    .select('title')
    .eq('content_type', 'shorts')

  const titles = new Set<string>()
  data?.forEach(item => {
    // "직캠(이름) 시그명" 형식에서 시그명 추출
    const match = item.title.match(/^직캠\([^)]+\)\s+(.+)$/)
    if (match) {
      titles.add(match[1].toLowerCase())
    }
    titles.add(item.title.toLowerCase())
  })
  return titles
}

// TUS 프로토콜을 사용한 Cloudflare Stream 업로드
async function uploadToCloudflare(filePath: string): Promise<string> {
  const fileSize = fs.statSync(filePath).size
  const fileName = path.basename(filePath)

  // 200MB 이하면 일반 업로드
  if (fileSize <= 200 * 1024 * 1024) {
    return uploadNormal(filePath)
  }

  // 200MB 초과면 TUS 업로드
  console.log(' (TUS)')

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
    const error = await createResponse.text()
    throw new Error(`TUS 초기화 실패: ${error}`)
  }

  const uploadUrl = createResponse.headers.get('location')
  if (!uploadUrl) {
    throw new Error('TUS 업로드 URL 없음')
  }

  // 2. 파일 업로드 (청크 단위)
  const fileBuffer = fs.readFileSync(filePath)
  const chunkSize = 50 * 1024 * 1024 // 50MB 청크
  let offset = 0

  while (offset < fileSize) {
    const chunk = fileBuffer.slice(offset, Math.min(offset + chunkSize, fileSize))
    const progress = Math.round((offset / fileSize) * 100)
    process.stdout.write(`\r  업로드 중... ${progress}%`)

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

  process.stdout.write(`\r  업로드 중... 100%\n`)

  // 3. UID 추출
  const uidMatch = uploadUrl.match(/\/([a-f0-9]{32})$/)
  if (!uidMatch) {
    throw new Error('Cloudflare UID 추출 실패')
  }

  return uidMatch[1]
}

// 일반 업로드 (200MB 이하)
async function uploadNormal(filePath: string): Promise<string> {
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
    throw new Error(`업로드 실패: ${data.errors?.[0]?.message || JSON.stringify(data.errors)}`)
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
  const options: UploadOptions = { folder: '', dryRun: false, unit: 'excel' }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--folder': options.folder = args[++i]; break
      case '--dry-run': options.dryRun = true; break
      case '--limit': options.limit = parseInt(args[++i], 10); break
      case '--unit': options.unit = args[++i] as 'excel' | 'crew'; break
    }
  }

  return options
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
  console.log('🎬 로컬 폴더 → Cloudflare Stream (Shorts 업로드)')
  console.log('═'.repeat(60))

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('\n❌ Cloudflare 환경변수가 설정되지 않았습니다.')
    process.exit(1)
  }

  const options = parseArgs()

  if (!options.folder) {
    console.log('\n사용법:')
    console.log('  npx tsx scripts/local-shorts-upload.ts --folder /path/to/videos')
    console.log('\n옵션:')
    console.log('  --dry-run       검증만 수행')
    console.log('  --limit <n>     처음 n개만 업로드')
    console.log('  --unit <unit>   excel 또는 crew (기본: excel)')
    process.exit(1)
  }

  if (!fs.existsSync(options.folder)) {
    console.error(`\n❌ 폴더가 존재하지 않습니다: ${options.folder}`)
    process.exit(1)
  }

  console.log(`\n📂 폴더: ${options.folder}`)
  console.log(`📋 모드: ${options.dryRun ? '🔍 검증만' : '🚀 실제 업로드'}`)
  console.log(`📋 Unit: ${options.unit}`)
  if (options.limit) console.log(`📋 제한: ${options.limit}개`)

  // 이미 업로드된 파일 확인
  const uploadedTitles = await getUploadedTitles()
  console.log(`\n📊 이미 업로드된 파일: ${uploadedTitles.size}개`)

  // 비디오 파일 목록
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']
  const allFiles = fs.readdirSync(options.folder)
    .filter(f => videoExtensions.some(ext => f.toLowerCase().endsWith(ext)))
    .sort()

  console.log(`\n📁 전체 영상 파일: ${allFiles.length}개`)

  // 이미 업로드된 파일 제외
  const filesToUpload = allFiles.filter(fileName => {
    const baseName = fileName.replace(/\.(mp4|mov|avi|mkv|webm|m4v)$/i, '').toLowerCase()
    const parts = baseName.split(' ')
    const sigName = parts.length >= 2 ? parts.slice(0, -1).join(' ') : baseName
    return !uploadedTitles.has(baseName) && !uploadedTitles.has(sigName)
  })

  console.log(`   업로드 필요: ${filesToUpload.length}개`)

  if (filesToUpload.length === 0) {
    console.log('\n⚠️ 업로드할 영상이 없습니다.')
    return
  }

  let toUpload = filesToUpload
  if (options.limit && filesToUpload.length > options.limit) {
    toUpload = filesToUpload.slice(0, options.limit)
    console.log(`\n📋 --limit ${options.limit} 적용`)
  }

  if (options.dryRun) {
    console.log('\n🔍 [DRY RUN] 검증 완료')
    toUpload.forEach((file, idx) => {
      const filePath = path.join(options.folder, file)
      const fileSize = fs.statSync(filePath).size
      const fileSizeMB = (fileSize / 1024 / 1024).toFixed(1)
      const title = extractTitle(file)
      console.log(`  ${idx + 1}. ${file} (${fileSizeMB}MB) → ${title}`)
    })
    return
  }

  console.log('\n🚀 업로드 시작...\n')

  let success = 0
  let failed = 0

  for (let i = 0; i < toUpload.length; i++) {
    const fileName = toUpload[i]
    const filePath = path.join(options.folder, fileName)
    const title = extractTitle(fileName)
    const fileSize = fs.statSync(filePath).size
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(1)

    process.stdout.write(`[${i + 1}/${toUpload.length}] ${fileName} (${fileSizeMB}MB)`)

    try {
      // 1. Cloudflare 업로드
      process.stdout.write(' ☁️')
      const cloudflareUid = await uploadToCloudflare(filePath)

      // 2. DB 저장
      process.stdout.write(' 💾')
      const mediaId = await saveToMediaContent(cloudflareUid, title, options.unit!)

      console.log(` ✅ (id: ${mediaId}, uid: ${cloudflareUid.substring(0, 8)}...)`)
      success++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(` ❌ ${msg}`)
      failed++
    }

    // 다음 파일 전 대기
    if (i < toUpload.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  console.log('\n' + '═'.repeat(60))
  console.log(`📊 결과: 성공 ${success}개, 실패 ${failed}개`)
  console.log('═'.repeat(60))
}

main().catch(err => {
  console.error('\n❌ 오류:', err.message)
  process.exit(1)
})
