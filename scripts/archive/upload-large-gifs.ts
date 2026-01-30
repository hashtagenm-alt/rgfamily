/**
 * 대용량 GIF (>10MB) Cloudinary 업로드 스크립트
 * ffmpeg로 압축 후 업로드
 * 사용법: npx tsx scripts/upload-large-gifs.ts
 */

import { createClient } from '@supabase/supabase-js'
import { v2 as cloudinary } from 'cloudinary'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { execSync } from 'child_process'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
})

const SIGNATURES_FOLDER = '/Users/bagjaeseog/Downloads/RG시그 리뉴얼/rg 리뉴얼 시그 최종'
const TEMP_FOLDER = '/tmp/rg-family-compressed-gifs'

// 10MB 초과 파일 목록
const LARGE_FILES = [
  10000, 10002, 10003, 10004, 10006, 10007, 10008, 10009, 10010,
  10020, 10033, 10070, 10073, 10558, 12337, 12412, 12470,
  50000, 70000, 100000, 200000, 300000
]

// ffmpeg로 GIF 압축 (프레임 레이트 줄이고 크기 조절)
function compressGif(inputPath: string, sigNumber: number): string | null {
  const outputPath = path.join(TEMP_FOLDER, `${sigNumber}.gif`)

  try {
    // 400x400으로 리사이즈, 프레임 레이트 15fps로 줄임, 색상 수 128개로 제한
    execSync(
      `ffmpeg -y -i "${inputPath}" -vf "fps=12,scale=400:400:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse" "${outputPath}"`,
      { stdio: 'pipe' }
    )

    const compressedSize = fs.statSync(outputPath).size / (1024 * 1024)
    console.log(`  압축됨: ${compressedSize.toFixed(1)}MB`)

    return outputPath
  } catch {
    console.error(`  ❌ 압축 실패`)
    return null
  }
}

async function uploadCompressedGif(sigNumber: number): Promise<string | null> {
  // 원본 파일 찾기
  const files = fs.readdirSync(SIGNATURES_FOLDER)
  const fileName = files.find(f => {
    const match = f.match(/^(\d+)/)
    return match && parseInt(match[1], 10) === sigNumber
  })

  if (!fileName) {
    console.error(`  파일을 찾을 수 없음: ${sigNumber}`)
    return null
  }

  const originalPath = path.join(SIGNATURES_FOLDER, fileName)
  const originalSize = fs.statSync(originalPath).size / (1024 * 1024)

  console.log(`  원본: ${fileName} (${originalSize.toFixed(1)}MB)`)

  // 압축
  const compressedPath = compressGif(originalPath, sigNumber)
  if (!compressedPath) return null

  // Cloudinary 업로드
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
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`  ❌ Cloudinary 업로드 실패:`, errorMessage)
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
  }

  return true
}

async function main() {
  console.log('🚀 대용량 GIF 압축 후 업로드 시작')
  console.log(`📊 총 ${LARGE_FILES.length}개 파일 처리 예정`)
  console.log('')

  // 임시 폴더 생성
  if (!fs.existsSync(TEMP_FOLDER)) {
    fs.mkdirSync(TEMP_FOLDER, { recursive: true })
  }

  let successCount = 0
  let failCount = 0

  for (let i = 0; i < LARGE_FILES.length; i++) {
    const sigNumber = LARGE_FILES[i]
    console.log(`[${i + 1}/${LARGE_FILES.length}] 시그 ${sigNumber} 처리 중...`)

    const publicUrl = await uploadCompressedGif(sigNumber)

    if (publicUrl) {
      const dbSuccess = await upsertSignature(sigNumber, publicUrl)
      if (dbSuccess) {
        console.log(`  ✅ 완료`)
        successCount++
      } else {
        console.log(`  ⚠️ 업로드됨, DB 실패`)
        failCount++
      }
    } else {
      console.log(`  ❌ 실패`)
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
