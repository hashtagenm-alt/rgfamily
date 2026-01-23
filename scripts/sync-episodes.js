const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 누락된 에피소드 데이터 (schedules 테이블 기준)
const missingEpisodes = [
  {
    season_id: 1,
    episode_number: 11,
    title: '[RG FAMILY] 시즌1 / 11화!',
    broadcast_date: '2026-02-12T05:00:00+00:00',
    is_rank_battle: false,
    is_finalized: false,
    description: '용병 데이_2'
  },
  {
    season_id: 1,
    episode_number: 12,
    title: '[RG FAMILY] 시즌1 / 12화!',
    broadcast_date: '2026-02-14T05:00:00+00:00',
    is_rank_battle: false,
    is_finalized: false,
    description: '설날특집 도파민데이'
  },
  {
    season_id: 1,
    episode_number: 13,
    title: '[RG FAMILY] 시즌1 / 13화!',
    broadcast_date: '2026-02-19T05:00:00+00:00',
    is_rank_battle: false,
    is_finalized: false,
    description: '팀 데스매치'
  },
  {
    season_id: 1,
    episode_number: 14,
    title: '[RG FAMILY] 시즌1 / 14화!',
    broadcast_date: '2026-02-21T05:00:00+00:00',
    is_rank_battle: false,
    is_finalized: false,
    description: '기여도 전쟁'
  }
];

async function syncEpisodes() {
  console.log('🔄 누락된 에피소드 추가 중...\n');

  for (const ep of missingEpisodes) {
    // 이미 존재하는지 확인
    const { data: existing } = await supabase
      .from('episodes')
      .select('id')
      .eq('season_id', ep.season_id)
      .eq('episode_number', ep.episode_number)
      .single();

    if (existing) {
      console.log('  ⏭️  ' + ep.episode_number + '화: 이미 존재 (ID: ' + existing.id + ')');
      continue;
    }

    // 새 에피소드 추가
    const { data, error } = await supabase
      .from('episodes')
      .insert(ep)
      .select()
      .single();

    if (error) {
      console.log('  ❌ ' + ep.episode_number + '화 추가 실패:', error.message);
    } else {
      console.log('  ✅ ' + ep.episode_number + '화 추가됨 (ID: ' + data.id + ')');
    }
  }

  // 결과 확인
  console.log('\n📊 최종 에피소드 목록:');
  const { data: episodes } = await supabase
    .from('episodes')
    .select('id, episode_number, title, broadcast_date')
    .eq('season_id', 1)
    .order('episode_number');

  if (episodes) {
    episodes.forEach(function(e) {
      const date = e.broadcast_date ? e.broadcast_date.substring(0,10) : 'null';
      console.log('  EP' + e.episode_number.toString().padStart(2, '0') + ' | ' + date + ' | ' + e.title);
    });
    console.log('\n  총: ' + episodes.length + '개 에피소드');
  }
}

syncEpisodes().catch(console.error);
