/**
 * 랭킹 통계 백필 스크립트
 *
 * donations 테이블에서 donor별로 집계하여
 * total_donation_rankings / season_donation_rankings에
 * donation_count, top_bj 컬럼을 업데이트합니다.
 *
 * 사용법:
 *   npx tsx scripts/backfill-ranking-stats.ts [--dry-run]
 */

import { getServiceClient } from './lib/supabase'

const supabase = getServiceClient()
const isDryRun = process.argv.includes('--dry-run')

async function backfillTotalRankings() {
  console.log('\n=== 종합 랭킹 백필 시작 ===')

  const { data: rankings, error } = await supabase
    .from('total_donation_rankings')
    .select('id, rank, donor_name')
    .order('rank', { ascending: true })

  if (error) {
    console.error('종합 랭킹 조회 실패:', error)
    return
  }

  console.log(`종합 랭킹 ${rankings.length}건 처리`)

  for (const ranking of rankings) {
    const donorName = ranking.donor_name.trim()

    // donation_count: 해당 donor의 전체 후원 건수
    const { count } = await supabase
      .from('donations')
      .select('*', { count: 'exact', head: true })
      .eq('donor_name', donorName)

    // top_bj: 가장 많이 후원한 BJ
    const { data: topBjData } = await supabase
      .rpc('get_top_bj_for_donor', { p_donor_name: donorName })

    // RPC가 없을 수 있으므로 fallback: raw query
    let topBj: string | null = null
    if (topBjData && topBjData.length > 0) {
      topBj = topBjData[0].target_bj
    } else {
      // fallback: donations에서 직접 집계
      const { data: bjAgg } = await supabase
        .from('donations')
        .select('target_bj')
        .eq('donor_name', donorName)
        .not('target_bj', 'is', null)

      if (bjAgg && bjAgg.length > 0) {
        const bjCounts: Record<string, number> = {}
        for (const d of bjAgg) {
          if (d.target_bj) {
            bjCounts[d.target_bj] = (bjCounts[d.target_bj] || 0) + 1
          }
        }
        const sorted = Object.entries(bjCounts).sort((a, b) => b[1] - a[1])
        if (sorted.length > 0) {
          topBj = sorted[0][0]
        }
      }
    }

    const donationCount = count || 0

    if (isDryRun) {
      console.log(`  [DRY] ${ranking.rank}위 ${donorName}: count=${donationCount}, top_bj=${topBj}`)
    } else {
      const { error: updateError } = await supabase
        .from('total_donation_rankings')
        .update({ donation_count: donationCount, top_bj: topBj })
        .eq('id', ranking.id)

      if (updateError) {
        console.error(`  ERROR ${ranking.rank}위 ${donorName}:`, updateError)
      } else {
        console.log(`  ${ranking.rank}위 ${donorName}: count=${donationCount}, top_bj=${topBj || '-'}`)
      }
    }
  }
}

async function backfillSeasonRankings() {
  console.log('\n=== 시즌 랭킹 백필 시작 ===')

  const { data: rankings, error } = await supabase
    .from('season_donation_rankings')
    .select('id, season_id, rank, donor_name')
    .order('season_id', { ascending: true })
    .order('rank', { ascending: true })

  if (error) {
    console.error('시즌 랭킹 조회 실패:', error)
    return
  }

  console.log(`시즌 랭킹 ${rankings.length}건 처리`)

  for (const ranking of rankings) {
    const donorName = ranking.donor_name.trim()

    // top_bj: 해당 시즌에서 가장 많이 후원한 BJ
    const { data: bjAgg } = await supabase
      .from('donations')
      .select('target_bj')
      .eq('donor_name', donorName)
      .eq('season_id', ranking.season_id)
      .not('target_bj', 'is', null)

    let topBj: string | null = null
    if (bjAgg && bjAgg.length > 0) {
      const bjCounts: Record<string, number> = {}
      for (const d of bjAgg) {
        if (d.target_bj) {
          bjCounts[d.target_bj] = (bjCounts[d.target_bj] || 0) + 1
        }
      }
      const sorted = Object.entries(bjCounts).sort((a, b) => b[1] - a[1])
      if (sorted.length > 0) {
        topBj = sorted[0][0]
      }
    }

    if (isDryRun) {
      console.log(`  [DRY] S${ranking.season_id} ${ranking.rank}위 ${donorName}: top_bj=${topBj}`)
    } else {
      const { error: updateError } = await supabase
        .from('season_donation_rankings')
        .update({ top_bj: topBj })
        .eq('id', ranking.id)

      if (updateError) {
        console.error(`  ERROR S${ranking.season_id} ${ranking.rank}위 ${donorName}:`, updateError)
      } else {
        console.log(`  S${ranking.season_id} ${ranking.rank}위 ${donorName}: top_bj=${topBj || '-'}`)
      }
    }
  }
}

async function main() {
  console.log('=== 랭킹 통계 백필 스크립트 ===')
  if (isDryRun) {
    console.log('⚠️  DRY RUN 모드 - 실제 업데이트 없음')
  }

  await backfillTotalRankings()
  await backfillSeasonRankings()

  console.log('\n=== 완료 ===')
}

main().catch(console.error)
