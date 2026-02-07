/**
 * 시즌 랭킹 갱신 스크립트
 * donations 테이블 기준으로 season_donation_rankings 재계산
 * RPC 함수를 사용하여 트랜잭션 안전성을 보장합니다.
 *
 * 사용법:
 *   npx tsx scripts/refresh-season-rankings.ts [--season=1]
 */

import { getServiceClient } from './lib/supabase'
import { withRetry } from './lib/utils'

const supabase = getServiceClient()

interface DonationRecord {
  donor_name: string
  amount: number
}

async function fetchAllDonations(seasonId: number): Promise<DonationRecord[]> {
  const allData: DonationRecord[] = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('donations')
      .select('donor_name, amount')
      .eq('season_id', seasonId)
      .gt('amount', 0)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) {
      console.error(`페이지네이션 오류 (page ${page}):`, error.message)
      break
    }

    if (!data || data.length === 0) break
    allData.push(...data)
    if (data.length < pageSize) break
    page++
  }

  return allData
}

async function upsertWithRPC(
  seasonId: number,
  rankings: { donor_name: string; total_amount: number; donation_count: number }[]
) {
  const rankingsJson = rankings.slice(0, 50).map((donor, index) => ({
    rank: index + 1,
    donor_name: donor.donor_name,
    total_amount: donor.total_amount,
    donation_count: donor.donation_count,
    unit: 'excel', // 기본값
  }))

  const result = await withRetry(
    async () => {
      const { data, error } = await supabase.rpc('upsert_season_rankings', {
        p_season_id: seasonId,
        p_unit: null, // 전체 삭제 후 삽입
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

  return result
}

async function upsertWithFallback(
  seasonId: number,
  rankings: { donor_name: string; total_amount: number; donation_count: number }[]
) {
  // 1. 기존 데이터 삭제
  await withRetry(
    async () => {
      const { error } = await supabase
        .from('season_donation_rankings')
        .delete()
        .eq('season_id', seasonId)
      if (error) throw new Error(error.message)
    },
    { maxRetries: 3 }
  )

  // 2. 데이터 삽입
  const insertData = rankings.slice(0, 50).map((d, i) => ({
    season_id: seasonId,
    rank: i + 1,
    donor_name: d.donor_name,
    total_amount: d.total_amount,
    donation_count: d.donation_count,
    unit: 'excel' as const,
    updated_at: new Date().toISOString(),
  }))

  await withRetry(
    async () => {
      const { error } = await supabase.from('season_donation_rankings').insert(insertData)
      if (error) throw new Error(error.message)
    },
    { maxRetries: 3 }
  )

  return insertData.length
}

async function main() {
  // 시즌 ID 파싱
  const seasonArg = process.argv.find((arg) => arg.startsWith('--season='))
  const seasonId = seasonArg ? parseInt(seasonArg.split('=')[1], 10) : 1

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`🔄 시즌 ${seasonId} 랭킹 갱신`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 갱신 전 상태 확인
  console.log('📊 갱신 전 Top 5:')
  const { data: before } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name, total_amount')
    .eq('season_id', seasonId)
    .order('rank')
    .limit(5)

  for (const r of before || []) {
    console.log(`   ${r.rank}위: ${r.donor_name} - ${r.total_amount.toLocaleString()} 하트`)
  }

  // donations에서 집계
  console.log('\n📥 donations 테이블에서 데이터 로딩...')
  const donations = await fetchAllDonations(seasonId)
  console.log(`   ${donations.length}건 로드됨`)

  // 닉네임별 집계
  const donorTotals: Record<string, { total: number; count: number }> = {}
  for (const d of donations) {
    if (!donorTotals[d.donor_name]) {
      donorTotals[d.donor_name] = { total: 0, count: 0 }
    }
    donorTotals[d.donor_name].total += d.amount
    donorTotals[d.donor_name].count++
  }

  // 정렬 및 상위 50명 추출
  const rankings = Object.entries(donorTotals)
    .map(([name, data]) => ({
      donor_name: name,
      total_amount: data.total,
      donation_count: data.count,
    }))
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, 50)

  console.log(`   ${rankings.length}명 Top 50 추출`)

  // RPC로 업데이트 시도
  console.log('\n🔄 랭킹 데이터 업데이트 중...')
  try {
    const result = await upsertWithRPC(seasonId, rankings)
    console.log('   ✅ RPC 실행 성공!')
    if (result && result[0]) {
      console.log(`   📊 삭제: ${result[0].deleted_count}건, 삽입: ${result[0].inserted_count}건`)
    }
  } catch (rpcError) {
    console.log(`   ⚠️  RPC 실패, 폴백 실행: ${rpcError instanceof Error ? rpcError.message : rpcError}`)
    const count = await upsertWithFallback(seasonId, rankings)
    console.log(`   ✅ 폴백 실행 완료: ${count}명`)
  }

  // 갱신 후 상태 확인
  console.log('\n📊 갱신 후 Top 10:')
  const { data: after } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name, total_amount, donation_count')
    .eq('season_id', seasonId)
    .order('rank')
    .limit(10)

  for (const r of after || []) {
    console.log(`   ${r.rank}위: ${r.donor_name} - ${r.total_amount.toLocaleString()} 하트 (${r.donation_count}건)`)
  }

  // 총합 확인
  const { data: allRankings } = await supabase
    .from('season_donation_rankings')
    .select('total_amount')
    .eq('season_id', seasonId)

  const total = (allRankings || []).reduce((sum, r) => sum + r.total_amount, 0)
  console.log(`\n📊 총합: ${total.toLocaleString()} 하트`)

  console.log('\n✅ 시즌 랭킹 갱신 완료!')
}

main().catch(console.error)
