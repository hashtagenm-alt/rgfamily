/**
 * 시그니처 영상 일괄 업로드 스크립트
 *
 * 사용법:
 * 1. Google Drive에서 영상 파일들을 로컬 폴더에 다운로드
 * 2. 스크립트 실행: npx tsx scripts/batch-upload-signature-videos.ts --folder ./videos
 *
 * 옵션:
 *   --folder <path>    영상 파일이 있는 폴더 경로
 *   --dry-run          실제 업로드 없이 테스트만
 *   --limit <n>        최대 업로드 개수 제한
 *   --member <name>    특정 멤버만 처리 (예: 가애)
 *   --sig <number>     특정 시그니처만 처리
 */

import { getServiceClient } from './lib/supabase'
import * as fs from 'fs'
import * as path from 'path'
import * as tus from 'tus-js-client'

// Supabase 클라이언트
const supabase = getServiceClient()

// Cloudflare 설정
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || ''
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || ''
const CLOUDFLARE_STREAM_API = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`

// 멤버 ID 매핑
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

// 특수 매핑 (파일명에 다른 이름이 있는 경우)
const SPECIAL_NAME_MAP: Record<string, string> = {
  '에이맨': '린아',
  '클로저': '가애', // 기본값, 파일명에서 멤버 확인 필요
  '르큐리': '청아', // 기본값
  '호랭이': '한세아',
  '씌발이': '가윤',
  '미드굿': '가애',
  '솜사탕': '홍서하',
  '키세스': '채은', // 또는 퀸로니
}

interface VideoFile {
  filePath: string
  fileName: string
  sigNumber: number
  memberName: string
  memberId: number
}

interface Signature {
  id: number
  sig_number: number
  title: string
  unit: string
}

interface UploadResult {
  file: VideoFile
  success: boolean
  cloudflareUid?: string
  videoId?: number
  error?: string
}

/**
 * 파일명에서 시그니처 번호 추출
 */
function extractSigNumber(fileName: string): number | null {
  // "1000 가애.mp4" or "100,000 채은.mp4"
  const match = fileName.match(/^([\d,]+)/)
  if (match) {
    return parseInt(match[1].replace(/,/g, ''), 10)
  }
  return null
}

/**
 * 파일명에서 멤버 이름 추출
 */
function extractMemberName(fileName: string, folderName?: string): string | null {
  // 폴더명이 있으면 폴더명 우선 (멤버 이름 폴더 구조)
  if (folderName && MEMBER_MAP[folderName]) {
    return folderName
  }

  // 파일명에서 추출: "1000 가애.mp4" -> "가애"
  const match = fileName.match(/[\d,]+\s+([^\s.(]+)/)
  if (match) {
    const name = match[1]
    // 특수 매핑 확인
    if (SPECIAL_NAME_MAP[name]) {
      return SPECIAL_NAME_MAP[name]
    }
    if (MEMBER_MAP[name]) {
      return name
    }
  }

  return null
}

/**
 * 로컬 폴더에서 영상 파일 목록 수집
 */
function collectVideoFiles(folderPath: string): VideoFile[] {
  const files: VideoFile[] = []

  function scanDir(dirPath: string, parentFolder?: string) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        // 멤버 이름 폴더인 경우 폴더명 전달
        const folderName = MEMBER_MAP[entry.name] ? entry.name : parentFolder
        scanDir(fullPath, folderName)
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.mp4')) {
        const sigNumber = extractSigNumber(entry.name)
        if (!sigNumber) {
          console.warn(`⚠️  시그번호 추출 실패: ${entry.name}`)
          continue
        }

        const memberName = extractMemberName(entry.name, parentFolder)
        if (!memberName) {
          console.warn(`⚠️  멤버 추출 실패: ${entry.name}`)
          continue
        }

        const memberId = MEMBER_MAP[memberName]
        if (!memberId) {
          console.warn(`⚠️  멤버 ID 없음: ${memberName} (${entry.name})`)
          continue
        }

        files.push({
          filePath: fullPath,
          fileName: entry.name,
          sigNumber,
          memberName,
          memberId,
        })
      }
    }
  }

  scanDir(folderPath)
  return files
}

/**
 * DB에서 시그니처 목록 로드
 */
async function loadSignatures(): Promise<Map<number, Signature>> {
  const { data, error } = await supabase
    .from('signatures')
    .select('id, sig_number, title, unit')
    .order('sig_number')

  if (error) throw new Error(`시그니처 로드 실패: ${error.message}`)

  const map = new Map<number, Signature>()
  for (const sig of data || []) {
    map.set(sig.sig_number, sig)
  }
  return map
}

/**
 * 이미 등록된 영상 조합 확인
 */
async function loadExistingVideos(): Promise<Set<string>> {
  const { data: videos, error: videoError } = await supabase
    .from('signature_videos')
    .select('signature_id, member_id')

  if (videoError) throw new Error(`영상 로드 실패: ${videoError.message}`)

  const { data: signatures, error: sigError } = await supabase
    .from('signatures')
    .select('id, sig_number')

  if (sigError) throw new Error(`시그니처 로드 실패: ${sigError.message}`)

  const sigIdToNumber = new Map<number, number>()
  for (const sig of signatures || []) {
    sigIdToNumber.set(sig.id, sig.sig_number)
  }

  const existing = new Set<string>()
  for (const v of videos || []) {
    const sigNumber = sigIdToNumber.get(v.signature_id)
    if (sigNumber) {
      existing.add(`${sigNumber}_${v.member_id}`)
    }
  }
  return existing
}

/**
 * Cloudflare TUS 업로드 (대용량 파일 지원)
 * @returns Cloudflare Stream UID
 */
async function uploadWithTus(
  filePath: string,
  fileName: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const fileSize = fs.statSync(filePath).size
  const fileStream = fs.createReadStream(filePath)

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(fileStream, {
      endpoint: `${CLOUDFLARE_STREAM_API}`,
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
      chunkSize: 50 * 1024 * 1024, // 50MB chunks
      retryDelays: [0, 3000, 5000, 10000, 20000],
      metadata: {
        filename: fileName,
        filetype: 'video/mp4',
      },
      uploadSize: fileSize,
      onError: (error) => {
        reject(new Error(`TUS 업로드 실패: ${error.message}`))
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = Math.round((bytesUploaded / bytesTotal) * 100)
        process.stdout.write(`\r    업로드 중... ${percentage}%`)
        onProgress?.(percentage)
      },
      onSuccess: () => {
        // TUS 업로드 완료 후 UID 추출 (URL에서)
        const uploadUrl = upload.url
        if (!uploadUrl) {
          reject(new Error('업로드 URL을 가져올 수 없습니다.'))
          return
        }
        // URL 형식:
        // - https://api.cloudflare.com/client/v4/accounts/{account_id}/stream/{uid}
        // - https://edge-production.gateway.api.cloudflare.com/client/v4/accounts/{account_id}/media/{uid}?tusv2=true
        const uidMatch = uploadUrl.match(/\/(?:stream|media)\/([a-f0-9]+)/)
        if (uidMatch) {
          console.log('') // 줄바꿈
          resolve(uidMatch[1])
        } else {
          reject(new Error(`UID 추출 실패: ${uploadUrl}`))
        }
      },
    })

    upload.start()
  })
}

/**
 * 영상 처리 상태 폴링
 */
async function pollVideoStatus(uid: string, maxAttempts = 120): Promise<{ ready: boolean; duration: number }> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000)) // 5초 대기

    const res = await fetch(`${CLOUDFLARE_STREAM_API}/${uid}`, {
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
    })

    const json = await res.json()
    if (!json.success) continue

    const status = json.result?.status
    if (status?.state === 'ready') {
      return { ready: true, duration: json.result.duration || 0 }
    }
    if (status?.state === 'error') {
      throw new Error(status.errorReasonText || '영상 처리 오류')
    }

    const pct = status?.pctComplete || '0'
    process.stdout.write(`\r    처리 중... ${pct}%`)
  }

  throw new Error('영상 처리 타임아웃')
}

/**
 * DB에 영상 레코드 삽입
 */
async function insertVideoRecord(
  signatureId: number,
  memberId: number,
  cloudflareUid: string
): Promise<number> {
  const videoUrl = `https://customer-stream.cloudflarestream.com/${cloudflareUid}/manifest/video.m3u8`

  const { data, error } = await supabase
    .from('signature_videos')
    .insert({
      signature_id: signatureId,
      member_id: memberId,
      video_url: videoUrl,
      cloudflare_uid: cloudflareUid,
    })
    .select('id')
    .single()

  if (error) throw new Error(`DB 삽입 실패: ${error.message}`)
  return data.id
}

