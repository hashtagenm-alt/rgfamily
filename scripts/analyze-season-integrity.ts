;
;
import { getServiceClient } from './lib/supabase'
import * as path from 'path';

 });

const supabase = getServiceClient();

async function analyze() {
  console.log('=== 시즌 랭킹 데이터 정합성 분석 ===\n');

  // 1. season_donation_rankings 조회
  const { data: seasonRankings } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name, total_amount, season_id')
    .order('rank')
    .limit(50);

  console.log('season_donation_rankings Top 10:');
  seasonRankings?.slice(0, 10).forEach(r => {
    console.log(`  ${r.rank}위: ${r.donor_name} - ${r.total_amount.toLocaleString()}`);
  });
  console.log(`  ... 총 ${seasonRankings?.length}개 레코드\n`);

  // 2. donations 테이블에서 집계
  console.log('donations 테이블 집계 중...');

  // 페이지네이션으로 전체 donations 조회
  let allDonations: { donor_name: string; amount: number }[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('donations')
      .select('donor_name, amount')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error || !data || data.length === 0) break;
    allDonations = allDonations.concat(data);
    page++;
  }

  console.log(`총 donations: ${allDonations.length}건\n`);

  // 후원자별 집계
  const donorTotals: Record<string, number> = {};
  allDonations.forEach(d => {
    const name = d.donor_name.trim();
    donorTotals[name] = (donorTotals[name] || 0) + d.amount;
  });

  // 정렬
  const sortedDonors = Object.entries(donorTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);

  console.log('donations 집계 Top 10:');
  sortedDonors.slice(0, 10).forEach(([name, amount], idx) => {
    console.log(`  ${idx + 1}위: ${name} - ${amount.toLocaleString()}`);
  });

  // 3. 비교 분석
  console.log('\n=== 정합성 비교 ===\n');

  interface Mismatch {
    rank: number;
    name: string;
    seasonAmount: number;
    donationAmount: number;
    diff: number;
  }

  const mismatches: Mismatch[] = [];
  let matches = 0;

  seasonRankings?.forEach(sr => {
    const donationAmount = donorTotals[sr.donor_name.trim()] || 0;
    const diff = sr.total_amount - donationAmount;

    if (Math.abs(diff) > 0) {
      mismatches.push({
        rank: sr.rank,
        name: sr.donor_name,
        seasonAmount: sr.total_amount,
        donationAmount: donationAmount,
        diff: diff
      });
    } else {
      matches++;
    }
  });

  console.log(`일치: ${matches}건`);
  console.log(`불일치: ${mismatches.length}건\n`);

  if (mismatches.length > 0) {
    console.log('불일치 상세 (상위 20건):');
    mismatches.slice(0, 20).forEach(m => {
      const sign = m.diff > 0 ? '+' : '';
      console.log(`  ${m.rank}위 ${m.name}`);
      console.log(`    시즌랭킹: ${m.seasonAmount.toLocaleString()}, donations: ${m.donationAmount.toLocaleString()} (차이: ${sign}${m.diff.toLocaleString()})`);
    });

    // 차이 통계
    const totalDiff = mismatches.reduce((sum, m) => sum + Math.abs(m.diff), 0);
    console.log(`\n총 차이 합계: ${totalDiff.toLocaleString()} 하트`);
  }

  // 4. donations에는 있지만 season_rankings에 없는 경우
  console.log('\n=== donations Top 50 vs season_rankings 비교 ===\n');

  const seasonNames = new Set(seasonRankings?.map(r => r.donor_name.trim()));
  const missingInSeason = sortedDonors.filter(([name]) => !seasonNames.has(name));

  if (missingInSeason.length > 0) {
    console.log('donations Top 50 중 season_rankings에 없는 후원자:');
    missingInSeason.slice(0, 10).forEach(([name, amount], idx) => {
      console.log(`  ${name}: ${amount.toLocaleString()} 하트`);
    });
  }
}

analyze().catch(console.error);
