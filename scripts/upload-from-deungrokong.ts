/**
 * 등록용 폴더에서 검증된 이미지 업로드 스크립트
 * 이미지 내 텍스트로 시그번호 검증 완료됨
 */

import { createClient } from '@supabase/supabase-js'
import { v2 as cloudinary } from 'cloudinary'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
})

const SOURCE_FOLDER = '/Users/bagjaeseog/Downloads/등록용'

// 검증된 시그니처 목록 (이미지 텍스트로 확인됨)
const VERIFIED_SIGNATURES = [
  { sigNumber: 5015, fileName: '5015-월아--3mb.gif', name: '월아' },
  { sigNumber: 5018, fileName: '5018-설윤-3mb.gif', name: '설윤' },
  { sigNumber: 5022, fileName: '5022-키키응원가-3mb.gif', name: '키키응원가' },
  { sigNumber: 5044, fileName: '5044-서하-응원가-3mb.gif', name: '서하 응원가' },
  { sigNumber: 5045, fileName: '5045-한세아-3mb.gif', name: '한세아' },
  { sigNumber: 5052, fileName: '5052-해린-응원가-3mb.gif', name: '해린 응원가' },
  { sigNumber: 5053, fileName: '5053-손밍응원가-3mb.gif', name: '손밍응원가' },
  { sigNumber: 5055, fileName: '5055-가윤-응원가-3mb.gif', name: '가윤 응원가' },
  { sigNumber: 5058, fileName: '5058-채은-응원가-3mb.gif', name: '채은 응원가' },
  { sigNumber: 5071, fileName: '5071-퀸로니-응원가-3mb.gif', name: '퀸로니 응원가' },
  { sigNumber: 5075, fileName: '5075-청아-3mb.gif', name: '청아' },
  { sigNumber: 5084, fileName: '5084-한백설-3mb.gif', name: '한백설' },
]

async function uploadToCloudinary(filePath: string, sigNumber: number): Promise<string | null> {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'rg-family/signatures',
      public_id: `sig-${sigNumber}-verified`,
      overwrite: true,
      resource_type: 'image',
    })
    return result.secure_url
  } catch (err) {
    console.error(`  ❌ Cloudinary 업로드 실패:`, err)
    return null
  }
}

async function upsertSignature(sigNumber: number, thumbnailUrl: string) {
  const { data: existing } = await supabase
    .from('signatures')
    .select('id')
    .eq('sig_number', sigNumber)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('signatures')
      .update({ thumbnail_url: thumbnailUrl })
      .eq('sig_number', sigNumber)

    if (error) {
      console.error(`  ⚠️ DB 업데이트 실패:`, error.message)
      return false
    }
    console.log(`  📝 기존 레코드 업데이트됨`)
  } else {
    const { error } = await supabase
      .from('signatures')
      .insert({
        sig_number: sigNumber,
        title: String(sigNumber),
        description: '',
        thumbnail_url: thumbnailUrl,
        unit: 'excel'
      })

    if (error) {
      console.error(`  ⚠️ DB 삽입 실패:`, error.message)
      return false
    }
    console.log(`  📝 새 레코드 삽입됨`)
  }

  return true
}

async function main() {
  console.log('')
  console.log('🚀 등록용 폴더 검증된 이미지 업로드 시작')
  console.log(`📁 소스 폴더: ${SOURCE_FOLDER}`)
  console.log(`📊 총 ${VERIFIED_SIGNATURES.length}개 시그니처 처리 예정`)
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  let successCount = 0
  let failCount = 0

  for (let i = 0; i < VERIFIED_SIGNATURES.length; i++) {
    const sig = VERIFIED_SIGNATURES[i]
    console.log(`\n[${i + 1}/${VERIFIED_SIGNATURES.length}] 시그 ${sig.sigNumber} (${sig.name}) 처리 중...`)

    const filePath = path.join(SOURCE_FOLDER, sig.fileName)

    if (!fs.existsSync(filePath)) {
      console.error(`  ❌ 파일 없음: ${sig.fileName}`)
      failCount++
      continue
    }

    const fileSize = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(1)
    console.log(`  📄 ${sig.fileName} (${fileSize}MB)`)

    // Cloudinary 업로드
    console.log(`  ☁️  Cloudinary 업로드 중...`)
    const thumbnailUrl = await uploadToCloudinary(filePath, sig.sigNumber)

    if (!thumbnailUrl) {
      failCount++
      continue
    }
    console.log(`  ✅ 업로드 완료: ${thumbnailUrl}`)

    // DB 저장
    const dbSuccess = await upsertSignature(sig.sigNumber, thumbnailUrl)

    if (dbSuccess) {
      console.log(`  ✅ 시그 ${sig.sigNumber} 완료!`)
      successCount++
    } else {
      failCount++
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ 성공: ${successCount}개`)
  console.log(`❌ 실패: ${failCount}개`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
