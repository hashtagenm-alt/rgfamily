/**
 * Profiles 테이블 total_donation 동기화
 * donations 테이블 기준으로 업데이트
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncProfiles() {
  console.log('🔄 Profiles 테이블 동기화 시작...\n');

  // 현재 profiles 확인
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, total_donation')
    .order('total_donation', { ascending: false })
    .limit(5);

  console.log('현재 Profiles Top 5:');
  profiles?.forEach((p, i) => console.log(`  ${i+1}. ${p.nickname}: ${p.total_donation}`));

  // donations 집계
  const { data: donations } = await supabase
    .from('donations')
    .select('donor_name, amount');

  const totals = {};
  donations?.forEach(d => {
    if (!totals[d.donor_name]) totals[d.donor_name] = 0;
    totals[d.donor_name] += d.amount;
  });

  // 모든 profiles의 total_donation을 0으로 리셋
  const { error: resetErr } = await supabase
    .from('profiles')
    .update({ total_donation: 0 })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 레코드

  if (resetErr) {
    console.log('\n프로필 리셋 에러:', resetErr.message);
  }

  // nickname 기준으로 업데이트
  let updated = 0;
  for (const [nickname, amount] of Object.entries(totals)) {
    const { error } = await supabase
      .from('profiles')
      .update({ total_donation: amount })
      .eq('nickname', nickname);

    if (!error) updated++;
  }

  console.log(`\n✅ ${updated}개 프로필 업데이트 완료`);

  // 결과 확인
  const { data: result } = await supabase
    .from('profiles')
    .select('nickname, total_donation')
    .order('total_donation', { ascending: false })
    .limit(5);

  console.log('\n📊 업데이트 후 Profiles Top 5:');
  result?.forEach((p, i) => console.log(`  ${i+1}. ${p.nickname}: ${p.total_donation}`));
}

syncProfiles();
