;
;
import { getServiceClient } from './lib/supabase'
import * as path from 'path';

 });

const supabase = getServiceClient();

async function addAllVipRewards() {
  console.log('=== 시즌 랭킹 Top 50 vip_rewards 일괄 추가 ===\n');

  // 현재 vip_rewards
  const { data: existing } = await supabase.from('vip_rewards').select('profile_id');
  const existingIds = new Set(existing?.map(v => v.profile_id));

  // 프로필 매핑
  const { data: profiles } = await supabase.from('profiles').select('id, nickname');
  const nicknameToId: Record<string, string> = {};
  profiles?.forEach(p => {
    if (p.nickname) nicknameToId[p.nickname.trim()] = p.id;
  });

  // 시즌 랭킹
  const { data: rankings } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name')
    .order('rank')
    .limit(50);

  let added = 0;
  let skipped = 0;
  let noProfile = 0;

  for (const r of rankings || []) {
    const profileId = nicknameToId[r.donor_name.trim()];

    if (!profileId) {
      console.log(`${r.rank}위 ${r.donor_name}: ❌ 프로필 없음`);
      noProfile++;
      continue;
    }

    if (existingIds.has(profileId)) {
      skipped++;
      continue;
    }

    const { error } = await supabase.from('vip_rewards').insert({
      profile_id: profileId,
      season_id: 1,
      rank: r.rank,
    });

    if (error) {
      console.log(`${r.rank}위 ${r.donor_name}: ⚠️ 실패 - ${error.message}`);
    } else {
      console.log(`${r.rank}위 ${r.donor_name}: ✅ 추가됨`);
      added++;
      existingIds.add(profileId);
    }
  }

  console.log(`\n결과: ${added}개 추가, ${skipped}개 이미 존재, ${noProfile}개 프로필 없음`);

  // 프로필 없는 항목 처리
  if (noProfile > 0) {
    console.log('\n=== 프로필 없는 후원자 처리 ===');

    for (const r of rankings || []) {
      const profileId = nicknameToId[r.donor_name.trim()];
      if (!profileId) {
        // 유사 닉네임 검색
        const searchTerm = r.donor_name.replace(/[^\w\uAC00-\uD7AF]/g, '').slice(0, 4);
        const { data: similar } = await supabase
          .from('profiles')
          .select('id, nickname')
          .ilike('nickname', `%${searchTerm}%`)
          .limit(3);

        if (similar && similar.length > 0) {
          console.log(`${r.rank}위 ${r.donor_name} → 유사: ${similar.map(s => s.nickname).join(', ')}`);
        }
      }
    }
  }
}

addAllVipRewards().catch(console.error);
