/**
 * 폴더 기반 시그니처 영상 대량 업로드 스크립트
 *
 * 폴더 구조 예시:
 *   /videos/
 *     ├── 린아/
 *     │   ├── 777.mp4
 *     │   ├── 1000.mp4
 *     │   └── ...
 *     ├── 가애/
 *     │   ├── 777.mp4
 *     │   └── ...
 *     └── ...
 *
 * 파일명 규칙: {sig_number}.mp4 (예: 777.mp4, 1000.mp4)
 * 폴더명 규칙: {멤버이름} (예: 린아, 가애)
 *
 * 사용법: npx tsx scripts/bulk-upload-signature-videos/upload-from-folders.ts <폴더경로> [options]
 *
 * Options:
 *   --dry-run       실제 업로드 없이 검증만 수행
 *   --limit <n>     처음 n개만 업로드
 *   --member <name> 특정 멤버만 업로드
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID!
const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN!

// 환경변수 검증
const missingEnvVars: string[] = []
if (!supabaseUrl) missingEnvVars.push('NEXT_PUBLIC_SUPABASE_URL')
if (!supabaseKey) missingEnvVars.push('SUPABASE_SERVICE_ROLE_KEY')
if (!cloudflareAccountId) missingEnvVars.push('CLOUDFLARE_ACCOUNT_ID')
if (!cloudflareApiToken) missingEnvVars.push('CLOUDFLARE_API_TOKEN')

if (missingEnvVars.length > 0) {
  console.error('❌ 환경변수 설정 필요:', missingEnvVars.join(', '))
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface VideoFile {
  filePath: string
  memberName: string
  sigNumber: number
  memberId?: number
  signatureId?: number
  error?: string
}

// Cloudflare Stream 업로드
async function uploadToCloudflare(filePath: string): Promise<string> {
  const formData = new FormData()
  const fileBuffer = fs.readFileSync(filePath)
  const blob = new Blob([fileBuffer])
  formData.append('file', blob, path.basename(filePath))

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/stream`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cloudflareApiToken}`,
      },
      body: formData,
    }
  )

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || 'Cloudflare upload failed')
  }

  return data.result.uid
}

// 폴더 스캔
function scanFolders(rootDir: string): VideoFile[] {
  const files: VideoFile[] = []
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi']

  // 멤버 폴더 순회
  const memberFolders = fs.readdirSync(rootDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  for (const memberName of memberFolders) {
    const memberDir = path.join(rootDir, memberName)
    const videoFiles = fs.readdirSync(memberDir)
      .filter(f => videoExtensions.some(ext => f.toLowerCase().endsWith(ext)))

    for (const videoFile of videoFiles) {
      const fileName = path.parse(videoFile).name
      const sigNumber = parseInt(fileName, 10)

      if (isNaN(sigNumber)) {
        files.push({
          filePath: path.join(memberDir, videoFile),
          memberName,
          sigNumber: 0,
          error: `파일명에서 시그니처 번호를 파싱할 수 없음: ${videoFile}`
        })
      } else {
        files.push({
          filePath: path.join(memberDir, videoFile),
          memberName,
          sigNumber,
        })
      }
    }
  }

  return files
}

// 메인 실행
async function main() {
  const args = process.argv.slice(2)
  const rootDir = args.find(a => !a.startsWith('--'))
  const dryRun = args.includes('--dry-run')
  const limitArg = args.find((_, i) => args[i - 1] === '--limit')
  const memberFilter = args.find((_, i) => args[i - 1] === '--member')

  if (!rootDir) {
    console.log('사용법: npx tsx scripts/bulk-upload-signature-videos/upload-from-folders.ts <폴더경로> [options]')
    console.log('')
    console.log('폴더 구조 예시:')
    console.log('  /videos/')
    console.log('    ├── 린아/')
    console.log('    │   ├── 777.mp4')
    console.log('    │   ├── 1000.mp4')
    console.log('    ├── 가애/')
    console.log('    │   ├── 777.mp4')
    console.log('')
    console.log('Options:')
    console.log('  --dry-run       검증만 수행')
    console.log('  --limit <n>     처음 n개만 업로드')
    console.log('  --member <name> 특정 멤버만 업로드')
    process.exit(1)
  }

  const limit = limitArg ? parseInt(limitArg, 10) : Infinity

  console.log('🎬 폴더 기반 시그니처 영상 대량 업로드')
  console.log('═'.repeat(60))
  console.log(`루트 폴더: ${rootDir}`)
  console.log(`모드: ${dryRun ? '🔍 검증만 (dry-run)' : '🚀 실제 업로드'}`)
  if (limit !== Infinity) console.log(`업로드 제한: ${limit}개`)
  if (memberFilter) console.log(`멤버 필터: ${memberFilter}`)
  console.log('═'.repeat(60) + '\n')

  // 폴더 확인
  if (!fs.existsSync(rootDir)) {
    console.error(`❌ 폴더를 찾을 수 없습니다: ${rootDir}`)
    process.exit(1)
  }

  // 폴더 스캔
  console.log('📂 폴더 스캔 중...')
  let files = scanFolders(rootDir)

  // 멤버 필터 적용
  if (memberFilter) {
    files = files.filter(f => f.memberName === memberFilter)
  }

  console.log(`   ${files.length}개 파일 발견\n`)

  if (files.length === 0) {
    console.log('업로드할 파일이 없습니다.')
    return
  }

  // DB에서 시그니처/멤버 정보 조회
  const { data: signatures } = await supabase
    .from('signatures')
    .select('id, sig_number')

  const { data: members } = await supabase
    .from('organization')
    .select('id, name')

  const sigMap = new Map(signatures?.map(s => [s.sig_number, s.id]) || [])
  const memberMap = new Map(members?.map(m => [m.name, m.id]) || [])

  // ID 매핑
  for (const file of files) {
    if (file.error) continue

    file.signatureId = sigMap.get(file.sigNumber)
    if (!file.signatureId) {
      file.error = `시그니처 번호 없음: ${file.sigNumber}`
      continue
    }

    file.memberId = memberMap.get(file.memberName)
    if (!file.memberId) {
      file.error = `멤버 이름 없음: ${file.memberName}`
    }
  }

  // 결과 집계
  const errors = files.filter(f => f.error)
  const valid = files.filter(f => !f.error)

  // 멤버별 통계
  console.log('📊 멤버별 파일 수:')
  const memberStats = new Map<string, number>()
  valid.forEach(f => {
    memberStats.set(f.memberName, (memberStats.get(f.memberName) || 0) + 1)
  })
  for (const [name, count] of memberStats) {
    console.log(`   ${name}: ${count}개`)
  }
  console.log('')

  if (errors.length > 0) {
    console.log(`❌ 오류 ${errors.length}개:\n`)
    errors.slice(0, 10).forEach(e => {
      console.log(`   ${path.basename(e.filePath)}: ${e.error}`)
    })
    if (errors.length > 10) {
      console.log(`   ... 외 ${errors.length - 10}개`)
    }
    console.log('')
  }

  console.log(`✅ 유효한 파일: ${valid.length}개\n`)

  if (valid.length === 0) {
    console.log('업로드할 유효한 파일이 없습니다.')
    return
  }

  // 업로드할 파일 선택
  const toUpload = valid.slice(0, limit)
  console.log(`📤 업로드 대상: ${toUpload.length}개\n`)

  if (dryRun) {
    console.log('🔍 Dry-run 모드: 업로드 없이 검증만 완료')
    toUpload.slice(0, 20).forEach((file, idx) => {
      console.log(`   ${idx + 1}. ${file.memberName}/${path.basename(file.filePath)} → sig:${file.signatureId}`)
    })
    if (toUpload.length > 20) {
      console.log(`   ... 외 ${toUpload.length - 20}개`)
    }
    return
  }

  // 실제 업로드
  let success = 0
  let failed = 0

  for (let i = 0; i < toUpload.length; i++) {
    const file = toUpload[i]
    const displayName = `${file.memberName}/${path.basename(file.filePath)}`
    process.stdout.write(`[${i + 1}/${toUpload.length}] ${displayName}... `)

    try {
      // 1. Cloudflare에 업로드
      const cloudflareUid = await uploadToCloudflare(file.filePath)

      // 2. DB에 저장
      const { error } = await supabase
        .from('signature_videos')
        .insert({
          signature_id: file.signatureId!,
          member_id: file.memberId!,
          video_url: '', // cloudflare_uid만 사용
          cloudflare_uid: cloudflareUid,
        })

      if (error) throw error

      console.log(`✅ ${cloudflareUid}`)
      success++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`❌ ${msg}`)
      failed++
    }

    // Rate limit 방지 (1초 대기)
    if (i < toUpload.length - 1) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  console.log('\n' + '═'.repeat(60))
  console.log(`📊 결과: 성공 ${success}개, 실패 ${failed}개`)
  console.log('═'.repeat(60))
}

main().catch(console.error)
