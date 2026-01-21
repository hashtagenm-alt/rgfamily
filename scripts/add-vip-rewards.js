/**
 * VIP Rewards 등록 스크립트
 * 시즌 1 Top 3 (손밍매니아, 미키™, 쩔어서짜다) 등록
 *
 * profiles, vip_rewards 모두 auth.users FK 제약이 있어
 * 기존 프로필을 재활용 (닉네임 업데이트)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 시즌 1 Top 3 데이터
const top3 = [
  {
    rank: 1,
    nickname: '손밍매니아',
    totalDonation: 254663,
    personalMessage: `손밍매니아님, 압도적인 1위로 항상 최고의 응원을 보내주셔서 진심으로 감사합니다! 💖

시즌 1 첫 방송부터 변함없이 함께해주신 손밍매니아님 덕분에 매일 방송이 행복합니다. 놀라운 응원으로 언제나 든든한 서포터가 되어주셔서 정말 감사드려요.

손밍매니아님과 함께하는 모든 순간이 소중해요. 앞으로도 함께 더 좋은 추억 만들어가요!

사랑합니다! 💕

- RG Family 일동`
  },
  {
    rank: 2,
    nickname: '미키™',
    totalDonation: 215381,
    personalMessage: `미키™님, 항상 변함없는 응원에 진심으로 감사드려요! 🌟

미키™님과 함께하는 방송은 언제나 특별해요. 채팅에서 따뜻한 메시지로 분위기를 밝혀주시고, 다른 팬분들도 챙겨주시는 모습이 정말 감동입니다.

꾸준한 응원 덕분에 우리 방송 분위기가 항상 최고예요! 앞으로도 함께 좋은 추억 많이 만들어요!

감사합니다! 💝

- RG Family 일동`
  },
  {
    rank: 3,
    nickname: '쩔어서짜다',
    totalDonation: 185465,
    personalMessage: `쩔어서짜다님, 따뜻한 응원 항상 감사합니다! ⭐❤️

처음부터 함께해주신 특별한 서포터가 되어주셔서 정말 감동이에요. 중요한 순간마다 항상 함께해주시는 모습이 정말 따뜻합니다.

쩔어서짜다님 덕분에 힘이 나요! 앞으로도 좋은 방송으로 보답할게요!

감사합니다! 💖

- RG Family 일동`
  }
];

// 기존 프로필 (재활용할 것)
const oldProfiles = ['미키', '미드', '농심육개장라면'];

async function addVipRewards() {
  console.log('🏆 VIP Rewards 등록 시작...\n');

  try {
    // 1. 기존 vip_rewards, vip_images 삭제
    console.log('1️⃣ 기존 데이터 삭제...');
    await supabase.from('vip_images').delete().neq('id', 0);
    await supabase.from('vip_rewards').delete().neq('id', 0);
    console.log('   ✅ 기존 VIP 데이터 삭제 완료');

    // 2. 기존 프로필 조회 (미키, 미드, 농심육개장라면)
    console.log('\n2️⃣ 기존 프로필 조회...');
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname')
      .in('nickname', oldProfiles);

    if (!profiles || profiles.length < 3) {
      console.log('   ⚠️ 재활용할 프로필이 부족합니다. 현재:', profiles?.map(p => p.nickname).join(', '));
      console.log('   임의의 프로필 3개를 가져옵니다...');

      const { data: anyProfiles } = await supabase
        .from('profiles')
        .select('id, nickname')
        .limit(3);

      if (!anyProfiles || anyProfiles.length < 3) {
        console.log('   ❌ 프로필이 3개 미만입니다. 종료합니다.');
        return;
      }

      profiles.length = 0;
      profiles.push(...anyProfiles);
    }

    console.log('   사용할 프로필:', profiles.map(p => `${p.nickname} (${p.id.substring(0, 8)}...)`).join(', '));

    // 3. 프로필 닉네임 업데이트 및 VIP Rewards 생성
    console.log('\n3️⃣ 프로필 업데이트 및 VIP Rewards 생성...');

    for (let i = 0; i < top3.length; i++) {
      const donor = top3[i];
      const profile = profiles[i];

      // 프로필 닉네임 및 후원액 업데이트
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          nickname: donor.nickname,
          total_donation: donor.totalDonation,
          role: 'vip',
          unit: 'excel',
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (updateError) {
        console.log(`   ❌ ${donor.nickname} 프로필 업데이트 실패: ${updateError.message}`);
        continue;
      }
      console.log(`   ✅ 프로필 업데이트: ${profile.nickname} → ${donor.nickname}`);

      // VIP Reward 생성
      const { data: reward, error: rewardError } = await supabase
        .from('vip_rewards')
        .insert({
          profile_id: profile.id,
          season_id: 1,
          rank: donor.rank,
          personal_message: donor.personalMessage,
          dedication_video_url: null,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (rewardError) {
        console.log(`   ❌ ${donor.nickname} VIP Reward 실패: ${rewardError.message}`);
      } else {
        console.log(`   ✅ ${donor.nickname} (${donor.rank}위) - Reward ID: ${reward.id}, Profile ID: ${profile.id.substring(0, 8)}...`);
      }
    }

    // 4. 결과 확인
    console.log('\n📊 최종 결과 확인...');

    const { data: rewards } = await supabase
      .from('vip_rewards')
      .select(`
        id, rank, profile_id,
        profiles:profile_id (nickname, total_donation)
      `)
      .order('rank', { ascending: true });

    if (rewards && rewards.length > 0) {
      console.log('\n=== 시즌 1 VIP Rewards ===');
      rewards.forEach(r => {
        const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        console.log(`  ${r.rank}위: ${profile?.nickname} (ID: ${r.profile_id.substring(0, 8)}...)`);
      });

      console.log('\n=== VIP 프로필 페이지 URL ===');
      rewards.forEach(r => {
        const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        console.log(`  ${r.rank}위 ${profile?.nickname}: /ranking/vip/${r.profile_id}`);
      });
    }

    console.log('\n🎉 VIP Rewards 등록 완료!');

  } catch (error) {
    console.error('❌ 에러:', error.message);
  }
}

addVipRewards();
