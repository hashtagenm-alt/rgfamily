/**
 * 이전 계정 제거 확인 및 현황 체크
 */

import { getServiceClient } from './lib/supabase'
const supabase = getServiceClient()

// 삭제되어야 할 기존 계정 ID들
const OLD_PROFILE_IDS = [
  '30cf13d0-50bf-40e7-be20-6e4f50b38446', // 르큐리 (lequli@rgfamily.kr)
  'e001e9e2-b228-4195-a056-5e9f09b31279', // 미키™ (vip2@rg-family.test)
  '09ef14ad-9cee-44a2-9440-8cbd575084f2', // 채은❤️여신 (rgfamily.internal)
  '673e74ff-5180-4484-a536-1e23d07f57b9', // 에이맨♣️ (rgfamily.internal)
  'f8caa19f-d4c2-422e-8b22-91a2ae8739f7', // 손밍매니아 (vip1@rg-family.test)
  '30fc6e73-7e94-4a2d-afae-065e275c5b8d', // 한세아내꺼♡호랭이 (rgfamily.local)
  '15935b30-4700-4d34-891a-3a0149b32874', // 사랑해씌발™ (rgfamily.local)
  '94b963ab-f2a7-4d03-a446-e69e1990a617', // [RG]미드굿♣️가애 (rgfamily.local)
  '1312dbb6-fc23-4f6a-a5cb-696695be039c', // [J]젖문가 (rgfamily.local)
  '3e413632-32a6-486a-86e8-f5cedf3030b3', // [RG]✨린아의발굴™ (vip4@rg-family.test)
  '85430ebf-80be-4f6d-9532-2924e47cef6e', // 농심육개장라면 (rgfamily.local)
]

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 이전 계정 제거 확인 및 현황 체크')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 1. 기존 프로필 삭제 확인
  console.log('📋 기존 프로필 삭제 확인:')
  let deletedProfiles = 0
  let remainingProfiles = 0

  for (const id of OLD_PROFILE_IDS) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, nickname, email')
      .eq('id', id)
      .single()

    if (profile) {
      console.log(`   ❌ 남아있음: ${profile.nickname} (${profile.email})`)
      remainingProfiles++
    } else {
      deletedProfiles++
    }
  }

  console.log(`   ✅ 삭제됨: ${deletedProfiles}/${OLD_PROFILE_IDS.length}`)
  if (remainingProfiles > 0) {
    console.log(`   ⚠️ 남아있음: ${remainingProfiles}개`)
  }

  // 2. 기존 auth user 삭제 확인
  console.log('\n📋 기존 auth user 삭제 확인:')
  let deletedAuth = 0
  let remainingAuth = 0

  for (const id of OLD_PROFILE_IDS) {
    const { data: authData } = await supabase.auth.admin.getUserById(id)
    if (authData?.user) {
      console.log(`   ❌ 남아있음: ${authData.user.email}`)
      remainingAuth++
    } else {
      deletedAuth++
    }
  }

  console.log(`   ✅ 삭제됨: ${deletedAuth}/${OLD_PROFILE_IDS.length}`)
  if (remainingAuth > 0) {
    console.log(`   ⚠️ 남아있음: ${remainingAuth}개`)
  }

  // 3. 전체 현황
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 전체 현황')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 전체 프로필 수
  const { count: totalProfiles } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  console.log(`전체 프로필: ${totalProfiles}개`)

  // 이메일 패턴별 프로필 수
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('email')

  const emailPatterns = {
    '@rgfamily.kr': 0,
    '@rgfamily.local': 0,
    '@rgfamily.internal': 0,
    '@rg-family.test': 0,
    '기타': 0
  }

  for (const p of allProfiles || []) {
    const email = p.email || ''
    if (email.endsWith('@rgfamily.kr')) emailPatterns['@rgfamily.kr']++
    else if (email.endsWith('@rgfamily.local')) emailPatterns['@rgfamily.local']++
    else if (email.endsWith('@rgfamily.internal')) emailPatterns['@rgfamily.internal']++
    else if (email.includes('@rg-family.test')) emailPatterns['@rg-family.test']++
    else emailPatterns['기타']++
  }

  console.log('\n프로필 이메일 패턴:')
  for (const [pattern, count] of Object.entries(emailPatterns)) {
    if (count > 0) {
      console.log(`   ${pattern}: ${count}개`)
    }
  }

  // vip_rewards 현황
  const { count: totalVipRewards } = await supabase
    .from('vip_rewards')
    .select('*', { count: 'exact', head: true })

  console.log(`\nvip_rewards: ${totalVipRewards}개`)

  // vip_images 현황
  const { count: totalVipImages } = await supabase
    .from('vip_images')
    .select('*', { count: 'exact', head: true })

  console.log(`vip_images: ${totalVipImages}개`)

  // 11명 VIP 최종 상태
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ 11명 VIP 최종 상태')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const TARGET_NICKNAMES = [
    '르큐리', '미키™', '채은❤️여신', '에이맨♣️', '손밍매니아',
    '한세아내꺼♡호랭이', '사랑해씌발™', '[RG]미드굿♣️가애',
    '[J]젖문가', '[RG]✨린아의발굴™', '농심육개장라면'
  ]

  for (const nickname of TARGET_NICKNAMES) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, avatar_url')
      .eq('nickname', nickname)

    const { data: rewards } = await supabase
      .from('vip_rewards')
      .select('id')
      .in('profile_id', (profiles || []).map(p => p.id))

    const profileCount = profiles?.length || 0
    const hasAvatar = profiles?.some(p => p.avatar_url) || false
    const rewardCount = rewards?.length || 0
    const email = profiles?.[0]?.email || 'N/A'

    const status = profileCount === 1 && hasAvatar && rewardCount >= 1 ? '✅' : '⚠️'
    console.log(`${status} ${nickname}`)
    console.log(`   프로필: ${profileCount}개, avatar: ${hasAvatar ? '있음' : '없음'}, vip_rewards: ${rewardCount}개`)
    console.log(`   이메일: ${email}`)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
