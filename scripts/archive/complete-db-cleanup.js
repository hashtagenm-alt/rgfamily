/**
 * 데이터베이스 정리 완료 스크립트
 * - timeline_events FK 업데이트
 * - 시즌 10 삭제
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('========================================');
  console.log('데이터베이스 정리 완료');
  console.log('========================================\n');

  // 1. 현재 시즌 상태 확인
  console.log('1. 현재 시즌 상태...');
  const { data: seasons } = await supabase
    .from('seasons')
    .select('*')
    .order('id');

  if (seasons) {
    seasons.forEach(s => {
      const status = s.is_active ? '🟢 활성' : '⚪ 비활성';
      console.log('   ' + status + ' ID ' + s.id + ': ' + s.name);
    });
  }

  // 2. timeline_events의 season_id 10 -> 1 업데이트
  console.log('\n2. timeline_events FK 업데이트...');

  const { data: events10 } = await supabase
    .from('timeline_events')
    .select('id, title, season_id')
    .eq('season_id', 10);

  if (events10 && events10.length > 0) {
    console.log('   시즌 10 연결 이벤트: ' + events10.length + '개');
    events10.forEach(e => {
      console.log('   - ' + e.title);
    });

    const { error: updateErr } = await supabase
      .from('timeline_events')
      .update({ season_id: 1 })
      .eq('season_id', 10);

    if (updateErr) {
      console.log('   timeline_events 업데이트 실패: ' + updateErr.message);
    } else {
      console.log('   timeline_events season_id 10 -> 1 업데이트 완료');
    }
  } else {
    console.log('   시즌 10 연결 이벤트 없음');
  }

  // 3. vip_rewards의 season_id 10 -> 1 업데이트
  console.log('\n3. vip_rewards FK 업데이트...');

  const { data: vipRewards10 } = await supabase
    .from('vip_rewards')
    .select('id, rank, season_id')
    .eq('season_id', 10);

  if (vipRewards10 && vipRewards10.length > 0) {
    console.log('   시즌 10 연결 VIP: ' + vipRewards10.length + '개');

    const { error: updateErr } = await supabase
      .from('vip_rewards')
      .update({ season_id: 1 })
      .eq('season_id', 10);

    if (updateErr) {
      console.log('   vip_rewards 업데이트 실패: ' + updateErr.message);
    } else {
      console.log('   vip_rewards season_id 10 -> 1 업데이트 완료');
    }
  } else {
    console.log('   시즌 10 연결 VIP 없음');
  }

  // 4. donations의 season_id 10 -> 1 업데이트
  console.log('\n4. donations FK 업데이트...');

  const { count: donations10Count } = await supabase
    .from('donations')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', 10);

  if (donations10Count && donations10Count > 0) {
    console.log('   시즌 10 연결 donations: ' + donations10Count + '개');

    const { error: updateErr } = await supabase
      .from('donations')
      .update({ season_id: 1 })
      .eq('season_id', 10);

    if (updateErr) {
      console.log('   donations 업데이트 실패: ' + updateErr.message);
    } else {
      console.log('   donations season_id 10 -> 1 업데이트 완료');
    }
  } else {
    console.log('   시즌 10 연결 donations 없음');
  }

  // 5. 시즌 10 삭제 시도
  console.log('\n5. 시즌 10 삭제 시도...');
  const { error: deleteErr } = await supabase
    .from('seasons')
    .delete()
    .eq('id', 10);

  if (deleteErr) {
    console.log('   시즌 10 삭제 실패: ' + deleteErr.message);
  } else {
    console.log('   시즌 10 삭제 완료');
  }

  // 6. 최종 시즌 상태 확인
  console.log('\n6. 최종 시즌 상태...');
  const { data: finalSeasons } = await supabase
    .from('seasons')
    .select('*')
    .order('id');

  if (finalSeasons) {
    finalSeasons.forEach(s => {
      const status = s.is_active ? '🟢 활성' : '⚪ 비활성';
      console.log('   ' + status + ' ID ' + s.id + ': ' + s.name);
    });
  }

  // 7. VIP Rewards 현황
  console.log('\n7. VIP Rewards 현황...');
  const { data: vipRewards } = await supabase
    .from('vip_rewards')
    .select('id, rank, profile_id, season_id, profiles:profile_id(nickname)')
    .order('rank');

  if (vipRewards && vipRewards.length > 0) {
    vipRewards.forEach(v => {
      const nickname = v.profiles?.nickname || 'Unknown';
      console.log('   ' + v.rank + '위: ' + nickname + ' (season_id: ' + v.season_id + ')');
    });
  } else {
    console.log('   VIP Rewards 데이터 없음');
  }

  console.log('\n========================================');
  console.log('데이터베이스 정리 완료');
  console.log('========================================');
}

main().catch(console.error);
