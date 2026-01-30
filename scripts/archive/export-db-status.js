const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '/Users/bagjaeseog/rg-family/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function exportAll() {
  console.log('📊 Supabase DB 현황 분석 및 CSV 내보내기\n');
  console.log('='.repeat(60));

  const tables = [
    'profiles', 'seasons', 'episodes', 'donations', 'organization',
    'schedules', 'total_donation_rankings', 'rank_battle_records',
    'vip_rewards', 'vip_images', 'banners', 'notices', 'posts',
    'comments', 'signatures', 'signature_videos', 'media_content',
    'timeline_events', 'live_status', 'bj_episode_performances'
  ];

  console.log('\n📋 테이블별 레코드 수:');
  console.log('-'.repeat(40));

  const summary = [];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        summary.push({ table, count: count || 0 });
        console.log('  ' + table.padEnd(30) + ' ' + (count || 0) + '개');
      }
    } catch (e) {}
  }

  // Summary CSV
  let csv = 'table_name,record_count\n';
  summary.forEach(function(s) { csv += s.table + ',' + s.count + '\n'; });
  fs.writeFileSync('/tmp/db_summary.csv', csv);
  console.log('\n✅ /tmp/db_summary.csv 저장됨');

  // Seasons
  const { data: seasons } = await supabase.from('seasons').select('*').order('id');
  if (seasons && seasons.length) {
    csv = 'id,name,start_date,end_date,is_active,created_at\n';
    seasons.forEach(function(s) { csv += s.id + ',"' + s.name + '",' + (s.start_date||'') + ',' + (s.end_date||'') + ',' + s.is_active + ',' + s.created_at + '\n'; });
    fs.writeFileSync('/tmp/db_seasons.csv', csv);
    console.log('✅ /tmp/db_seasons.csv 저장됨');
  }

  // Episodes
  const { data: episodes } = await supabase.from('episodes').select('*').order('id');
  if (episodes && episodes.length) {
    csv = 'id,season_id,episode_number,title,broadcast_date,is_rank_battle,is_finalized,description\n';
    episodes.forEach(function(e) {
      csv += e.id + ',' + e.season_id + ',' + e.episode_number + ',"' + (e.title||'') + '",' + (e.broadcast_date||'') + ',' + e.is_rank_battle + ',' + e.is_finalized + ',"' + ((e.description||'').replace(/"/g,'""')) + '"\n';
    });
    fs.writeFileSync('/tmp/db_episodes.csv', csv);
    console.log('✅ /tmp/db_episodes.csv 저장됨');
  }

  // Schedules
  const { data: schedules } = await supabase.from('schedules').select('*').order('start_datetime');
  if (schedules && schedules.length) {
    csv = 'id,title,start_datetime,end_datetime,event_type,unit,description\n';
    schedules.forEach(function(s) {
      csv += s.id + ',"' + ((s.title||'').replace(/"/g,'""')) + '",' + s.start_datetime + ',' + (s.end_datetime||'') + ',' + (s.event_type||'') + ',' + (s.unit||'') + ',"' + ((s.description||'').replace(/"/g,'""')) + '"\n';
    });
    fs.writeFileSync('/tmp/db_schedules.csv', csv);
    console.log('✅ /tmp/db_schedules.csv 저장됨');
  }

  // Organization
  const { data: org } = await supabase.from('organization').select('*').order('id');
  if (org && org.length) {
    csv = 'id,name,unit,role,parent_id,is_active,afreeca_id,profile_image_url\n';
    org.forEach(function(o) {
      csv += o.id + ',"' + o.name + '",' + (o.unit||'') + ',' + (o.role||'') + ',' + (o.parent_id||'') + ',' + o.is_active + ',"' + (o.afreeca_id||'') + '","' + (o.profile_image_url||'') + '"\n';
    });
    fs.writeFileSync('/tmp/db_organization.csv', csv);
    console.log('✅ /tmp/db_organization.csv 저장됨');
  }

  // Total Donation Rankings
  const { data: rankings } = await supabase.from('total_donation_rankings').select('*').order('rank');
  if (rankings && rankings.length) {
    csv = 'rank,donor_name,total_amount,is_permanent_vip,updated_at\n';
    rankings.forEach(function(r) {
      csv += r.rank + ',"' + r.donor_name + '",' + r.total_amount + ',' + r.is_permanent_vip + ',' + r.updated_at + '\n';
    });
    fs.writeFileSync('/tmp/db_total_donation_rankings.csv', csv);
    console.log('✅ /tmp/db_total_donation_rankings.csv 저장됨');
  }

  // BJ Episode Performances
  const { data: bjPerf } = await supabase.from('bj_episode_performances').select('*').order('episode_id');
  if (bjPerf && bjPerf.length) {
    csv = 'id,episode_id,bj_member_id,donation_hearts,donation_count,heart_score,contribution,final_rank,rank_result\n';
    bjPerf.forEach(function(b) {
      csv += b.id + ',' + b.episode_id + ',' + b.bj_member_id + ',' + b.donation_hearts + ',' + b.donation_count + ',' + b.heart_score + ',' + b.contribution + ',' + (b.final_rank||'') + ',"' + (b.rank_result||'') + '"\n';
    });
    fs.writeFileSync('/tmp/db_bj_episode_performances.csv', csv);
    console.log('✅ /tmp/db_bj_episode_performances.csv 저장됨');
  }

  // Live Status
  const { data: liveStatus } = await supabase.from('live_status').select('*');
  if (liveStatus && liveStatus.length) {
    csv = 'id,bj_id,is_live,viewer_count,title,last_checked\n';
    liveStatus.forEach(function(l) {
      csv += l.id + ',' + l.bj_id + ',' + l.is_live + ',' + (l.viewer_count||0) + ',"' + ((l.title||'').replace(/"/g,'""')) + '",' + (l.last_checked||'') + '\n';
    });
    fs.writeFileSync('/tmp/db_live_status.csv', csv);
    console.log('✅ /tmp/db_live_status.csv 저장됨');
  }

  // Profiles (최근 100개)
  const { data: profiles } = await supabase.from('profiles').select('id,nickname,role,created_at').order('created_at', { ascending: false }).limit(100);
  if (profiles && profiles.length) {
    csv = 'id,nickname,role,created_at\n';
    profiles.forEach(function(p) {
      csv += p.id + ',"' + (p.nickname||'') + '",' + (p.role||'') + ',' + p.created_at + '\n';
    });
    fs.writeFileSync('/tmp/db_profiles_recent100.csv', csv);
    console.log('✅ /tmp/db_profiles_recent100.csv 저장됨');
  }

  console.log('\n' + '='.repeat(60));
  console.log('📁 모든 CSV 파일: /tmp/db_*.csv');
}

exportAll().catch(console.error);