/**
 * 단일 파일 업로드 처리
 */
async function uploadSingleFile(
  file: VideoFile,
  signatureId: number,
  dryRun: boolean
): Promise<UploadResult> {
  console.log(`\n📤 업로드: ${file.fileName}`)
  console.log(`   시그: ${file.sigNumber}, 멤버: ${file.memberName} (ID: ${file.memberId})`)

  if (dryRun) {
    console.log('   [DRY-RUN] 스킵')
    return { file, success: true }
  }

  try {
    // 1. TUS 업로드 (대용량 파일 지원)
    console.log('   1. Cloudflare TUS 업로드...')
    const uid = await uploadWithTus(file.filePath, file.fileName)

    // 2. 처리 완료 대기
    console.log('   2. 처리 대기...')
    const { ready, duration } = await pollVideoStatus(uid)
    console.log(`\n   ✅ 처리 완료 (${duration}초)`)

    // 3. DB 저장
    console.log('   3. DB 저장...')
    const videoId = await insertVideoRecord(signatureId, file.memberId, uid)

    console.log(`   ✅ 완료! (video_id: ${videoId}, uid: ${uid})`)

    return {
      file,
      success: true,
      cloudflareUid: uid,
      videoId,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    console.log(`   ❌ 실패: ${message}`)
    return { file, success: false, error: message }
  }
}

/**
 * 메인 실행
 */
async function main() {
  const args = process.argv.slice(2)

  // 도움말
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
시그니처 영상 일괄 업로드 스크립트

사용법:
  npx tsx scripts/batch-upload-signature-videos.ts [옵션]

옵션:
  --folder <path>    영상 파일이 있는 폴더 경로 (필수)
  --dry-run          실제 업로드 없이 테스트만
  --limit <n>        최대 업로드 개수 제한
  --member <name>    특정 멤버만 처리 (예: 가애)
  --sig <number>     특정 시그니처만 처리
  --help, -h         도움말

예시:
  npx tsx scripts/batch-upload-signature-videos.ts --folder ./downloaded-videos
  npx tsx scripts/batch-upload-signature-videos.ts --folder ./videos --member 가애 --dry-run
  npx tsx scripts/batch-upload-signature-videos.ts --folder ./videos --limit 5
`)
    return
  }

  // 환경변수 확인
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('❌ CLOUDFLARE_ACCOUNT_ID 또는 CLOUDFLARE_API_TOKEN이 설정되지 않았습니다.')
    process.exit(1)
  }

  // 옵션 파싱
  const folderIdx = args.indexOf('--folder')
  const folderPath = folderIdx !== -1 ? args[folderIdx + 1] : null
  const dryRun = args.includes('--dry-run')
  const limitIdx = args.indexOf('--limit')
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity
  const memberIdx = args.indexOf('--member')
  const memberFilter = memberIdx !== -1 ? args[memberIdx + 1] : null
  const sigIdx = args.indexOf('--sig')
  const sigFilter = sigIdx !== -1 ? parseInt(args[sigIdx + 1], 10) : null

  if (!folderPath || !fs.existsSync(folderPath)) {
    console.error('❌ --folder 옵션으로 유효한 폴더 경로를 지정해주세요.')
    process.exit(1)
  }

  console.log('\n' + '='.repeat(60))
  console.log('📤 시그니처 영상 일괄 업로드')
  console.log('='.repeat(60))
  console.log(`\n📁 폴더: ${folderPath}`)
  if (dryRun) console.log('⚠️  DRY-RUN 모드 (실제 업로드 안 함)')
  if (memberFilter) console.log(`👤 멤버 필터: ${memberFilter}`)
  if (sigFilter) console.log(`🔢 시그 필터: ${sigFilter}`)
  if (limit < Infinity) console.log(`📊 최대 업로드: ${limit}개`)

  // 1. 파일 수집
  console.log('\n🔍 파일 수집 중...')
  let files = collectVideoFiles(folderPath)
  console.log(`   ${files.length}개 파일 발견`)

  // 필터 적용
  if (memberFilter) {
    files = files.filter((f) => f.memberName === memberFilter)
    console.log(`   멤버 필터 적용: ${files.length}개`)
  }
  if (sigFilter) {
    files = files.filter((f) => f.sigNumber === sigFilter)
    console.log(`   시그 필터 적용: ${files.length}개`)
  }

  // 2. DB 데이터 로드
  console.log('\n📊 DB 데이터 로드...')
  const signatures = await loadSignatures()
  const existingVideos = await loadExistingVideos()
  console.log(`   시그니처: ${signatures.size}개`)
  console.log(`   기존 영상 조합: ${existingVideos.size}개`)

  // 3. 업로드 대상 필터링
  const toUpload: Array<{ file: VideoFile; signatureId: number }> = []
  const skipped: VideoFile[] = []
  const noSignature: VideoFile[] = []

  for (const file of files) {
    const signature = signatures.get(file.sigNumber)
    if (!signature) {
      noSignature.push(file)
      continue
    }

    const key = `${file.sigNumber}_${file.memberId}`
    if (existingVideos.has(key)) {
      skipped.push(file)
      continue
    }

    toUpload.push({ file, signatureId: signature.id })
  }

  console.log(`\n📋 업로드 대상:`)
  console.log(`   ✅ 이미 등록됨: ${skipped.length}개`)
  console.log(`   📤 업로드 필요: ${toUpload.length}개`)
  console.log(`   ⚠️  시그니처 없음: ${noSignature.length}개`)

  if (noSignature.length > 0) {
    console.log('\n⚠️  DB에 시그니처가 없는 파일:')
    for (const f of noSignature.slice(0, 5)) {
      console.log(`   - ${f.sigNumber} ${f.memberName}: ${f.fileName}`)
    }
    if (noSignature.length > 5) {
      console.log(`   ... 외 ${noSignature.length - 5}개`)
    }
  }

  if (toUpload.length === 0) {
    console.log('\n✅ 업로드할 파일이 없습니다.')
    return
  }

  // 4. 업로드 실행
  const uploadTargets = toUpload.slice(0, limit)
  console.log(`\n🚀 ${uploadTargets.length}개 파일 업로드 시작...`)

  const results: UploadResult[] = []
  for (let i = 0; i < uploadTargets.length; i++) {
    const { file, signatureId } = uploadTargets[i]
    console.log(`\n[${i + 1}/${uploadTargets.length}]`)

    const result = await uploadSingleFile(file, signatureId, dryRun)
    results.push(result)

    // 연속 요청 방지를 위한 딜레이
    if (!dryRun && i < uploadTargets.length - 1) {
      await new Promise((r) => setTimeout(r, 2000))
    }
  }

  // 5. 결과 요약
  const succeeded = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)

  console.log('\n' + '='.repeat(60))
  console.log('📊 업로드 결과')
  console.log('='.repeat(60))
  console.log(`   ✅ 성공: ${succeeded.length}개`)
  console.log(`   ❌ 실패: ${failed.length}개`)

  if (failed.length > 0) {
    console.log('\n❌ 실패한 파일:')
    for (const r of failed) {
      console.log(`   - ${r.file.fileName}: ${r.error}`)
    }
  }

  console.log('\n' + '='.repeat(60))
}

main().catch((err) => {
  console.error('❌ 오류:', err.message)
  process.exit(1)
})
