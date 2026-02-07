;
;
import { getServiceClient } from './lib/supabase'
import * as path from 'path';

 });

const supabase = getServiceClient();

async function check() {
  console.log('=== DB 후원 데이터 현황 ===\n');

  // Count donations
  const { count } = await supabase
    .from('donations')
    .select('*', { count: 'exact', head: true });
  console.log(`donations 레코드 수: ${count}`);

  // Sum donations with pagination
  let total = 0;
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('donations')
      .select('amount')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error || !data || data.length === 0) break;
    total += data.reduce((s, r) => s + r.amount, 0);
    page++;
  }
  console.log(`donations 총 하트: ${total.toLocaleString()}`);

  // Total rankings sum
  const { data: rankings } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, total_amount')
    .order('rank');

  if (rankings) {
    const rankSum = rankings.reduce((s, r) => s + r.total_amount, 0);
    console.log(`\ntotal_donation_rankings (${rankings.length}개):`);
    console.log(`  합계: ${rankSum.toLocaleString()} 하트`);

    console.log('\n  Top 5:');
    rankings.slice(0, 5).forEach(r => {
      console.log(`    ${r.rank}. ${r.donor_name}: ${r.total_amount.toLocaleString()}`);
    });
  }

  // Season rankings sum
  const { data: seasonRankings } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name, total_amount')
    .order('rank');

  if (seasonRankings) {
    const seasonSum = seasonRankings.reduce((s, r) => s + r.total_amount, 0);
    console.log(`\nseason_donation_rankings (${seasonRankings.length}개):`);
    console.log(`  합계: ${seasonSum.toLocaleString()} 하트`);
  }
}

check().catch(console.error);
