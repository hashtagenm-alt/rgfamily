/**
 * VIP 데이터 연결 상태 확인
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anonSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  console.log('========================================');
  console.log('VIP 데이터 연결 상태 확인');
  console.log('========================================\n');

  // 1. vip_rewards 전체 데이터 (서비스 롤)
  console.log('1. vip_rewards 전체 데이터 (서비스 롤)...');
  const { data: vipRewardsAll, error: vipErr } = await supabase
    .from('vip_rewards')
    .select('*')
    .order('rank');

  if (vipErr) {
    console.log('   에러: ' + vipErr.message);
  } else {
    console.log('   총 ' + vipRewardsAll.length + '개');
    vipRewardsAll.forEach(v => {
      console.log('   rank ' + v.rank + ': profile_id=' + v.profile_id);
    });
  }

  // 2. profiles 테이블 확인
  console.log('\n2. profiles 테이블 확인...');
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, nickname')
    .order('created_at', { ascending: false })
    .limit(10);

  if (profErr) {
    console.log('   에러: ' + profErr.message);
  } else {
    console.log('   총 프로필: ' + profiles.length + '개');
    profiles.forEach(p => {
      console.log('   - ' + p.id + ': ' + p.nickname);
    });
  }

  // 3. 익명 접근으로 vip_rewards 조회
  console.log('\n3. 익명 접근 vip_rewards 조회...');
  const { data: anonVip, error: anonErr } = await anonSupabase
    .from('vip_rewards')
    .select('id, rank, profile_id')
    .order('rank');

  if (anonErr) {
    console.log('   에러: ' + anonErr.message);
  } else {
    console.log('   결과: ' + anonVip.length + '개');
    anonVip.forEach(v => {
      console.log('   rank ' + v.rank + ': profile_id=' + v.profile_id);
    });
  }

  // 4. 익명 접근으로 profiles 조회
  console.log('\n4. 익명 접근 profiles 조회...');
  const { data: anonProfiles, error: anonProfErr } = await anonSupabase
    .from('profiles')
    .select('id, nickname')
    .limit(5);

  if (anonProfErr) {
    console.log('   에러: ' + anonProfErr.message);
  } else {
    console.log('   결과: ' + anonProfiles.length + '개');
    anonProfiles.forEach(p => {
      console.log('   - ' + p.id + ': ' + p.nickname);
    });
  }

  // 5. 익명 접근으로 vip_rewards + profiles JOIN
  console.log('\n5. 익명 접근 vip_rewards + profiles JOIN...');
  const { data: joinData, error: joinErr } = await anonSupabase
    .from('vip_rewards')
    .select('id, rank, profile_id, profiles:profile_id(id, nickname)')
    .order('rank');

  if (joinErr) {
    console.log('   에러: ' + joinErr.message);
  } else {
    console.log('   결과: ' + joinData.length + '개');
    joinData.forEach(v => {
      const nickname = v.profiles?.nickname || '(프로필 없음)';
      console.log('   rank ' + v.rank + ': ' + nickname + ' (profile_id=' + v.profile_id + ')');
    });
  }

  console.log('\n========================================');
}

main().catch(console.error);
