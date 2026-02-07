;
import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv';
;

const supabase = getServiceClient();

async function debug() {
  // vip_images + vip_rewards 조회
  const { data: vipImages } = await supabase.from('vip_images').select('reward_id');
  const rewardIds = vipImages?.map(v => v.reward_id) || [];
  
  const { data: vipRewards } = await supabase
    .from('vip_rewards')
    .select('id, profile_id, profiles:profile_id(nickname)')
    .in('id', rewardIds);

  console.log('=== 11명의 profile_id 목록 (vip_images 보유자) ===');
  const profileIds: string[] = [];
  vipRewards?.forEach(v => {
    const nickname = Array.isArray(v.profiles) ? v.profiles[0]?.nickname : (v.profiles as any)?.nickname;
    console.log(`${nickname}: ${v.profile_id}`);
    if (v.profile_id) profileIds.push(v.profile_id);
  });

  // 랭킹에서 해당 profile_id가 donorId로 매칭되는지 확인
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname')
    .in('id', profileIds);

  console.log('\n=== profiles 테이블에서 조회 ===');
  profiles?.forEach(p => console.log(`${p.nickname}: ${p.id}`));

  // total_rankings_public과 비교
  const { data: rankings } = await supabase
    .from('total_rankings_public')
    .select('rank, donor_name, gauge_percent')
    .order('rank')
    .limit(15);

  console.log('\n=== total_rankings_public Top 15 ===');
  rankings?.forEach(r => console.log(`${r.rank}. ${r.donor_name}`));
}

debug();
