/**
 * 랭킹 데이터 정합성 검증 스크립트
 *
 * 기능:
 * - donations 테이블과 랭킹 테이블 간 데이터 일치 여부 확인
 * - 불일치 발견 시 자동 수정 옵션 (RPC 사용)
 *
 * 사용법:
 * - 검증만: npx tsx scripts/verify-ranking-integrity.ts
 * - 시즌 랭킹 수정: npx tsx scripts/verify-ranking-integrity.ts --fix-season
 * - 전체 수정: npx tsx scripts/verify-ranking-integrity.ts --fix
 */

import { getServiceClient } from '../lib/supabase'
import { withRetry, processBatch } from '../lib/utils'

const supabase = getServiceClient()

interface MismatchResult {
  donor_name: string
  donations_total: number
  ranking_total: number | null
  difference: number
}

interface DonationRecord {
  donor_name: string
  amount: number
}

// 페이지네이션으로 전체 데이터 가져오기
async function fetchAllDonations(seasonId?: number): Promise<DonationRecord[]> {
  const allData: DonationRecord[] = []
  const pageSize = 1000
  let page = 0

  while (true) {
    let query = supabase
      .from('donations')
      .select('donor_name, amount')
      .gt('amount', 0)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (seasonId !== undefined) {
      query = query.eq('season_id', seasonId)
    }

    const { data, error } = await query

    if (error) {
      console.error(`페이지네이션 오류 (page ${page}):`, error.message)
      break
    }

    if (!data || data.length === 0) break

    allData.push(...data)
    page++

    // 데이터가 pageSize보다 적으면 마지막 페이지
    if (data.length < pageSize) break
  }

  return allData
}

async function checkSeasonRankingIntegrity(seasonId: number): Promise<MismatchResult[]> {
  console.log(`\n📊 시즌 ${seasonId} 랭킹 정합성 검사...`)

  // donations에서 집계 (페이지네이션으로 전체 데이터)
  const donations = await fetchAllDonations(seasonId)

  const donationsMap = new Map<string, number>()
  for (const d of donations) {
    donationsMap.set(d.donor_name, (donationsMap.get(d.donor_name) || 0) + d.amount)
  }

  // season_donation_rankings에서 조회
  const { data: rankings } = await supabase
    .from('season_donation_rankings')
    .select('donor_name, total_amount')
    .eq('season_id', seasonId)

  const rankingsMap = new Map<string, number>()
  for (const r of rankings || []) {
    rankingsMap.set(r.donor_name, r.total_amount)
  }

  // 비교
  const mismatches: MismatchResult[] = []
  const allNames = new Set([...donationsMap.keys(), ...rankingsMap.keys()])

  for (const name of allNames) {
    const donationsTotal = donationsMap.get(name) || 0
    const rankingTotal = rankingsMap.get(name) || null

    if (donationsTotal !== (rankingTotal || 0)) {
      mismatches.push({
        donor_name: name,
        donations_total: donationsTotal,
        ranking_total: rankingTotal,
        difference: donationsTotal - (rankingTotal || 0),
      })
    }
  }

  // 결과 출력
  if (mismatches.length === 0) {
    console.log(`   ✅ 시즌 ${seasonId}: 모든 데이터 일치 (${donationsMap.size}명, ${donations.length}건)`)
  } else {
    console.log(`   ❌ 시즌 ${seasonId}: ${mismatches.length}건 불일치 발견`)
    for (const m of mismatches.slice(0, 5)) {
      console.log(
        `      - ${m.donor_name}: donations=${m.donations_total.toLocaleString()}, ranking=${m.ranking_total?.toLocaleString() || 'N/A'} (차이: ${m.difference.toLocaleString()})`
      )
    }
    if (mismatches.length > 5) {
      console.log(`      ... 외 ${mismatches.length - 5}건`)
    }
  }

  return mismatches
}

