/**
 * 누락된 시그니처 이미지 업로드 스크립트
 * 사용법: npx tsx scripts/upload-missing-signatures.ts
 */

import { createClient } from '@supabase/supabase-js'
import { v2 as cloudinary } from 'cloudinary'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { execSync } from 'child_process'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const TEMP_FOLDER = '/tmp/rg-signatures-compressed'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

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

const BASE_FOLDER = '/Users/bagjaeseog/Downloads/_RG패밀리/RG시그 리뉴얼/시그_전체정리'

// 누락된 시그니처 목록 (시그번호)
const MISSING_SIGNATURES = [
  5015, 5018, 5022, 5044, 5045, 5052, 5053, 5055, 5058, 5071, 5075, 5084, 10053
]

interface SignatureInfo {
  sigNumber: number
  folderName: string
  filePath: string
}

// 폴더에서 시그니처 정보 찾기
function findSignatureInfo(sigNumber: number): SignatureInfo | null {
  const folders = fs.readdirSync(BASE_FOLDER)

  // 시그번호로 시작하는 폴더 찾기 (예: 005015_월아, 010053_레졸룸)
  const paddedNum = String(sigNumber).padStart(6, '0')
  const folder = folders.find(f => f.startsWith(paddedNum) || f.startsWith(String(sigNumber).padStart(5, '0')))

  if (!folder) {
    console.error(`  폴더를 찾을 수 없음: ${sigNumber}`)
    return null
  }

  const folderPath = path.join(BASE_FOLDER, folder)
  const files = fs.readdirSync(folderPath)

  // "XXXX 3mb.gif" 형식의 파일 찾기
  const gifFile = files.find(f => f.toLowerCase().includes('3mb.gif') || f.toLowerCase().endsWith('.gif'))

  if (!gifFile) {
    console.error(`  GIF 파일을 찾을 수 없음: ${folder}`)
    return null
  }

  return {
    sigNumber,
    folderName: folder,
    filePath: path.join(folderPath, gifFile)
  }
}

// ffmpeg로 GIF 압축
function compressGif(inputPath: string, sigNumber: number): string | null {
  const outputPath = path.join(TEMP_FOLDER, `${sigNumber}.gif`)

  try {
    // 400x400으로 리사이즈, 프레임 레이트 12fps, 색상 128개로 제한
    execSync(
      `ffmpeg -y -i "${inputPath}" -vf "fps=12,scale=400:400:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse" "${outputPath}"`,
      { stdio: 'pipe' }
    )

    const compressedSize = fs.statSync(outputPath).size / (1024 * 1024)
    console.log(`  📦 압축됨: ${compressedSize.toFixed(1)}MB`)

    return outputPath
  } catch (err) {
    console.error(`  ❌ ffmpeg 압축 실패:`, err)
    return null
  }
}

// Cloudinary에 이미지 업로드
async function uploadToCloudinary(filePath: string, sigNumber: number): Promise<string | null> {
  // 먼저 압축
  console.log(`  📦 ffmpeg 압축 중...`)
  const compressedPath = compressGif(filePath, sigNumber)

  if (!compressedPath) {
    return null
  }

  try {
    const result = await cloudinary.uploader.upload(compressedPath, {
      folder: 'rg-family/signatures',
      public_id: `sig-${sigNumber}`,
      overwrite: true,
      resource_type: 'image',
    })

    // 임시 파일 삭제
    fs.unlinkSync(compressedPath)

    return result.secure_url
  } catch (err) {
    console.error(`  ❌ Cloudinary 업로드 실패:`, err)
    return null
  }
}

// Supabase DB에 시그니처 삽입/업데이트
async function upsertSignature(sigNumber: number, thumbnailUrl: string) {
  const title = String(sigNumber)

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
        title,
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
  console.log('🚀 누락된 시그니처 업로드 시작 (ffmpeg 압축 적용)')
  console.log(`📁 소스 폴더: ${BASE_FOLDER}`)
  console.log(`📊 총 ${MISSING_SIGNATURES.length}개 시그니처 처리 예정`)
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // 임시 폴더 생성
  if (!fs.existsSync(TEMP_FOLDER)) {
    fs.mkdirSync(TEMP_FOLDER, { recursive: true })
  }

  let successCount = 0
  let failCount = 0

  for (let i = 0; i < MISSING_SIGNATURES.length; i++) {
    const sigNumber = MISSING_SIGNATURES[i]
    console.log(`\n[${i + 1}/${MISSING_SIGNATURES.length}] 시그 ${sigNumber} 처리 중...`)

    // 1. 파일 찾기
    const info = findSignatureInfo(sigNumber)
    if (!info) {
      failCount++
      continue
    }

    const fileSize = (fs.statSync(info.filePath).size / (1024 * 1024)).toFixed(1)
    console.log(`  📁 ${info.folderName}`)
    console.log(`  📄 ${path.basename(info.filePath)} (${fileSize}MB)`)

    // 2. Cloudinary 업로드
    console.log(`  ☁️  Cloudinary 업로드 중...`)
    const thumbnailUrl = await uploadToCloudinary(info.filePath, sigNumber)

    if (!thumbnailUrl) {
      failCount++
      continue
    }
    console.log(`  ✅ 업로드 완료: ${thumbnailUrl}`)

    // 3. DB 저장
    const dbSuccess = await upsertSignature(sigNumber, thumbnailUrl)

    if (dbSuccess) {
      console.log(`  ✅ 시그 ${sigNumber} 완료!`)
      successCount++
    } else {
      failCount++
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ 성공: ${successCount}개`)
  console.log(`❌ 실패: ${failCount}개`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
