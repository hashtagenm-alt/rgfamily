/**
 * 시그니처 영상 대량 업로드 스크립트
 *
 * 사용법: npx tsx scripts/bulk-upload-signature-videos/upload.ts [options]
 *
 * Options:
 *   --csv <path>    CSV 파일 경로 (기본: ./upload-template.csv)
 *   --dry-run       실제 업로드 없이 검증만 수행
 *   --limit <n>     처음 n개만 업로드
 *   --skip <n>      처음 n개 건너뛰기
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

interface UploadRow {
  file_path: string
  signature_id?: number
  sig_number?: number
  member_id?: number
  member_name?: string
}

interface ParsedRow extends UploadRow {
  lineNumber: number
  resolvedSignatureId?: number
  resolvedMemberId?: number
  error?: string
}

// CSV 파싱
function parseCSV(content: string): UploadRow[] {
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'))
  if (lines.length < 2) return []

  const header = lines[0].split(',').map(h => h.trim())
  const rows: UploadRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string | number | undefined> = {}

    header.forEach((h, idx) => {
      const val = values[idx]?.trim()
      if (val) {
        if (['signature_id', 'sig_number', 'member_id'].includes(h)) {
          row[h] = parseInt(val, 10)
        } else {
          row[h] = val
        }
      }
    })

    if (row.file_path) {
      rows.push(row as UploadRow)
    }
  }

  return rows
}

// CSV 한 줄 파싱 (따옴표 처리)
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
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

// 메인 실행
async function main() {
  const args = process.argv.slice(2)
  const csvPathArg = args.find((_, i) => args[i - 1] === '--csv')
  const dryRun = args.includes('--dry-run')
  const limitArg = args.find((_, i) => args[i - 1] === '--limit')
  const skipArg = args.find((_, i) => args[i - 1] === '--skip')

  const csvPath = csvPathArg || path.join(__dirname, 'upload-template.csv')
  const limit = limitArg ? parseInt(limitArg, 10) : Infinity
  const skip = skipArg ? parseInt(skipArg, 10) : 0

  console.log('🎬 시그니처 영상 대량 업로드')
  console.log('═'.repeat(60))
  console.log(`CSV 파일: ${csvPath}`)
  console.log(`모드: ${dryRun ? '🔍 검증만 (dry-run)' : '🚀 실제 업로드'}`)
  if (limit !== Infinity) console.log(`업로드 제한: ${limit}개`)
  if (skip > 0) console.log(`건너뛰기: ${skip}개`)
  console.log('═'.repeat(60) + '\n')

  // CSV 파일 읽기
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV 파일을 찾을 수 없습니다: ${csvPath}`)
    console.log('\n먼저 템플릿을 생성하세요:')
    console.log('npx tsx scripts/bulk-upload-signature-videos/generate-csv-template.ts')
    process.exit(1)
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(csvContent)

  console.log(`📄 CSV에서 ${rows.length}개 행 파싱됨\n`)

  if (rows.length === 0) {
    console.log('업로드할 데이터가 없습니다.')
    return
  }

  // 시그니처/멤버 조회 (이름 → ID 변환용)
  const { data: signatures } = await supabase
    .from('signatures')
    .select('id, sig_number')

  const { data: members } = await supabase
    .from('organization')
    .select('id, name')

  const sigMap = new Map(signatures?.map(s => [s.sig_number, s.id]) || [])
  const memberMap = new Map(members?.map(m => [m.name, m.id]) || [])

  // 행 검증 및 ID 변환
  const parsedRows: ParsedRow[] = rows.map((row, idx) => {
    const parsed: ParsedRow = { ...row, lineNumber: idx + 2 }

    // 파일 존재 확인
    if (!fs.existsSync(row.file_path)) {
      parsed.error = `파일 없음: ${row.file_path}`
      return parsed
    }

    // signature_id 변환
    if (row.signature_id) {
      parsed.resolvedSignatureId = row.signature_id
    } else if (row.sig_number) {
      parsed.resolvedSignatureId = sigMap.get(row.sig_number)
      if (!parsed.resolvedSignatureId) {
        parsed.error = `시그니처 번호 없음: ${row.sig_number}`
        return parsed
      }
    } else {
      parsed.error = 'signature_id 또는 sig_number 필요'
      return parsed
    }

    // member_id 변환
    if (row.member_id) {
      parsed.resolvedMemberId = row.member_id
    } else if (row.member_name) {
      parsed.resolvedMemberId = memberMap.get(row.member_name)
      if (!parsed.resolvedMemberId) {
        parsed.error = `멤버 이름 없음: ${row.member_name}`
        return parsed
      }
    } else {
      parsed.error = 'member_id 또는 member_name 필요'
      return parsed
    }

    return parsed
  })

  // 에러 확인
  const errors = parsedRows.filter(r => r.error)
  const valid = parsedRows.filter(r => !r.error)

  if (errors.length > 0) {
    console.log(`❌ 오류 ${errors.length}개:\n`)
    errors.forEach(e => {
      console.log(`   Line ${e.lineNumber}: ${e.error}`)
    })
    console.log('')
  }

  console.log(`✅ 유효한 행: ${valid.length}개\n`)

  if (valid.length === 0) {
    console.log('업로드할 유효한 데이터가 없습니다.')
    return
  }

  // 업로드할 행 선택
  const toUpload = valid.slice(skip, skip + limit)
  console.log(`📤 업로드 대상: ${toUpload.length}개\n`)

  if (dryRun) {
    console.log('🔍 Dry-run 모드: 업로드 없이 검증만 완료')
    toUpload.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${path.basename(row.file_path)} → sig:${row.resolvedSignatureId}, member:${row.resolvedMemberId}`)
    })
    return
  }

  // 실제 업로드
  let success = 0
  let failed = 0

  for (let i = 0; i < toUpload.length; i++) {
    const row = toUpload[i]
    const fileName = path.basename(row.file_path)
    process.stdout.write(`[${i + 1}/${toUpload.length}] ${fileName}... `)

    try {
      // 1. Cloudflare에 업로드
      const cloudflareUid = await uploadToCloudflare(row.file_path)

      // 2. DB에 저장
      const { error } = await supabase
        .from('signature_videos')
        .insert({
          signature_id: row.resolvedSignatureId!,
          member_id: row.resolvedMemberId!,
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
