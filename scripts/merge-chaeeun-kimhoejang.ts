/**
 * 채은❤️까부는김회장 → 채은❤️여신 동일인물 통합
 *
 * 1. donations donor_name 통합
 * 2. total_donation_rankings 합산
 * 3. season_donation_rankings 합산
 * 4. signature_eligibility 중복 제거
 * 5. vip_rewards 중복 제거
 * 6. 순위 재계산
 */

import { getServiceClient } from './lib/supabase'

const supabase = getServiceClient()

const PRIMARY = '채은❤️여신'
const PRIMARY_PROFILE_ID = '5e8a4d74-6a09-4f2a-88e3-d76cb9c973a1'
const ALIAS = '채은❤️까부는김회장'
const ALIAS_PROFILE_ID = 'be6a75dd-6319-436e-9da3-66d5979be3ce'

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`🔗 ${ALIAS} → ${PRIMARY} 통합`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  // 1. donations 통합
  console.log('💰 [1/6] donations 통합...')
  const { data: movedDonations } = await supabase
    .from('donations')
    .update({ donor_name: PRIMARY })
    .eq('donor_name', ALIAS)
    .select('id')

  console.log(`   ✅ ${movedDonations?.length || 0}건 donor_name 변경`)
  console.log('')

  // 2. total_donation_rankings 합산
  console.log('🏆 [2/6] total_donation_rankings 합산...')
  const { data: totalP } = await supabase.from('total_donation_rankings').select('id, rank, total_amount').eq('donor_name', PRIMARY).single()
  const { data: totalA } = await supabase.from('total_donation_rankings').select('id, rank, total_amount').eq('donor_name', ALIAS).single()

  if (totalP && totalA) {
    const combined = totalP.total_amount + totalA.total_amount
    console.log(`   ${PRIMARY}: ${totalP.total_amount} (${totalP.rank}위)`)
    console.log(`   ${ALIAS}: ${totalA.total_amount} (${totalA.rank}위)`)
    console.log(`   → 합산: ${combined}`)

    await supabase.from('total_donation_rankings').delete().eq('id', totalA.id)
    console.log('   ✅ alias 행 삭제')

    await supabase.from('total_donation_rankings').update({ total_amount: combined, donor_id: PRIMARY_PROFILE_ID }).eq('id', totalP.id)
    console.log('   ✅ 금액 업데이트')
  }
  console.log('')

  // 3. season_donation_rankings 합산
  console.log('🏅 [3/6] season_donation_rankings 합산...')
  const { data: seasonP } = await supabase.from('season_donation_rankings').select('id, rank, total_amount, donation_count').eq('donor_name', PRIMARY).eq('season_id', 1).single()
  const { data: seasonA } = await supabase.from('season_donation_rankings').select('id, rank, total_amount, donation_count').eq('donor_name', ALIAS).eq('season_id', 1).single()

  if (seasonP && seasonA) {
    const combined = seasonP.total_amount + seasonA.total_amount
    const combinedCount = (seasonP.donation_count || 0) + (seasonA.donation_count || 0)
    console.log(`   ${PRIMARY}: ${seasonP.total_amount} (${seasonP.rank}위)`)
    console.log(`   ${ALIAS}: ${seasonA.total_amount} (${seasonA.rank}위)`)
    console.log(`   → 합산: ${combined}`)

    await supabase.from('season_donation_rankings').delete().eq('id', seasonA.id)
    console.log('   ✅ alias 행 삭제')

    await supabase.from('season_donation_rankings').update({ total_amount: combined, donation_count: combinedCount, donor_id: PRIMARY_PROFILE_ID }).eq('id', seasonP.id)
    console.log('   ✅ 금액 업데이트')
  }
  console.log('')

  // 4. signature_eligibility 중복 제거
  console.log('💎 [4/6] signature_eligibility 정리...')
  const { error: sigDelErr } = await supabase
    .from('signature_eligibility')
    .delete()
    .eq('donor_name', ALIAS)

  if (sigDelErr) console.log('   ⚠️ 삭제 실패:', sigDelErr.message)
  else console.log('   ✅ 채은❤️까부는김회장 sig_eligibility 삭제 (채은❤️여신 것 유지)')
  console.log('')

  // 5. vip_rewards 중복 제거
  console.log('🎁 [5/6] vip_rewards 정리...')
  const { error: vipDelErr } = await supabase
    .from('vip_rewards')
    .delete()
    .eq('profile_id', ALIAS_PROFILE_ID)

  if (vipDelErr) console.log('   ⚠️ 삭제 실패:', vipDelErr.message)
  else console.log('   ✅ 채은❤️까부는김회장 vip_rewards 삭제 (채은❤️여신 것 유지)')
  console.log('')

  // 6. 순위 재계산
  console.log('📊 [6/6] 순위 재계산...')

  const { data: allTotal } = await supabase
    .from('total_donation_rankings')
    .select('id, total_amount')
    .order('total_amount', { ascending: false })

  if (allTotal) {
    for (let i = 0; i < allTotal.length; i++) {
      await supabase.from('total_donation_rankings').update({ rank: i + 1 }).eq('id', allTotal[i].id)
    }
    console.log(`   ✅ total 순위 재계산 (${allTotal.length}명)`)
  }

  const { data: allSeason } = await supabase
    .from('season_donation_rankings')
    .select('id, total_amount')
    .eq('season_id', 1)
    .order('total_amount', { ascending: false })

  if (allSeason) {
    for (let i = 0; i < allSeason.length; i++) {
      await supabase.from('season_donation_rankings').update({ rank: i + 1 }).eq('id', allSeason[i].id)
    }
    console.log(`   ✅ season 순위 재계산 (${allSeason.length}명)`)
  }
  console.log('')

  // 검증
  console.log('🔍 검증...')

  const { data: vTotal } = await supabase.from('total_donation_rankings').select('rank, total_amount').eq('donor_name', PRIMARY).single()
  const { data: vSeason } = await supabase.from('season_donation_rankings').select('rank, total_amount').eq('donor_name', PRIMARY).eq('season_id', 1).single()
  console.log(`   총 랭킹: ${vTotal?.rank}위 | ${vTotal?.total_amount} 하트`)
  console.log(`   시즌 랭킹: ${vSeason?.rank}위 | ${vSeason?.total_amount} 하트`)

  // alias 잔여 확인
  const { data: rTotal } = await supabase.from('total_donation_rankings').select('id').eq('donor_name', ALIAS).maybeSingle()
  const { data: rSeason } = await supabase.from('season_donation_rankings').select('id').eq('donor_name', ALIAS).maybeSingle()
  const { data: rSig } = await supabase.from('signature_eligibility').select('id').eq('donor_name', ALIAS).maybeSingle()
  const { data: rVip } = await supabase.from('vip_rewards').select('id').eq('profile_id', ALIAS_PROFILE_ID).maybeSingle()
  const { count: rDon } = await supabase.from('donations').select('*', { count: 'exact', head: true }).eq('donor_name', ALIAS)

  console.log(`   ${ALIAS} 잔여: total=${rTotal ? '있음' : '없음'} season=${rSeason ? '있음' : '없음'} sig=${rSig ? '있음' : '없음'} vip=${rVip ? '있음' : '없음'} donations=${rDon || 0}건`)

  // Top 5 출력
  console.log('')
  console.log('   === 총 랭킹 Top 5 ===')
  const { data: top } = await supabase.from('total_donation_rankings').select('rank, donor_name, total_amount').order('rank').limit(5)
  top?.forEach(r => console.log(`   ${r.rank}위: ${r.donor_name} (${r.total_amount})`))

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ 통합 완료!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(e => { console.error('❌', e); process.exit(1) })