async function checkTotalRankingIntegrity(): Promise<MismatchResult[]> {
  console.log(`\n📊 종합 랭킹 정합성 검사...`)
  console.log(`   ⚠️  주의: total_donation_rankings는 레거시 데이터 + 시즌1을 포함`)
  console.log(`   donations 테이블은 시즌1 데이터만 포함하므로 차이가 있을 수 있음`)

  // donations에서 집계 (페이지네이션으로 전체 데이터)
  const donations = await fetchAllDonations()

  const donationsMap = new Map<string, number>()
  for (const d of donations) {
    donationsMap.set(d.donor_name, (donationsMap.get(d.donor_name) || 0) + d.amount)
  }

  // total_donation_rankings에서 조회
  const { data: rankings } = await supabase.from('total_donation_rankings').select('donor_name, total_amount')

  const rankingsMap = new Map<string, number>()
  for (const r of rankings || []) {
    rankingsMap.set(r.donor_name, r.total_amount)
  }

  // 비교
  const mismatches: MismatchResult[] = []
  const allNames = new Set([...donationsMap.keys(), ...rankingsMap.keys()])

  for (const name of allNames) {
    const donationsTotal = donationsMap.get(name) || 0
    const rankingTotal = rankingsMap.get(name) || null

    if (donationsTotal !== (rankingTotal || 0)) {
      mismatches.push({
        donor_name: name,
        donations_total: donationsTotal,
        ranking_total: rankingTotal,
        difference: donationsTotal - (rankingTotal || 0),
      })
    }
  }

  // 결과 출력 (종합은 레거시 데이터 때문에 차이가 정상)
  console.log(`   📋 donations 후원자: ${donationsMap.size}명, rankings: ${rankingsMap.size}명`)
  console.log(`   📋 차이 있는 항목: ${mismatches.length}건 (레거시 데이터로 인한 정상적 차이 포함)`)

  return mismatches
}

async function fixSeasonRankingWithRPC(seasonId: number) {
  console.log(`\n🔧 시즌 ${seasonId} 랭킹 수정 중 (RPC)...`)

  // donations 기반 새 랭킹 생성 (페이지네이션으로 전체 데이터)
  const donations = await fetchAllDonations(seasonId)

  const aggregated = new Map<string, number>()
  const donationCounts = new Map<string, number>()

  for (const d of donations) {
    aggregated.set(d.donor_name, (aggregated.get(d.donor_name) || 0) + d.amount)
    donationCounts.set(d.donor_name, (donationCounts.get(d.donor_name) || 0) + 1)
  }

  const sorted = [...aggregated.entries()].sort((a, b) => b[1] - a[1])

  const rankingsJson = sorted.slice(0, 50).map(([name, amount], idx) => ({
    rank: idx + 1,
    donor_name: name,
    total_amount: amount,
    donation_count: donationCounts.get(name) || 0,
    unit: 'excel',
  }))

  try {
    const result = await withRetry(
      async () => {
        const { data, error } = await supabase.rpc('upsert_season_rankings', {
          p_season_id: seasonId,
          p_unit: null,
          p_rankings: rankingsJson,
        })

        if (error) throw new Error(error.message)
        return data
      },
      {
        maxRetries: 3,
        onRetry: (error, attempt, delay) => {
          console.log(`   ⚠️  재시도 ${attempt}/3: ${error.message} (${delay}ms 대기)`)
        },
      }
    )

    console.log(`   ✅ 시즌 ${seasonId}: RPC로 ${rankingsJson.length}명 랭킹 갱신 완료`)
    if (result && result[0]) {
      console.log(`   📊 삭제: ${result[0].deleted_count}건, 삽입: ${result[0].inserted_count}건`)
    }
  } catch (rpcError) {
    console.log(`   ⚠️  RPC 실패, 폴백 실행: ${rpcError instanceof Error ? rpcError.message : rpcError}`)
    await fixSeasonRankingFallback(seasonId, rankingsJson)
  }
}

async function fixSeasonRankingFallback(
  seasonId: number,
  rankings: { rank: number; donor_name: string; total_amount: number; donation_count: number; unit: string }[]
) {
  // 기존 데이터 삭제
  await withRetry(
    async () => {
      const { error } = await supabase.from('season_donation_rankings').delete().eq('season_id', seasonId)
      if (error) throw new Error(error.message)
    },
    { maxRetries: 3 }
  )

  const rankingsToInsert = rankings.map((r) => ({
    season_id: seasonId,
    rank: r.rank,
    donor_name: r.donor_name,
    total_amount: r.total_amount,
    donation_count: r.donation_count,
    unit: r.unit,
  }))

  // 배치 삽입
  const batchSize = 100
  for (let i = 0; i < rankingsToInsert.length; i += batchSize) {
    const batch = rankingsToInsert.slice(i, i + batchSize)
    await withRetry(
      async () => {
        const { error } = await supabase.from('season_donation_rankings').insert(batch)
        if (error) throw new Error(error.message)
      },
      { maxRetries: 3 }
    )
  }

  console.log(`   ✅ 시즌 ${seasonId}: 폴백으로 ${rankingsToInsert.length}명 랭킹 갱신 완료`)
}

