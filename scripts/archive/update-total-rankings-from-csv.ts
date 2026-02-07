/**
 * Update total_donation_rankings from CSV file
 * Source: 제목 없는 스프레드시트 - 시트1.csv (Total ranking data)
 */

;
;
import { getServiceClient } from './lib/supabase'
import * as path from 'path';

 });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = getServiceClient();

// Total ranking data from CSV (제목 없는 스프레드시트 - 시트1.csv)
const totalRankingData = [
  { rank: 1, donor_name: '르큐리', total_amount: 1798059 },
  { rank: 2, donor_name: '미키™', total_amount: 981100 },
  { rank: 3, donor_name: '채은❤️여신', total_amount: 716532 },
  { rank: 4, donor_name: '에이맨♣️', total_amount: 527637 },
  { rank: 5, donor_name: '손밍매니아', total_amount: 375454 },
  { rank: 6, donor_name: '한세아내꺼♡호랭이', total_amount: 332673 },
  { rank: 7, donor_name: '[RG]미드굿♣️가애', total_amount: 262421 },
  { rank: 8, donor_name: '[J]젖문가', total_amount: 241372 },
  { rank: 9, donor_name: '❥CaNnOt', total_amount: 236386 },
  { rank: 10, donor_name: '[RG]✨린아의발굴™✨', total_amount: 232529 },
  { rank: 11, donor_name: '사랑해씌발™', total_amount: 230701 },
  { rank: 12, donor_name: '쩔어서짜다', total_amount: 185465 },
  { rank: 13, donor_name: '바겐시우', total_amount: 150374 },
  { rank: 14, donor_name: '[RG]가애ෆ57774', total_amount: 145052 },
  { rank: 15, donor_name: '린아사단✨탱커', total_amount: 136662 },
  { rank: 16, donor_name: '까부는넌내꺼야119', total_amount: 130869 },
  { rank: 17, donor_name: 'qldh라유', total_amount: 99880 },
  { rank: 18, donor_name: '신세련❤️영원한니꺼✦쿨', total_amount: 97525 },
  { rank: 19, donor_name: '김스껄', total_amount: 95115 },
  { rank: 20, donor_name: '농심육개장라면', total_amount: 94197 },
  { rank: 21, donor_name: '가윤이꼬❤️가플단마음⭐', total_amount: 92775 },
  { rank: 22, donor_name: '까부는김회장', total_amount: 80777 },
  { rank: 23, donor_name: '칰힌사주면천사❥', total_amount: 80426 },
  { rank: 24, donor_name: 'FA교미', total_amount: 78164 },
  { rank: 25, donor_name: '박하은❤️린아❤️사탕', total_amount: 77849 },
  { rank: 26, donor_name: '청아❤️머리크기빵빵이', total_amount: 77726 },
  { rank: 27, donor_name: '푸바오✨', total_amount: 75582 },
  { rank: 28, donor_name: '한세아♡백작♡하얀만두피', total_amount: 73042 },
  { rank: 29, donor_name: '조패러갈꽈', total_amount: 70213 },
  { rank: 30, donor_name: '⭐건빵이미래쥐', total_amount: 68207 },
];

async function updateTotalRankings() {
  console.log('=== Total Donation Rankings Update ===\n');
  console.log(`Source: 제목 없는 스프레드시트 - 시트1.csv`);
  console.log(`Records to insert: ${totalRankingData.length}\n`);

  // First, clear existing data
  console.log('Clearing existing total_donation_rankings...');
  const { error: deleteError } = await supabase
    .from('total_donation_rankings')
    .delete()
    .gte('rank', 1);

  if (deleteError) {
    console.error('Failed to clear table:', deleteError);
    return;
  }

  // Insert new data
  console.log('Inserting new ranking data...\n');

  const recordsToInsert = totalRankingData.map(r => ({
    rank: r.rank,
    donor_name: r.donor_name.trim(),
    total_amount: r.total_amount,
    is_permanent_vip: false,
  }));

  const { data, error: insertError } = await supabase
    .from('total_donation_rankings')
    .insert(recordsToInsert)
    .select();

  if (insertError) {
    console.error('Failed to insert:', insertError);
    return;
  }

  console.log(`✅ Successfully inserted ${data.length} records\n`);

  // Verify the data
  console.log('=== Verification ===\n');
  const { data: verifyData } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, total_amount')
    .order('rank', { ascending: true });

  if (verifyData) {
    console.log('Top 10:');
    verifyData.slice(0, 10).forEach(r => {
      console.log(`  ${r.rank}. ${r.donor_name}: ${r.total_amount.toLocaleString()} 하트`);
    });
    console.log(`\nTotal records: ${verifyData.length}`);

    // Check 미키™
    const miki = verifyData.find(r => r.donor_name.includes('미키'));
    if (miki) {
      console.log(`\n✅ 미키™ verified: Rank ${miki.rank}, ${miki.total_amount.toLocaleString()} 하트`);
    }
  }
}

updateTotalRankings().catch(console.error);
