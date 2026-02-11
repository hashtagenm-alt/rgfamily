/**
 * 까부는넌내꺼야119 + 시아에오ღ까부는넌내꺼야 동일인물 통합
 *
 * 1. nickname_aliases 등록
 * 2. donations 테이블 donor_name 통합
 * 3. total_donation_rankings 합산 후 정리
 * 4. season_donation_rankings 합산 후 정리
 * 5. 순위 재계산
 */

import { getServiceClient } from './lib/supabase'

const supabase = getServiceClient()

const PRIMARY_NAME = '까부는넌내꺼야119'
const ALIAS_NAME = '시아에오ღ까부는넌내꺼야'
const PROFILE_ID = '6c7d5ca9-ba0c-4748-81b2-4125b89b14a2'

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`🔗 닉네임 통합: ${ALIAS_NAME} → ${PRIMARY_NAME}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  // 1. nickname_aliases 등록
  console.log('📝 [1/5] nickname_aliases 등록...')
  const { error: aliasError } = await supabase
    .from('nickname_aliases')
    .upsert(
      { nickname: PRIMARY_NAME, alias: ALIAS_NAME },
      { onConflict: 'alias' }
    )

  if (aliasError) {
    console.log(`   ⚠️ alias 등록 실패 (이미 존재할 수 있음): ${aliasError.message}`)
  } else {
    console.log(`   ✅ ${ALIAS_NAME} → ${PRIMARY_NAME} 별칭 등록 완료`)
  }
  console.log('')

  // 2. donations 테이블 donor_name 통합
  console.log('💰 [2/5] donations 테이블 통합...')
  const { data: aliasDonations, error: donError } = await supabase
    .from('donations')
    .update({ donor_name: PRIMARY_NAME })
    .eq('donor_name', ALIAS_NAME)
    .select('id')

  if (donError) {
    console.log(`   ❌ donations 업데이트 실패: ${donError.message}`)
  } else {
    console.log(`   ✅ ${aliasDonations?.length || 0}건 donations donor_name 변경 완료`)
  }
  console.log('')

  // 3. total_donation_rankings 합산
  console.log('🏆 [3/5] total_donation_rankings 합산...')

  const { data: totalPrimary } = await supabase
    .from('total_donation_rankings')
    .select('id, rank, total_amount')
    .eq('donor_name', PRIMARY_NAME)
    .single()

  const { data: totalAlias } = await supabase
    .from('total_donation_rankings')
    .select('id, rank, total_amount')
    .eq('donor_name', ALIAS_NAME)
    .single()

  if (totalPrimary && totalAlias) {
    const combinedTotal = totalPrimary.total_amount + totalAlias.total_amount
    console.log(`   ${PRIMARY_NAME}: ${totalPrimary.total_amount.toLocaleString()} (${totalPrimary.rank}위)`)
    console.log(`   ${ALIAS_NAME}: ${totalAlias.total_amount.toLocaleString()} (${totalAlias.rank}위)`)
    console.log(`   → 합산: ${combinedTotal.toLocaleString()}`)

    // primary 업데이트
    const { error: updateErr } = await supabase
      .from('total_donation_rankings')
      .update({
        total_amount: combinedTotal,
        donor_id: PROFILE_ID,
        updated_at: new Date().toISOString(),
      })
      .eq('id', totalPrimary.id)

    if (updateErr) throw new Error(`total 업데이트 실패: ${updateErr.message}`)

    // alias 삭제
    const { error: deleteErr } = await supabase
      .from('total_donation_rankings')
      .delete()
      .eq('id', totalAlias.id)

    if (deleteErr) throw new Error(`total alias 삭제 실패: ${deleteErr.message}`)

    console.log('   ✅ total_donation_rankings 합산 완료')
  } else {
    console.log('   ⚠️ 한쪽 데이터가 없음 - 스킵')
  }
  console.log('')

  // 4. season_donation_rankings 합산
  console.log('🏅 [4/5] season_donation_rankings 합산...')

  const { data: seasonPrimary } = await supabase
    .from('season_donation_rankings')
    .select('id, rank, total_amount, season_id, donation_count')
    .eq('donor_name', PRIMARY_NAME)
    .eq('season_id', 1)
    .single()

  const { data: seasonAlias } = await supabase
    .from('season_donation_rankings')
    .select('id, rank, total_amount, season_id, donation_count')
    .eq('donor_name', ALIAS_NAME)
    .eq('season_id', 1)
    .single()

  if (seasonPrimary && seasonAlias) {
    const combinedSeason = seasonPrimary.total_amount + seasonAlias.total_amount
    const combinedCount = (seasonPrimary.donation_count || 0) + (seasonAlias.donation_count || 0)
    console.log(`   ${PRIMARY_NAME}: ${seasonPrimary.total_amount.toLocaleString()} (${seasonPrimary.rank}위)`)
    console.log(`   ${ALIAS_NAME}: ${seasonAlias.total_amount.toLocaleString()} (${seasonAlias.rank}위)`)
    console.log(`   → 합산: ${combinedSeason.toLocaleString()}`)

    const { error: updateErr } = await supabase
      .from('season_donation_rankings')
      .update({
        total_amount: combinedSeason,
        donation_count: combinedCount,
        donor_id: PROFILE_ID,
        updated_at: new Date().toISOString(),
      })
      .eq('id', seasonPrimary.id)

    if (updateErr) throw new Error(`season 업데이트 실패: ${updateErr.message}`)

    const { error: deleteErr } = await supabase
      .from('season_donation_rankings')
      .delete()
      .eq('id', seasonAlias.id)

    if (deleteErr) throw new Error(`season alias 삭제 실패: ${deleteErr.message}`)

    console.log('   ✅ season_donation_rankings 합산 완료')
  } else {
    console.log('   ⚠️ 한쪽 데이터가 없음 - 스킵')
  }
  console.log('')

  // 5. 순위 재계산
  console.log('📊 [5/5] 순위 재계산...')

  // total 순위 재계산
  const { data: allTotal } = await supabase
    .from('total_donation_rankings')
    .select('id, total_amount')
    .order('total_amount', { ascending: false })

  if (allTotal) {
    let prevAmount = -1
    let prevRank = 0
    for (let i = 0; i < allTotal.length; i++) {
      const newRank = allTotal[i].total_amount === prevAmount ? prevRank : i + 1
      await supabase
        .from('total_donation_rankings')
        .update({ rank: newRank })
        .eq('id', allTotal[i].id)
      prevAmount = allTotal[i].total_amount
      prevRank = newRank
    }
    console.log(`   ✅ total 순위 재계산 완료 (${allTotal.length}명)`)
  }

  // season 순위 재계산
  const { data: allSeason } = await supabase
    .from('season_donation_rankings')
    .select('id, total_amount')
    .eq('season_id', 1)
    .order('total_amount', { ascending: false })

  if (allSeason) {
    let prevAmount = -1
    let prevRank = 0
    for (let i = 0; i < allSeason.length; i++) {
      const newRank = allSeason[i].total_amount === prevAmount ? prevRank : i + 1
      await supabase
        .from('season_donation_rankings')
        .update({ rank: newRank })
        .eq('id', allSeason[i].id)
      prevAmount = allSeason[i].total_amount
      prevRank = newRank
    }
    console.log(`   ✅ season 순위 재계산 완료 (${allSeason.length}명)`)
  }
  console.log('')

  // 검증
  console.log('🔍 검증...')

  const { data: verifyTotal } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, total_amount')
    .eq('donor_name', PRIMARY_NAME)
    .single()

  const { data: verifySeason } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name, total_amount')
    .eq('donor_name', PRIMARY_NAME)
    .eq('season_id', 1)
    .single()

  const { data: verifyAlias } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name')
    .eq('donor_name', ALIAS_NAME)
    .maybeSingle()

  console.log(`   총 랭킹: ${verifyTotal?.rank}위 | ${verifyTotal?.total_amount?.toLocaleString()} 하트`)
  console.log(`   시즌 랭킹: ${verifySeason?.rank}위 | ${verifySeason?.total_amount?.toLocaleString()} 하트`)
  console.log(`   ${ALIAS_NAME} 잔여: ${verifyAlias ? '⚠️ 아직 존재' : '✅ 삭제됨'}`)

  const { count: aliasCount } = await supabase
    .from('donations')
    .select('*', { count: 'exact', head: true })
    .eq('donor_name', ALIAS_NAME)

  console.log(`   ${ALIAS_NAME} 잔여 donations: ${aliasCount || 0}건`)

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ 닉네임 통합 완료!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch((err) => {
  console.error('❌ 오류:', err)
  process.exit(1)
})
