/**
 * 랭킹 데이터 불일치 근본 원인 분석 스크립트
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function analyze() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 랭킹 데이터 불일치 근본 원인 분석')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 1. donations 테이블 에피소드별 집계
  console.log('📊 1. donations 테이블 에피소드별 집계')
  console.log('─────────────────────────────────────────────')

  const { data: donations } = await supabase
    .from('donations')
    .select('episode_id, amount, donor_name')
    .eq('season_id', 1)

  const epTotals: Record<number, { count: number; total: number }> = {}
  const donorTotals: Record<string, number> = {}

  for (const d of donations || []) {
    if (!epTotals[d.episode_id]) {
      epTotals[d.episode_id] = { count: 0, total: 0 }
    }
    epTotals[d.episode_id].count++
    epTotals[d.episode_id].total += d.amount
    donorTotals[d.donor_name] = (donorTotals[d.donor_name] || 0) + d.amount
  }

  const episodes = await supabase
    .from('episodes')
    .select('id, episode_number')
    .eq('season_id', 1)
    .order('episode_number')

  let totalDonations = 0
  let totalAmount = 0

  for (const ep of episodes?.data || []) {
    const stats = epTotals[ep.id] || { count: 0, total: 0 }
    const status = stats.count > 0 ? '✅' : '❌'
    console.log(`${status} ${ep.episode_number}화 (id:${ep.id}): ${stats.count}건, ${stats.total.toLocaleString()} 하트`)
    totalDonations += stats.count
    totalAmount += stats.total
  }
  console.log(`\n총계: ${totalDonations}건, ${totalAmount.toLocaleString()} 하트`)

  // 2. season_donation_rankings 테이블 데이터
  console.log('\n📊 2. season_donation_rankings 테이블 (저장된 시즌 랭킹)')
  console.log('─────────────────────────────────────────────')

  const { data: seasonRankings } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name, total_amount, updated_at')
    .eq('season_id', 1)
    .order('rank')
    .limit(10)

  let seasonRankingTotal = 0
  const { data: allSeasonRankings } = await supabase
    .from('season_donation_rankings')
    .select('total_amount')
    .eq('season_id', 1)

  for (const r of allSeasonRankings || []) {
    seasonRankingTotal += r.total_amount
  }

  for (const r of seasonRankings || []) {
    console.log(`${r.rank}위: ${r.donor_name} - ${r.total_amount.toLocaleString()} 하트`)
  }
  console.log(`\n총합 (모든 랭커): ${seasonRankingTotal.toLocaleString()} 하트`)
  console.log(`마지막 업데이트: ${seasonRankings?.[0]?.updated_at || 'N/A'}`)

  // 3. 불일치 분석
  console.log('\n📊 3. 데이터 불일치 분석')
  console.log('─────────────────────────────────────────────')

  const sortedDonors = Object.entries(donorTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  console.log('\n닉네임별 비교 (Top 10):')
  console.log('| 순위 | 닉네임 | donations 합계 | 시즌랭킹 저장값 | 차이 |')
  console.log('|------|--------|----------------|-----------------|------|')

  for (let i = 0; i < sortedDonors.length; i++) {
    const [name, donationSum] = sortedDonors[i]
    const ranking = (seasonRankings || []).find(r => r.donor_name === name)
    const rankingAmount = ranking?.total_amount || 0
    const diff = rankingAmount - donationSum
    const diffStr = diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()
    console.log(`| ${i+1} | ${name.substring(0, 15).padEnd(15)} | ${donationSum.toLocaleString().padStart(14)} | ${rankingAmount.toLocaleString().padStart(15)} | ${diffStr.padStart(8)} |`)
  }

  // 4. 근본 원인 분석
  console.log('\n📊 4. 근본 원인 분석')
  console.log('─────────────────────────────────────────────')

  const top1Donation = sortedDonors[0]
  const top1Ranking = seasonRankings?.[0]

  if (top1Donation && top1Ranking) {
    const diff = top1Ranking.total_amount - top1Donation[1]

    console.log(`\n1위 ${top1Donation[0]} 분석:`)
    console.log(`- donations 테이블 합계: ${top1Donation[1].toLocaleString()} 하트`)
    console.log(`- season_donation_rankings: ${top1Ranking.total_amount.toLocaleString()} 하트`)
    console.log(`- 차이: ${diff.toLocaleString()} 하트`)

    if (diff > 0) {
      console.log(`\n⚠️  시즌 랭킹에 ${diff.toLocaleString()} 하트가 더 많음!`)
      console.log('   → 이 데이터는 donations 테이블에 없는 외부 CSV 데이터임')
      console.log('   → season_donation_rankings은 외부 CSV에서 직접 입력된 것으로 추정')
    }
  }

  // 5. 결론 및 해결 방안
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎯 결론')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`
현재 아키텍처 문제:

1. 데이터 이중화
   - donations 테이블: 에피소드별 상세 기록 (CSV import)
   - season_donation_rankings: 외부 누적 CSV에서 직접 입력 (update-season-rankings.ts)

2. 불일치 원인
   - season_donation_rankings는 1/25에 외부 CSV 파일에서 직접 입력됨
   - 해당 외부 CSV에는 1~4화까지의 누적 데이터가 모두 포함
   - 하지만 donations 테이블에는 1~2화만 있었고, 3~4화는 오늘 import됨
   - 외부 CSV의 원본 데이터와 donations 테이블 데이터가 다른 소스

3. 해결 방안
   A) 단일 소스 원칙 (권장)
      - donations 테이블을 유일한 데이터 소스로 사용
      - refresh_season_rankings(1) RPC 호출로 랭킹 재계산
      - 단, 이 경우 외부 CSV에만 있던 데이터는 유실됨

   B) 외부 CSV 기준 유지
      - 모든 에피소드의 누적 CSV를 확보
      - update-season-rankings.ts 스크립트로 직접 입력
      - donations 테이블은 참고용으로만 사용
`)
}

analyze().catch(console.error)
