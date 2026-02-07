/**
 * VIP 페이지 클릭 가능 조건 분석
 * avatar_url + vip_images 모두 있어야 클릭 가능
 */

import { getServiceClient } from './lib/supabase'

// dotenv 수동 로드

const supabase = getServiceClient()

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 VIP 페이지 클릭 가능 조건 분석 (DB 기준)')
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

  // 3. vip_images에서 이미지 있는 profile_id 조회
  const profileIds = (profiles || []).map(p => p.id)
  const { data: vipImages } = await supabase
    .from('vip_images')
    .select('profile_id')
    .in('profile_id', profileIds)

  const profilesWithVipImages = new Set((vipImages || []).map(v => v.profile_id))
  console.log(`📸 vip_images 있는 유저 수: ${profilesWithVipImages.size}`)

  // 4. 두 조건 모두 충족하는 유저 목록
  console.log('\n✅ 클릭 가능한 유저 (avatar_url + vip_images 모두 있음):')
  let clickableCount = 0
  for (const profile of profiles || []) {
    const hasAvatar = Boolean(profile.avatar_url)
    const hasVipImage = profilesWithVipImages.has(profile.id)
    if (hasAvatar && hasVipImage) {
      clickableCount++
      const rank = rankings?.find(r => r.donor_name === profile.nickname)?.rank || '?'
      console.log(`   ${rank}위: ${profile.nickname}`)
    }
  }

  if (clickableCount === 0) {
    console.log('   (없음)')
  }

  console.log(`\n📊 결과: ${clickableCount}/${rankings?.length || 0}명만 VIP 페이지 클릭 가능`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // 상세 분석
  console.log('\n📌 상세 분석:')
  console.log('   - avatar_url만 있는 유저:')
  for (const profile of profilesWithAvatar) {
    if (!profilesWithVipImages.has(profile.id)) {
      const rank = rankings?.find(r => r.donor_name === profile.nickname)?.rank || '?'
      console.log(`     ${rank}위: ${profile.nickname} (VIP 이미지 없음)`)
    }
  }

  console.log('\n   - vip_images만 있는 유저:')
  for (const profile of profiles || []) {
    if (!profile.avatar_url && profilesWithVipImages.has(profile.id)) {
      const rank = rankings?.find(r => r.donor_name === profile.nickname)?.rank || '?'
      console.log(`     ${rank}위: ${profile.nickname} (avatar 없음)`)
    }
  }
}

main().catch(console.error)
