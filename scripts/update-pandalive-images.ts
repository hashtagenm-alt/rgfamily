/**
 * PandaLive 이미지로 공식 홈페이지 시그니처 이미지 업데이트
 * 특정 시그니처(10000, 10001, 12337)의 이미지를 PandaLive에서 가져와 업데이트
 * 사용법: npx tsx scripts/update-pandalive-images.ts
 */

import { getServiceClient } from './lib/supabase'
import { chromium } from 'playwright'
import { v2 as cloudinary } from 'cloudinary'
import * as fs from 'fs'
import * as path from 'path'
import https from 'https'

// Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

if (!process.env.CLOUDINARY_CLOUD_NAME) {
  console.error('❌ Cloudinary 환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = getServiceClient()

const TEMP_DIR = '/tmp/pandalive-update'
const TARGET_SIGNATURES = [10000, 10001, 12337]

interface SignatureData {
  number: number
  imageUrl: string
  localPath?: string
  cloudinaryUrl?: string
}

// 이미지 다운로드
async function downloadImage(url: string, filepath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(filepath)
    https.get(url, (response) => {
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve(true)
      })
    }).on('error', (err) => {
      fs.unlink(filepath, () => {})
      console.error(`  ❌ 다운로드 실패: ${err.message}`)
      resolve(false)
    })
  })
}

// Cloudinary 업로드
async function uploadToCloudinary(filePath: string, sigNumber: number): Promise<string | null> {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'rg-family/signatures',
      public_id: `sig-${sigNumber}-pandalive`,
      overwrite: true,
      resource_type: 'image',
      transformation: [
        { width: 400, height: 400, crop: 'fill' }
      ]
    })
    return result.secure_url
  } catch (err) {
    console.error(`  ❌ Cloudinary 업로드 실패 [${sigNumber}]:`, err)
    return null
  }
}

// DB 업데이트
async function updateDatabase(sigNumber: number, thumbnailUrl: string): Promise<boolean> {
  const { error } = await supabase
    .from('signatures')
    .update({ thumbnail_url: thumbnailUrl })
    .eq('sig_number', sigNumber)

  if (error) {
    console.error(`  ❌ DB 업데이트 실패 [${sigNumber}]:`, error.message)
    return false
  }
  return true
}

async function main() {
  console.log('🚀 PandaLive 이미지 업데이트 시작\n')
  console.log(`📋 대상 시그니처: ${TARGET_SIGNATURES.join(', ')}\n`)

  // 임시 폴더 생성
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const signatures: SignatureData[] = []

  // PandaLive 페이지 로드
  console.log('📄 PandaLive 페이지 로드 중...')
  await page.goto('https://www.pandalive.co.kr/channel/rgfamily/signature', {
    waitUntil: 'networkidle'
  })

  // 3페이지 모두 스크래핑
  for (let pageNum = 1; pageNum <= 3; pageNum++) {
    console.log(`\n📄 페이지 ${pageNum} 스크래핑 중...`)

    if (pageNum > 1) {
      const pageButtons = await page.$$('button')
      for (const btn of pageButtons) {
        const text = await btn.textContent()
        if (text?.trim() === String(pageNum)) {
          await btn.click()
          await page.waitForTimeout(3000)
          break
        }
      }
    }

    // 스크롤하여 이미지 로드
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(1500)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)

    // 대상 시그니처 이미지 URL 추출
    const pageSignatures = await page.evaluate((targets: number[]) => {
      const results: { number: number; imageUrl: string }[] = []
      const buttons = document.querySelectorAll('button')

      buttons.forEach(btn => {
        const text = btn.textContent?.trim() || ''
        const numMatch = text.match(/^(\d{3,6})$/m)

        if (numMatch) {
          const sigNum = parseInt(numMatch[1])
          if (targets.includes(sigNum)) {
            const divs = btn.querySelectorAll('div')
            for (const div of divs) {
              const style = div.getAttribute('style') || ''
              const computedStyle = window.getComputedStyle(div)
              const bgImage = style.includes('background-image')
                ? style
                : computedStyle.backgroundImage

              if (bgImage && bgImage.includes('HeartIcon')) {
                const urlMatch = bgImage.match(/url\(["']?([^"')]+)["']?\)/)
                if (urlMatch) {
                  results.push({
                    number: sigNum,
                    imageUrl: urlMatch[1]
                  })
                  break
                }
              }
            }
          }
        }
      })

      return results
    }, TARGET_SIGNATURES)

    signatures.push(...pageSignatures.map(s => ({ ...s })))
  }

  await browser.close()

  // 중복 제거
  const uniqueSignatures = signatures.filter((v, i, a) =>
    a.findIndex(t => t.number === v.number) === i
  )

  console.log(`\n✅ ${uniqueSignatures.length}개 시그니처 이미지 URL 발견`)

  if (uniqueSignatures.length === 0) {
    console.log('❌ 대상 시그니처를 찾지 못했습니다.')
    process.exit(1)
  }

  // 이미지 다운로드 및 업로드
  console.log('\n📥 이미지 다운로드 및 업로드 시작...\n')

  let successCount = 0

  for (const sig of uniqueSignatures) {
    console.log(`[${sig.number}] 처리 중...`)

    // 1. 다운로드
    const ext = sig.imageUrl.endsWith('.gif') ? 'gif' : 'png'
    const localPath = path.join(TEMP_DIR, `${sig.number}.${ext}`)

    console.log(`  📥 다운로드: ${sig.imageUrl.substring(0, 60)}...`)
    const downloaded = await downloadImage(sig.imageUrl, localPath)

    if (!downloaded) {
      console.log(`  ❌ 다운로드 실패`)
      continue
    }
    console.log(`  ✅ 다운로드 완료`)

    // 2. Cloudinary 업로드
    console.log(`  ☁️  Cloudinary 업로드 중...`)
    const cloudinaryUrl = await uploadToCloudinary(localPath, sig.number)

    if (!cloudinaryUrl) {
      console.log(`  ❌ Cloudinary 업로드 실패`)
      continue
    }
    console.log(`  ✅ Cloudinary: ${cloudinaryUrl.substring(0, 60)}...`)

    // 3. DB 업데이트
    console.log(`  💾 DB 업데이트 중...`)
    const dbUpdated = await updateDatabase(sig.number, cloudinaryUrl)

    if (!dbUpdated) {
      console.log(`  ❌ DB 업데이트 실패`)
      continue
    }
    console.log(`  ✅ DB 업데이트 완료`)

    successCount++
    console.log(`  🎉 [${sig.number}] 완료!\n`)

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // 찾지 못한 시그니처 확인
  const foundNumbers = uniqueSignatures.map(s => s.number)
  const notFound = TARGET_SIGNATURES.filter(n => !foundNumbers.includes(n))

  if (notFound.length > 0) {
    console.log(`⚠️  찾지 못한 시그니처: ${notFound.join(', ')}`)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ 성공: ${successCount}개`)
  console.log(`❌ 실패: ${TARGET_SIGNATURES.length - successCount}개`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
