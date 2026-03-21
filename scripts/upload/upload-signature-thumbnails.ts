/**
 * 시그니처 썸네일 업로드 스크립트
 *
 * 사용법:
 * 1. scripts/thumbnails/ 폴더에 이미지 파일 저장
 *    - 파일명: sig-{시그번호}.png 또는 sig-{시그번호}.jpg
 *    - 예: sig-10018.png, sig-10019.jpg
 *
 * 2. 스크립트 실행:
 *    npx tsx scripts/upload-signature-thumbnails.ts
 */

import { getServiceClient } from '../lib/supabase'
import * as fs from 'fs'
import * as path from 'path'

const supabase = getServiceClient()

const THUMBNAILS_DIR = path.join(__dirname, 'thumbnails')
const BUCKET_NAME = 'vip-signatures'

interface UploadResult {
  sigNumber: number
  success: boolean
  url?: string
  error?: string
}

async function uploadThumbnail(filePath: string, sigNumber: number): Promise<UploadResult> {
  try {
    const fileBuffer = fs.readFileSync(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const contentType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg'
    const fileName = `sig-${sigNumber}${ext}`

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(`thumbnails/${fileName}`, fileBuffer, {
        contentType,
        upsert: true, // 이미 존재하면 덮어쓰기
      })

    if (error) {
      return { sigNumber, success: false, error: error.message }
    }

    // Public URL 가져오기
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(`thumbnails/${fileName}`)

    return {
      sigNumber,
      success: true,
      url: urlData.publicUrl,
    }
  } catch (err) {
    return {
      sigNumber,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function updateSignatureThumbnail(sigNumber: number, thumbnailUrl: string): Promise<boolean> {
  const { error } = await supabase
    .from('signatures')
    .update({ thumbnail_url: thumbnailUrl })
    .eq('sig_number', sigNumber)

  if (error) {
    console.error(`❌ DB 업데이트 실패 (${sigNumber}):`, error.message)
    return false
  }
  return true
}

async function main() {
  console.log('=== 시그니처 썸네일 업로드 ===\n')

  // thumbnails 폴더 확인
  if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true })
    console.log(`📁 폴더 생성됨: ${THUMBNAILS_DIR}`)
    console.log('\n이미지 파일을 위 폴더에 저장한 후 다시 실행하세요.')
    console.log('파일명 형식: sig-{시그번호}.png 또는 sig-{시그번호}.jpg')
    console.log('예: sig-10018.png, sig-10019.jpg')
    return
  }

  // 이미지 파일 찾기 (png, jpg, gif 지원)
  const files = fs.readdirSync(THUMBNAILS_DIR).filter(f =>
    /^sig-\d+\.(png|jpg|jpeg|gif)$/i.test(f)
  )

  if (files.length === 0) {
    console.log('📭 업로드할 이미지가 없습니다.')
    console.log(`\n${THUMBNAILS_DIR} 폴더에 이미지를 저장하세요.`)
    console.log('파일명 형식: sig-{시그번호}.png 또는 sig-{시그번호}.jpg')
    return
  }

  console.log(`📷 발견된 이미지: ${files.length}개\n`)

  const results: UploadResult[] = []

  for (const file of files) {
    const match = file.match(/^sig-(\d+)\.(png|jpg|jpeg|gif)$/i)
    if (!match) continue

    const sigNumber = parseInt(match[1], 10)
    const filePath = path.join(THUMBNAILS_DIR, file)

    console.log(`⏳ 업로드 중: ${file}...`)

    const result = await uploadThumbnail(filePath, sigNumber)
    results.push(result)

    if (result.success && result.url) {
      console.log(`✅ 업로드 완료: ${result.url}`)

      // DB 업데이트
      const dbUpdated = await updateSignatureThumbnail(sigNumber, result.url)
      if (dbUpdated) {
        console.log(`✅ DB 업데이트 완료 (sig_number: ${sigNumber})`)
      }
    } else {
      console.log(`❌ 업로드 실패: ${result.error}`)
    }
    console.log('')
  }

  // 결과 요약
  console.log('=== 결과 요약 ===')
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  console.log(`✅ 성공: ${successful.length}개`)
  console.log(`❌ 실패: ${failed.length}개`)

  if (failed.length > 0) {
    console.log('\n실패한 파일:')
    failed.forEach(f => console.log(`  - sig-${f.sigNumber}: ${f.error}`))
  }
}

main().catch(console.error)
