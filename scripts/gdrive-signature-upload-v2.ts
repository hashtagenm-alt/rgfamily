/**
 * Google Drive 폴더 → 로컬 다운로드 → Cloudflare Stream 업로드
 *
 * Google Drive URL 복사 방식이 안 되므로 로컬로 다운로드 후 업로드
 *
 * 사용법:
 *   npx tsx scripts/gdrive-signature-upload-v2.ts --folder-id FOLDER_ID
 *   npx tsx scripts/gdrive-signature-upload-v2.ts --folder-id FOLDER_ID --dry-run
 *   npx tsx scripts/gdrive-signature-upload-v2.ts --folder-id FOLDER_ID --member 가애
 */

import puppeteer, { Browser, Page } from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// ============================================
// 환경변수
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const TEMP_DIR = path.join(os.tmpdir(), 'rg-signature-upload')

// ============================================
// 타입
// ============================================

interface DriveItem {
  id: string
  name: string
  type: 'folder' | 'file'
}

interface VideoTask {
  fileId: string
  fileName: string
  memberName: string
  memberId: number
  sigNumber: number
  signatureId: number
}

interface UploadOptions {
  folderId: string
  dryRun: boolean
  limit?: number
  memberFilter?: string
}

// ============================================
// Puppeteer: Google Drive 아이템 조회
// ============================================

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

      // Google Drive 파일명 정리
      const cleanName = name
        .replace(/\s+동영상$/i, '')
        .replace(/\s+이미지$/i, '')
        .replace(/\s+문서$/i, '')
        .trim()

      const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']
      const isVideo = videoExtensions.some(ext => cleanName.toLowerCase().endsWith(ext))
      const hasNoExtension = !cleanName.includes('.') || cleanName.match(/^\d+$/)
      const isFolder = hasNoExtension && !isVideo

      if (isVideo) {
        results.push({ id, name: cleanName, type: 'file' })
      } else if (isFolder) {
        results.push({ id, name: cleanName, type: 'folder' })
      }
    })
    return results
  })

  return items.filter((item, idx, self) => idx === self.findIndex(i => i.id === item.id))
}

// ============================================
// Google Drive 파일 다운로드 (Puppeteer)
// ============================================

async function downloadFromGoogleDrive(
  browser: Browser,
  fileId: string,
  fileName: string
): Promise<string> {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }

  const downloadPath = path.join(TEMP_DIR, fileName)

  // 이미 다운로드된 파일이 있으면 스킵
  if (fs.existsSync(downloadPath)) {
    const stats = fs.statSync(downloadPath)
    if (stats.size > 1000) {
      return downloadPath
    }
    fs.unlinkSync(downloadPath)
  }

  const page = await browser.newPage()

  try {
    // 다운로드 경로 설정
    const client = await page.createCDPSession()
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: TEMP_DIR,
    })

    // 다운로드 URL로 이동
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
    await page.goto(downloadUrl, { waitUntil: 'networkidle2', timeout: 120000 })

    // 바이러스 스캔 경고 처리 ("그래도 다운로드" 버튼)
    await new Promise(resolve => setTimeout(resolve, 2000))

    const confirmButton = await page.$('a[id="uc-download-link"]')
    if (confirmButton) {
      await confirmButton.click()
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    // form submit 버튼 체크
    const formButton = await page.$('form button, form input[type="submit"]')
    if (formButton) {
      await formButton.click()
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    // 다운로드 완료 대기
    let attempts = 0
    const maxAttempts = 60 // 최대 60초 대기

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))

      // TEMP_DIR에서 파일 찾기
      const files = fs.readdirSync(TEMP_DIR)
      const downloadedFile = files.find(f =>
        !f.endsWith('.crdownload') && !f.endsWith('.tmp') && f !== '.DS_Store'
      )

      if (downloadedFile) {
        const currentPath = path.join(TEMP_DIR, downloadedFile)
        const stats = fs.statSync(currentPath)

        if (stats.size > 1000) {
          // 파일명이 다르면 변경
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

// ============================================
// Cloudflare Stream 직접 업로드
// ============================================

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
    const errorMsg = data.errors?.[0]?.message || JSON.stringify(data.errors)
    throw new Error(`Cloudflare 업로드 실패: ${errorMsg}`)
  }

  return data.result.uid
}

// ============================================
// 헬퍼 함수들
// ============================================

