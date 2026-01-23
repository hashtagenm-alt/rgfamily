/**
 * 시즌 랭킹 데이터 확인 스크립트
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

async function main() {
  console.log('📊 시즌 랭킹 데이터 확인\n')

  // 1. 시즌 목록
  const { data: seasons } = await supabase
    .from('seasons')
    .select('*')
    .order('id')

  console.log('📅 시즌 목록:')
  seasons?.forEach(s => {
    console.log(`   [${s.id}] ${s.name} ${s.is_active ? '(활성)' : ''}`)
  })

  // 2. 시즌 1 랭킹 데이터
  console.log('\n📋 시즌 1 랭킹 (Top 20):')
  const { data: rankings, error } = await supabase
    .from('season_donation_rankings')
    .select('*')
    .eq('season_id', 1)
    .order('rank', { ascending: true })
    .limit(20)

  if (error) {
    console.log(`   ❌ 에러: ${error.message}`)
  } else if (!rankings || rankings.length === 0) {
    console.log('   ⚠️ 데이터 없음')
  } else {
    rankings.forEach(r => {
      console.log(`   ${r.rank}위. ${r.donor_name} - ${r.total_amount?.toLocaleString()}하트`)
    })
    console.log(`\n   총 ${rankings.length}명`)
  }

  // 3. 전체 시즌별 데이터 개수
  console.log('\n📊 시즌별 랭킹 데이터 수:')
  for (const s of (seasons || [])) {
    const { count } = await supabase
      .from('season_donation_rankings')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', s.id)
    console.log(`   시즌 ${s.id}: ${count || 0}명`)
  }

  // 4. profiles 테이블 확인
  console.log('\n👤 profiles 테이블:')
  const { count: profileCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
  console.log(`   총 ${profileCount || 0}명`)

  const { data: realProfiles } = await supabase
    .from('profiles')
    .select('id, nickname, email')
    .not('email', 'is', null)
    .limit(10)

  console.log(`\n   이메일 있는 계정 (실제 가입 추정):`)
  realProfiles?.forEach(p => {
    console.log(`   - ${p.nickname} (${p.email})`)
  })

  const { data: virtualProfiles } = await supabase
    .from('profiles')
    .select('id, nickname, email')
    .is('email', null)
    .limit(10)

  console.log(`\n   이메일 없는 계정 (임의 생성 추정):`)
  virtualProfiles?.forEach(p => {
    console.log(`   - ${p.nickname}`)
  })
}

main().catch(console.error)
