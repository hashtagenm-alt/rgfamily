/**
 * 명예의 전당 시스템 상태 확인 스크립트
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabase() {
  console.log('═══════════════════════════════════════════');
  console.log('📊 SUPABASE 데이터베이스 상태 확인');
  console.log('═══════════════════════════════════════════\n');

  // 1. 시즌 확인
  console.log('1️⃣ 시즌 상태');
  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, name, is_active')
    .order('id');

  if (seasons) {
    seasons.forEach(s => {
      const icon = s.is_active ? '🔥' : '  ';
      const status = s.is_active ? '진행중' : '종료';
      console.log(`   ${icon} 시즌 ${s.id}: ${s.name} (${status})`);
    });
  }

  // 2. 직급전 에피소드 확인
  console.log('\n2️⃣ 직급전 에피소드 (is_rank_battle=true)');
  const { data: episodes } = await supabase
    .from('episodes')
    .select('id, season_id, episode_number, title, is_rank_battle, is_finalized')
    .eq('is_rank_battle', true)
    .order('episode_number');

  if (episodes && episodes.length > 0) {
    episodes.forEach(e => {
      const status = e.is_finalized ? '✅ 확정' : '⏳ 미확정';
      console.log(`   ${status} | ID ${e.id} | ${e.episode_number}화: "${e.title}"`);
    });
  } else {
    console.log('   ⚠️ 직급전 에피소드 없음');
  }

  // 3. VIP Rewards (명예의 전당)
  console.log('\n3️⃣ VIP Rewards (명예의 전당 데이터)');
  const { data: rewards } = await supabase
    .from('vip_rewards')
    .select(`
      id, rank, season_id, episode_id,
      profiles:profile_id(nickname),
      episodes:episode_id(episode_number, title)
    `)
    .order('season_id')
    .order('rank');

  if (rewards && rewards.length > 0) {
    console.log(`   총 ${rewards.length}개 포디움 기록\n`);
    rewards.forEach(r => {
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      const episode = Array.isArray(r.episodes) ? r.episodes[0] : r.episodes;
      const epInfo = episode ? `${episode.episode_number}화 직급전` : '시즌 최종';
      console.log(`   🏆 ${r.rank}위: ${profile?.nickname} | 시즌${r.season_id} | ${epInfo}`);
    });
  } else {
    console.log('   ⚠️ VIP Rewards 없음');
  }

  // 4. 포디움 달성자 profile_id 목록
  console.log('\n4️⃣ 포디움 달성자 (VIP 페이지 접근 가능)');
  const { data: podiumAchievers } = await supabase
    .from('vip_rewards')
    .select('profile_id, profiles:profile_id(nickname)')
    .lte('rank', 3);

  if (podiumAchievers) {
    const uniqueIds = [...new Set(podiumAchievers.map(p => p.profile_id))];
    console.log(`   총 ${uniqueIds.length}명`);
    podiumAchievers.forEach(p => {
      const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
      console.log(`   ✓ ${profile?.nickname} (${p.profile_id.substring(0, 8)}...)`);
    });
  }

  console.log('\n═══════════════════════════════════════════');
}

checkDatabase();
