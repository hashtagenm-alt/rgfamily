/**
 * 시그니처 영상 동기화 스크립트
 *
 * 기능:
 * 1. Google Drive 파일 목록과 DB 시그니처 매칭
 * 2. 데이터 정합성 검증
 * 3. 누락된 영상 파악
 * 4. Cloudflare Stream 업로드 (선택적)
 *
 * 사용법:
 * npx tsx scripts/sync-signature-videos.ts --check    # 정합성 검증만
 * npx tsx scripts/sync-signature-videos.ts --report   # 상세 리포트
 */

import { getServiceClient } from './lib/supabase'
import * as fs from 'fs'
import * as path from 'path'

const supabase = getServiceClient()

// 멤버 ID 매핑 (organization 테이블 기준)
const MEMBER_MAP: Record<string, number> = {
  '가애': 60,
  '가윤': 63,
  '린아': 59,
  '설윤': 62,
  '손밍': 64,
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

interface DriveFile {
  fileName: string
  sigNumber: number
  memberName: string
  memberId: number
  folderPath: string
}

interface Signature {
  id: number
  sig_number: number
  title: string
  unit: string
}

interface SignatureVideo {
  id: number
  signature_id: number
  member_id: number
  video_url: string
  cloudflare_uid: string | null
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  stats: {
    totalSignatures: number
    signaturesWithVideo: number
    signaturesWithoutVideo: number
    totalVideos: number
    driveFiles: number
    matchedFiles: number
    unmatchedFiles: number
    duplicateEntries: number
  }
}

/**
 * 파일명에서 시그니처 번호 추출
 * 예: "1000 가애.mp4" -> 1000
 * 예: "12337 에이맨(가애버전).mp4" -> 12337
 */
function extractSigNumber(fileName: string): number | null {
  const match = fileName.match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * 파일명에서 멤버 이름 추출
 * 예: "1000 가애.mp4" -> "가애"
 * 예: "12337 에이맨(가애버전).mp4" -> "에이맨" (원본 닉네임)
 */
function extractMemberFromFileName(fileName: string): string | null {
  // "숫자 이름" 패턴
  const match = fileName.match(/^\d+\s+([^\s.(]+)/)
  return match ? match[1] : null
}

/**
 * Google Drive 파일 목록 파싱 (CSV 또는 JSON)
 */
function parseFileList(filePath: string): DriveFile[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const ext = path.extname(filePath).toLowerCase()

  if (ext === '.json') {
    return JSON.parse(content)
  }

  // CSV 파싱 (형식: folderName,fileName)
  const lines = content.trim().split('\n')
  const files: DriveFile[] = []

  for (const line of lines.slice(1)) { // 헤더 스킵
    const [folderName, fileName] = line.split(',').map(s => s.trim())
    if (!folderName || !fileName) continue

    const sigNumber = extractSigNumber(fileName)
    if (!sigNumber) {
      console.warn(`⚠️  시그번호 추출 실패: ${fileName}`)
      continue
    }

    // 폴더명이 멤버 이름
    const memberId = MEMBER_MAP[folderName]
    if (!memberId) {
      console.warn(`⚠️  멤버 매핑 실패: ${folderName}`)
      continue
    }

    files.push({
      fileName,
      sigNumber,
      memberName: folderName,
      memberId,
      folderPath: folderName,
    })
  }

  return files
}

/**
 * DB에서 시그니처 및 영상 데이터 로드
 */
async function loadDBData() {
  const [sigResult, videoResult, memberResult] = await Promise.all([
    supabase.from('signatures').select('id, sig_number, title, unit').order('sig_number'),
    supabase.from('signature_videos').select('id, signature_id, member_id, video_url, cloudflare_uid'),
    supabase.from('organization').select('id, name, unit'),
  ])

  if (sigResult.error) throw new Error(`시그니처 로드 실패: ${sigResult.error.message}`)
  if (videoResult.error) throw new Error(`영상 로드 실패: ${videoResult.error.message}`)
  if (memberResult.error) throw new Error(`멤버 로드 실패: ${memberResult.error.message}`)

  return {
    signatures: sigResult.data as Signature[],
    videos: videoResult.data as SignatureVideo[],
    members: memberResult.data as { id: number; name: string; unit: string }[],
  }
}

/**
 * 데이터 정합성 검증
 */
async function validateData(driveFiles?: DriveFile[]): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  const { signatures, videos, members } = await loadDBData()

  // sig_number -> signature 매핑
  const sigMap = new Map<number, Signature>()
  signatures.forEach(s => sigMap.set(s.sig_number, s))

  // signature_id -> videos 매핑
  const videosBySig = new Map<number, SignatureVideo[]>()
  videos.forEach(v => {
    const list = videosBySig.get(v.signature_id) || []
    list.push(v)
    videosBySig.set(v.signature_id, list)
  })

  // 1. 중복 영상 체크 (같은 시그니처 + 같은 멤버)
  let duplicateCount = 0
  for (const [sigId, vids] of videosBySig) {
    const memberIds = vids.map(v => v.member_id)
    const uniqueMembers = new Set(memberIds)
    if (memberIds.length !== uniqueMembers.size) {
      const sig = signatures.find(s => s.id === sigId)
      errors.push(`중복 영상: 시그니처 ${sig?.sig_number} (${sig?.title})에 같은 멤버의 영상이 여러 개`)
      duplicateCount++
    }
  }

  // 2. 영상 없는 시그니처 목록
  const sigsWithoutVideo: Signature[] = []
  for (const sig of signatures) {
    if (!videosBySig.has(sig.id) || videosBySig.get(sig.id)!.length === 0) {
      sigsWithoutVideo.push(sig)
    }
  }

  // 3. 잘못된 member_id 참조 체크
  const memberIds = new Set(members.map(m => m.id))
  for (const video of videos) {
    if (!memberIds.has(video.member_id)) {
      errors.push(`잘못된 멤버 참조: video.id=${video.id}, member_id=${video.member_id}`)
    }
  }

  // 4. 잘못된 signature_id 참조 체크
  const signatureIds = new Set(signatures.map(s => s.id))
  for (const video of videos) {
    if (!signatureIds.has(video.signature_id)) {
      errors.push(`잘못된 시그니처 참조: video.id=${video.id}, signature_id=${video.signature_id}`)
    }
  }

  // 5. Drive 파일과 DB 매칭 검증 (파일 목록이 있는 경우)
  let matchedFiles = 0
  let unmatchedFiles = 0

  if (driveFiles && driveFiles.length > 0) {
    for (const file of driveFiles) {
      const sig = sigMap.get(file.sigNumber)
      if (!sig) {
        warnings.push(`DB에 없는 시그니처: ${file.sigNumber} (${file.fileName})`)
        unmatchedFiles++
        continue
      }

      // 이미 해당 시그니처+멤버 조합의 영상이 있는지 확인
      const existingVideos = videosBySig.get(sig.id) || []
      const hasVideo = existingVideos.some(v => v.member_id === file.memberId)

      if (hasVideo) {
        matchedFiles++
      } else {
        unmatchedFiles++
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalSignatures: signatures.length,
      signaturesWithVideo: signatures.length - sigsWithoutVideo.length,
      signaturesWithoutVideo: sigsWithoutVideo.length,
      totalVideos: videos.length,
      driveFiles: driveFiles?.length || 0,
      matchedFiles,
      unmatchedFiles,
      duplicateEntries: duplicateCount,
    },
  }
}

/**
 * 누락된 영상 목록 생성
 */
async function findMissingVideos(driveFiles: DriveFile[]): Promise<{
  toUpload: DriveFile[]
  alreadyExists: DriveFile[]
  noMatchingSig: DriveFile[]
}> {
  const { signatures, videos } = await loadDBData()

  const sigMap = new Map<number, Signature>()
  signatures.forEach(s => sigMap.set(s.sig_number, s))

  const existingPairs = new Set<string>()
  for (const v of videos) {
    const sig = signatures.find(s => s.id === v.signature_id)
    if (sig) {
      existingPairs.add(`${sig.sig_number}_${v.member_id}`)
    }
  }

  const toUpload: DriveFile[] = []
  const alreadyExists: DriveFile[] = []
  const noMatchingSig: DriveFile[] = []

  for (const file of driveFiles) {
    const sig = sigMap.get(file.sigNumber)
    if (!sig) {
      noMatchingSig.push(file)
      continue
    }

    const key = `${file.sigNumber}_${file.memberId}`
    if (existingPairs.has(key)) {
      alreadyExists.push(file)
    } else {
      toUpload.push(file)
    }
  }

  return { toUpload, alreadyExists, noMatchingSig }
}

/**
 * 상세 리포트 출력
 */
async function printReport(driveFiles?: DriveFile[]) {
  console.log('\n' + '='.repeat(60))
  console.log('📊 시그니처 영상 동기화 리포트')
  console.log('='.repeat(60))

  const result = await validateData(driveFiles)

  console.log('\n📈 통계:')
  console.log(`   전체 시그니처: ${result.stats.totalSignatures}개`)
  console.log(`   영상 있는 시그니처: ${result.stats.signaturesWithVideo}개`)
  console.log(`   영상 없는 시그니처: ${result.stats.signaturesWithoutVideo}개`)
  console.log(`   전체 영상: ${result.stats.totalVideos}개`)

  if (driveFiles && driveFiles.length > 0) {
    console.log(`\n📁 Drive 파일:`)
    console.log(`   전체 파일: ${result.stats.driveFiles}개`)
    console.log(`   이미 등록됨: ${result.stats.matchedFiles}개`)
    console.log(`   업로드 필요: ${result.stats.unmatchedFiles}개`)
  }

  if (result.errors.length > 0) {
    console.log('\n❌ 오류:')
    result.errors.forEach(e => console.log(`   - ${e}`))
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  경고:')
    result.warnings.slice(0, 10).forEach(w => console.log(`   - ${w}`))
    if (result.warnings.length > 10) {
      console.log(`   ... 외 ${result.warnings.length - 10}개`)
    }
  }

  if (result.valid) {
    console.log('\n✅ 데이터 정합성 검증 통과!')
  } else {
    console.log('\n❌ 데이터 정합성 검증 실패')
  }

  console.log('\n' + '='.repeat(60))
}

/**
 * 영상 없는 시그니처 목록 출력
 */
async function printMissingSignatures() {
  const { signatures, videos } = await loadDBData()

  const sigWithVideo = new Set<number>()
  for (const v of videos) {
    sigWithVideo.add(v.signature_id)
  }

  const missing = signatures.filter(s => !sigWithVideo.has(s.id))

  console.log('\n📋 영상 없는 시그니처 목록:')
  console.log('-'.repeat(50))

  for (const sig of missing) {
    console.log(`${sig.sig_number}\t${sig.title}`)
  }

  console.log('-'.repeat(50))
  console.log(`총 ${missing.length}개`)
}

/**
 * 업로드 필요한 파일 목록 출력
 */
async function printUploadList(driveFiles: DriveFile[]) {
  const { toUpload, alreadyExists, noMatchingSig } = await findMissingVideos(driveFiles)

  console.log('\n' + '='.repeat(60))
  console.log('📤 업로드 필요 목록')
  console.log('='.repeat(60))

  console.log(`\n✅ 이미 등록됨: ${alreadyExists.length}개`)
  console.log(`📤 업로드 필요: ${toUpload.length}개`)
  console.log(`⚠️  DB에 시그니처 없음: ${noMatchingSig.length}개`)

  if (toUpload.length > 0) {
    console.log('\n📤 업로드 필요한 파일:')
    console.log('-'.repeat(50))
    for (const file of toUpload) {
      console.log(`  ${file.sigNumber}\t${file.memberName}\t${file.fileName}`)
    }
  }

  if (noMatchingSig.length > 0) {
    console.log('\n⚠️  DB에 시그니처가 없는 파일:')
    console.log('-'.repeat(50))
    for (const file of noMatchingSig) {
      console.log(`  ${file.sigNumber}\t${file.memberName}\t${file.fileName}`)
    }
  }

  console.log('\n' + '='.repeat(60))
}

// 메인 실행
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
시그니처 영상 동기화 스크립트

사용법:
  npx tsx scripts/sync-signature-videos.ts [옵션]

옵션:
  --check              데이터 정합성 검증만 수행
  --report             상세 리포트 출력
  --missing            영상 없는 시그니처 목록 출력
  --upload-list        업로드 필요 목록 출력
  --file <path>        Drive 파일 목록 (CSV/JSON)
  --help, -h           도움말 출력

CSV 파일 형식:
  folder,fileName
  가애,1000 가애.mp4
  가애,1002 가애.mp4
  ...
`)
    return
  }

  const fileIndex = args.indexOf('--file')
  let driveFiles: DriveFile[] | undefined

  if (fileIndex !== -1 && args[fileIndex + 1]) {
    const filePath = args[fileIndex + 1]
    if (fs.existsSync(filePath)) {
      driveFiles = parseFileList(filePath)
      console.log(`📁 파일 목록 로드: ${driveFiles.length}개`)
    } else {
      console.error(`❌ 파일을 찾을 수 없음: ${filePath}`)
      process.exit(1)
    }
  }

  if (args.includes('--missing')) {
    await printMissingSignatures()
    return
  }

  if (args.includes('--upload-list')) {
    if (!driveFiles) {
      console.error('❌ --file 옵션으로 파일 목록을 지정해주세요.')
      process.exit(1)
    }
    await printUploadList(driveFiles)
    return
  }

  if (args.includes('--check')) {
    const result = await validateData(driveFiles)
    console.log(result.valid ? '✅ 정합성 검증 통과' : '❌ 정합성 검증 실패')
    if (!result.valid) {
      result.errors.forEach(e => console.log(`  - ${e}`))
    }
    return
  }

  // 기본: 리포트 출력
  await printReport(driveFiles)
}

main().catch(console.error)
