/**
 * 이전 테스트 데이터 정리
 * 시즌 4, 시즌 10 데이터 삭제 (시즌 1만 유지)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanup() {
  console.log('🧹 이전 테스트 데이터 정리 시작...\n');

  // 시즌 4 삭제
  const { error: err4 } = await supabase
    .from('donations')
    .delete()
    .eq('season_id', 4);

  if (err4) {
    console.error('시즌 4 삭제 실패:', err4);
  } else {
    console.log('✅ 시즌 4 데이터 삭제 완료');
  }

  // 시즌 10 삭제
  const { error: err10 } = await supabase
    .from('donations')
    .delete()
    .eq('season_id', 10);

  if (err10) {
    console.error('시즌 10 삭제 실패:', err10);
  } else {
    console.log('✅ 시즌 10 데이터 삭제 완료');
  }

  // 결과 확인
  const { data, count } = await supabase
    .from('donations')
    .select('donor_name, amount, season_id', { count: 'exact' })
    .order('amount', { ascending: false })
    .limit(5);

  console.log('\n📊 정리 후 Top 5:');
  data.forEach((d, i) => console.log(`  ${i+1}. ${d.donor_name}: ${d.amount} (시즌 ${d.season_id})`));
  console.log(`\n총 ${count}건의 후원 데이터 남음`);
}

cleanup();
