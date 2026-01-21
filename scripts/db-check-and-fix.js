/**
 * Supabase 데이터베이스 점검 및 정리
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('========================================');
  console.log('🔧 Supabase 데이터베이스 점검 및 수정');
  console.log('========================================\n');

  // 1. 테이블 데이터 현황
  console.log('1️⃣ 테이블 데이터 현황...');

  const tables = ['profiles', 'vip_rewards', 'vip_images', 'seasons', 'donations', 'posts', 'comments', 'members', 'episodes'];

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`   ${table}: ❌ 테이블 없음 또는 접근 불가`);
    } else {
      console.log(`   ${table}: ${count}개 레코드`);
    }
  }

  // 2. VIP Rewards 상세 확인
  console.log('\n2️⃣ VIP Rewards 현황...');
  const { data: vipRewards } = await supabase
    .from('vip_rewards')
    .select('id, rank, profile_id, season_id, profiles:profile_id(nickname)')
    .order('rank');

  if (vipRewards && vipRewards.length > 0) {
    vipRewards.forEach(v => {
      const nickname = v.profiles?.nickname || 'Unknown';
      console.log(`   ${v.rank}위: ${nickname} (season_id: ${v.season_id})`);
    });
  } else {
    console.log('   VIP Rewards 데이터 없음');
  }

  // 3. Seasons 확인
  console.log('\n3️⃣ Seasons 현황...');
  const { data: seasons } = await supabase
    .from('seasons')
    .select('*')
    .order('id');

  if (seasons) {
    seasons.forEach(s => {
      console.log(`   ID ${s.id}: ${s.name} (active: ${s.is_active})`);
    });

    // 활성 시즌이 여러 개인지 확인
    const activeSeasons = seasons.filter(s => s.is_active);
    if (activeSeasons.length > 1) {
      console.log(`\n   ⚠️  활성 시즌이 ${activeSeasons.length}개 - 정리 필요`);
    }
  }

  // 4. 시즌 정리 (시즌 1만 활성화, 나머지 비활성화)
  console.log('\n4️⃣ 시즌 데이터 정리...');

  // 시즌 1만 활성화
  const { error: updateErr1 } = await supabase
    .from('seasons')
    .update({ is_active: false })
    .neq('id', 1);

  const { error: updateErr2 } = await supabase
    .from('seasons')
    .update({ is_active: true })
    .eq('id', 1);

  if (!updateErr1 && !updateErr2) {
    console.log('   ✅ 시즌 1만 활성화 완료');
  } else {
    console.log('   ❌ 시즌 업데이트 실패:', updateErr1?.message || updateErr2?.message);
  }

  // 5. 불필요한 시즌 삭제 (ID 4, 10 - 테스트 데이터)
  console.log('\n5️⃣ 레거시/테스트 시즌 정리...');

  // 시즌 4, 10에 연결된 데이터가 있는지 확인
  const { count: s4Count } = await supabase
    .from('donations')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', 4);

  const { count: s10Count } = await supabase
    .from('donations')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', 10);

  console.log(`   시즌 4 연결 donations: ${s4Count || 0}개`);
  console.log(`   시즌 10 연결 donations: ${s10Count || 0}개`);

  // 연결된 데이터가 없으면 시즌 삭제
  if ((s4Count || 0) === 0) {
    const { error } = await supabase.from('seasons').delete().eq('id', 4);
    console.log(`   시즌 4 삭제: ${error ? '실패 - ' + error.message : '✅ 완료'}`);
  }

  if ((s10Count || 0) === 0) {
    const { error } = await supabase.from('seasons').delete().eq('id', 10);
    console.log(`   시즌 10 삭제: ${error ? '실패 - ' + error.message : '✅ 완료'}`);
  }

  // 6. Donations 데이터 확인
  console.log('\n6️⃣ Donations Top 5...');
  const { data: topDonors } = await supabase
    .from('donations')
    .select('donor_name, amount, season_id')
    .order('amount', { ascending: false })
    .limit(10);

  if (topDonors) {
    // 집계
    const totals = {};
    topDonors.forEach(d => {
      totals[d.donor_name] = (totals[d.donor_name] || 0) + d.amount;
    });

    const sorted = Object.entries(totals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    sorted.forEach(([name, amount], i) => {
      console.log(`   ${i+1}. ${name}: ${amount.toLocaleString()}하트`);
    });
  }

  // 7. 최종 상태 확인
  console.log('\n7️⃣ 최종 시즌 상태...');
  const { data: finalSeasons } = await supabase
    .from('seasons')
    .select('*')
    .order('id');

  if (finalSeasons) {
    finalSeasons.forEach(s => {
      const status = s.is_active ? '🟢 활성' : '⚪ 비활성';
      console.log(`   ${status} ID ${s.id}: ${s.name}`);
    });
  }

  console.log('\n========================================');
  console.log('✅ 데이터베이스 점검 및 정리 완료');
  console.log('========================================');
}

main().catch(console.error);
