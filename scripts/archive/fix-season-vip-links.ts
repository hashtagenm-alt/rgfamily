;
;
import { getServiceClient } from './lib/supabase'
import * as path from 'path';

 });

const supabase = getServiceClient();

interface Issue {
  rank: number;
  name: string;
  issue: 'no_profile' | 'no_vip_reward';
  profileId?: string;
}

async function analyzeAndFix() {
  console.log('=== 시즌 랭킹 VIP 링크 분석 및 수정 ===\n');

  // 1. 현재 시즌 조회
  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .single();
  const seasonId = season?.id || 1;

  // 2. vip_rewards가 있는 프로필들 조회
  const { data: vipRewards } = await supabase
    .from('vip_rewards')
    .select('profile_id, rank, profiles:profile_id(id, nickname)');

  const vipProfileIds = new Set<string>();
  vipRewards?.forEach(v => {
    vipProfileIds.add(v.profile_id);
  });

  console.log(`현재 vip_rewards 보유: ${vipProfileIds.size}개\n`);

  // 3. season_donation_rankings 조회
  const { data: seasonRankings } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name')
    .order('rank')
    .limit(50);

  // 4. 모든 랭킹 닉네임에 대해 프로필 조회
  const rankingNames = seasonRankings?.map(r => r.donor_name.trim()) || [];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname');

  const nicknameToProfileId: Record<string, string> = {};
  profiles?.forEach(p => {
    if (p.nickname) {
      nicknameToProfileId[p.nickname] = p.id;
      nicknameToProfileId[p.nickname.trim()] = p.id;
    }
  });

  // 5. 분석
  console.log('=== 시즌 랭킹 Top 20 분석 ===\n');

  const issues: Issue[] = [];

  seasonRankings?.slice(0, 20).forEach(sr => {
    const profileId = nicknameToProfileId[sr.donor_name.trim()];
    const hasProfile = profileId !== undefined;
    const hasVipReward = profileId !== undefined && vipProfileIds.has(profileId);

    let status = '';
    if (!hasProfile) {
      status = '❌ 프로필 없음';
      issues.push({ rank: sr.rank, name: sr.donor_name, issue: 'no_profile' });
    } else if (!hasVipReward) {
      status = '⚠️ vip_rewards 없음';
      issues.push({ rank: sr.rank, name: sr.donor_name, issue: 'no_vip_reward', profileId });
    } else {
      status = '✅ 정상';
    }

    console.log(`${sr.rank}위 ${sr.donor_name}: ${status}`);
  });

  // 6. vip_rewards 없는 프로필 수정
  const needsVipReward = issues.filter(i => i.issue === 'no_vip_reward');

  if (needsVipReward.length > 0) {
    console.log(`\n=== vip_rewards 추가 (${needsVipReward.length}건) ===\n`);

    for (const item of needsVipReward) {
      const { data, error } = await supabase
        .from('vip_rewards')
        .insert({
          profile_id: item.profileId,
          season_id: seasonId,
          rank: item.rank,
        })
        .select()
        .single();

      if (error) {
        console.log(`❌ ${item.rank}위 ${item.name}: ${error.message}`);
      } else {
        console.log(`✅ ${item.rank}위 ${item.name}: vip_rewards 추가 (id: ${data.id})`);
      }
    }
  }

  // 7. 프로필 없는 경우 처리 (닉네임 유사 검색)
  const needsProfile = issues.filter(i => i.issue === 'no_profile');

  if (needsProfile.length > 0) {
    console.log(`\n=== 프로필 없는 후원자 (${needsProfile.length}건) ===\n`);

    for (const item of needsProfile) {
      // 유사 닉네임 검색
      const searchTerm = item.name.replace(/[^\w\uAC00-\uD7AF]/g, '').slice(0, 5);
      const { data: similar } = await supabase
        .from('profiles')
        .select('id, nickname')
        .ilike('nickname', `%${searchTerm}%`)
        .limit(3);

      console.log(`${item.rank}위 ${item.name}:`);
      if (similar && similar.length > 0) {
        console.log(`  유사 프로필:`);
        similar.forEach(s => console.log(`    - ${s.nickname} (${s.id.slice(0, 8)}...)`));
      } else {
        console.log(`  유사 프로필 없음 - 새 프로필 생성 필요`);
      }
    }
  }

  // 최종 결과
  console.log('\n=== 최종 결과 ===');
  const { data: finalVip } = await supabase
    .from('vip_rewards')
    .select('profile_id, profiles:profile_id(nickname)')
    .order('created_at', { ascending: false })
    .limit(15);

  console.log(`\nvip_rewards 총 개수: ${finalVip?.length || 0}개`);
}

analyzeAndFix().catch(console.error);
