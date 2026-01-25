/**
 * 시그니처 영상 업로드 스크립트
 *
 * 기능:
 * - 로컬 폴더에서 영상 파일 읽기
 * - Supabase Storage에 업로드
 * - signature_videos 테이블에 등록
 *
 * 사용법:
 * 1. /tmp/signature-videos/01화/ 폴더에 멤버별 영상 복사
 *    예: /tmp/signature-videos/01화/가애/1000 가애.mp4
 * 2. npx tsx scripts/upload-signature-videos.ts
 * 3. 특정 멤버만: npx tsx scripts/upload-signature-videos.ts --member 가애
 * 4. 드라이런: npx tsx scripts/upload-signature-videos.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 환경변수 설정 필요: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
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

async function uploadVideoToStorage(
  filePath: string,
  memberId: number,
  sigNumber: number
): Promise<string | null> {
  const fileName = path.basename(filePath)
  const storagePath = `signature-videos/member-${memberId}/${sigNumber}_${Date.now()}.mp4`

  const fileBuffer = fs.readFileSync(filePath)
  const fileSizeMB = fileBuffer.length / (1024 * 1024)

  console.log(`   📤 업로드 중: ${fileName} (${fileSizeMB.toFixed(2)}MB)`)

  if (fileSizeMB > 50) {
    console.log(`   ⚠️ 파일 크기 초과 (50MB 제한): ${fileSizeMB.toFixed(2)}MB`)
    return null
  }

  const { data, error } = await supabase.storage
    .from('videos')
    .upload(storagePath, fileBuffer, {
      contentType: 'video/mp4',
      upsert: false,
    })

  if (error) {
    console.error(`   ❌ 업로드 실패: ${error.message}`)
    return null
  }

  // Public URL 생성
  const { data: urlData } = supabase.storage
    .from('videos')
    .getPublicUrl(storagePath)

  return urlData.publicUrl
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

  const { sigNumber, memberName: fileMemerName } = parsed
  const memberName = fileMemerName || folderMemberName

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

  // Storage 업로드
  const videoUrl = await uploadVideoToStorage(filePath, memberId, sigNumber)
  if (!videoUrl) {
    return {
      success: false,
      memberName,
      sigNumber,
      fileName,
      error: 'Storage 업로드 실패',
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

async function checkStorageUsage(): Promise<void> {
  console.log('\n📊 Storage 사용량 확인...')

  const { data, error } = await supabase.storage
    .from('videos')
    .list('signature-videos', { limit: 1000 })

  if (error) {
    console.log('   ⚠️ Storage 사용량 확인 실패')
    return
  }

  if (!data || data.length === 0) {
    console.log('   📁 signature-videos 폴더 비어있음')
    return
  }

  // 파일 개수 출력 (용량은 별도 API 필요)
  console.log(`   📁 현재 업로드된 파일: ${data.length}개`)
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const memberArg = args.find(a => a.startsWith('--member'))
  const targetMember = memberArg ? args[args.indexOf(memberArg) + 1] : null

  const baseDir = '/tmp/signature-videos-compressed/01화'

  console.log('========================================')
  console.log('🎬 시그니처 영상 업로드 스크립트')
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

  // Storage 사용량 확인
  await checkStorageUsage()

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

  // 최종 Storage 사용량
  await checkStorageUsage()
}

main().catch(console.error)
