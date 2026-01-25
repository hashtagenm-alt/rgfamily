/**
 * 랭킹 데이터 정합성 검증 스크립트
 *
 * 기능:
 * - donations 테이블과 랭킹 테이블 간 데이터 일치 여부 확인
 * - 불일치 발견 시 자동 수정 옵션
 *
 * 사용법:
 * - 검증만: npx tsx scripts/verify-ranking-integrity.ts
 * - 자동 수정: npx tsx scripts/verify-ranking-integrity.ts --fix
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('환경변수 설정 필요')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})

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

async function fixSeasonRanking(seasonId: number) {
  console.log(`\n🔧 시즌 ${seasonId} 랭킹 수정 중...`)

  // 기존 데이터 삭제
  await supabase.from('season_donation_rankings').delete().eq('season_id', seasonId)

  // donations 기반 새 랭킹 생성 (페이지네이션으로 전체 데이터)
  const donations = await fetchAllDonations(seasonId)

  const aggregated = new Map<string, number>()
  const donationCounts = new Map<string, number>()

  for (const d of donations) {
    aggregated.set(d.donor_name, (aggregated.get(d.donor_name) || 0) + d.amount)
    donationCounts.set(d.donor_name, (donationCounts.get(d.donor_name) || 0) + 1)
  }

  const sorted = [...aggregated.entries()].sort((a, b) => b[1] - a[1])
  const maxAmount = sorted[0]?.[1] || 0

  const rankingsToInsert = sorted.map(([name, amount], idx) => ({
    season_id: seasonId,
    rank: idx + 1,
    donor_name: name,
    total_amount: amount,
    donation_count: donationCounts.get(name) || 0,
    unit: 'excel',
    gauge_percent: Math.round((amount / maxAmount) * 100),
  }))

  // 100개씩 배치 삽입
  const batchSize = 100
  for (let i = 0; i < rankingsToInsert.length; i += batchSize) {
    const batch = rankingsToInsert.slice(i, i + batchSize)
    await supabase.from('season_donation_rankings').insert(batch)
  }

  console.log(`   ✅ 시즌 ${seasonId}: ${rankingsToInsert.length}명 랭킹 갱신 완료`)
}

async function fixTotalRanking() {
  console.log(`\n🔧 종합 랭킹 수정 중...`)
  console.log(`   ⚠️  주의: 이 작업은 레거시 데이터를 덮어씁니다!`)

  // 기존 데이터 삭제
  await supabase.from('total_donation_rankings').delete().neq('id', 0)

  // donations 기반 새 랭킹 생성 (페이지네이션으로 전체 데이터)
  const donations = await fetchAllDonations()

  const aggregated = new Map<string, number>()
  for (const d of donations) {
    aggregated.set(d.donor_name, (aggregated.get(d.donor_name) || 0) + d.amount)
  }

  const sorted = [...aggregated.entries()].sort((a, b) => b[1] - a[1])

  const rankingsToInsert = sorted.map(([name, amount], idx) => ({
    rank: idx + 1,
    donor_name: name,
    total_amount: amount,
    is_permanent_vip: false,
  }))

  // 100개씩 배치 삽입
  const batchSize = 100
  for (let i = 0; i < rankingsToInsert.length; i += batchSize) {
    const batch = rankingsToInsert.slice(i, i + batchSize)
    await supabase.from('total_donation_rankings').insert(batch)
  }

  console.log(`   ✅ 종합 랭킹: ${rankingsToInsert.length}명 랭킹 갱신 완료`)
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
      await fixSeasonRanking(season.id)
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
