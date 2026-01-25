/**
 * 시그니처 영상 업로드 스크립트 (Cloudinary 버전)
 *
 * 기능:
 * - 로컬 폴더에서 영상 파일 읽기
 * - Cloudinary에 업로드 (대용량 파일 지원)
 * - signature_videos 테이블에 등록
 *
 * 사용법:
 * 1. 다운로드한 영상을 /tmp/signature-videos/01화/ 폴더에 정리
 * 2. npx tsx scripts/upload-signature-videos-cloudinary.ts
 * 3. 특정 멤버만: npx tsx scripts/upload-signature-videos-cloudinary.ts --member 가애
 * 4. 드라이런: npx tsx scripts/upload-signature-videos-cloudinary.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import { v2 as cloudinary } from 'cloudinary'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수 설정 필요')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})

// Cloudinary 설정
const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

if (!cloudName || !apiKey || !apiSecret) {
  console.error('❌ Cloudinary 환경변수 설정 필요')
  process.exit(1)
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
})

// 멤버 이름 -> organization ID 매핑
const MEMBER_ID_MAP: Record<string, number> = {
  '가애': 60,
  '가윤': 63,
  '린아': 59,
  '설윤': 62,
  '월아': 66,
  '채은': 61,
  '청아': 71,
  '퀸로니': 68,
  '키키': 72,
  '한백설': 67,
  '한세아': 70,
  '해린': 69,
  '홍서하': 65,
}

// 시그 번호 -> signature ID 캐시
const sigIdCache = new Map<number, number>()

interface UploadResult {
  success: boolean
  memberName: string
  sigNumber: number
  fileName: string
  videoUrl?: string
  error?: string
}

async function getSignatureId(sigNumber: number): Promise<number | null> {
  if (sigIdCache.has(sigNumber)) {
    return sigIdCache.get(sigNumber)!
  }

  const { data, error } = await supabase
    .from('signatures')
    .select('id')
    .eq('sig_number', sigNumber)
    .single()

  if (error || !data) {
    return null
  }

  sigIdCache.set(sigNumber, data.id)
  return data.id
}

async function uploadVideoToCloudinary(
  filePath: string,
  memberName: string,
  sigNumber: number
): Promise<string | null> {
  const fileName = path.basename(filePath)
  const fileSizeMB = fs.statSync(filePath).size / (1024 * 1024)

  console.log(`   📤 Cloudinary 업로드 중: ${fileName} (${fileSizeMB.toFixed(2)}MB)`)

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'video',
      folder: `signature-videos/${memberName}`,
      public_id: `sig_${sigNumber}_${Date.now()}`,
      overwrite: false,
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    })

    console.log(`   ✅ Cloudinary 업로드 완료`)
    return result.secure_url
  } catch (error) {
    console.error(`   ❌ Cloudinary 업로드 실패:`, error)
    return null
  }
}

async function registerSignatureVideo(
  signatureId: number,
  memberId: number,
  videoUrl: string
): Promise<boolean> {
  // 기존 레코드 확인
  const { data: existing } = await supabase
    .from('signature_videos')
    .select('id')
    .eq('signature_id', signatureId)
    .eq('member_id', memberId)
    .single()

  if (existing) {
    // 업데이트
    const { error } = await supabase
      .from('signature_videos')
      .update({ video_url: videoUrl })
      .eq('id', existing.id)

    if (error) {
      console.error(`   ❌ DB 업데이트 실패: ${error.message}`)
      return false
    }
    console.log(`   ✅ DB 업데이트 완료 (기존 레코드)`)
    return true
  }

  // 새 레코드 삽입
  const { error } = await supabase
    .from('signature_videos')
    .insert({
      signature_id: signatureId,
      member_id: memberId,
      video_url: videoUrl,
    })

  if (error) {
    console.error(`   ❌ DB 등록 실패: ${error.message}`)
    return false
  }

  console.log(`   ✅ DB 등록 완료`)
  return true
}

function parseVideoFileName(fileName: string): { sigNumber: number; memberName: string } | null {
  // 파일명 형식: "1000 가애.mp4" 또는 "1000.mp4"
  const nameWithoutExt = path.basename(fileName, '.mp4')
  const parts = nameWithoutExt.split(' ')

  const sigNumber = parseInt(parts[0], 10)
  if (isNaN(sigNumber)) {
    return null
  }

  const memberName = parts.length > 1 ? parts.slice(1).join(' ') : ''
  return { sigNumber, memberName }
}

async function processVideoFile(
  filePath: string,
  folderMemberName: string,
  dryRun: boolean
): Promise<UploadResult> {
  const fileName = path.basename(filePath)
  const parsed = parseVideoFileName(fileName)

  if (!parsed) {
    return {
      success: false,
      memberName: folderMemberName,
      sigNumber: 0,
      fileName,
      error: '파일명 파싱 실패',
    }
  }

  const { sigNumber, memberName: fileMemberName } = parsed
  const memberName = fileMemberName || folderMemberName

  console.log(`\n📁 처리 중: ${fileName}`)
  console.log(`   시그 번호: ${sigNumber}, 멤버: ${memberName}`)

  // 멤버 ID 확인
  const memberId = MEMBER_ID_MAP[memberName]
  if (!memberId) {
    return {
      success: false,
      memberName,
      sigNumber,
      fileName,
      error: `멤버 ID를 찾을 수 없음: ${memberName}`,
    }
  }

  // 시그니처 ID 확인
  const signatureId = await getSignatureId(sigNumber)
  if (!signatureId) {
    return {
      success: false,
      memberName,
      sigNumber,
      fileName,
      error: `시그니처를 찾을 수 없음: ${sigNumber}`,
    }
  }

  console.log(`   시그니처 ID: ${signatureId}, 멤버 ID: ${memberId}`)

  if (dryRun) {
    console.log(`   🔍 [DRY-RUN] 업로드 스킵`)
    return {
      success: true,
      memberName,
      sigNumber,
      fileName,
      videoUrl: '[dry-run]',
    }
  }

  // Cloudinary 업로드
  const videoUrl = await uploadVideoToCloudinary(filePath, memberName, sigNumber)
  if (!videoUrl) {
    return {
      success: false,
      memberName,
      sigNumber,
      fileName,
      error: 'Cloudinary 업로드 실패',
    }
  }

  // DB 등록
  const dbSuccess = await registerSignatureVideo(signatureId, memberId, videoUrl)
  if (!dbSuccess) {
    return {
      success: false,
      memberName,
      sigNumber,
      fileName,
      error: 'DB 등록 실패',
    }
  }

  return {
    success: true,
    memberName,
    sigNumber,
    fileName,
    videoUrl,
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const memberIdx = args.indexOf('--member')
  const targetMember = memberIdx !== -1 ? args[memberIdx + 1] : null

  const baseDir = '/tmp/signature-videos/01화'

  console.log('========================================')
  console.log('🎬 시그니처 영상 업로드 스크립트 (Cloudinary)')
  console.log(`   모드: ${dryRun ? '드라이런 (실제 업로드 안함)' : '실제 업로드'}`)
  if (targetMember) {
    console.log(`   대상 멤버: ${targetMember}`)
  }
  console.log(`   소스 폴더: ${baseDir}`)
  console.log('========================================')

  // 폴더 존재 확인
  if (!fs.existsSync(baseDir)) {
    console.error(`\n❌ 소스 폴더가 없습니다: ${baseDir}`)
    console.log('\n📋 사용법:')
    console.log('1. Google Drive에서 영상 다운로드')
    console.log('2. /tmp/signature-videos/01화/[멤버명]/ 구조로 정리')
    console.log('   예: /tmp/signature-videos/01화/가애/1000 가애.mp4')
    console.log('3. 이 스크립트 다시 실행')
    process.exit(1)
  }

  // 멤버별 폴더 처리
  const memberDirs = fs.readdirSync(baseDir).filter(f => {
    const stat = fs.statSync(path.join(baseDir, f))
    return stat.isDirectory()
  })

  if (memberDirs.length === 0) {
    console.error('\n❌ 멤버 폴더가 없습니다.')
    process.exit(1)
  }

  console.log(`\n📂 발견된 멤버 폴더: ${memberDirs.join(', ')}`)

  const results: UploadResult[] = []

  for (const memberDir of memberDirs) {
    if (targetMember && memberDir !== targetMember) {
      continue
    }

    const memberPath = path.join(baseDir, memberDir)
    const videoFiles = fs.readdirSync(memberPath).filter(f => f.endsWith('.mp4'))

    console.log(`\n====== ${memberDir} (${videoFiles.length}개 영상) ======`)

    for (const videoFile of videoFiles) {
      const filePath = path.join(memberPath, videoFile)
      const result = await processVideoFile(filePath, memberDir, dryRun)
      results.push(result)
    }
  }

  // 결과 요약
  console.log('\n========================================')
  console.log('📋 결과 요약')
  console.log('========================================')

  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  console.log(`✅ 성공: ${successful.length}개`)
  console.log(`❌ 실패: ${failed.length}개`)

  if (failed.length > 0) {
    console.log('\n❌ 실패 목록:')
    for (const f of failed) {
      console.log(`   - ${f.fileName}: ${f.error}`)
    }
  }

  if (successful.length > 0) {
    console.log('\n✅ 성공 목록:')
    for (const s of successful) {
      console.log(`   - ${s.fileName} → ${s.videoUrl}`)
    }
  }
}

main().catch(console.error)
