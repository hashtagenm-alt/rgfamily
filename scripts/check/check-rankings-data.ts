/**
 * 랭킹 데이터 비교 스크립트
 */
import { getServiceClient } from '../lib/supabase'

const supabase = getServiceClient()

async function main() {
  // 1. total_donation_rankings에서 상위 10명 확인
  console.log('=== total_donation_rankings (기존 레거시 데이터) ===\n')
  const { data: totalRankings, error: e1 } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, total_amount')
    .order('rank')
    .limit(10)

  if (e1) {
    console.error('Error:', e1.message)
  } else if (totalRankings && totalRankings.length > 0) {
    for (const r of totalRankings) {
      console.log(`${r.rank}. ${r.donor_name}: ${r.total_amount.toLocaleString()}`)
    }
  } else {
    console.log('데이터 없음')
  }

  // 2. donations에서 시즌1 상위 10명 확인
  console.log('\n=== donations 시즌1+ 집계 (상위 10명) ===\n')
  const { data: seasonDonations, error: e2 } = await supabase
    .from('donations')
    .select('donor_name, amount')
    .gt('season_id', 0)

  if (e2) {
    console.error('Error:', e2.message)
  } else if (seasonDonations) {
    const aggregated = new Map<string, number>()
    for (const d of seasonDonations) {
      aggregated.set(d.donor_name, (aggregated.get(d.donor_name) || 0) + d.amount)
    }
    const sorted = [...aggregated.entries()].sort((a,b) => b[1] - a[1]).slice(0,10)
    let rank = 1
    for (const [name, amount] of sorted) {
      console.log(`${rank}. ${name}: ${amount.toLocaleString()}`)
      rank++
    }
  }

  // 3. 현재 v_total_rankings 뷰 결과 확인
  console.log('\n=== v_total_rankings (현재 뷰 결과) ===\n')
  const { data: viewData, error: e3 } = await supabase
    .from('v_total_rankings')
    .select('*')
    .limit(10)

  if (e3) {
    console.error('Error:', e3.message)
  } else if (viewData && viewData.length > 0) {
    for (const r of viewData) {
      console.log(`${r.rank}. ${r.donor_name}: ${r.total_amount.toLocaleString()}`)
    }
  } else {
    console.log('데이터 없음')
  }

  // 4. 데이터 통계
  console.log('\n=== 통계 ===\n')
  const { count: totalCount } = await supabase
    .from('total_donation_rankings')
    .select('*', { count: 'exact', head: true })

  const { count: donationsCount } = await supabase
    .from('donations')
    .select('*', { count: 'exact', head: true })
    .gt('season_id', 0)

  console.log(`total_donation_rankings 레코드 수: ${totalCount}`)
  console.log(`donations (시즌1+) 레코드 수: ${donationsCount}`)
}

main().catch(console.error)
