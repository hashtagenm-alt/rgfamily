/**
 * VIP 테이블 RLS 정책 수정
 * 비로그인 사용자도 VIP 라운지 및 프로필 페이지 접근 가능하도록
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixRLS() {
  console.log('🔧 VIP RLS 정책 수정 확인 중...\n');

  // 테스트: 익명 키로 vip_rewards 접근
  const anonSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data, error } = await anonSupabase
    .from('vip_rewards')
    .select('profile_id, profiles:profile_id(nickname)')
    .limit(1);

  if (error) {
    console.log('\n❌ 익명 접근 여전히 불가:', error.message);
    console.log('\n⚠️  Supabase Dashboard에서 아래 SQL을 실행하세요:\n');
    console.log(`
-- VIP 관련 테이블 공개 읽기 허용
DROP POLICY IF EXISTS "VIP rewards visible to authenticated users" ON vip_rewards;
DROP POLICY IF EXISTS "VIP rewards public read" ON vip_rewards;
CREATE POLICY "VIP rewards public read" ON vip_rewards FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "VIP images visible to authenticated users" ON vip_images;
DROP POLICY IF EXISTS "VIP images public read" ON vip_images;
CREATE POLICY "VIP images public read" ON vip_images FOR SELECT TO anon, authenticated USING (true);

-- profiles, seasons 공개 읽기 (기존 정책 유지하면서 추가)
DROP POLICY IF EXISTS "Profiles public read" ON profiles;
CREATE POLICY "Profiles public read" ON profiles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Seasons public read" ON seasons;
CREATE POLICY "Seasons public read" ON seasons FOR SELECT TO anon, authenticated USING (true);
    `);
  } else {
    console.log('\n✅ 익명 접근 가능! VIP 라운지 정상 작동');
    console.log('  테스트 데이터:', data);
  }
}

fixRLS();
