/**
 * 시그니처 제목 업데이트 스크립트
 * CSV의 시그니처 이름을 읽어서 "번호 > 이름" 형식으로 업데이트
 * 사용법: npx tsx scripts/update-signature-titles.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// .env.local에서 환경변수 로드
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
})

const CSV_PATH = '/Users/bagjaeseog/엑셀 내역 정리/시그_전체현황_20260124.csv'

interface SignatureInfo {
  sigNumber: number
  name: string
}

// CSV 파일 파싱
function parseCSV(csvPath: string): SignatureInfo[] {
  const content = fs.readFileSync(csvPath, 'utf-8')
  const lines = content.trim().split('\n')
  const signatures: SignatureInfo[] = []

  // 헤더 스킵
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const parts = line.split(',')
    if (parts.length < 3) continue

    const sigNumber = parseInt(parts[1])
    const name = parts[2]

    if (!isNaN(sigNumber) && name) {
      signatures.push({ sigNumber, name })
    }
  }

  return signatures
}

async function main() {
  console.log('🚀 시그니처 제목 업데이트 시작\n')

  // CSV 파일 읽기
  const signatures = parseCSV(CSV_PATH)
  console.log(`📄 CSV에서 ${signatures.length}개 시그니처 정보 로드\n`)

  let successCount = 0
  let failCount = 0
  let notFoundCount = 0

  for (const sig of signatures) {
    const newTitle = `${sig.sigNumber} - ${sig.name}`

    // Supabase에서 시그니처 업데이트
    const { data, error } = await supabase
      .from('signatures')
      .update({ title: newTitle })
      .eq('sig_number', sig.sigNumber)
      .select()

    if (error) {
      console.error(`❌ [${sig.sigNumber}] 업데이트 실패: ${error.message}`)
      failCount++
    } else if (!data || data.length === 0) {
      console.log(`⚠️  [${sig.sigNumber}] DB에 없음`)
      notFoundCount++
    } else {
      console.log(`✅ [${sig.sigNumber}] ${newTitle}`)
      successCount++
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ 성공: ${successCount}개`)
  console.log(`⚠️  DB에 없음: ${notFoundCount}개`)
  console.log(`❌ 실패: ${failCount}개`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
