/**
 * 직캠 영상 업로드 스크립트
 *
 * 사용법:
 * npx tsx scripts/upload-fancam-videos.ts
 * npx tsx scripts/upload-fancam-videos.ts --dry-run
 * npx tsx scripts/upload-fancam-videos.ts --limit 5
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

// 직캠 폴더 경로
const FANCAM_FOLDER = path.join(__dirname, 'downloads/직캠')

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
  '에이맨': 59, // 린아
}

interface VideoFile {
  filePath: string
  fileName: string
  sigNumber: number
  memberName: string
  memberId: number
  isAlternate: boolean // -1 suffix
}

interface UploadResult {
  file: VideoFile
  success: boolean
  cloudflareUid?: string
  videoId?: number
  error?: string
}

/**
 * 파일명 파싱: "가애 1007.mp4" or "채은 10092-1.mp4"
 */
function parseFileName(fileName: string): { memberName: string; sigNumber: number; isAlternate: boolean } | null {
  // Pattern: "멤버명 시그번호.mp4" or "멤버명 시그번호-1.mp4"
  const match = fileName.match(/^(.+?)\s+(\d+)(-1)?\.mp4$/i)
  if (!match) return null

  return {
    memberName: match[1].trim(),
    sigNumber: parseInt(match[2], 10),
    isAlternate: !!match[3],
  }
}

/**
 * 시그니처 ID 찾기
 */
async function findSignatureId(sigNumber: number): Promise<number | null> {
  const { data, error } = await supabase
    .from('signatures')
    .select('id')
    .eq('sig_number', sigNumber)
    .single()

  if (error || !data) {
    console.log(`⚠️ 시그니처 ${sigNumber} 없음`)
    return null
  }
  return data.id
}

/**
 * 이미 업로드된 영상인지 확인
 */
async function isAlreadyUploaded(signatureId: number, memberId: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('signature_videos')
    .select('id')
    .eq('signature_id', signatureId)
    .eq('member_id', memberId)
    .limit(1)

  return !error && data && data.length > 0
}

/**
 * TUS 프로토콜로 Cloudflare Stream에 업로드
 */
async function uploadWithTus(
  filePath: string,
  fileName: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const fileSize = fs.statSync(filePath).size
  const fileStream = fs.createReadStream(filePath)

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(fileStream as unknown as tus.Upload['file'], {
      endpoint: CLOUDFLARE_STREAM_API,
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
        reject(error)
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percent = Math.round((bytesUploaded / bytesTotal) * 100)
        if (onProgress) onProgress(percent)
      },
      onSuccess: () => {
        const uploadUrl = upload.url || ''
        // URL formats:
        // - https://api.cloudflare.com/client/v4/accounts/{account_id}/stream/{uid}
        // - https://edge-production.gateway.api.cloudflare.com/client/v4/accounts/{account_id}/media/{uid}?tusv2=true
        const uidMatch = uploadUrl.match(/\/(?:stream|media)\/([a-f0-9]+)/)
        if (uidMatch) {
          resolve(uidMatch[1])
        } else {
          reject(new Error(`Failed to extract UID from URL: ${uploadUrl}`))
        }
      },
    })
    upload.start()
  })
}

/**
 * DB에 영상 기록 추가
 */
async function insertVideoRecord(
  signatureId: number,
  memberId: number,
  cloudflareUid: string
): Promise<number | null> {
  const videoUrl = `https://iframe.videodelivery.net/${cloudflareUid}`

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

  if (error) {
    console.error(`❌ DB 삽입 실패:`, error.message)
    return null
  }
  return data.id
}

/**
 * 파일 목록 수집
 */
function collectVideoFiles(): VideoFile[] {
  const files: VideoFile[] = []

  if (!fs.existsSync(FANCAM_FOLDER)) {
    console.error(`❌ 폴더 없음: ${FANCAM_FOLDER}`)
    return files
  }

  const fileNames = fs.readdirSync(FANCAM_FOLDER).filter((f) => f.endsWith('.mp4'))

  for (const fileName of fileNames) {
    // Skip MVI_* files (raw camera files without proper naming)
    if (fileName.startsWith('MVI_')) {
      console.log(`⏭️ 스킵 (명명 규칙 불일치): ${fileName}`)
      continue
    }

    const parsed = parseFileName(fileName)
    if (!parsed) {
      console.log(`⏭️ 스킵 (파싱 실패): ${fileName}`)
      continue
    }

    const memberId = MEMBER_MAP[parsed.memberName]
    if (!memberId) {
      console.log(`⏭️ 스킵 (멤버 없음): ${fileName} (${parsed.memberName})`)
      continue
    }

    files.push({
      filePath: path.join(FANCAM_FOLDER, fileName),
      fileName,
      sigNumber: parsed.sigNumber,
      memberName: parsed.memberName,
      memberId,
      isAlternate: parsed.isAlternate,
    })
  }

  return files
}

