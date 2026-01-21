/**
 * 총 후원 랭킹 테이블 생성 및 데이터 삽입
 *
 * 실행: node scripts/create-total-rankings.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Top 50 총 후원 랭킹 데이터
const totalRankings = [
  { rank: 1, donor_name: '미키™', total_amount: 626663, is_permanent_vip: true },
  { rank: 2, donor_name: '손밍매니아', total_amount: 254663, is_permanent_vip: false },
  { rank: 3, donor_name: '❥CaNnOt', total_amount: 236386, is_permanent_vip: false },
  { rank: 4, donor_name: '쩔어서짜다', total_amount: 185465, is_permanent_vip: false },
  { rank: 5, donor_name: '미드굿♣️가애', total_amount: 146276, is_permanent_vip: true },
  { rank: 6, donor_name: '[RG]✨린아의발굴™', total_amount: 103309, is_permanent_vip: true },
  { rank: 7, donor_name: '농심육개장라면', total_amount: 84177, is_permanent_vip: true },
  { rank: 8, donor_name: '까부는넌내꺼야119', total_amount: 70847, is_permanent_vip: false },
  { rank: 9, donor_name: '☀칰힌사주면천사☀', total_amount: 58907, is_permanent_vip: false },
  { rank: 10, donor_name: '[RG]린아✨여행™', total_amount: 56157, is_permanent_vip: false },
  { rank: 11, donor_name: '한세아내꺼♡호랭이', total_amount: 50300, is_permanent_vip: false },
  { rank: 12, donor_name: '한세아♡백작♡하얀만두피', total_amount: 50023, is_permanent_vip: false },
  { rank: 13, donor_name: '시라☆구구단☆시우', total_amount: 48720, is_permanent_vip: false },
  { rank: 14, donor_name: '태린공주❤️줄여보자', total_amount: 46926, is_permanent_vip: false },
  { rank: 15, donor_name: '⭐건빵이미래쥐', total_amount: 42395, is_permanent_vip: false },
  { rank: 16, donor_name: '❤️지수ෆ해린❤️치토스㉦', total_amount: 36488, is_permanent_vip: false },
  { rank: 17, donor_name: '가윤이꼬❤️털이', total_amount: 35951, is_permanent_vip: false },
  { rank: 18, donor_name: '✨바위늪✨', total_amount: 28452, is_permanent_vip: false },
  { rank: 19, donor_name: '조패러갈꽈', total_amount: 27020, is_permanent_vip: false },
  { rank: 20, donor_name: 'qldh라유', total_amount: 25795, is_permanent_vip: false },
  { rank: 21, donor_name: '김스껄', total_amount: 25008, is_permanent_vip: false },
  { rank: 22, donor_name: '가윤이꼬❤️함주라', total_amount: 22822, is_permanent_vip: false },
  { rank: 23, donor_name: '언제나♬', total_amount: 20873, is_permanent_vip: false },
  { rank: 24, donor_name: '한은비ღ안줘ღ', total_amount: 20727, is_permanent_vip: false },
  { rank: 25, donor_name: '☾코코에르메스', total_amount: 20070, is_permanent_vip: false },
  { rank: 26, donor_name: '린아사단✨탱커', total_amount: 18492, is_permanent_vip: false },
  { rank: 27, donor_name: '[RG]린아네☀둥그레', total_amount: 18433, is_permanent_vip: false },
  { rank: 28, donor_name: '미쯔✨', total_amount: 18279, is_permanent_vip: false },
  { rank: 29, donor_name: '개호구⭐즈하⭐광대', total_amount: 18015, is_permanent_vip: false },
  { rank: 30, donor_name: '앵겨라잉', total_amount: 15588, is_permanent_vip: false },
  { rank: 31, donor_name: '태린공주❤️마비™', total_amount: 15240, is_permanent_vip: false },
  { rank: 32, donor_name: '[로진]버러지원엔터대표', total_amount: 15209, is_permanent_vip: false },
  { rank: 33, donor_name: '홍서하네❥페르소나™', total_amount: 14950, is_permanent_vip: false },
  { rank: 34, donor_name: '이태린ෆ', total_amount: 14205, is_permanent_vip: false },
  { rank: 35, donor_name: 'ෆ유은', total_amount: 13797, is_permanent_vip: false },
  { rank: 36, donor_name: '❤️재활중~방랑자❤️', total_amount: 13198, is_permanent_vip: false },
  { rank: 37, donor_name: '57774', total_amount: 12208, is_permanent_vip: false },
  { rank: 38, donor_name: '니니ღ', total_amount: 12095, is_permanent_vip: false },
  { rank: 39, donor_name: '말랑채이', total_amount: 12003, is_permanent_vip: false },
  { rank: 40, donor_name: '채은S2으악❤️', total_amount: 11866, is_permanent_vip: false },
  { rank: 41, donor_name: '아름다운집', total_amount: 11018, is_permanent_vip: false },
  { rank: 42, donor_name: '사랑해씌발™', total_amount: 10606, is_permanent_vip: false },
  { rank: 43, donor_name: '♬♪행복한베니와✨엔띠♬', total_amount: 10008, is_permanent_vip: false },
  { rank: 44, donor_name: '소율❤️', total_amount: 10001, is_permanent_vip: false },
  { rank: 45, donor_name: '[S]윤수아잉❤️', total_amount: 10000, is_permanent_vip: false },
  { rank: 46, donor_name: '리정팔', total_amount: 10000, is_permanent_vip: false },
  { rank: 47, donor_name: '한세령❤️', total_amount: 10000, is_permanent_vip: false },
  { rank: 48, donor_name: '홍서하네❥홍바스', total_amount: 9341, is_permanent_vip: false },
  { rank: 49, donor_name: '태린공주❤️깡총⁀증기선', total_amount: 9048, is_permanent_vip: false },
  { rank: 50, donor_name: '박하은❤️왕교대교', total_amount: 8866, is_permanent_vip: false },
];

async function main() {
  console.log('=== 총 후원 랭킹 테이블 생성 및 데이터 삽입 ===\n');

  // 1. 테이블 생성 (SQL 직접 실행)
  console.log('1. 테이블 생성 중...');
  const { error: createError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS public.total_donation_rankings (
        id SERIAL PRIMARY KEY,
        rank INTEGER NOT NULL UNIQUE,
        donor_name TEXT NOT NULL,
        total_amount INTEGER NOT NULL,
        is_permanent_vip BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_tdr_rank ON public.total_donation_rankings(rank);
    `
  });

  if (createError) {
    // RPC 없으면 직접 INSERT 시도 (테이블이 이미 있을 수 있음)
    console.log('   RPC 사용 불가, 직접 데이터 삽입 시도...');
  } else {
    console.log('   ✓ 테이블 생성 완료');
  }

  // 2. 기존 데이터 삭제
  console.log('\n2. 기존 데이터 정리 중...');
  const { error: deleteError } = await supabase
    .from('total_donation_rankings')
    .delete()
    .gte('rank', 1);

  if (deleteError && !deleteError.message.includes('does not exist')) {
    console.log('   삭제 오류 (무시 가능):', deleteError.message);
  } else {
    console.log('   ✓ 기존 데이터 정리 완료');
  }

  // 3. 새 데이터 삽입
  console.log('\n3. Top 50 데이터 삽입 중...');
  const { data, error: insertError } = await supabase
    .from('total_donation_rankings')
    .insert(totalRankings)
    .select();

  if (insertError) {
    console.error('   ✗ 삽입 오류:', insertError.message);
    console.log('\n   테이블이 없을 수 있습니다. Supabase 대시보드에서 다음 SQL을 먼저 실행해주세요:');
    console.log(`
      CREATE TABLE IF NOT EXISTS public.total_donation_rankings (
        id SERIAL PRIMARY KEY,
        rank INTEGER NOT NULL UNIQUE,
        donor_name TEXT NOT NULL,
        total_amount INTEGER NOT NULL,
        is_permanent_vip BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    process.exit(1);
  }

  console.log(`   ✓ ${data.length}개 레코드 삽입 완료`);

  // 4. 확인
  console.log('\n4. 데이터 확인...');
  const { data: checkData, error: checkError } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, is_permanent_vip')
    .order('rank')
    .limit(5);

  if (checkError) {
    console.error('   ✗ 확인 오류:', checkError.message);
  } else {
    console.log('   Top 5:');
    checkData.forEach(r => {
      const vip = r.is_permanent_vip ? ' [영구VIP]' : '';
      console.log(`   ${r.rank}. ${r.donor_name}${vip}`);
    });
  }

  console.log('\n=== 완료 ===');
}

main().catch(console.error);
