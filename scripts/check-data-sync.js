const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAll() {
  console.log('📊 데이터 현황 비교 분석\n');

  // 1. schedules
  console.log('📆 SCHEDULES 테이블 (RG FAMILY 일정):');
  const { data: schedules } = await supabase
    .from('schedules')
    .select('id, title, start_datetime, event_type')
    .ilike('title', '%RG FAMILY%')
    .order('start_datetime');

  if (schedules) {
    schedules.forEach(function(s) {
      console.log('  ' + s.start_datetime.substring(0,10) + ' | ' + s.title);
    });
    console.log('  총: ' + schedules.length + '개\n');
  }

  // 2. episodes
  console.log('📺 EPISODES 테이블:');
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
    console.log('  총: ' + episodes.length + '개\n');
  }

  // 3. timeline_events
  console.log('📜 TIMELINE_EVENTS 테이블:');
  const { data: timeline } = await supabase
    .from('timeline_events')
    .select('id, title, event_date, event_type')
    .order('event_date');

  if (timeline) {
    timeline.forEach(function(t) {
      console.log('  ' + (t.event_date || 'null') + ' | ' + t.event_type + ' | ' + t.title);
    });
    console.log('  총: ' + timeline.length + '개\n');
  }

  // 4. 불일치 체크
  console.log('⚠️ 불일치 분석:');

  const epNumbers = new Set(episodes ? episodes.map(function(e) { return e.episode_number; }) : []);
  const scheduleEpNumbers = new Set();

  if (schedules) {
    schedules.forEach(function(s) {
      const match = s.title.match(/(\d+)화/);
      if (match) scheduleEpNumbers.add(parseInt(match[1]));
    });
  }

  console.log('  Episodes 테이블: [' + Array.from(epNumbers).sort((a,b)=>a-b).join(', ') + ']');
  console.log('  Schedules 테이블: [' + Array.from(scheduleEpNumbers).sort((a,b)=>a-b).join(', ') + ']');

  // 누락된 에피소드
  const missingInEpisodes = [];
  scheduleEpNumbers.forEach(function(n) {
    if (!epNumbers.has(n)) missingInEpisodes.push(n);
  });

  if (missingInEpisodes.length) {
    console.log('  ❌ Episodes 테이블에 누락된 에피소드: ' + missingInEpisodes.sort((a,b)=>a-b).join(', ') + '화');
  } else {
    console.log('  ✅ 모든 에피소드 존재');
  }

  return { schedules, episodes, missingInEpisodes, scheduleEpNumbers };
}

checkAll().catch(console.error);