function parseSigNumber(fileName: string): number | null {
  const match = fileName.match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

function extractMemberName(folderName: string): string {
  return folderName
    .replace(/\s*공유\s*폴더$/i, '')
    .replace(/\s*공유$/i, '')
    .trim()
}

async function loadDbMappings() {
  const { data: signatures, error: sigError } = await supabase
    .from('signatures')
    .select('id, sig_number')
  if (sigError) throw new Error(`시그니처 조회 실패: ${sigError.message}`)

  const { data: members, error: memError } = await supabase
    .from('organization')
    .select('id, name')
  if (memError) throw new Error(`멤버 조회 실패: ${memError.message}`)

  const sigMap = new Map<number, number>()
  signatures?.forEach(s => sigMap.set(s.sig_number, s.id))

  const memberMap = new Map<string, number>()
  members?.forEach(m => memberMap.set(m.name, m.id))

  return { sigMap, memberMap }
}

async function saveToDatabase(signatureId: number, memberId: number, cloudflareUid: string) {
  const { data: existing } = await supabase
    .from('signature_videos')
    .select('id')
    .eq('signature_id', signatureId)
    .eq('member_id', memberId)
    .limit(1)

  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from('signature_videos')
      .update({ cloudflare_uid: cloudflareUid })
      .eq('id', existing[0].id)
    if (error) throw new Error(`DB 업데이트 실패: ${error.message}`)
    return { updated: true, id: existing[0].id }
  }

  const { data, error } = await supabase
    .from('signature_videos')
    .insert({
      signature_id: signatureId,
      member_id: memberId,
      video_url: `https://iframe.videodelivery.net/${cloudflareUid}`,
      cloudflare_uid: cloudflareUid,
    })
    .select()
    .single()

  if (error) throw new Error(`DB 삽입 실패: ${error.message}`)
  return { updated: false, id: data.id }
}

function parseArgs(): UploadOptions {
  const args = process.argv.slice(2)
  const options: UploadOptions = { folderId: '', dryRun: false }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--folder-id': options.folderId = args[++i]; break
      case '--dry-run': options.dryRun = true; break
      case '--limit': options.limit = parseInt(args[++i], 10); break
      case '--member': options.memberFilter = args[++i]; break
    }
  }

  return options
}

function cleanupTempFiles() {
  if (fs.existsSync(TEMP_DIR)) {
    const files = fs.readdirSync(TEMP_DIR)
    files.forEach(f => {
      try {
        fs.unlinkSync(path.join(TEMP_DIR, f))
      } catch {}
    })
  }
}

// ============================================
// 메인
// ============================================

