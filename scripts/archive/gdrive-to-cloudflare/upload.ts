/**
 * Google Drive → Cloudflare Stream VOD 자동 업로드
 *
 * 사용법:
 *   npx tsx scripts/gdrive-to-cloudflare/upload.ts --file-id FILE_ID --title "제목"
 *   npx tsx scripts/gdrive-to-cloudflare/upload.ts --folder-id FOLDER_ID --content-type vod
 */

import { google } from 'googleapis'
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
const GOOGLE_CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-credentials.json'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ============================================
// 타입 정의
// ============================================

interface UploadOptions {
  fileId?: string
  folderId?: string
  title?: string
  contentType: 'vod' | 'shorts'
  unit?: 'excel' | 'crew'
  dryRun: boolean
  limit?: number
}

interface DriveFile {
  id: string
  name: string
  size: string
  mimeType: string
}

interface CloudflareUploadResult {
  uid: string
  status: string
}

// ============================================
// Google Drive 클라이언트
// ============================================

function getGoogleDriveClient() {
  const credentialsPath = path.resolve(GOOGLE_CREDENTIALS_PATH)

  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`Google 자격 증명 파일을 찾을 수 없습니다: ${credentialsPath}\nREADME.md의 1단계를 따라 설정해주세요.`)
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })

  return google.drive({ version: 'v3', auth })
}

// ============================================
// Google Drive 파일 목록/정보 조회
// ============================================

async function getFileInfo(drive: ReturnType<typeof google.drive>, fileId: string): Promise<DriveFile> {
  const res = await drive.files.get({
    fileId,
    fields: 'id, name, size, mimeType',
  })

  return {
    id: res.data.id!,
    name: res.data.name!,
    size: res.data.size!,
    mimeType: res.data.mimeType!,
  }
}

