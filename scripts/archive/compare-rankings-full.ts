/**
 * donations 테이블과 season_donation_rankings 완전 비교
 */

import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv'

const supabase = getServiceClient()

async function fetchAllDonations(seasonId: number) {
  const allData: { donor_name: string; amount: number; episode_id: number }[] = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data } = await supabase
      .from('donations')
      .select('donor_name, amount, episode_id')
      .eq('season_id', seasonId)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (!data || data.length === 0) break
    allData.push(...data)
    if (data.length < pageSize) break
    page++
  }

  return allData
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 donations vs season_donation_rankings 완전 비교')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 1. donations 테이블에서 전체 데이터 가져오기
  const donations = await fetchAllDonations(1)
  console.log(`donations 테이블: ${donations.length}건`)

  // 2. 닉네임별 합계 계산
  const donorTotals: Record<string, { total: number; count: number; episodes: Set<number> }> = {}

  for (const d of donations) {
    if (!donorTotals[d.donor_name]) {
      donorTotals[d.donor_name] = { total: 0, count: 0, episodes: new Set() }
    }
    donorTotals[d.donor_name].total += d.amount
    donorTotals[d.donor_name].count++
    donorTotals[d.donor_name].episodes.add(d.episode_id)
  }

  // 3. 랭킹 정렬
  const donationRanking = Object.entries(donorTotals)
    .map(([name, data]) => ({
      donor_name: name,
      total_amount: data.total,
      donation_count: data.count,
      episodes: Array.from(data.episodes).sort((a, b) => a - b)
    }))
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, 50)
    .map((d, i) => ({ ...d, rank: i + 1 }))

  // 4. season_donation_rankings 가져오기
  const { data: storedRankings } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name, total_amount, donation_count')
    .eq('season_id', 1)
    .order('rank')
    .limit(50)

  // 5. 비교 출력
  console.log('\n📈 Top 20 비교:')
  console.log('┌──────┬─────────────────────────┬──────────────────┬──────────────────┬──────────────┐')
  console.log('│ 순위 │ 닉네임                  │ donations 합계   │ 저장된 랭킹      │ 차이         │')
  console.log('├──────┼─────────────────────────┼──────────────────┼──────────────────┼──────────────┤')

  const storedMap = new Map(storedRankings?.map(r => [r.donor_name, r]) || [])
  let totalDonationsSum = 0
  let totalStoredSum = 0

  for (let i = 0; i < 20; i++) {
    const d = donationRanking[i]
    const stored = storedMap.get(d.donor_name)
    const storedAmount = stored?.total_amount || 0
    const diff = storedAmount - d.total_amount
    const diffStr = diff > 0 ? `+${diff.toLocaleString()}` : diff < 0 ? diff.toLocaleString() : '0'

    totalDonationsSum += d.total_amount
    totalStoredSum += storedAmount

    console.log(
      `│ ${String(d.rank).padStart(4)} │ ${d.donor_name.substring(0, 20).padEnd(23)} │ ${d.total_amount.toLocaleString().padStart(16)} │ ${storedAmount.toLocaleString().padStart(16)} │ ${diffStr.padStart(12)} │`
    )
  }

  console.log('└──────┴─────────────────────────┴──────────────────┴──────────────────┴──────────────┘')

  // 6. 총합 비교
  const donationsTotal = donationRanking.reduce((sum, d) => sum + d.total_amount, 0)
  const storedTotal = (storedRankings || []).reduce((sum, r) => sum + r.total_amount, 0)

  console.log('\n📊 총합 비교:')
  console.log(`- donations 기준 Top 50 총합: ${donationsTotal.toLocaleString()} 하트`)
  console.log(`- 저장된 랭킹 총합: ${storedTotal.toLocaleString()} 하트`)
  console.log(`- 차이: ${(storedTotal - donationsTotal).toLocaleString()} 하트`)

  // 7. 결론
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎯 결론')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (donationsTotal > storedTotal) {
    console.log('\n✅ donations 테이블에 더 많은 데이터가 있습니다!')
    console.log('   → 시즌 랭킹을 donations 기반으로 갱신하면 정확한 데이터 반영')
    console.log('\n실행 방법:')
    console.log('   SELECT refresh_season_rankings(1);')
  } else if (storedTotal > donationsTotal) {
    console.log('\n⚠️  저장된 랭킹에 더 많은 데이터가 있습니다!')
    console.log('   → donations 테이블에 누락된 에피소드 데이터가 있을 수 있음')
    console.log('   → 또는 외부 CSV 소스와 donations 테이블 소스가 다름')
  } else {
    console.log('\n✅ 데이터가 일치합니다!')
  }

  // 8. donations 기준 Top 10 출력
  console.log('\n📋 donations 테이블 기준 실제 Top 10:')
  for (let i = 0; i < 10; i++) {
    const d = donationRanking[i]
    console.log(`${d.rank}위: ${d.donor_name} - ${d.total_amount.toLocaleString()} 하트 (${d.donation_count}건, 에피소드: ${d.episodes.join(',')})`)
  }
}

main().catch(console.error)
