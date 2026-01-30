const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  // vip_rewards 테이블 확인
  const { data: rewards, error } = await supabase
    .from('vip_rewards')
    .select(`
      id,
      profile_id,
      rank,
      personal_message,
      profiles:profile_id (nickname)
    `)
    .order('rank', { ascending: true })
    .limit(10);

  console.log('=== VIP Rewards 테이블 ===');
  if (error) {
    console.error('Error:', error.message);
  } else if (rewards && rewards.length > 0) {
    rewards.forEach((r, i) => {
      const profile = r.profiles;
      const nickname = Array.isArray(profile) ? profile[0]?.nickname : profile?.nickname;
      console.log(`${r.rank}. ${nickname || 'Unknown'} (ID: ${r.profile_id?.substring(0, 8)}...)`);
    });
  } else {
    console.log('vip_rewards 테이블이 비어있습니다.');
  }

  // profiles 테이블 확인
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, nickname, total_donation')
    .order('total_donation', { ascending: false })
    .limit(10);

  console.log('\n=== Profiles 테이블 Top 10 ===');
  if (profErr) {
    console.error('Error:', profErr.message);
  } else {
    profiles.forEach((p, i) => console.log(`${i+1}. ${p.nickname} (ID: ${p.id.substring(0, 8)}...)`));
  }
}

check();