async function listFilesInFolder(
  drive: ReturnType<typeof google.drive>,
  folderId: string,
  limit?: number
): Promise<DriveFile[]> {
  const files: DriveFile[] = []
  let pageToken: string | undefined

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and (mimeType contains 'video/')`,
      fields: 'nextPageToken, files(id, name, size, mimeType)',
      pageSize: 100,
      pageToken,
    })

    for (const file of res.data.files || []) {
      files.push({
        id: file.id!,
        name: file.name!,
        size: file.size!,
        mimeType: file.mimeType!,
      })

      if (limit && files.length >= limit) {
        return files
      }
    }

    pageToken = res.data.nextPageToken || undefined
  } while (pageToken)

  return files
}

// ============================================
// Google Drive 파일 다운로드 (스트리밍)
// ============================================

async function downloadFile(
  drive: ReturnType<typeof google.drive>,
  fileId: string,
  destPath: string,
  fileName: string
): Promise<string> {
  const filePath = path.join(destPath, fileName)
  const dest = fs.createWriteStream(filePath)

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  )

  return new Promise((resolve, reject) => {
    let downloadedBytes = 0
    const totalBytes = parseInt(res.headers['content-length'] || '0', 10)

    res.data
      .on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length
        const percent = totalBytes > 0 ? ((downloadedBytes / totalBytes) * 100).toFixed(1) : '?'
        process.stdout.write(`\r   다운로드 중: ${percent}% (${formatBytes(downloadedBytes)})`)
      })
      .on('end', () => {
        console.log(`\n   다운로드 완료: ${filePath}`)
        resolve(filePath)
      })
      .on('error', reject)
      .pipe(dest)
  })
}

// ============================================
// Cloudflare Stream 업로드 (TUS)
// ============================================

async function uploadToCloudflare(
  filePath: string,
  meta: Record<string, string>
): Promise<CloudflareUploadResult> {
  const fileSize = fs.statSync(filePath).size
  const fileName = path.basename(filePath)

  // 1. TUS 업로드 URL 생성
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
    throw new Error(`Cloudflare TUS 초기화 실패: ${initRes.status} - ${errorText}`)
  }

  const uploadUrl = initRes.headers.get('location')
  const streamMediaId = initRes.headers.get('stream-media-id')

  if (!uploadUrl || !streamMediaId) {
    throw new Error('Cloudflare 업로드 URL을 받지 못했습니다')
  }

  console.log(`   Cloudflare UID: ${streamMediaId}`)

  // 2. 청크 업로드 (5MB씩)
  const chunkSize = 5 * 1024 * 1024 // 5MB
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
    process.stdout.write(`\r   업로드 중: ${percent}% (${formatBytes(uploadedBytes)} / ${formatBytes(fileSize)})`)
  }

  console.log('\n   업로드 완료!')

  return {
    uid: streamMediaId,
    status: 'queued',
  }
}

// ============================================
// Supabase media_content 등록
// ============================================

async function registerToDatabase(
  uid: string,
  title: string,
  contentType: 'vod' | 'shorts',
  unit?: 'excel' | 'crew',
  description?: string
) {
  const { data, error } = await supabase
    .from('media_content')
    .insert({
      content_type: contentType,
      title,
      description: description || null,
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
// 유틸리티
// ============================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function parseArgs(): UploadOptions {
  const args = process.argv.slice(2)
  const options: UploadOptions = {
    contentType: 'vod',
    dryRun: false,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file-id':
        options.fileId = args[++i]
        break
      case '--folder-id':
        options.folderId = args[++i]
        break
      case '--title':
        options.title = args[++i]
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
// 메인 로직
// ============================================

async function processFile(
  drive: ReturnType<typeof google.drive>,
  file: DriveFile,
  options: UploadOptions,
  index: number,
  total: number
) {
  const title = options.title || file.name.replace(/\.[^/.]+$/, '') // 확장자 제거

  console.log(`\n[${index + 1}/${total}] ${file.name}`)
  console.log(`   크기: ${formatBytes(parseInt(file.size, 10))}`)
  console.log(`   제목: ${title}`)

  if (options.dryRun) {
    console.log('   [DRY RUN] 실제 업로드 건너뜀')
    return
  }

  // 1. 임시 폴더에 다운로드
  const tempDir = path.join(os.tmpdir(), 'rg-vod-upload')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  const localPath = await downloadFile(drive, file.id, tempDir, file.name)

  try {
    // 2. Cloudflare에 업로드
    const result = await uploadToCloudflare(localPath, {
      name: title,
      source: 'gdrive',
    })

    // 3. DB에 등록
    const dbRecord = await registerToDatabase(
      result.uid,
      title,
      options.contentType,
      options.unit
    )

    console.log(`   ✅ DB 등록 완료 (id: ${dbRecord.id})`)

    // 4. 로컬 파일 삭제
    fs.unlinkSync(localPath)
    console.log('   🗑️  임시 파일 삭제')
  } catch (error) {
    // 에러 발생 시에도 임시 파일 정리
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath)
    }
    throw error
  }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎬 Google Drive → Cloudflare Stream 업로드')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // 환경변수 체크
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('\n❌ Cloudflare 환경변수가 설정되지 않았습니다.')
    console.error('   .env.local에 CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN 추가 필요')
    console.error('   자세한 내용: scripts/gdrive-to-cloudflare/README.md')
    process.exit(1)
  }

  const options = parseArgs()

  if (!options.fileId && !options.folderId) {
    console.error('\n❌ --file-id 또는 --folder-id를 지정해주세요.')
    console.error('\n사용법:')
    console.error('  npx tsx scripts/gdrive-to-cloudflare/upload.ts --file-id FILE_ID')
    console.error('  npx tsx scripts/gdrive-to-cloudflare/upload.ts --folder-id FOLDER_ID')
    console.error('\n옵션:')
    console.error('  --title "제목"        영상 제목 (기본: 파일명)')
    console.error('  --content-type vod    vod 또는 shorts (기본: vod)')
    console.error('  --unit excel          excel 또는 crew')
    console.error('  --dry-run             테스트 실행')
    console.error('  --limit 10            최대 업로드 수')
    process.exit(1)
  }

  // Google Drive 클라이언트 초기화
  let drive: ReturnType<typeof google.drive>
  try {
    drive = getGoogleDriveClient()
    console.log('\n✅ Google Drive 연결 성공')
  } catch (error) {
    console.error('\n❌ Google Drive 연결 실패:', (error as Error).message)
    process.exit(1)
  }

  // 파일 목록 가져오기
  let files: DriveFile[] = []

  if (options.fileId) {
    const file = await getFileInfo(drive, options.fileId)
    files = [file]
    console.log(`\n📁 단일 파일: ${file.name}`)
  } else if (options.folderId) {
    files = await listFilesInFolder(drive, options.folderId, options.limit)
    console.log(`\n📁 폴더 내 영상 파일: ${files.length}개`)
  }

  if (files.length === 0) {
    console.log('\n⚠️  업로드할 파일이 없습니다.')
    return
  }

  if (options.dryRun) {
    console.log('\n🔍 [DRY RUN 모드] 실제 업로드 없이 테스트만 진행합니다.')
  }

  // 파일 처리
  let success = 0
  let failed = 0

  for (let i = 0; i < files.length; i++) {
    try {
      await processFile(drive, files[i], options, i, files.length)
      success++
    } catch (error) {
      console.error(`   ❌ 실패: ${(error as Error).message}`)
      failed++
    }
  }

  // 결과 출력
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📊 결과: 성공 ${success}개, 실패 ${failed}개`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch((error) => {
  console.error('\n❌ 오류 발생:', error.message)
  process.exit(1)
})
