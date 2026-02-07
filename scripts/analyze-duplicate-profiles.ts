/**
 * 중복 프로필 분석 및 정리 대상 식별
 * 11명 VIP 유저들의 프로필 상태 확인
 */

import { getServiceClient } from './lib/supabase'

// dotenv 수동 로드

const supabase = getServiceClient()

// 클릭 가능 11명 닉네임
const TARGET_NICKNAMES = [
  '르큐리',
  '미키™',
  '채은❤️여신',
  '에이맨♣️',
  '손밍매니아',
  '한세아내꺼♡호랭이',
  '사랑해씌발™',
  '[RG]미드굿♣️가애',
  '[J]젖문가',
  '[RG]✨린아의발굴™',
  '농심육개장라면'
]

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 중복 프로필 분석 (11명 VIP)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  for (const nickname of TARGET_NICKNAMES) {
    // 해당 닉네임의 모든 프로필 조회
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname, email, role, avatar_url')
      .eq('nickname', nickname)

    if (!profiles || profiles.length === 0) {
      console.log(`❌ [${nickname}] 프로필 없음`)
      continue
    }

    console.log(`\n[${nickname}] - ${profiles.length}개 프로필`)

    for (const profile of profiles) {
      // vip_rewards 확인
      const { data: rewards } = await supabase
        .from('vip_rewards')
        .select('id')
        .eq('profile_id', profile.id)

      // total_donation_rankings 확인
      const { data: rankings } = await supabase
        .from('total_donation_rankings')
        .select('id')
        .eq('donor_id', profile.id)

      // auth user 확인
      const { data: authData } = await supabase.auth.admin.getUserById(profile.id)
      const authExists = !!authData?.user

      const isNew = profile.email?.endsWith('@rgfamily.kr')
      const marker = isNew ? '🆕' : '📦'

      console.log(`   ${marker} ${profile.id.substring(0, 8)}...`)
      console.log(`      email: ${profile.email}`)
      console.log(`      avatar: ${profile.avatar_url ? '✅' : '❌'}`)
      console.log(`      vip_rewards: ${rewards?.length || 0}개`)
      console.log(`      rankings: ${rankings?.length || 0}개`)
      console.log(`      auth_user: ${authExists ? '✅' : '❌'}`)
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🆕 = 새 계정 (@rgfamily.kr) - 유지')
  console.log('📦 = 기존 계정 - 데이터 이관 후 삭제 대상')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