async function main() {
  console.log('═'.repeat(60))
  console.log('🎬 Google Drive → Cloudflare Stream (로컬 다운로드 방식)')
  console.log('═'.repeat(60))

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('\n❌ Cloudflare 환경변수가 설정되지 않았습니다.')
    process.exit(1)
  }

  const options = parseArgs()

  if (!options.folderId) {
    console.log('\n사용법:')
    console.log('  npx tsx scripts/gdrive-signature-upload-v2.ts --folder-id FOLDER_ID')
    console.log('\n옵션:')
    console.log('  --dry-run       검증만 수행')
    console.log('  --limit <n>     처음 n개만 업로드')
    console.log('  --member <name> 특정 멤버만 업로드')
    process.exit(1)
  }

  console.log(`\n📂 폴더 ID: ${options.folderId}`)
  console.log(`📋 모드: ${options.dryRun ? '🔍 검증만' : '🚀 실제 업로드'}`)
  console.log(`📁 임시 폴더: ${TEMP_DIR}`)
  if (options.limit) console.log(`📋 제한: ${options.limit}개`)
  if (options.memberFilter) console.log(`📋 멤버 필터: ${options.memberFilter}`)

  // DB 매핑 로드
  console.log('\n📊 DB 매핑 로드 중...')
  const { sigMap, memberMap } = await loadDbMappings()
  console.log(`   시그니처: ${sigMap.size}개, 멤버: ${memberMap.size}개`)

  // 임시 폴더 정리
  cleanupTempFiles()

  // 브라우저 시작
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
    // 1단계: 폴더 스캔
    console.log('\n📁 멤버 폴더 스캔 중...')
    const topItems = await getDriveItems(page, options.folderId)
    const memberFolders = topItems.filter(item => item.type === 'folder')

    console.log(`   폴더: ${memberFolders.length}개`)

    // 멤버 필터
    let foldersToProcess = memberFolders
    if (options.memberFilter) {
      foldersToProcess = memberFolders.filter(f =>
        extractMemberName(f.name) === options.memberFilter
      )
    }

    // 2단계: 각 멤버 폴더의 영상 수집
    const tasks: VideoTask[] = []
    const errors: string[] = []

    for (const folder of foldersToProcess) {
      const memberName = extractMemberName(folder.name)
      const memberId = memberMap.get(memberName)

      if (/^\d+화?$/.test(memberName)) {
        console.log(`\n⏭️  ${folder.name} 건너뜀 (회차 폴더)`)
        continue
      }

      if (!memberId) {
        errors.push(`멤버 미등록: ${folder.name}`)
        continue
      }

      console.log(`\n🔍 ${memberName} 폴더 스캔 중...`)
      await new Promise(resolve => setTimeout(resolve, 1000))

      const videos = await getDriveItems(page, folder.id)
      const videoFiles = videos.filter(v => v.type === 'file')
      console.log(`   영상: ${videoFiles.length}개`)

      for (const video of videoFiles) {
        const sigNumber = parseSigNumber(video.name)
        if (!sigNumber) {
          errors.push(`시그번호 파싱 실패: ${memberName}/${video.name}`)
          continue
        }

        const signatureId = sigMap.get(sigNumber)
        if (!signatureId) {
          errors.push(`시그니처 미등록 (${sigNumber}): ${memberName}/${video.name}`)
          continue
        }

        tasks.push({
          fileId: video.id,
          fileName: video.name,
          memberName,
          memberId,
          sigNumber,
          signatureId,
        })
      }
    }

    // 결과 출력
    console.log('\n' + '─'.repeat(60))
    console.log(`✅ 유효한 업로드 태스크: ${tasks.length}개`)
    if (errors.length > 0) {
      console.log(`❌ 오류: ${errors.length}개`)
      errors.slice(0, 10).forEach(e => console.log(`   - ${e}`))
    }

    if (tasks.length === 0) {
      await browser.close()
      return
    }

    let toUpload = tasks
    if (options.limit && tasks.length > options.limit) {
      toUpload = tasks.slice(0, options.limit)
      console.log(`\n📋 --limit ${options.limit} 적용`)
    }

    if (options.dryRun) {
      console.log('\n🔍 [DRY RUN] 검증 완료')
      toUpload.slice(0, 20).forEach((task, idx) => {
        console.log(`  ${idx + 1}. ${task.memberName}/${task.fileName} → sig:${task.sigNumber}`)
      })
      await browser.close()
      return
    }

    // 3단계: 다운로드 → 업로드
    console.log('\n🚀 업로드 시작...\n')

    let success = 0
    let failed = 0
    let updated = 0

    for (let i = 0; i < toUpload.length; i++) {
      const task = toUpload[i]
      const displayName = `${task.memberName}/${task.fileName}`
      process.stdout.write(`[${i + 1}/${toUpload.length}] ${displayName}`)

      try {
        // 1. Google Drive에서 다운로드
        process.stdout.write(' 📥')
        const localPath = await downloadFromGoogleDrive(browser, task.fileId, task.fileName)

        // 2. Cloudflare에 업로드
        process.stdout.write(' ☁️')
        const cloudflareUid = await uploadToCloudflare(localPath, `${task.sigNumber}_${task.memberName}`)

        // 3. DB 저장
        process.stdout.write(' 💾')
        const result = await saveToDatabase(task.signatureId, task.memberId, cloudflareUid)

        // 4. 로컬 파일 삭제
        fs.unlinkSync(localPath)

        if (result.updated) {
          console.log(` ✅ 업데이트 (${cloudflareUid})`)
          updated++
        } else {
          console.log(` ✅ 신규 (${cloudflareUid})`)
        }
        success++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(` ❌ ${msg}`)
        failed++
      }

      // 다음 파일 전 잠시 대기
      if (i < toUpload.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // 최종 결과
    console.log('\n' + '═'.repeat(60))
    console.log(`📊 결과: 성공 ${success}개 (신규: ${success - updated}, 업데이트: ${updated}), 실패 ${failed}개`)

    if (success > 0) {
      console.log('\n⏳ Cloudflare에서 인코딩 중...')
      console.log(`   https://dash.cloudflare.com/${CLOUDFLARE_ACCOUNT_ID}/stream`)
    }

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
