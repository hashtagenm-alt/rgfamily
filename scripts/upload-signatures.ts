/**
 * 시그니처 이미지 Cloudinary 업로드 스크립트
 * 사용법: npx tsx scripts/upload-signatures.ts
 */

import { createClient } from '@supabase/supabase-js'
import { v2 as cloudinary } from 'cloudinary'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// .env.local에서 환경변수 로드
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Service Role Key를 사용하여 RLS 우회 (관리자 작업용)
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY가 없어 anon key를 사용합니다. RLS로 인해 삽입이 실패할 수 있습니다.')
}

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

console.log('🔗 Supabase URL:', SUPABASE_URL)
console.log('🔗 Cloudinary:', process.env.CLOUDINARY_CLOUD_NAME)

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
})

const SIGNATURES_FOLDER = '/Users/bagjaeseog/Downloads/RG시그 리뉴얼/rg 리뉴얼 시그 최종'

interface SignatureFile {
  fileName: string
  sigNumber: number
  filePath: string
  extension: string
}

// 파일 이름에서 시그니처 번호 추출
function extractSigNumber(fileName: string): number | null {
  // "10000 수정16mb.gif" -> 10000
  // "1000.png" -> 1000
  const match = fileName.match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

// 시그니처 제목 생성 (숫자만)
function generateTitle(sigNumber: number): string {
  return String(sigNumber)
}

// Cloudinary에 이미지 업로드
async function uploadFile(file: SignatureFile): Promise<string | null> {
  const isGif = file.extension === 'gif'

  try {
    const result = await cloudinary.uploader.upload(file.filePath, {
      folder: 'rg-family/signatures',
      public_id: `sig-${file.sigNumber}`,
      overwrite: true,
      resource_type: 'image',
      ...(isGif
        ? {
            // GIF: 애니메이션 유지, 리사이즈만
            transformation: [
              { width: 400, height: 400, crop: 'fill' }
            ]
          }
        : {
            // PNG: 최적화 적용
            transformation: [
              { width: 400, height: 400, crop: 'fill' },
              { quality: 'auto', fetch_format: 'auto' }
            ]
          })
    })
    return result.secure_url
  } catch (err) {
    console.error(`  ❌ Cloudinary 업로드 실패 [${file.sigNumber}]:`, err)
    return null
  }
}

async function upsertSignature(sigNumber: number, thumbnailUrl: string) {
  const title = generateTitle(sigNumber)

  // 기존 레코드 확인
  const { data: existing } = await supabase
    .from('signatures')
    .select('id')
    .eq('sig_number', sigNumber)
    .single()

  if (existing) {
    // 업데이트
    const { error } = await supabase
      .from('signatures')
      .update({ thumbnail_url: thumbnailUrl })
      .eq('sig_number', sigNumber)

    if (error) {
      console.error(`  ⚠️ DB 업데이트 실패 [${sigNumber}]:`, error.message)
      return false
    }
  } else {
    // 새로 삽입
    const { error } = await supabase
      .from('signatures')
      .insert({
        sig_number: sigNumber,
        title,
        description: '',
        thumbnail_url: thumbnailUrl,
        unit: 'excel' // 기본값
      })

    if (error) {
      console.error(`  ⚠️ DB 삽입 실패 [${sigNumber}]:`, error.message)
      return false
    }
  }

  return true
}

async function main() {
  console.log('🚀 시그니처 이미지 업로드 시작 (Cloudinary)')
  console.log(`📁 소스 폴더: ${SIGNATURES_FOLDER}`)
  console.log('')

  // 파일 목록 읽기
  const files = fs.readdirSync(SIGNATURES_FOLDER)
  const signatureFiles: SignatureFile[] = []

  for (const fileName of files) {
    const sigNumber = extractSigNumber(fileName)
    if (sigNumber === null) continue

    const extension = fileName.toLowerCase().endsWith('.gif') ? 'gif' : 'png'

    signatureFiles.push({
      fileName,
      sigNumber,
      filePath: path.join(SIGNATURES_FOLDER, fileName),
      extension
    })
  }

  // 번호순 정렬
  signatureFiles.sort((a, b) => a.sigNumber - b.sigNumber)

  console.log(`📊 총 ${signatureFiles.length}개 시그니처 파일 발견`)
  console.log('')

  let successCount = 0
  let failCount = 0

  for (let i = 0; i < signatureFiles.length; i++) {
    const file = signatureFiles[i]
    const progress = `[${i + 1}/${signatureFiles.length}]`

    process.stdout.write(`${progress} 시그 ${file.sigNumber} 업로드 중...`)

    const publicUrl = await uploadFile(file)

    if (publicUrl) {
      const dbSuccess = await upsertSignature(file.sigNumber, publicUrl)
      if (dbSuccess) {
        console.log(' ✅')
        successCount++
      } else {
        console.log(' ⚠️ (업로드됨, DB 실패)')
        failCount++
      }
    } else {
      console.log(' ❌')
      failCount++
    }

    // Rate limiting 방지
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ 성공: ${successCount}개`)
  console.log(`❌ 실패: ${failCount}개`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
