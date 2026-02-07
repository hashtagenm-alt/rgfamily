;
import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv';
;

const supabase = getServiceClient();

async function check() {
  // vip_images에 있는 reward_id 목록
  const { data: vipImages } = await supabase.from('vip_images').select('reward_id');
  const rewardIds = vipImages?.map(v => v.reward_id) || [];
  console.log('vip_images reward_ids:', rewardIds);

  // 해당 reward_id의 vip_rewards + profiles 조회
  const { data: vipRewards } = await supabase
    .from('vip_rewards')
    .select('id, rank, profile_id, profiles:profile_id(nickname)')
    .in('id', rewardIds)
    .order('rank');

  console.log('\n✅ VIP 개인 페이지 보유자 (11명):');
  vipRewards?.forEach(v => {
    const nickname = Array.isArray(v.profiles) ? v.profiles[0]?.nickname : (v.profiles as any)?.nickname;
    console.log(`  - rank ${v.rank}: ${nickname} (reward_id: ${v.id})`);
  });

  // 전체 vip_rewards 중 vip_images가 없는 것들
  const { data: allVipRewards } = await supabase
    .from('vip_rewards')
    .select('id, rank, profile_id, profiles:profile_id(nickname)')
    .order('rank');

  const withoutImages = allVipRewards?.filter(v => !rewardIds.includes(v.id)) || [];
  console.log(`\n❌ VIP 개인 페이지 없는 사용자 (${withoutImages.length}명):`);
  withoutImages.forEach(v => {
    const nickname = Array.isArray(v.profiles) ? v.profiles[0]?.nickname : (v.profiles as any)?.nickname;
    console.log(`  - rank ${v.rank}: ${nickname} (reward_id: ${v.id})`);
  });
}

check();
