/**
 * 시그니처 썸네일 교체 스크립트
 * 10000과 10001의 썸네일 URL을 서로 교환
 * 사용법: npx tsx scripts/swap-signature-thumbnails.ts
 */

import { createClient } from '@supabase/supabase-js'
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

async function main() {
  console.log('🚀 시그니처 썸네일 교체 시작\n')

  // 1. 10000, 10001 현재 상태 조회
  const { data: signatures, error: fetchError } = await supabase
    .from('signatures')
    .select('id, sig_number, title, thumbnail_url')
    .in('sig_number', [10000, 10001])
    .order('sig_number')

  if (fetchError) {
    console.error('❌ 조회 실패:', fetchError.message)
    process.exit(1)
  }

  if (!signatures || signatures.length !== 2) {
    console.error('❌ 10000, 10001 시그니처를 찾을 수 없습니다.')
    process.exit(1)
  }

  const sig10000 = signatures.find(s => s.sig_number === 10000)!
  const sig10001 = signatures.find(s => s.sig_number === 10001)!

  console.log('📋 현재 상태:')
  console.log(`  [10000] ${sig10000.title}`)
  console.log(`    썸네일: ${sig10000.thumbnail_url?.substring(0, 80)}...`)
  console.log(`  [10001] ${sig10001.title}`)
  console.log(`    썸네일: ${sig10001.thumbnail_url?.substring(0, 80)}...`)
  console.log()

  // 2. 썸네일 URL 교환
  console.log('🔄 썸네일 URL 교환 중...\n')

  // 10000에 10001의 썸네일 적용
  const { error: update10000Error } = await supabase
    .from('signatures')
    .update({ thumbnail_url: sig10001.thumbnail_url })
    .eq('sig_number', 10000)

  if (update10000Error) {
    console.error('❌ 10000 업데이트 실패:', update10000Error.message)
    process.exit(1)
  }
  console.log('✅ [10000] 썸네일 업데이트 완료')

  // 10001에 10000의 썸네일 적용
  const { error: update10001Error } = await supabase
    .from('signatures')
    .update({ thumbnail_url: sig10000.thumbnail_url })
    .eq('sig_number', 10001)

  if (update10001Error) {
    console.error('❌ 10001 업데이트 실패:', update10001Error.message)
    process.exit(1)
  }
  console.log('✅ [10001] 썸네일 업데이트 완료')

  // 3. 교체 후 상태 확인
  console.log('\n📋 교체 후 상태:')

  const { data: updatedSigs } = await supabase
    .from('signatures')
    .select('sig_number, title, thumbnail_url')
    .in('sig_number', [10000, 10001])
    .order('sig_number')

  if (updatedSigs) {
    for (const sig of updatedSigs) {
      console.log(`  [${sig.sig_number}] ${sig.title}`)
      console.log(`    썸네일: ${sig.thumbnail_url?.substring(0, 80)}...`)
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ 썸네일 교체 완료!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
