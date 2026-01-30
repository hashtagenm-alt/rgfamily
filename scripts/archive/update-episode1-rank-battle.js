/**
 * Episode 1 직급전 업데이트 스크립트
 *
 * 1차 직급전이 이미 진행되었으므로:
 * 1. Episode 1 (episode_number = 1)을 is_rank_battle = true로 업데이트
 * 2. VIP rewards (episode_id = null)를 Episode 1에 연결
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateEpisode1RankBattle() {
  console.log('🏆 Episode 1 직급전 업데이트 시작...\n');

  try {
    // 1. 먼저 Episode 1 조회
    console.log('1️⃣ Episode 1 조회...');
    const { data: episode1, error: queryError } = await supabase
      .from('episodes')
      .select('*')
      .eq('season_id', 1)
      .eq('episode_number', 1)
      .single();

    if (queryError) {
      console.log('   ❌ Episode 1 조회 실패:', queryError.message);

      // 에피소드가 없으면 모든 에피소드 조회
      console.log('\n   📋 현재 에피소드 목록 조회...');
      const { data: allEpisodes } = await supabase
        .from('episodes')
        .select('id, season_id, episode_number, title, is_rank_battle, is_finalized')
        .order('episode_number', { ascending: true });

      if (allEpisodes) {
        console.log('   현재 에피소드:');
        allEpisodes.forEach(ep => {
          console.log(`     - ID ${ep.id}: ${ep.episode_number}화 "${ep.title}" (직급전: ${ep.is_rank_battle}, 확정: ${ep.is_finalized})`);
        });
      }
      return;
    }

    console.log(`   ✅ Episode 1 발견: ID ${episode1.id}, "${episode1.title}"`);
    console.log(`      현재 상태: is_rank_battle=${episode1.is_rank_battle}, is_finalized=${episode1.is_finalized}`);

    // 2. Episode 1 업데이트 (직급전 + 확정)
    console.log('\n2️⃣ Episode 1 → 직급전 확정으로 업데이트...');
    const { data: updated, error: updateError } = await supabase
      .from('episodes')
      .update({
        is_rank_battle: true,
        is_finalized: true,
        finalized_at: new Date().toISOString(),
        title: episode1.title || '1차 직급전'
      })
      .eq('id', episode1.id)
      .select()
      .single();

    if (updateError) {
      console.log('   ❌ Episode 1 업데이트 실패:', updateError.message);
      return;
    }

    console.log('   ✅ Episode 1 업데이트 완료');
    console.log(`      is_rank_battle: ${updated.is_rank_battle}`);
    console.log(`      is_finalized: ${updated.is_finalized}`);

    // 3. VIP Rewards 조회 (episode_id가 null인 것들)
    console.log('\n3️⃣ episode_id가 null인 VIP Rewards 조회...');
    const { data: nullRewards, error: rewardsQueryError } = await supabase
      .from('vip_rewards')
      .select(`
        id, rank, profile_id, season_id, episode_id,
        profiles:profile_id (nickname)
      `)
      .eq('season_id', 1)
      .is('episode_id', null);

    if (rewardsQueryError) {
      console.log('   ❌ VIP Rewards 조회 실패:', rewardsQueryError.message);
      return;
    }

    if (!nullRewards || nullRewards.length === 0) {
      console.log('   ℹ️ episode_id가 null인 VIP Rewards가 없습니다.');

      // 전체 VIP Rewards 확인
      const { data: allRewards } = await supabase
        .from('vip_rewards')
        .select('id, rank, profile_id, season_id, episode_id')
        .eq('season_id', 1);

      console.log('   현재 시즌 1 VIP Rewards:', allRewards?.length || 0, '개');
      allRewards?.forEach(r => {
        console.log(`     - ID ${r.id}: ${r.rank}위, episode_id: ${r.episode_id}`);
      });
    } else {
      console.log(`   발견된 Rewards: ${nullRewards.length}개`);
      nullRewards.forEach(r => {
        const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        console.log(`     - ${r.rank}위: ${profile?.nickname} (episode_id: null)`);
      });

      // 4. VIP Rewards 업데이트 (Episode 1에 연결)
      console.log('\n4️⃣ VIP Rewards를 Episode 1에 연결...');
      const rewardIds = nullRewards.map(r => r.id);

      const { error: linkError } = await supabase
        .from('vip_rewards')
        .update({ episode_id: episode1.id })
        .in('id', rewardIds);

      if (linkError) {
        console.log('   ❌ VIP Rewards 연결 실패:', linkError.message);
        return;
      }

      console.log(`   ✅ ${rewardIds.length}개 VIP Rewards를 Episode 1 (ID: ${episode1.id})에 연결 완료`);
    }

    // 5. 최종 결과 확인
    console.log('\n📊 최종 결과 확인...');

    const { data: finalEpisodes } = await supabase
      .from('episodes')
      .select('*')
      .eq('season_id', 1)
      .eq('is_rank_battle', true)
      .order('episode_number', { ascending: true });

    console.log('\n=== 시즌 1 직급전 에피소드 ===');
    finalEpisodes?.forEach(ep => {
      console.log(`  ${ep.episode_number}화: "${ep.title}" (확정: ${ep.is_finalized ? '✅' : '❌'})`);
    });

    const { data: finalRewards } = await supabase
      .from('vip_rewards')
      .select(`
        id, rank, episode_id,
        profiles:profile_id (nickname),
        episodes:episode_id (episode_number, title)
      `)
      .eq('season_id', 1)
      .order('rank', { ascending: true });

    console.log('\n=== 시즌 1 VIP Rewards ===');
    finalRewards?.forEach(r => {
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      const episode = Array.isArray(r.episodes) ? r.episodes[0] : r.episodes;
      const epInfo = episode ? `${episode.episode_number}화 "${episode.title}"` : '시즌 최종';
      console.log(`  ${r.rank}위: ${profile?.nickname} → ${epInfo}`);
    });

    console.log('\n🎉 Episode 1 직급전 업데이트 완료!');

  } catch (error) {
    console.error('❌ 에러:', error.message);
  }
}

updateEpisode1RankBattle();