/**
 * 단일 파일 업로드
 */
async function uploadSingleFile(file: VideoFile, dryRun: boolean): Promise<UploadResult> {
  console.log(`\n📹 처리 중: ${file.fileName}`)
  console.log(`   멤버: ${file.memberName} (ID: ${file.memberId})`)
  console.log(`   시그번호: ${file.sigNumber}`)

  // 1. 시그니처 ID 찾기
  const signatureId = await findSignatureId(file.sigNumber)
  if (!signatureId) {
    return { file, success: false, error: `시그니처 ${file.sigNumber} 없음` }
  }
  console.log(`   시그니처 ID: ${signatureId}`)

  // 2. 이미 업로드된 영상인지 확인 (대체 영상이 아닌 경우만)
  if (!file.isAlternate) {
    const alreadyExists = await isAlreadyUploaded(signatureId, file.memberId)
    if (alreadyExists) {
      console.log(`   ⏭️ 이미 업로드됨, 스킵`)
      return { file, success: false, error: '이미 존재' }
    }
  }

  if (dryRun) {
    console.log(`   🔵 [DRY-RUN] 업로드 예정`)
    return { file, success: true }
  }

  // 3. Cloudflare Stream 업로드
  console.log(`   ⬆️ Cloudflare 업로드 중...`)
  try {
    const cloudflareUid = await uploadWithTus(file.filePath, file.fileName, (percent) => {
      process.stdout.write(`\r   진행률: ${percent}%`)
    })
    console.log(`\n   ✅ Cloudflare UID: ${cloudflareUid}`)

    // 4. DB에 기록
    const videoId = await insertVideoRecord(signatureId, file.memberId, cloudflareUid)
    if (!videoId) {
      return { file, success: false, cloudflareUid, error: 'DB 삽입 실패' }
    }
    console.log(`   ✅ DB 기록 완료 (video_id: ${videoId})`)

    return { file, success: true, cloudflareUid, videoId }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.log(`   ❌ 업로드 실패: ${errorMsg}`)
    return { file, success: false, error: errorMsg }
  }
}

/**
 * 메인 함수
 */
async function main() {
  console.log('=== 직캠 영상 업로드 ===\n')

  // 인자 파싱
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitIdx = args.indexOf('--limit')
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity

  if (dryRun) {
    console.log('🔵 DRY-RUN 모드: 실제 업로드 없음\n')
  }

  // Cloudflare 설정 확인
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('❌ Cloudflare 설정 없음')
    console.error('   CLOUDFLARE_ACCOUNT_ID와 CLOUDFLARE_API_TOKEN을 .env.local에 설정하세요')
    return
  }

  // 파일 목록 수집
  const files = collectVideoFiles()
  console.log(`\n📁 발견된 파일: ${files.length}개`)

  if (files.length === 0) {
    console.log('업로드할 파일이 없습니다.')
    return
  }

  // 업로드 실행
  const results: UploadResult[] = []
  const filesToProcess = files.slice(0, limit)

  console.log(`\n⬆️ 업로드 시작 (${filesToProcess.length}개)...`)

  for (const file of filesToProcess) {
    const result = await uploadSingleFile(file, dryRun)
    results.push(result)
  }

  // 결과 요약
  console.log('\n\n=== 결과 요약 ===')
  const successful = results.filter((r) => r.success && !r.error)
  const skipped = results.filter((r) => r.error === '이미 존재')
  const failed = results.filter((r) => !r.success && r.error !== '이미 존재')

  console.log(`✅ 성공: ${successful.length}개`)
  console.log(`⏭️ 스킵 (이미 존재): ${skipped.length}개`)
  console.log(`❌ 실패: ${failed.length}개`)

  if (failed.length > 0) {
    console.log('\n실패한 파일:')
    failed.forEach((r) => console.log(`  - ${r.file.fileName}: ${r.error}`))
  }
}

main().catch(console.error)
