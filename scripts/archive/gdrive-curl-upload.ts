/**
 * Google Drive 공개 파일 → Cloudflare Stream 업로드
 * curl을 사용해 대용량 파일 다운로드 (바이러스 검사 우회)
 */

import { createClient } from '@supabase/supabase-js'
import { execSync, spawn } from 'child_process'
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
const TEMP_DIR = path.join(os.tmpdir(), 'rg-vod-upload')

// ============================================
// Google Drive 파일 목록 (하드코딩)
// ============================================

const FILES = [
  { id: '1R9TFURxy19xIrLGuz8ofhVt2EilHTkIV', title: '엑셀부 시즌1_01화 첫 직급전' },
  { id: '11OcltaH4VuYICT0OM8Y3R-JkW-GzBrcL', title: '엑셀부 시즌1_02화 황금or벌금DAY' },
  { id: '1nbesmXzRdKpNnNkVTx8SrSwvsg-UzQMl', title: '엑셀부 시즌1_03화 조기퇴근DAY' },
  { id: '16U6GWshY8DDP4DB_XFVM0fHHEyCB9tAS', title: '엑셀부 시즌1_04화 명품데이' },
  { id: '1v7euXR7zhlVd81_Q32XzJvCm0NEVPnaY', title: '엑셀부 시즌1_05화 3 vs 9' },
]

// ============================================
// curl로 Google Drive 대용량 파일 다운로드
// ============================================

async function downloadWithCurl(fileId: string, outputPath: string): Promise<void> {
  const cookieFile = path.join(TEMP_DIR, 'cookies.txt')

  // 1단계: 초기 요청으로 쿠키 및 confirm 토큰 획득
  console.log('   📥 다운로드 준비...')

  const initUrl = `https://drive.google.com/uc?export=download&id=${fileId}`

  // 쿠키 저장하며 초기 요청
  execSync(`curl -s -c "${cookieFile}" -L "${initUrl}" -o /dev/null`, { stdio: 'pipe' })

  // 2단계: confirm 토큰으로 실제 다운로드
  // Google Drive는 대용량 파일에 대해 confirm 토큰을 요구함
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`

  console.log('   📥 다운로드 중... (대용량 파일)')

  return new Promise((resolve, reject) => {
    const curl = spawn('curl', [
      '-L',
      '-b', cookieFile,
      '-o', outputPath,
      '--progress-bar',
      downloadUrl
    ], { stdio: ['pipe', 'pipe', 'inherit'] }) // stderr로 진행 상황 표시

    curl.on('close', (code) => {
      // 쿠키 파일 삭제
      if (fs.existsSync(cookieFile)) {
        fs.unlinkSync(cookieFile)
      }

      if (code === 0) {
        const stats = fs.statSync(outputPath)
        console.log(`   ✅ 다운로드 완료: ${formatBytes(stats.size)}`)
        resolve()
      } else {
        reject(new Error(`curl 종료 코드: ${code}`))
      }
    })

    curl.on('error', reject)
  })
}

// ============================================
// Cloudflare Stream 업로드
// ============================================

async function uploadToCloudflare(filePath: string, title: string): Promise<string> {
  const fileSize = fs.statSync(filePath).size
  console.log(`   ☁️  Cloudflare 업로드 시작...`)

  // TUS 초기화
  const initRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(fileSize),
        'Upload-Metadata': `name ${Buffer.from(title).toString('base64')}`,
      },
    }
  )

  if (!initRes.ok) {
    throw new Error(`Cloudflare 초기화 실패: ${await initRes.text()}`)
  }

  const uploadUrl = initRes.headers.get('location')!
  const uid = initRes.headers.get('stream-media-id')!
  console.log(`   UID: ${uid}`)

  // 청크 업로드
  const chunkSize = 10 * 1024 * 1024 // 10MB
  const fd = fs.openSync(filePath, 'r')
  const buffer = Buffer.alloc(chunkSize)
  let uploadedBytes = 0

  while (uploadedBytes < fileSize) {
    const bytesRead = fs.readSync(fd, buffer, 0, chunkSize, uploadedBytes)
    const chunk = buffer.slice(0, bytesRead)

    const patchRes = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/offset+octet-stream',
        'Upload-Offset': String(uploadedBytes),
        'Tus-Resumable': '1.0.0',
      },
      body: chunk,
    })

    if (!patchRes.ok) {
      fs.closeSync(fd)
      throw new Error(`청크 업로드 실패: ${patchRes.status}`)
    }

    uploadedBytes += bytesRead
    const percent = ((uploadedBytes / fileSize) * 100).toFixed(1)
    process.stdout.write(`\r   ☁️  업로드: ${percent}% (${formatBytes(uploadedBytes)} / ${formatBytes(fileSize)})`)
  }

  fs.closeSync(fd)
  console.log('\n   ✅ Cloudflare 업로드 완료')

  return uid
}

// ============================================
// DB 등록
// ============================================

async function registerToDatabase(uid: string, title: string) {
  const { data, error } = await supabase
    .from('media_content')
    .insert({
      content_type: 'vod',
      title,
      video_url: `https://iframe.videodelivery.net/${uid}`,
      cloudflare_uid: uid,
      thumbnail_url: `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg`,
      unit: 'excel',
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// ============================================
// 메인
// ============================================

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎬 Google Drive → Cloudflare Stream 업로드')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // 임시 폴더 생성
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }

  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitArg = args.indexOf('--limit')
  const limit = limitArg !== -1 ? parseInt(args[limitArg + 1]) : FILES.length

  const filesToProcess = FILES.slice(0, limit)

  console.log(`\n📁 처리할 파일: ${filesToProcess.length}개`)
  filesToProcess.forEach((f, i) => console.log(`  ${i + 1}. ${f.title}`))

  if (dryRun) {
    console.log('\n🔍 [DRY RUN] 실제 업로드 없이 종료')
    return
  }

  let success = 0, failed = 0, skipped = 0

  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i]
    console.log(`\n${'━'.repeat(50)}`)
    console.log(`[${i + 1}/${filesToProcess.length}] ${file.title}`)

    // 중복 체크
    if (await checkDuplicate(file.title)) {
      console.log('   ⚠️  이미 등록됨. 건너뜀.')
      skipped++
      continue
    }

    const outputPath = path.join(TEMP_DIR, `${file.id}.mp4`)

    try {
      // 1. 다운로드
      await downloadWithCurl(file.id, outputPath)

      // 파일 크기 확인
      const stats = fs.statSync(outputPath)
      if (stats.size < 1000) {
        // 너무 작으면 에러 페이지일 가능성
        const content = fs.readFileSync(outputPath, 'utf-8')
        if (content.includes('<!DOCTYPE') || content.includes('quota')) {
          throw new Error('다운로드 실패 (HTML 응답)')
        }
      }

      // 2. Cloudflare 업로드
      const uid = await uploadToCloudflare(outputPath, file.title)

      // 3. DB 등록
      const dbRecord = await registerToDatabase(uid, file.title)
      console.log(`   ✅ DB 등록 완료 (id: ${dbRecord.id})`)

      success++
    } catch (error) {
      console.error(`   ❌ 실패: ${(error as Error).message}`)
      failed++
    } finally {
      // 4. 임시 파일 삭제
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath)
        console.log('   🗑️  임시 파일 삭제')
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📊 결과: 성공 ${success}개, 실패 ${failed}개, 건너뜀 ${skipped}개`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
