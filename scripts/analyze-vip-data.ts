/**
 * VIP 유저 데이터 정합성 분석
 * 특정 유저들의 avatar_url, vip_images, signature_videos 등 확인
 */

import { getServiceClient } from './lib/supabase'

// dotenv 수동 로드

const supabase = getServiceClient()

// 시그니처 이미지가 있어야 하는 유저들 (닉네임 패턴)
const TARGET_USERS = [
  '르큐리',
  '미키',
  '채은.*여신',
  '에이맨',
  '손밍매니아',
  '한세아내꺼.*호랭이',
  '사랑해씌발',
  '미드굿.*가애',
  '젖문가',
  '린아.*발굴',
  '농심.*육개장.*라면'
]

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 VIP 유저 데이터 정합성 분석')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 1. 모든 프로필 조회
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url, role')
    .order('nickname')

  // 2. 타겟 유저 매칭
  const targetProfiles: any[] = []
  for (const profile of allProfiles || []) {
    for (const pattern of TARGET_USERS) {
      const regex = new RegExp(pattern, 'i')
      if (regex.test(profile.nickname)) {
        targetProfiles.push(profile)
        break
      }
    }
  }

  console.log(`📋 타겟 유저 (${targetProfiles.length}명):\n`)

  // 3. 각 유저별 데이터 확인
  const profileIds = targetProfiles.map(p => p.id)

  // vip_images 조회
  const { data: vipImages } = await supabase
    .from('vip_images')
    .select('*')
    .in('profile_id', profileIds)

  // signature_videos 조회
  const { data: sigVideos } = await supabase
    .from('signature_videos')
    .select('*')
    .in('profile_id', profileIds)

  // vip_rewards 조회
  const { data: vipRewards } = await supabase
    .from('vip_rewards')
    .select('*')
    .in('profile_id', profileIds)

  // total_donation_rankings에서 순위 조회
  const { data: rankings } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, donor_id')
    .order('rank', { ascending: true })
    .limit(50)

  // 데이터 매핑
  const vipImagesMap = new Map<string, any[]>()
  for (const img of vipImages || []) {
    const existing = vipImagesMap.get(img.profile_id) || []
    existing.push(img)
    vipImagesMap.set(img.profile_id, existing)
  }

  const sigVideosMap = new Map<string, any[]>()
  for (const vid of sigVideos || []) {
    const existing = sigVideosMap.get(vid.profile_id) || []
    existing.push(vid)
    sigVideosMap.set(vid.profile_id, existing)
  }

  const vipRewardsMap = new Map<string, any[]>()
  for (const reward of vipRewards || []) {
    const existing = vipRewardsMap.get(reward.profile_id) || []
    existing.push(reward)
    vipRewardsMap.set(reward.profile_id, existing)
  }

  // 결과 출력
  console.log('┌─────┬──────────────────────────┬──────────┬────────────┬────────────┬────────────┐')
  console.log('│순위 │ 닉네임                   │avatar_url│vip_images  │sig_videos  │vip_rewards │')
  console.log('├─────┼──────────────────────────┼──────────┼────────────┼────────────┼────────────┤')

  for (const profile of targetProfiles) {
    const rank = rankings?.find(r =>
      r.donor_name === profile.nickname || r.donor_id === profile.id
    )?.rank || '-'

    const hasAvatar = profile.avatar_url ? '✅' : '❌'
    const vipImgCount = vipImagesMap.get(profile.id)?.length || 0
    const sigVidCount = sigVideosMap.get(profile.id)?.length || 0
    const vipRewCount = vipRewardsMap.get(profile.id)?.length || 0

    const nickname = profile.nickname.substring(0, 20).padEnd(20)
    console.log(`│ ${String(rank).padStart(2)} │ ${nickname} │    ${hasAvatar}    │     ${vipImgCount}      │     ${sigVidCount}      │     ${vipRewCount}      │`)
  }

  console.log('└─────┴──────────────────────────┴──────────┴────────────┴────────────┴────────────┘')

  // 요약
  console.log('\n📊 요약:')
  console.log(`   - avatar_url 있음: ${targetProfiles.filter(p => p.avatar_url).length}/${targetProfiles.length}`)
  console.log(`   - vip_images 있음: ${[...vipImagesMap.keys()].length}/${targetProfiles.length}`)
  console.log(`   - signature_videos 있음: ${[...sigVideosMap.keys()].length}/${targetProfiles.length}`)
  console.log(`   - vip_rewards 있음: ${[...vipRewardsMap.keys()].length}/${targetProfiles.length}`)

  // 수정 필요 사항
  console.log('\n🔧 수정 필요 사항:')
  const needsVipImages = targetProfiles.filter(p => !vipImagesMap.has(p.id))
  if (needsVipImages.length > 0) {
    console.log(`   vip_images 추가 필요 (${needsVipImages.length}명):`)
    for (const p of needsVipImages) {
      console.log(`     - ${p.nickname} (id: ${p.id})`)
    }
  } else {
    console.log('   vip_images: 모두 정상')
  }

  // 중복 프로필 확인
  console.log('\n📌 중복 프로필 확인:')
  const nicknameCount = new Map<string, number>()
  for (const p of targetProfiles) {
    nicknameCount.set(p.nickname, (nicknameCount.get(p.nickname) || 0) + 1)
  }
  const duplicates = [...nicknameCount.entries()].filter(([, count]) => count > 1)
  if (duplicates.length > 0) {
    for (const [nickname, count] of duplicates) {
      console.log(`   ⚠️ ${nickname}: ${count}개 프로필 존재`)
      const dups = targetProfiles.filter(p => p.nickname === nickname)
      for (const dup of dups) {
        console.log(`      - id: ${dup.id}, role: ${dup.role}, avatar: ${dup.avatar_url ? '있음' : '없음'}`)
      }
    }
  } else {
    console.log('   중복 없음')
  }
}

main().catch(console.error)
