/**
 * VIP 테이블 RLS 정책 수정 - 익명 접근 허용
 * 서비스 롤 키를 사용하여 직접 SQL 실행
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyRLS() {
  console.log('========================================');
  console.log('VIP RLS 정책 수정 적용');
  console.log('========================================\n');

  // SQL 명령어들
  const sqlCommands = [
    // 1. vip_rewards 정책
    `DROP POLICY IF EXISTS "VIP rewards visible to authenticated users" ON public.vip_rewards`,
    `DROP POLICY IF EXISTS "VIP rewards public read" ON public.vip_rewards`,
    `CREATE POLICY "VIP rewards public read" ON public.vip_rewards FOR SELECT TO anon, authenticated USING (true)`,

    // 2. vip_images 정책
    `DROP POLICY IF EXISTS "VIP images visible to authenticated users" ON public.vip_images`,
    `DROP POLICY IF EXISTS "VIP images public read" ON public.vip_images`,
    `CREATE POLICY "VIP images public read" ON public.vip_images FOR SELECT TO anon, authenticated USING (true)`,

    // 3. seasons 정책
    `DROP POLICY IF EXISTS "Seasons public read" ON public.seasons`,
    `CREATE POLICY "Seasons public read" ON public.seasons FOR SELECT TO anon, authenticated USING (true)`,
  ];

  for (const sql of sqlCommands) {
    console.log('실행: ' + sql.substring(0, 60) + '...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      // rpc가 없을 수 있음 - 다른 방법 시도
      console.log('   RPC 실패 (정상일 수 있음): ' + (error.message || ''));
    } else {
      console.log('   성공');
    }
  }

  console.log('\n========================================');
  console.log('RLS 정책 수정 시도 완료');
  console.log('');
  console.log('직접 SQL 실행이 필요할 수 있습니다.');
  console.log('Supabase Dashboard > SQL Editor에서 아래 SQL 실행:');
  console.log('========================================\n');

  console.log(`
-- VIP 관련 테이블 공개 읽기 허용
DROP POLICY IF EXISTS "VIP rewards visible to authenticated users" ON public.vip_rewards;
DROP POLICY IF EXISTS "VIP rewards public read" ON public.vip_rewards;
CREATE POLICY "VIP rewards public read" ON public.vip_rewards FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "VIP images visible to authenticated users" ON public.vip_images;
DROP POLICY IF EXISTS "VIP images public read" ON public.vip_images;
CREATE POLICY "VIP images public read" ON public.vip_images FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Seasons public read" ON public.seasons;
CREATE POLICY "Seasons public read" ON public.seasons FOR SELECT TO anon, authenticated USING (true);
`);
}

applyRLS().catch(console.error);
