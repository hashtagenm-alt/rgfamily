/**
 * 스키마 변경 적용 스크립트
 * - season_donation_rankings에 unit 컬럼 추가
 * - profiles에 account_type 컬럼 추가
 * - 기존 데이터 업데이트
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

async function main() {
  console.log('🚀 스키마 변경 적용 시작\n')

  // 1. season_donation_rankings에 unit 컬럼 추가
  console.log('📊 season_donation_rankings.unit 컬럼 추가...')
  const { error: err1 } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE season_donation_rankings ADD COLUMN IF NOT EXISTS unit TEXT CHECK (unit IN ('excel', 'crew'))`
  }).maybeSingle()

  if (err1) {
    // RPC가 없을 수 있으니 직접 쿼리 시도
    console.log('   ⚠️ RPC 사용 불가, 수동 적용 필요')
  } else {
    console.log('   ✅ 완료')
  }

  // 2. 시즌 1 데이터에 unit='excel' 적용
  console.log('📊 시즌 1 데이터에 unit=excel 적용...')
  const { error: updateErr } = await supabase
    .from('season_donation_rankings')
    .update({ unit: 'excel' })
    .eq('season_id', 1)

  if (updateErr) {
    console.log(`   ⚠️ 에러: ${updateErr.message}`)
    console.log('   → 컬럼이 없으면 Supabase Dashboard에서 먼저 추가하세요')
  } else {
    console.log('   ✅ 완료')
  }

  // 3. 시즌 1 데이터 확인
  console.log('\n📋 시즌 1 랭킹 데이터 확인...')
  const { data: rankings, error: rankErr } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name, total_amount, unit')
    .eq('season_id', 1)
    .order('rank', { ascending: true })
    .limit(10)

  if (rankErr) {
    console.log(`   ❌ 에러: ${rankErr.message}`)
  } else if (!rankings || rankings.length === 0) {
    console.log('   ⚠️ 시즌 1 데이터가 없습니다.')
  } else {
    console.log(`   총 ${rankings.length}명 (Top 10 표시):`)
    rankings.forEach((r, i) => {
      console.log(`   ${r.rank}. ${r.donor_name} - ${r.total_amount?.toLocaleString()}하트 [${r.unit || 'null'}]`)
    })
  }

  // 4. profiles 확인 (account_type은 아직 없을 수 있음)
  console.log('\n📋 profiles 테이블 확인...')
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, nickname, email, account_type')
    .limit(5)

  if (profErr) {
    console.log(`   ⚠️ 에러: ${profErr.message}`)
    console.log('   → account_type 컬럼을 Supabase Dashboard에서 추가하세요')
  } else {
    console.log(`   샘플 프로필:`)
    profiles?.forEach(p => {
      console.log(`   - ${p.nickname} (${p.email || 'no email'}) [${p.account_type || 'no type'}]`)
    })
  }

  console.log('\n✅ 완료!')
  console.log('\n💡 Supabase Dashboard에서 수동으로 추가가 필요한 경우:')
  console.log('   1. season_donation_rankings 테이블 > unit 컬럼 (text, nullable)')
  console.log('   2. profiles 테이블 > account_type 컬럼 (text, default: real)')
}

main().catch((err) => {
  console.error('❌ 오류:', err)
  process.exit(1)
})
