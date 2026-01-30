/**
 * 시그니처 영상 Cloudflare Stream 대량 업로드 스크립트
 *
 * 사용법:
 *   npx tsx scripts/upload-signature-videos-cloudflare.ts --dry-run     # 드라이런 (실제 업로드 안 함)
 *   npx tsx scripts/upload-signature-videos-cloudflare.ts --member 가애  # 특정 멤버만
 *   npx tsx scripts/upload-signature-videos-cloudflare.ts               # 전체 업로드
 *
 * 필수 환경변수:
 *   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, SUPABASE_SERVICE_ROLE_KEY
 *
 * 로컬 파일 구조:
 *   /tmp/signature-videos/01화/{멤버명}/{시그번호} {멤버이름}.mp4
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

// 환경변수 로드
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!

// 기본 경로 (사용자가 Google Drive에서 다운로드한 위치)
const BASE_PATH = '/tmp/signature-videos/01화'

// 멤버 ID 매핑
const MEMBER_ID_MAP: Record<string, number> = {
  '린아': 59,
  '가애': 60,
  '채은': 61,
  '설윤': 62,
  '가윤': 63,
  '홍서하': 65,
  '월아': 66,
  '한백설': 67,
  '퀸로니': 68,
  '해린': 69,
  '한세아': 70,
  '청아': 71,
  '키키': 72,
}

// 동시 업로드 제한
const CONCURRENT_UPLOADS = 3

// Supabase 클라이언트
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface UploadTask {
  filePath: string
  fileName: string
  memberName: string
  memberId: number
  sigNumber: number
  signatureId: number | null
}

// 파일명 파싱: "{시그번호} {멤버이름}.mp4" -> { sigNumber, memberName }
function parseFileName(fileName: string): { sigNumber: number; memberName: string } | null {
  // "1234 가애.mp4" 형식
  const match = fileName.match(/^(\d+)\s+(.+)\.mp4$/i)
  if (!match) return null

  return {
    sigNumber: parseInt(match[1], 10),
    memberName: match[2].trim(),
  }
}

// Cloudflare Direct Upload URL 발급
async function getUploadUrl(fileName: string): Promise<{ uploadURL: string; uid: string }> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxDurationSeconds: 21600, // 6시간
        meta: { name: fileName },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Cloudflare upload URL 발급 실패: ${err}`)
  }

  const data = await res.json()
  return {
    uploadURL: data.result.uploadURL,
    uid: data.result.uid,
  }
}

// 파일 업로드
async function uploadFile(filePath: string, uploadURL: string): Promise<void> {
  const fileBuffer = fs.readFileSync(filePath)
  const formData = new FormData()
  formData.append('file', new Blob([fileBuffer]), path.basename(filePath))

  const res = await fetch(uploadURL, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    throw new Error(`파일 업로드 실패: ${res.status}`)
  }
}

// 영상 처리 상태 폴링
async function waitForProcessing(uid: string, maxWaitMs = 600000): Promise<void> {
  const startTime = Date.now()
  const pollInterval = 5000

  while (Date.now() - startTime < maxWaitMs) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
      {
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        },
      }
    )

    if (res.ok) {
      const data = await res.json()
      const state = data.result?.status?.state

      if (state === 'ready') {
        return
      }
      if (state === 'error') {
        throw new Error(`영상 처리 오류: ${data.result?.status?.errorReasonText}`)
      }

      const pct = data.result?.status?.pctComplete || '0'
      process.stdout.write(`\r  처리 중... ${pct}%`)
    }

    await new Promise((r) => setTimeout(r, pollInterval))
  }

  throw new Error('영상 처리 타임아웃')
}

// DB에 cloudflare_uid 업데이트
async function updateSignatureVideo(
  signatureId: number,
  memberId: number,
  cloudflareUid: string
): Promise<void> {
  // 기존 레코드 조회
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
      .update({
        cloudflare_uid: cloudflareUid,
        video_url: `https://customer-stream.cloudflarestream.com/${cloudflareUid}/manifest/video.m3u8`,
      })
      .eq('id', existing.id)

    if (error) throw error
  } else {
    // 신규 삽입
    const { error } = await supabase.from('signature_videos').insert({
      signature_id: signatureId,
      member_id: memberId,
      video_url: `https://customer-stream.cloudflarestream.com/${cloudflareUid}/manifest/video.m3u8`,
      cloudflare_uid: cloudflareUid,
    })

    if (error) throw error
  }
}

// 시그니처 ID 조회
async function getSignatureId(sigNumber: number): Promise<number | null> {
  const { data } = await supabase
    .from('signatures')
    .select('id')
    .eq('sig_number', sigNumber)
    .single()

  return data?.id || null
}

// 로컬 파일 스캔
function scanLocalFiles(basePath: string, memberFilter?: string): UploadTask[] {
  const tasks: UploadTask[] = []

  if (!fs.existsSync(basePath)) {
    console.error(`경로가 존재하지 않습니다: ${basePath}`)
    return tasks
  }

  const memberDirs = fs.readdirSync(basePath)

  for (const memberDir of memberDirs) {
    const memberPath = path.join(basePath, memberDir)

    if (!fs.statSync(memberPath).isDirectory()) continue

    // 멤버 필터 적용
    if (memberFilter && memberDir !== memberFilter) continue

    const memberId = MEMBER_ID_MAP[memberDir]
    if (!memberId) {
      console.warn(`알 수 없는 멤버: ${memberDir}`)
      continue
    }

    const files = fs.readdirSync(memberPath).filter((f) => f.toLowerCase().endsWith('.mp4'))

    for (const file of files) {
      const parsed = parseFileName(file)
      if (!parsed) {
        console.warn(`파일명 파싱 실패: ${file}`)
        continue
      }

      tasks.push({
        filePath: path.join(memberPath, file),
        fileName: file,
        memberName: memberDir,
        memberId,
        sigNumber: parsed.sigNumber,
        signatureId: null, // 나중에 조회
      })
    }
  }

  return tasks
}

// 단일 업로드 처리
async function processUpload(task: UploadTask, dryRun: boolean): Promise<boolean> {
  const { filePath, fileName, memberName, memberId, sigNumber } = task

  console.log(`\n[${memberName}] 시그 ${sigNumber}: ${fileName}`)

  // 시그니처 ID 조회
  const signatureId = await getSignatureId(sigNumber)
  if (!signatureId) {
    console.error(`  시그니처 ${sigNumber} 없음 - 스킵`)
    return false
  }

  if (dryRun) {
    console.log(`  [드라이런] 업로드 스킵 (signature_id: ${signatureId}, member_id: ${memberId})`)
    return true
  }

  try {
    // 1. Upload URL 발급
    console.log('  1. Cloudflare 업로드 URL 발급...')
    const { uploadURL, uid } = await getUploadUrl(fileName)
    console.log(`     UID: ${uid}`)

    // 2. 파일 업로드
    console.log('  2. 파일 업로드 중...')
    await uploadFile(filePath, uploadURL)
    console.log('     업로드 완료')

    // 3. 처리 대기
    console.log('  3. Cloudflare 처리 대기...')
    await waitForProcessing(uid)
    console.log('\n     처리 완료')

    // 4. DB 업데이트
    console.log('  4. DB 업데이트...')
    await updateSignatureVideo(signatureId, memberId, uid)
    console.log('     완료!')

    return true
  } catch (err) {
    console.error(`  오류: ${err instanceof Error ? err.message : err}`)
    return false
  }
}

// 메인 함수
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const memberIdx = args.indexOf('--member')
  const memberFilter = memberIdx !== -1 ? args[memberIdx + 1] : undefined

  console.log('========================================')
  console.log('시그니처 영상 Cloudflare 업로드 스크립트')
  console.log('========================================')
  console.log(`모드: ${dryRun ? '드라이런 (실제 업로드 안 함)' : '실제 업로드'}`)
  if (memberFilter) console.log(`멤버 필터: ${memberFilter}`)
  console.log(`기본 경로: ${BASE_PATH}`)
  console.log('')

  // 환경변수 검증
  if (!dryRun) {
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      console.error('CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN 환경변수 필요')
      process.exit(1)
    }
  }

  // 파일 스캔
  const tasks = scanLocalFiles(BASE_PATH, memberFilter)
  console.log(`발견된 파일: ${tasks.length}개`)

  if (tasks.length === 0) {
    console.log('업로드할 파일이 없습니다.')
    return
  }

  // 업로드 실행
  let successCount = 0
  let failCount = 0

  // 동시 업로드 제한을 위한 배치 처리
  for (let i = 0; i < tasks.length; i += CONCURRENT_UPLOADS) {
    const batch = tasks.slice(i, i + CONCURRENT_UPLOADS)
    const results = await Promise.all(batch.map((task) => processUpload(task, dryRun)))

    results.forEach((success) => {
      if (success) successCount++
      else failCount++
    })
  }

  console.log('\n========================================')
  console.log(`완료: 성공 ${successCount}개, 실패 ${failCount}개`)
  console.log('========================================')
}

main().catch(console.error)