async function fixTotalRankingWithRPC() {
  console.log(`\n🔧 종합 랭킹 수정 중 (RPC)...`)
  console.log(`   ⚠️  주의: 이 작업은 레거시 데이터를 덮어씁니다!`)

  // donations 기반 새 랭킹 생성 (페이지네이션으로 전체 데이터)
  const donations = await fetchAllDonations()

  const aggregated = new Map<string, number>()
  for (const d of donations) {
    aggregated.set(d.donor_name, (aggregated.get(d.donor_name) || 0) + d.amount)
  }

  const sorted = [...aggregated.entries()].sort((a, b) => b[1] - a[1])

  const rankingsJson = sorted.slice(0, 50).map(([name, amount], idx) => ({
    rank: idx + 1,
    donor_name: name,
    total_amount: amount,
    is_permanent_vip: false,
  }))

  try {
    const result = await withRetry(
      async () => {
        const { data, error } = await supabase.rpc('upsert_total_rankings', {
          p_rankings: rankingsJson,
        })

        if (error) throw new Error(error.message)
        return data
      },
      {
        maxRetries: 3,
        onRetry: (error, attempt, delay) => {
          console.log(`   ⚠️  재시도 ${attempt}/3: ${error.message} (${delay}ms 대기)`)
        },
      }
    )

    console.log(`   ✅ 종합 랭킹: RPC로 ${rankingsJson.length}명 랭킹 갱신 완료`)
    if (result && result[0]) {
      console.log(`   📊 삭제: ${result[0].deleted_count}건, 삽입: ${result[0].inserted_count}건`)
    }
  } catch (rpcError) {
    console.log(`   ⚠️  RPC 실패, 폴백 실행: ${rpcError instanceof Error ? rpcError.message : rpcError}`)
    await fixTotalRankingFallback(rankingsJson)
  }
}

async function fixTotalRankingFallback(
  rankings: { rank: number; donor_name: string; total_amount: number; is_permanent_vip: boolean }[]
) {
  // 기존 데이터 삭제
  await withRetry(
    async () => {
      const { error } = await supabase.from('total_donation_rankings').delete().neq('id', 0)
      if (error) throw new Error(error.message)
    },
    { maxRetries: 3 }
  )

  // 배치 삽입
  const batchSize = 100
  for (let i = 0; i < rankings.length; i += batchSize) {
    const batch = rankings.slice(i, i + batchSize)
    await withRetry(
      async () => {
        const { error } = await supabase.from('total_donation_rankings').insert(batch)
        if (error) throw new Error(error.message)
      },
      { maxRetries: 3 }
    )
  }

  console.log(`   ✅ 종합 랭킹: 폴백으로 ${rankings.length}명 랭킹 갱신 완료`)
}

async function main() {
  const shouldFix = process.argv.includes('--fix')
  const fixSeason = process.argv.includes('--fix-season')

  console.log('========================================')
  console.log('🔍 랭킹 데이터 정합성 검증')
  console.log(`   모드: ${shouldFix ? '검증 + 자동 수정' : fixSeason ? '시즌 랭킹만 수정' : '검증만'}`)
  console.log('========================================')

  // 시즌 목록 조회
  const { data: seasons } = await supabase.from('seasons').select('id, name').order('id')

  let seasonMismatches = 0

  // 시즌별 검증
  for (const season of seasons || []) {
    const mismatches = await checkSeasonRankingIntegrity(season.id)
    seasonMismatches += mismatches.length

    if ((shouldFix || fixSeason) && mismatches.length > 0) {
      await fixSeasonRankingWithRPC(season.id)
    }
  }

  // 종합 랭킹 검증 (정보 제공용)
  await checkTotalRankingIntegrity()

  // 최종 결과
  console.log('\n========================================')
  if (seasonMismatches === 0) {
    console.log('✅ 시즌 랭킹 데이터가 donations와 일치합니다!')
  } else if (shouldFix || fixSeason) {
    console.log(`🔧 시즌 랭킹 ${seasonMismatches}건 불일치 수정 완료`)
  } else {
    console.log(`❌ 시즌 랭킹 ${seasonMismatches}건 불일치 발견`)
    console.log('   수정하려면: npx tsx scripts/verify-ranking-integrity.ts --fix-season')
  }
  console.log('========================================')
}

main().catch(console.error)
