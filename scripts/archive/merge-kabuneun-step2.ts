/**
 * 까부는넌내꺼야 통합 - Step 2: 랭킹 합산 및 순위 재계산
 * (donations는 이미 통합됨)
 */

import { getServiceClient } from './lib/supabase'

const supabase = getServiceClient()

const PRIMARY = '까부는넌내꺼야119'
const ALIAS = '시아에오ღ까부는넌내꺼야'
const PROFILE_ID = '6c7d5ca9-ba0c-4748-81b2-4125b89b14a2'

async function mergeTotal() {
  console.log('🏆 total_donation_rankings 합산...')

  const { data: primary } = await supabase
    .from('total_donation_rankings')
    .select('id, rank, total_amount')
    .eq('donor_name', PRIMARY)
    .single()

  const { data: alias } = await supabase
    .from('total_donation_rankings')
    .select('id, rank, total_amount')
    .eq('donor_name', ALIAS)
    .single()

  if (!primary || !alias) {
    console.log('   ⚠️ 데이터 없음, 스킵')
    return
  }

  const combined = primary.total_amount + alias.total_amount
  console.log(`   ${PRIMARY}: ${primary.total_amount} (${primary.rank}위)`)
  console.log(`   ${ALIAS}: ${alias.total_amount} (${alias.rank}위)`)
  console.log(`   합산: ${combined}`)

  // alias 행 삭제 먼저
  const { error: delErr } = await supabase
    .from('total_donation_rankings')
    .delete()
    .eq('id', alias.id)

  if (delErr) {
    console.log('   ❌ alias 삭제 실패:', delErr.message)
    return
  }
  console.log('   ✅ alias 행 삭제')

  // primary 금액 업데이트
  const { error: updErr } = await supabase
    .from('total_donation_rankings')
    .update({ total_amount: combined, donor_id: PROFILE_ID })
    .eq('id', primary.id)

  if (updErr) {
    console.log('   ❌ 금액 업데이트 실패:', updErr.message)
    return
  }
  console.log('   ✅ 금액 업데이트 완료')

  // 순위 재계산
  const { data: all } = await supabase
    .from('total_donation_rankings')
    .select('id, total_amount')
    .order('total_amount', { ascending: false })

  if (!all) return

  for (let i = 0; i < all.length; i++) {
    const newRank = i + 1
    await supabase.from('total_donation_rankings').update({ rank: newRank }).eq('id', all[i].id)
  }
  console.log(`   ✅ 순위 재계산 완료 (${all.length}명)`)

  // 결과 확인
  const { data: result } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, total_amount')
    .eq('donor_name', PRIMARY)
    .single()

  console.log(`   → 결과: ${result?.rank}위 | ${result?.total_amount} 하트`)
}

async function mergeSeason() {
  console.log('')
  console.log('🏅 season_donation_rankings 합산...')

  const { data: primary } = await supabase
    .from('season_donation_rankings')
    .select('id, rank, total_amount, donation_count')
    .eq('donor_name', PRIMARY)
    .eq('season_id', 1)
    .single()

  const { data: alias } = await supabase
    .from('season_donation_rankings')
    .select('id, rank, total_amount, donation_count')
    .eq('donor_name', ALIAS)
    .eq('season_id', 1)
    .single()

  if (!primary || !alias) {
    console.log('   ⚠️ 데이터 없음, 스킵')
    return
  }

  const combined = primary.total_amount + alias.total_amount
  const combinedCount = (primary.donation_count || 0) + (alias.donation_count || 0)
  console.log(`   ${PRIMARY}: ${primary.total_amount} (${primary.rank}위)`)
  console.log(`   ${ALIAS}: ${alias.total_amount} (${alias.rank}위)`)
  console.log(`   합산: ${combined}`)

  // alias 행 삭제 먼저
  const { error: delErr } = await supabase
    .from('season_donation_rankings')
    .delete()
    .eq('id', alias.id)

  if (delErr) {
    console.log('   ❌ alias 삭제 실패:', delErr.message)
    return
  }
  console.log('   ✅ alias 행 삭제')

  // primary 금액 업데이트
  const { error: updErr } = await supabase
    .from('season_donation_rankings')
    .update({ total_amount: combined, donation_count: combinedCount, donor_id: PROFILE_ID })
    .eq('id', primary.id)

  if (updErr) {
    console.log('   ❌ 금액 업데이트 실패:', updErr.message)
    return
  }
  console.log('   ✅ 금액 업데이트 완료')

  // 순위 재계산
  const { data: all } = await supabase
    .from('season_donation_rankings')
    .select('id, total_amount')
    .eq('season_id', 1)
    .order('total_amount', { ascending: false })

  if (!all) return

  for (let i = 0; i < all.length; i++) {
    const newRank = i + 1
    await supabase.from('season_donation_rankings').update({ rank: newRank }).eq('id', all[i].id)
  }
  console.log(`   ✅ 순위 재계산 완료 (${all.length}명)`)

  // 결과 확인
  const { data: result } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name, total_amount')
    .eq('donor_name', PRIMARY)
    .eq('season_id', 1)
    .single()

  console.log(`   → 결과: ${result?.rank}위 | ${result?.total_amount} 하트`)
}

async function verify() {
  console.log('')
  console.log('🔍 최종 검증...')

  const { data: totalAlias } = await supabase
    .from('total_donation_rankings')
    .select('id')
    .eq('donor_name', ALIAS)
    .maybeSingle()

  const { data: seasonAlias } = await supabase
    .from('season_donation_rankings')
    .select('id')
    .eq('donor_name', ALIAS)
    .maybeSingle()

  const { count } = await supabase
    .from('donations')
    .select('*', { count: 'exact', head: true })
    .eq('donor_name', ALIAS)

  console.log(`   total에 ${ALIAS} 잔여: ${totalAlias ? '⚠️ 있음' : '✅ 없음'}`)
  console.log(`   season에 ${ALIAS} 잔여: ${seasonAlias ? '⚠️ 있음' : '✅ 없음'}`)
  console.log(`   donations에 ${ALIAS} 잔여: ${count || 0}건`)

  // Top 15 출력
  console.log('')
  console.log('   === 총 랭킹 Top 15 ===')
  const { data: top } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, total_amount')
    .order('rank')
    .limit(15)

  top?.forEach(r => console.log(`   ${r.rank}위: ${r.donor_name} (${r.total_amount})`))
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`🔗 ${ALIAS} → ${PRIMARY} 랭킹 통합`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  await mergeTotal()
  await mergeSeason()
  await verify()

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ 통합 완료!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(e => { console.error('❌', e); process.exit(1) })
