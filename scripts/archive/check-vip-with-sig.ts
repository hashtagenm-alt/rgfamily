import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv'

const supabase = getServiceClient()

async function check() {
  // vip_images에서 고유 reward_id 목록
  const { data: vipImages } = await supabase
    .from('vip_images')
    .select('reward_id')

  const rewardIds = [...new Set(vipImages?.map(v => v.reward_id) || [])]

  // vip_rewards에서 해당 reward들 조회
  const { data: vipRewards, error } = await supabase
    .from('vip_rewards')
    .select('id, rank, profile_id')
    .in('id', rewardIds)
    .order('rank', { ascending: true })

  if (error) {
    console.error('Error:', error.message)
    return
  }

  const results: any[] = []

  for (const vip of vipRewards || []) {
    // profiles에서 nickname 조회
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, nickname')
      .eq('id', vip.profile_id)
      .single()

    results.push({
      rank: vip.rank,
      nickname: profile?.nickname || '(알 수 없음)',
      rewardId: vip.id,
      profileId: vip.profile_id,
      url: vip.profile_id ? `https://www.rgfamily.kr/ranking/vip/${vip.profile_id}` : null
    })
  }

  console.log('=== VIP 시그니처(개인이미지) 보유자 목록 ===')
  console.log('총', results.length, '명\n')

  for (const r of results) {
    console.log(`${r.rank}위: ${r.nickname}`)
    console.log(`  profile_id: ${r.profileId || 'N/A'}`)
    console.log(`  URL: ${r.url || '(프로필 없음)'}`)
    console.log()
  }

  return results
}

check().catch(console.error)
