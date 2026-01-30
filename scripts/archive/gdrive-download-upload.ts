/**
 * Google Drive 공개 파일 → Cloudflare Stream 업로드
 * gdown 방식으로 바이러스 검사 우회
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as https from 'https'
import * as http from 'http'
import { URL } from 'url'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const TEMP_DIR = path.join(os.tmpdir(), 'rg-vod-upload')

// 파일 목록
const FILES = [
  { id: '1R9TFURxy19xIrLGuz8ofhVt2EilHTkIV', title: '엑셀부 시즌1_01화 첫 직급전' },
  { id: '11OcltaH4VuYICT0OM8Y3R-JkW-GzBrcL', title: '엑셀부 시즌1_02화 황금or벌금DAY' },
  { id: '1nbesmXzRdKpNnNkVTx8SrSwvsg-UzQMl', title: '엑셀부 시즌1_03화 조기퇴근DAY' },
  { id: '16U6GWshY8DDP4DB_XFVM0fHHEyCB9tAS', title: '엑셀부 시즌1_04화 명품데이' },
  { id: '1v7euXR7zhlVd81_Q32XzJvCm0NEVPnaY', title: '엑셀부 시즌1_05화 3 vs 9' },
]

// ============================================
// Google Drive 다운로드 (gdown 방식)
// ============================================

interface CookieJar {
  [key: string]: string
}

function parseCookies(setCookieHeader: string[]): CookieJar {
  const cookies: CookieJar = {}
  for (const cookie of setCookieHeader) {
    const parts = cookie.split(';')[0].split('=')
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join('=').trim()
    }
  }
  return cookies
}

function cookiesToString(cookies: CookieJar): string {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')
}

async function httpGet(
  url: string,
  cookies: CookieJar = {},
  followRedirect = true
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: Buffer; cookies: CookieJar }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Cookie': cookiesToString(cookies),
      },
    }

    const req = https.get(options, (res) => {
      // 쿠키 업데이트
      const newCookies = { ...cookies }
      const setCookies = res.headers['set-cookie'] || []
      Object.assign(newCookies, parseCookies(setCookies))

      // 리다이렉트 처리
      if (followRedirect && res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : `https://${parsedUrl.hostname}${res.headers.location}`
        resolve(httpGet(redirectUrl, newCookies, true))
        return
      }

      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          body: Buffer.concat(chunks),
          cookies: newCookies,
        })
      })
    })

    req.on('error', reject)
  })
}

async function downloadFromGoogleDrive(fileId: string, outputPath: string): Promise<void> {
  console.log('   📥 다운로드 준비...')

  const baseUrl = `https://drive.google.com/uc?export=download&id=${fileId}`

  // 1단계: 초기 요청
  const res1 = await httpGet(baseUrl, {}, false)
  let cookies = res1.cookies
  let body = res1.body.toString()

  // 2단계: 대용량 파일 확인 (바이러스 검사 경고 페이지)
  let downloadUrl = baseUrl

  // confirm 토큰 추출 시도
  const confirmMatch = body.match(/confirm=([a-zA-Z0-9_-]+)/) ||
                       body.match(/name="confirm" value="([^"]+)"/) ||
                       body.match(/&amp;confirm=([^&"]+)/)

  if (confirmMatch) {
    const confirmToken = confirmMatch[1]
    downloadUrl = `${baseUrl}&confirm=${confirmToken}`
    console.log('   📥 대용량 파일 확인 (confirm 토큰 획득)')
  }

  // UUID 토큰 추출 (새로운 Google Drive 형식)
  const uuidMatch = body.match(/name="uuid" value="([^"]+)"/)
  if (uuidMatch) {
    const uuid = uuidMatch[1]
    downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t&uuid=${uuid}`
    console.log('   📥 대용량 파일 확인 (UUID 토큰 획득)')
  }

  // at 토큰 추출 (또 다른 형식)
  const atMatch = body.match(/name="at" value="([^"]+)"/)
  if (atMatch) {
    const at = atMatch[1]
    downloadUrl += `&at=${at}`
  }

  // 3단계: 실제 다운로드
  console.log('   📥 다운로드 중...')

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(downloadUrl)
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Cookie': cookiesToString(cookies),
      },
    }

    const makeRequest = (url: URL, redirectCount = 0): void => {
      if (redirectCount > 10) {
        reject(new Error('너무 많은 리다이렉트'))
        return
      }

      const reqOptions = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Cookie': cookiesToString(cookies),
        },
      }

      https.get(reqOptions, (res) => {
        // 쿠키 업데이트
        const setCookies = res.headers['set-cookie'] || []
        Object.assign(cookies, parseCookies(setCookies))

        // 리다이렉트 처리
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = res.headers.location.startsWith('http')
            ? new URL(res.headers.location)
            : new URL(res.headers.location, `https://${url.hostname}`)
          makeRequest(redirectUrl, redirectCount + 1)
          return
        }

        // Content-Type 확인
        const contentType = res.headers['content-type'] || ''
        if (contentType.includes('text/html')) {
          // HTML 응답이면 에러
          const chunks: Buffer[] = []
          res.on('data', (chunk) => chunks.push(chunk))
          res.on('end', () => {
            const html = Buffer.concat(chunks).toString()
            if (html.includes('quota') || html.includes('exceeded')) {
              reject(new Error('Google Drive 다운로드 할당량 초과'))
            } else {
              reject(new Error('다운로드 실패 (HTML 응답)'))
            }
          })
          return
        }

        // 파일 다운로드
        const totalSize = parseInt(res.headers['content-length'] || '0', 10)
        const writeStream = fs.createWriteStream(outputPath)
        let downloadedSize = 0
        let lastPercent = 0

        res.on('data', (chunk) => {
          writeStream.write(chunk)
          downloadedSize += chunk.length

          if (totalSize > 0) {
            const percent = Math.floor((downloadedSize / totalSize) * 100)
            if (percent > lastPercent) {
              process.stdout.write(`\r   📥 다운로드: ${percent}% (${formatBytes(downloadedSize)} / ${formatBytes(totalSize)})`)
              lastPercent = percent
            }
          } else {
            process.stdout.write(`\r   📥 다운로드: ${formatBytes(downloadedSize)}`)
          }
        })

        res.on('end', () => {
          writeStream.end()
          console.log(`\n   ✅ 다운로드 완료: ${formatBytes(downloadedSize)}`)
          resolve()
        })

        res.on('error', (err) => {
          writeStream.end()
          reject(err)
        })
      }).on('error', reject)
    }

    makeRequest(new URL(downloadUrl))
  })
}

// ============================================
// Cloudflare 업로드
// ============================================

async function uploadToCloudflare(filePath: string, title: string): Promise<string> {
  const fileSize = fs.statSync(filePath).size
  console.log(`   ☁️  Cloudflare 업로드 시작...`)

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

  if (!initRes.ok) throw new Error(`Cloudflare 초기화 실패: ${await initRes.text()}`)

  const uploadUrl = initRes.headers.get('location')!
  const uid = initRes.headers.get('stream-media-id')!
  console.log(`   UID: ${uid}`)

  // 청크 업로드
  const chunkSize = 10 * 1024 * 1024
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
    console.log('\n🔍 [DRY RUN]')
    return
  }

  let success = 0, failed = 0, skipped = 0

  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i]
    console.log(`\n${'━'.repeat(50)}`)
    console.log(`[${i + 1}/${filesToProcess.length}] ${file.title}`)

    if (await checkDuplicate(file.title)) {
      console.log('   ⚠️  이미 등록됨. 건너뜀.')
      skipped++
      continue
    }

    const outputPath = path.join(TEMP_DIR, `${file.id}.mp4`)

    try {
      await downloadFromGoogleDrive(file.id, outputPath)

      const stats = fs.statSync(outputPath)
      if (stats.size < 100000) { // 100KB 미만이면 에러 가능성
        throw new Error(`파일 크기 이상 (${formatBytes(stats.size)})`)
      }

      const uid = await uploadToCloudflare(outputPath, file.title)
      const dbRecord = await registerToDatabase(uid, file.title)
      console.log(`   ✅ DB 등록 완료 (id: ${dbRecord.id})`)

      success++
    } catch (error) {
      console.error(`   ❌ 실패: ${(error as Error).message}`)
      failed++
    } finally {
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
