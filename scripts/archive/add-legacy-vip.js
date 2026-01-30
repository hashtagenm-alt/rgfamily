/**
 * 레거시 VIP 추가 (미드, 농심육개장라면)
 * 기존에 많이 후원했던 분들을 명예의 전당에 추가
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 레거시 VIP 데이터
const legacyVips = [
  {
    nickname: '미드',
    personalMessage: `미드님, 오랜 시간 함께해주셔서 감사합니다! 🌟

초창기부터 변함없이 응원해주신 미드님 덕분에 여기까지 올 수 있었어요. 언제나 든든한 서포터가 되어주셔서 정말 감동입니다.

앞으로도 좋은 추억 많이 만들어가요!

감사합니다! 💝

- RG Family 일동`
  },
  {
    nickname: '농심육개장라면',
    personalMessage: `농심육개장라면님, 항상 응원해주셔서 감사합니다! ⭐

특별한 닉네임만큼이나 특별한 응원을 보내주셔서 정말 기억에 남아요. 함께해주신 모든 순간이 소중합니다.

앞으로도 좋은 방송으로 보답할게요!

감사합니다! 💖

- RG Family 일동`
  }
];

async function addLegacyVip() {
  console.log('🏆 레거시 VIP 추가 시작...\n');

  try {
    // 1. 사용 가능한 프로필 찾기 (아직 vip_rewards에 등록 안 된 것)
    console.log('1️⃣ 사용 가능한 프로필 조회...');

    const { data: usedProfiles } = await supabase
      .from('vip_rewards')
      .select('profile_id');

    const usedIds = new Set(usedProfiles?.map(p => p.profile_id) || []);

    const { data: availableProfiles } = await supabase
      .from('profiles')
      .select('id, nickname')
      .limit(10);

    const unusedProfiles = availableProfiles?.filter(p => !usedIds.has(p.id)) || [];

    console.log('   사용 가능한 프로필:', unusedProfiles.map(p => p.nickname).join(', ') || '없음');

    if (unusedProfiles.length < legacyVips.length) {
      console.log('   ⚠️ 사용 가능한 프로필이 부족합니다.');
      return;
    }

    // 2. 현재 최대 rank 조회
    const { data: maxRankData } = await supabase
      .from('vip_rewards')
      .select('rank')
      .order('rank', { ascending: false })
      .limit(1)
      .single();

    let nextRank = (maxRankData?.rank || 0) + 1;
    console.log(`\n   현재 최대 rank: ${maxRankData?.rank || 0}, 다음 rank: ${nextRank}`);

    // 3. 레거시 VIP 추가
    console.log('\n2️⃣ 레거시 VIP 등록...');

    for (let i = 0; i < legacyVips.length; i++) {
      const vip = legacyVips[i];
      const profile = unusedProfiles[i];

      // 프로필 닉네임 업데이트
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          nickname: vip.nickname,
          role: 'vip',
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (updateError) {
        console.log(`   ❌ ${vip.nickname} 프로필 업데이트 실패: ${updateError.message}`);
        continue;
      }

      // VIP Reward 생성
      const { data: reward, error: rewardError } = await supabase
        .from('vip_rewards')
        .insert({
          profile_id: profile.id,
          season_id: 1,
          rank: nextRank++,
          personal_message: vip.personalMessage,
          dedication_video_url: null,
          created_at: new Date().toISOString()
        })
        .select('id, rank')
        .single();

      if (rewardError) {
        console.log(`   ❌ ${vip.nickname} VIP Reward 실패: ${rewardError.message}`);
      } else {
        console.log(`   ✅ ${vip.nickname} 등록 완료 - Rank: ${reward.rank}, Profile ID: ${profile.id.substring(0, 8)}...`);
      }
    }

    // 4. 결과 확인
    console.log('\n📊 전체 VIP Rewards 확인...');

    const { data: allRewards } = await supabase
      .from('vip_rewards')
      .select(`
        id, rank, profile_id,
        profiles:profile_id (nickname)
      `)
      .order('rank', { ascending: true });

    if (allRewards && allRewards.length > 0) {
      console.log('\n=== 명예의 전당 (VIP 프로필 보유자) ===');
      allRewards.forEach(r => {
        const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        console.log(`  ${r.rank}위: ${profile?.nickname} - /ranking/vip/${r.profile_id}`);
      });
    }

    console.log('\n🎉 레거시 VIP 추가 완료!');

  } catch (error) {
    console.error('❌ 에러:', error.message);
  }
}

addLegacyVip();
