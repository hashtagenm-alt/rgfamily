/**
 * 시그니처 DB 레코드 삽입 스크립트 (이미지는 이미 업로드됨)
 * 사용법: npx tsx scripts/insert-signatures-db.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const SUPABASE_URL = 'https://titqtnobfapyjvairgqy.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpdHF0bm9iZmFweWp2YWlyZ3F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc5NDQyNSwiZXhwIjoyMDg0MzcwNDI1fQ.M6mlPiqgRruYCd4jXBcIOsYIhtqgvJmGmzg6l3KakwU'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
})

const SIGNATURES_FOLDER = '/Users/bagjaeseog/Downloads/RG시그 리뉴얼/rg 리뉴얼 시그 최종'
const BUCKET_NAME = 'signatures'

// 파일 이름에서 시그니처 번호 추출
function extractSigNumber(fileName: string): number | null {
  const match = fileName.match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

// 시그니처 제목 생성
function generateTitle(sigNumber: number): string {
  const specialTitles: Record<number, string> = {
    666: '악마의 시그',
    777: '럭키 세븐',
    1000: '천 시그',
    2000: '이천 시그',
    2222: '투투투투',
    3000: '삼천 시그',
    3333: '쓰리쓰리',
    4444: '사사사사',
    5000: '오천 시그',
    6666: '육육육육',
    7000: '칠천 시그',
    7777: '럭키 세븐세븐',
    9999: '구구구구',
    10000: '만 시그',
    30000: '삼만 시그',
    50000: '오만 시그',
    70000: '칠만 시그',
    100000: '십만 시그',
    200000: '이십만 시그',
    300000: '삼십만 시그',
  }
  return specialTitles[sigNumber] || `시그니처 ${sigNumber}`
}

async function main() {
  console.log('🚀 시그니처 DB 레코드 삽입 시작')

  // 파일 목록 읽기
  const files = fs.readdirSync(SIGNATURES_FOLDER)
  const sigNumbers: { sigNumber: number; extension: string }[] = []

  for (const fileName of files) {
    const sigNumber = extractSigNumber(fileName)
    if (sigNumber === null) continue
    const extension = fileName.toLowerCase().endsWith('.gif') ? 'gif' : 'png'
    sigNumbers.push({ sigNumber, extension })
  }

  sigNumbers.sort((a, b) => a.sigNumber - b.sigNumber)
  console.log(`📊 총 ${sigNumbers.length}개 시그니처`)

  let successCount = 0
  const _skipCount = 0
  let failCount = 0

  for (let i = 0; i < sigNumbers.length; i++) {
    const { sigNumber, extension } = sigNumbers[i]
    const progress = `[${i + 1}/${sigNumbers.length}]`

    // Storage URL 생성
    const thumbnailUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${sigNumber}.${extension}`
    const title = generateTitle(sigNumber)

    // 기존 레코드 확인
    const { data: existing } = await supabase
      .from('signatures')
      .select('id')
      .eq('sig_number', sigNumber)
      .single()

    if (existing) {
      // 업데이트
      const { error } = await supabase
        .from('signatures')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('sig_number', sigNumber)

      if (error) {
        console.log(`${progress} 시그 ${sigNumber} ❌ 업데이트 실패: ${error.message}`)
        failCount++
      } else {
        console.log(`${progress} 시그 ${sigNumber} ✅ 업데이트`)
        successCount++
      }
    } else {
      // 새로 삽입
      const { error } = await supabase
        .from('signatures')
        .insert({
          sig_number: sigNumber,
          title,
          description: '',
          thumbnail_url: thumbnailUrl,
          unit: 'excel'
        })

      if (error) {
        console.log(`${progress} 시그 ${sigNumber} ❌ 삽입 실패: ${error.message}`)
        failCount++
      } else {
        console.log(`${progress} 시그 ${sigNumber} ✅ 삽입`)
        successCount++
      }
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ 성공: ${successCount}개`)
  console.log(`⏭️ 스킵: ${_skipCount}개`)
  console.log(`❌ 실패: ${failCount}개`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
