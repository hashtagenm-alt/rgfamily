/**
 * VIP 페이지 클릭 가능 조건 분석 v2
 * avatar_url + vip_rewards 기준
 */

import { getServiceClient } from './lib/supabase'

// dotenv 수동 로드

const supabase = getServiceClient()

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 VIP 페이지 클릭 가능 조건 분석 (vip_rewards 기준)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 1. 종합 랭킹 Top 50 닉네임 조회
  const { data: rankings } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name')
    .order('rank', { ascending: true })
    .limit(50)

  const donorNames = (rankings || []).map(r => r.donor_name)
  console.log(`📋 종합 랭킹 유저 수: ${rankings?.length || 0}`)

  // 2. 프로필에서 avatar_url 있는 유저 확인
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url')
    .in('nickname', donorNames)

  const profilesWithAvatar = (profiles || []).filter(p => p.avatar_url)
  console.log(`🖼️ avatar_url 있는 유저 수: ${profilesWithAvatar.length}`)

  // 3. vip_rewards 보유 여부 확인
  const profileIds = (profiles || []).map(p => p.id)
  const { data: vipRewards } = await supabase
    .from('vip_rewards')
    .select('profile_id')
    .in('profile_id', profileIds)

  const profilesWithVipRewards = new Set((vipRewards || []).map(v => v.profile_id))
  console.log(`🎁 vip_rewards 있는 유저 수: ${profilesWithVipRewards.size}`)

  // 4. 두 조건 모두 충족하는 유저 목록
  console.log('\n✅ 클릭 가능한 유저 (avatar_url + vip_rewards 모두 있음):')
  let clickableCount = 0
  const clickableUsers: { rank: number | string; nickname: string }[] = []

  for (const profile of profiles || []) {
    const hasAvatar = Boolean(profile.avatar_url)
    const hasVipReward = profilesWithVipRewards.has(profile.id)
    if (hasAvatar && hasVipReward) {
      clickableCount++
      const rank = rankings?.find(r => r.donor_name === profile.nickname)?.rank || '?'
      clickableUsers.push({ rank, nickname: profile.nickname })
    }
  }

  // 순위별 정렬
  clickableUsers.sort((a, b) => {
    const rankA = typeof a.rank === 'number' ? a.rank : 999
    const rankB = typeof b.rank === 'number' ? b.rank : 999
    return rankA - rankB
  })

  for (const user of clickableUsers) {
    console.log(`   ${user.rank}위: ${user.nickname}`)
  }

  if (clickableCount === 0) {
    console.log('   (없음)')
  }

  console.log(`\n📊 결과: ${clickableCount}/${rankings?.length || 0}명 VIP 페이지 클릭 가능`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
