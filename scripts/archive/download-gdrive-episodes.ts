/**
 * Google Drive 폴더에서 특정 에피소드 영상 다운로드
 *
 * 사용법:
 *   npx tsx scripts/download-gdrive-episodes.ts --folder-id FOLDER_ID --output-dir PATH
 *   npx tsx scripts/download-gdrive-episodes.ts --folder-id FOLDER_ID --output-dir PATH --episodes 4,5
 */

import puppeteer, { Browser, Page } from 'puppeteer'
import * as fs from 'fs'
import * as path from 'path'

interface DriveItem {
  id: string
  name: string
  type: 'folder' | 'file'
}

interface DownloadOptions {
  folderId: string
  outputDir: string
  episodes?: number[]
  dryRun: boolean
}

// Google Drive 아이템 조회
async function getDriveItems(page: Page, folderId: string): Promise<DriveItem[]> {
  const folderUrl = `https://drive.google.com/drive/folders/${folderId}`

  console.log(`   폴더 URL: ${folderUrl}`)
  await page.goto(folderUrl, { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise(resolve => setTimeout(resolve, 3000))

  // 스크롤하여 모든 파일 로드
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

// Google Drive 파일 다운로드
async function downloadFromGoogleDrive(
  browser: Browser,
  fileId: string,
  fileName: string,
  outputDir: string
): Promise<string> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const downloadPath = path.join(outputDir, fileName)

  // 이미 다운로드된 파일 확인
  if (fs.existsSync(downloadPath)) {
    const stats = fs.statSync(downloadPath)
    if (stats.size > 1000) {
      console.log(`   ⏭️  이미 존재: ${fileName}`)
      return downloadPath
    }
    fs.unlinkSync(downloadPath)
  }

  const page = await browser.newPage()

  try {
    const client = await page.createCDPSession()
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: outputDir,
    })

    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
    await page.goto(downloadUrl, { waitUntil: 'networkidle2', timeout: 120000 })

    await new Promise(resolve => setTimeout(resolve, 2000))

    // 바이러스 스캔 경고 처리
    const confirmButton = await page.$('a[id="uc-download-link"]')
    if (confirmButton) {
      await confirmButton.click()
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    const formButton = await page.$('form button, form input[type="submit"]')
    if (formButton) {
      await formButton.click()
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    // 다운로드 완료 대기 (최대 20분)
    let attempts = 0
    const maxAttempts = 1200 // 20분

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))

      const files = fs.readdirSync(outputDir)
      const downloadedFile = files.find(f =>
        !f.endsWith('.crdownload') && !f.endsWith('.tmp') && f !== '.DS_Store'
      )

      if (downloadedFile) {
        const currentPath = path.join(outputDir, downloadedFile)
        const stats = fs.statSync(currentPath)

        if (stats.size > 1000) {
          if (downloadedFile !== fileName) {
            const targetPath = path.join(outputDir, fileName)
            fs.renameSync(currentPath, targetPath)
            return targetPath
          }
          return downloadPath
        }
      }

      attempts++

      // 진행 상황 표시 (10초마다)
      if (attempts % 10 === 0) {
        process.stdout.write('.')
      }
    }

    throw new Error('다운로드 타임아웃')
  } finally {
    await page.close()
  }
}

// 파일 이름에서 에피소드 번호 추출
function extractEpisodeNumber(fileName: string): number | null {
  // 패턴: "4화", "5화", "ep4", "ep5", "episode 4" 등
  const patterns = [
    /(\d+)화/,
    /ep(\d+)/i,
    /episode\s*(\d+)/i,
    /e(\d+)/i,
  ]

  for (const pattern of patterns) {
    const match = fileName.match(pattern)
    if (match) {
      return parseInt(match[1], 10)
    }
  }

  return null
}

function parseArgs(): DownloadOptions {
  const args = process.argv.slice(2)
  const options: DownloadOptions = {
    folderId: '',
    outputDir: '',
    dryRun: false
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--folder-id':
        options.folderId = args[++i]
        break
      case '--output-dir':
        options.outputDir = args[++i]
        break
      case '--episodes':
        options.episodes = args[++i].split(',').map(n => parseInt(n.trim(), 10))
        break
      case '--dry-run':
        options.dryRun = true
        break
    }
  }

  return options
}

async function main() {
  console.log('═'.repeat(60))
  console.log('📥 Google Drive 에피소드 다운로드')
  console.log('═'.repeat(60))

  const options = parseArgs()

  if (!options.folderId || !options.outputDir) {
    console.log('\n사용법:')
    console.log('  npx tsx scripts/download-gdrive-episodes.ts \\')
    console.log('    --folder-id FOLDER_ID \\')
    console.log('    --output-dir /path/to/output')
    console.log('\n옵션:')
    console.log('  --episodes <n,m>  특정 회차만 다운로드 (예: --episodes 4,5)')
    console.log('  --dry-run         검증만 수행')
    process.exit(1)
  }

  console.log(`\n📂 폴더 ID: ${options.folderId}`)
  console.log(`💾 저장 경로: ${options.outputDir}`)
  console.log(`📋 모드: ${options.dryRun ? '🔍 검증만' : '⬇️  실제 다운로드'}`)
  if (options.episodes) {
    console.log(`📋 다운로드 회차: ${options.episodes.join(', ')}화`)
  }

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
    console.log('\n📁 폴더 스캔 중...')
    const items = await getDriveItems(page, options.folderId)
    let videoFiles = items.filter(item => item.type === 'file')

    console.log(`   전체 영상 파일: ${videoFiles.length}개`)

    // 에피소드 필터링
    if (options.episodes && options.episodes.length > 0) {
      videoFiles = videoFiles.filter(file => {
        const episodeNum = extractEpisodeNumber(file.name)
        return episodeNum !== null && options.episodes!.includes(episodeNum)
      })
      console.log(`   필터 적용 후: ${videoFiles.length}개`)
    }

    if (videoFiles.length === 0) {
      console.log('\n⚠️ 다운로드할 영상이 없습니다.')
      await browser.close()
      return
    }

    // 파일 목록 출력
    console.log('\n📋 다운로드 대상:')
    videoFiles.forEach((file, idx) => {
      const episodeNum = extractEpisodeNumber(file.name)
      const episodeLabel = episodeNum ? ` (${episodeNum}화)` : ''
      console.log(`   ${idx + 1}. ${file.name}${episodeLabel}`)
    })

    if (options.dryRun) {
      console.log('\n🔍 [DRY RUN] 검증 완료')
      await browser.close()
      return
    }

    console.log('\n⬇️  다운로드 시작...\n')

    let success = 0
    let failed = 0

    for (let i = 0; i < videoFiles.length; i++) {
      const file = videoFiles[i]
      const episodeNum = extractEpisodeNumber(file.name)
      const episodeLabel = episodeNum ? ` [${episodeNum}화]` : ''

      console.log(`[${i + 1}/${videoFiles.length}]${episodeLabel} ${file.name}`)

      try {
        const localPath = await downloadFromGoogleDrive(
          browser,
          file.id,
          file.name,
          options.outputDir
        )

        const stats = fs.statSync(localPath)
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2)
        console.log(`   ✅ 완료 (${sizeMB} MB)`)
        success++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(`   ❌ 실패: ${msg}`)
        failed++
      }

      if (i < videoFiles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log('\n' + '═'.repeat(60))
    console.log(`📊 결과: 성공 ${success}개, 실패 ${failed}개`)
    console.log('═'.repeat(60))

  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error('\n❌ 오류:', err.message)
  process.exit(1)
})
