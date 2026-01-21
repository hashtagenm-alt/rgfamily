/**
 * VIP Rewards 수정 - Top 3만 에피소드 연결
 * 4위, 5위는 episode_id를 null로 되돌림
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixVipRewardsTop3Only() {
  console.log('🔧 VIP Rewards 수정 - Top 3만 에피소드 연결\n');

  try {
    // 1. 현재 상태 확인
    console.log('1️⃣ 현재 VIP Rewards 상태 확인...');
    const { data: rewards } = await supabase
      .from('vip_rewards')
      .select(`
        id, rank, episode_id,
        profiles:profile_id (nickname)
      `)
      .eq('season_id', 1)
      .order('rank', { ascending: true });

    rewards?.forEach(r => {
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      console.log(`   ${r.rank}위: ${profile?.nickname} (episode_id: ${r.episode_id})`);
    });

    // 2. 4위 이상은 episode_id를 null로
    console.log('\n2️⃣ 4위 이상 episode_id → null 처리...');
    const { data: updated, error } = await supabase
      .from('vip_rewards')
      .update({ episode_id: null })
      .eq('season_id', 1)
      .gt('rank', 3)
      .select(`
        id, rank,
        profiles:profile_id (nickname)
      `);

    if (error) {
      console.log('   ❌ 업데이트 실패:', error.message);
      return;
    }

    if (updated && updated.length > 0) {
      updated.forEach(r => {
        const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        console.log(`   ✅ ${r.rank}위 ${profile?.nickname}: episode_id → null`);
      });
    } else {
      console.log('   ℹ️ 업데이트할 항목 없음');
    }

    // 3. 최종 결과 확인
    console.log('\n📊 최종 VIP Rewards 상태...');
    const { data: finalRewards } = await supabase
      .from('vip_rewards')
      .select(`
        id, rank, episode_id,
        profiles:profile_id (nickname),
        episodes:episode_id (episode_number, title)
      `)
      .eq('season_id', 1)
      .order('rank', { ascending: true });

    finalRewards?.forEach(r => {
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      const episode = Array.isArray(r.episodes) ? r.episodes[0] : r.episodes;
      const epInfo = episode ? `→ ${episode.episode_number}화` : '(에피소드 미연결)';
      const badge = r.rank <= 3 ? '🏆' : '  ';
      console.log(`   ${badge} ${r.rank}위: ${profile?.nickname} ${epInfo}`);
    });

    console.log('\n🎉 완료! Top 3만 에피소드에 연결됨');

  } catch (error) {
    console.error('❌ 에러:', error.message);
  }
}

fixVipRewardsTop3Only();
