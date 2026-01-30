/**
 * Google Drive 폴더 → Cloudflare Stream → signature_videos 테이블 업로드
 *
 * Google Drive 폴더 구조:
 *   {folder_id}/
 *     ├── 린아/
 *     │   ├── 777.mp4
 *     │   ├── 1000.mp4
 *     ├── 가애/
 *     │   ├── 777.mp4
 *     └── ...
 *
 * 사용법:
 *   npx tsx scripts/gdrive-signature-upload.ts --folder-id FOLDER_ID
 *   npx tsx scripts/gdrive-signature-upload.ts --folder-id FOLDER_ID --dry-run
 *   npx tsx scripts/gdrive-signature-upload.ts --folder-id FOLDER_ID --member 가애
 *
 * 필수 환경변수:
 *   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, SUPABASE_SERVICE_ROLE_KEY
 */

import puppeteer, { Browser, Page } from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
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

  // 스크롤하여 모든 아이템 로드
  let previousHeight = 0
  for (let i = 0; i < 10; i++) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight)
    if (currentHeight === previousHeight) break
    previousHeight = currentHeight
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // 아이템 추출
  const items = await page.evaluate(() => {
    const results: { id: string; name: string; type: 'folder' | 'file' }[] = []
    const fileElements = document.querySelectorAll('[data-id]')

    fileElements.forEach((el) => {
      const id = el.getAttribute('data-id')
      if (!id || id.length < 10) return

      const nameEl = el.querySelector('[data-tooltip]') as HTMLElement
      const name = nameEl?.getAttribute('data-tooltip') ||
                   nameEl?.textContent?.trim() ||
                   el.textContent?.trim().split('\n')[0] || ''

      if (!name) return

      // Google Drive는 파일명 뒤에 "동영상", "이미지" 등을 붙임
      // "1000 가애.mp4 동영상" → "1000 가애.mp4"
      const cleanName = name
        .replace(/\s+동영상$/i, '')
        .replace(/\s+이미지$/i, '')
        .replace(/\s+문서$/i, '')
        .trim()

      const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']
      const isVideo = videoExtensions.some(ext => cleanName.toLowerCase().endsWith(ext))

      // 확장자가 없고 폴더 아이콘이 있으면 폴더
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

  // 중복 제거
  const unique = items.filter((item, idx, self) =>
    idx === self.findIndex(i => i.id === item.id)
  )

  return unique
}

// ============================================
// Cloudflare Stream: URL Copy
// ============================================

async function uploadToCloudflare(fileId: string, title: string): Promise<string> {
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/copy`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: downloadUrl,
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

  return data.result.uid
}

// ============================================
// 시그니처 번호 파싱
// ============================================

function parseSigNumber(fileName: string): number | null {
  // "777.mp4", "1000 린아.mp4", "1000_린아.mp4" 등 지원
  const match = fileName.match(/^(\d+)/)
  if (match) {
    return parseInt(match[1], 10)
  }
  return null
}

// ============================================
// 폴더명에서 멤버 이름 추출
// ============================================

function extractMemberName(folderName: string): string {
  // "가애 공유 폴더" → "가애"
  // "린아 공유 폴더" → "린아"
  // "01화" 등 숫자로 시작하면 그대로 반환
  const cleaned = folderName
    .replace(/\s*공유\s*폴더$/i, '')
    .replace(/\s*공유$/i, '')
    .trim()
  return cleaned
}

// ============================================
// DB 조회: 시그니처, 멤버 매핑
// ============================================

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

// ============================================
// DB 저장: signature_videos
// ============================================

async function saveToDatabase(
  signatureId: number,
  memberId: number,
  cloudflareUid: string
) {
  // 중복 체크
  const { data: existing } = await supabase
    .from('signature_videos')
    .select('id')
    .eq('signature_id', signatureId)
    .eq('member_id', memberId)
    .limit(1)

  if (existing && existing.length > 0) {
    // 기존 레코드 업데이트
    const { error } = await supabase
      .from('signature_videos')
      .update({ cloudflare_uid: cloudflareUid })
      .eq('id', existing[0].id)

    if (error) throw new Error(`DB 업데이트 실패: ${error.message}`)
    return { updated: true, id: existing[0].id }
  }

  // 새 레코드 삽입
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

// ============================================
// Args 파싱
// ============================================

function parseArgs(): UploadOptions {
  const args = process.argv.slice(2)
  const options: UploadOptions = {
    folderId: '',
    dryRun: false,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--folder-id':
        options.folderId = args[++i]
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--limit':
        options.limit = parseInt(args[++i], 10)
        break
      case '--member':
        options.memberFilter = args[++i]
        break
    }
  }

  return options
}

// ============================================
// 메인
// ============================================

async function main() {
  console.log('═'.repeat(60))
  console.log('🎬 Google Drive → Cloudflare Stream → signature_videos')
  console.log('═'.repeat(60))

  // 환경변수 체크
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('\n❌ Cloudflare 환경변수가 설정되지 않았습니다.')
    process.exit(1)
  }

  const options = parseArgs()

  if (!options.folderId) {
    console.log('\n사용법:')
    console.log('  npx tsx scripts/gdrive-signature-upload.ts --folder-id FOLDER_ID')
    console.log('')
    console.log('옵션:')
    console.log('  --dry-run       검증만 수행')
    console.log('  --limit <n>     처음 n개만 업로드')
    console.log('  --member <name> 특정 멤버만 업로드')
    console.log('')
    console.log('폴더 ID:')
    console.log('  URL에서 추출: https://drive.google.com/drive/folders/FOLDER_ID')
    console.log('')
    console.log('⚠️  폴더가 "링크가 있는 모든 사용자"로 공유되어 있어야 합니다!')
    process.exit(1)
  }

  console.log(`\n📂 폴더 ID: ${options.folderId}`)
  console.log(`📋 모드: ${options.dryRun ? '🔍 검증만 (dry-run)' : '🚀 실제 업로드'}`)
  if (options.limit) console.log(`📋 제한: ${options.limit}개`)
  if (options.memberFilter) console.log(`📋 멤버 필터: ${options.memberFilter}`)

  // DB 매핑 로드
  console.log('\n📊 DB 매핑 로드 중...')
  const { sigMap, memberMap } = await loadDbMappings()
  console.log(`   시그니처: ${sigMap.size}개, 멤버: ${memberMap.size}개`)

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
    // 1단계: 최상위 폴더에서 멤버 폴더 조회
    console.log('\n📁 멤버 폴더 스캔 중...')
    const topItems = await getDriveItems(page, options.folderId)

    const memberFolders = topItems.filter(item => item.type === 'folder')
    const topVideos = topItems.filter(item => item.type === 'file')

    console.log(`   폴더: ${memberFolders.length}개`)
    console.log(`   영상(최상위): ${topVideos.length}개`)

    if (memberFolders.length === 0 && topVideos.length === 0) {
      console.log('\n⚠️  폴더에 아이템이 없습니다.')
      console.log('   - 폴더가 공개 공유되어 있는지 확인하세요.')
      console.log('   - "링크가 있는 모든 사용자"로 설정해야 합니다.')
      await browser.close()
      return
    }

    // 멤버 필터 적용
    let foldersToProcess = memberFolders
    if (options.memberFilter) {
      foldersToProcess = memberFolders.filter(f => {
        const memberName = extractMemberName(f.name)
        return memberName === options.memberFilter
      })
      if (foldersToProcess.length === 0) {
        console.log(`\n⚠️  멤버 '${options.memberFilter}' 폴더를 찾을 수 없습니다.`)
        console.log('   사용 가능한 폴더:', memberFolders.map(f => extractMemberName(f.name)).join(', '))
        await browser.close()
        return
      }
    }

    console.log('\n📂 처리할 멤버 폴더:')
    foldersToProcess.forEach(f => console.log(`   - ${f.name}`))

    // 2단계: 각 멤버 폴더의 영상 수집
    const tasks: VideoTask[] = []
    const errors: string[] = []

    for (const folder of foldersToProcess) {
      const memberName = extractMemberName(folder.name)
      const memberId = memberMap.get(memberName)
      if (!memberId) {
        // 01화 같은 폴더는 건너뛰기
        if (/^\d+화?$/.test(memberName)) {
          console.log(`\n⏭️  ${folder.name} 폴더 건너뜀 (회차 폴더)`)
          continue
        }
        errors.push(`멤버 미등록: ${folder.name} (추출: ${memberName})`)
        continue
      }

      console.log(`\n🔍 ${folder.name} → ${memberName} 폴더 스캔 중...`)
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
      if (errors.length > 10) console.log(`   ... 외 ${errors.length - 10}개`)
    }

    if (tasks.length === 0) {
      console.log('\n업로드할 파일이 없습니다.')
      await browser.close()
      return
    }

    // 제한 적용
    let toUpload = tasks
    if (options.limit && tasks.length > options.limit) {
      toUpload = tasks.slice(0, options.limit)
      console.log(`\n📋 --limit ${options.limit} 적용: ${toUpload.length}개만 처리`)
    }

    // Dry-run 모드
    if (options.dryRun) {
      console.log('\n🔍 [DRY RUN] 검증 완료, 실제 업로드 없음')
      console.log('\n업로드 예정 파일:')
      toUpload.slice(0, 20).forEach((task, idx) => {
        console.log(`  ${idx + 1}. ${task.memberName}/${task.fileName} → sig:${task.sigNumber}`)
      })
      if (toUpload.length > 20) {
        console.log(`  ... 외 ${toUpload.length - 20}개`)
      }
      await browser.close()
      return
    }

    // 3단계: 실제 업로드
    console.log('\n🚀 업로드 시작...\n')

    let success = 0
    let failed = 0
    let updated = 0

    for (let i = 0; i < toUpload.length; i++) {
      const task = toUpload[i]
      const displayName = `${task.memberName}/${task.fileName}`
      process.stdout.write(`[${i + 1}/${toUpload.length}] ${displayName}... `)

      try {
        // Cloudflare 업로드
        const cloudflareUid = await uploadToCloudflare(task.fileId, `${task.sigNumber}_${task.memberName}`)

        // DB 저장
        const result = await saveToDatabase(task.signatureId, task.memberId, cloudflareUid)

        if (result.updated) {
          console.log(`✅ 업데이트 (${cloudflareUid})`)
          updated++
        } else {
          console.log(`✅ 신규 (${cloudflareUid})`)
        }
        success++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(`❌ ${msg}`)
        failed++
      }

      // Rate limit 방지
      if (i < toUpload.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // 최종 결과
    console.log('\n' + '═'.repeat(60))
    console.log(`📊 결과: 성공 ${success}개 (신규: ${success - updated}, 업데이트: ${updated}), 실패 ${failed}개`)

    if (success > 0) {
      console.log('\n⏳ Cloudflare에서 인코딩 중...')
      console.log('   Dashboard에서 확인:')
      console.log(`   https://dash.cloudflare.com/${CLOUDFLARE_ACCOUNT_ID}/stream`)
    }

    console.log('═'.repeat(60))

  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error('\n❌ 오류:', err.message)
  process.exit(1)
})
