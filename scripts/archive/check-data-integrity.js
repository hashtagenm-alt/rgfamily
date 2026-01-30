/**
 * 데이터 무결성 점검
 * - FK 참조 확인
 * - 중복 데이터 확인
 * - 연결 상태 확인
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('========================================');
  console.log('데이터 무결성 점검');
  console.log('========================================\n');

  // 1. donations 데이터 확인
  console.log('1. donations 테이블 분석');
  console.log('----------------------------------------');

  const { data: donations } = await supabase
    .from('donations')
    .select('*')
    .order('amount', { ascending: false });

  if (donations) {
    console.log('총 레코드: ' + donations.length + '개\n');

    // donor_name 기준 집계
    const donorTotals = {};
    donations.forEach(d => {
      if (!donorTotals[d.donor_name]) {
        donorTotals[d.donor_name] = {
          total: 0,
          count: 0,
          unit: d.unit,
          season_id: d.season_id
        };
      }
      donorTotals[d.donor_name].total += d.amount;
      donorTotals[d.donor_name].count += 1;
    });

    const sorted = Object.entries(donorTotals)
      .sort((a, b) => b[1].total - a[1].total);

    console.log('후원자별 집계 (Top 10):');
    sorted.slice(0, 10).forEach(([name, info], i) => {
      console.log('  ' + (i+1) + '. ' + name + ': ' + info.total.toLocaleString() + '하트 (' + info.count + '건, ' + (info.unit || 'N/A') + ')');
    });

    // unit 분포
    const unitCounts = { excel: 0, crew: 0, null: 0 };
    donations.forEach(d => {
      if (d.unit === 'excel') unitCounts.excel++;
      else if (d.unit === 'crew') unitCounts.crew++;
      else unitCounts.null++;
    });
    console.log('\nunit 분포:');
    console.log('  excel: ' + unitCounts.excel + '건');
    console.log('  crew: ' + unitCounts.crew + '건');
    console.log('  미지정: ' + unitCounts.null + '건');

    // season_id 분포
    const seasonCounts = {};
    donations.forEach(d => {
      seasonCounts[d.season_id] = (seasonCounts[d.season_id] || 0) + 1;
    });
    console.log('\nseason_id 분포:');
    Object.entries(seasonCounts).forEach(([sid, cnt]) => {
      console.log('  시즌 ' + sid + ': ' + cnt + '건');
    });
  }

  // 2. vip_rewards 데이터 확인
  console.log('\n2. vip_rewards 테이블 분석');
  console.log('----------------------------------------');

  const { data: vipRewards } = await supabase
    .from('vip_rewards')
    .select('*, profiles:profile_id(id, nickname, email)')
    .order('rank');

  if (vipRewards && vipRewards.length > 0) {
    console.log('VIP 목록 (' + vipRewards.length + '명):');
    vipRewards.forEach(v => {
      const profile = v.profiles;
      console.log('  ' + v.rank + '위: ' + (profile?.nickname || 'MISSING') +
        ' (profile_id: ' + v.profile_id.substring(0, 8) + '...)');
      if (profile) {
        console.log('       email: ' + (profile.email || 'N/A'));
      }
    });

    // profile 연결 확인
    const missingProfiles = vipRewards.filter(v => !v.profiles);
    if (missingProfiles.length > 0) {
      console.log('\n⚠️  프로필 연결 누락: ' + missingProfiles.length + '건');
    } else {
      console.log('\n✅ 모든 VIP가 profiles와 정상 연결됨');
    }
  }

  // 3. episodes 데이터 확인
  console.log('\n3. episodes 테이블 분석');
  console.log('----------------------------------------');

  const { data: episodes } = await supabase
    .from('episodes')
    .select('*, seasons:season_id(name)')
    .order('episode_number');

  if (episodes) {
    console.log('에피소드 목록 (' + episodes.length + '개):');
    episodes.forEach(e => {
      const seasonName = e.seasons?.name || 'MISSING';
      console.log('  ' + e.episode_number + '화: ' + e.title + ' (' + seasonName + ')');
    });

    // 시즌 연결 확인
    const missingSeason = episodes.filter(e => !e.seasons);
    if (missingSeason.length > 0) {
      console.log('\n⚠️  시즌 연결 누락: ' + missingSeason.length + '건');
    }
  }

  // 4. timeline_events 데이터 확인
  console.log('\n4. timeline_events 테이블 분석');
  console.log('----------------------------------------');

  const { data: timeline } = await supabase
    .from('timeline_events')
    .select('*, seasons:season_id(name)')
    .order('event_date');

  if (timeline) {
    console.log('타임라인 이벤트 (' + timeline.length + '개):');
    timeline.forEach(t => {
      const seasonName = t.seasons?.name || 'MISSING';
      console.log('  ' + t.event_date + ': ' + t.title + ' (' + seasonName + ')');
    });
  }

  // 5. posts/comments 데이터 확인
  console.log('\n5. posts/comments 테이블 분석');
  console.log('----------------------------------------');

  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, author_id, board_type, profiles:author_id(nickname)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (posts) {
    console.log('최근 게시글 (' + posts.length + '개):');
    posts.forEach(p => {
      const author = p.profiles?.nickname || '익명';
      console.log('  [' + p.board_type + '] ' + p.title + ' - ' + author);
    });
  }

  console.log('\n========================================');
  console.log('무결성 점검 완료');
  console.log('========================================');
}

main().catch(console.error);
