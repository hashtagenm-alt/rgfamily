/**
 * 개인 시그니처 자격 분석
 * - 1번째 시그: 당일 누적 10만 하트 이상
 * - 2번째 시그: 당일 누적 15만 하트 이상
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, serviceRoleKey)

const FIRST_SIG_THRESHOLD = 100000  // 10만 하트
const SECOND_SIG_THRESHOLD = 150000 // 15만 하트

interface DonationRecord {
  donor_name: string
  amount: number
  donated_at: string
  episode_id: number
}

async function fetchAllDonations(): Promise<DonationRecord[]> {
  const allData: DonationRecord[] = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('donations')
      .select('donor_name, amount, donated_at, episode_id')
      .eq('season_id', 1)
      .not('donated_at', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break

    allData.push(...data)
    console.log(`  페이지 ${page + 1}: ${data.length}건 조회 (누적: ${allData.length}건)`)

    if (data.length < pageSize) break
    page++
  }

  return allData
}

async function main() {
  console.log('=== 개인 시그니처 자격 분석 ===')
  console.log(`1번째 시그: 당일 ${FIRST_SIG_THRESHOLD.toLocaleString()} 하트 이상`)
  console.log(`2번째 시그: 당일 ${SECOND_SIG_THRESHOLD.toLocaleString()} 하트 이상\n`)

  // 1. 전체 후원 데이터 조회
  console.log('1. 시즌 1 전체 후원 데이터 조회...')
  const donations = await fetchAllDonations()
  console.log(`총 ${donations.length}건 조회 완료\n`)

  // 2. 후원자별, 날짜별 집계
  console.log('2. 후원자별 날짜별 집계...')

  // donor_name -> date -> { total, episode_ids }
  const donorDailyTotals: Map<string, Map<string, { total: number; episodes: Set<number> }>> = new Map()

  for (const d of donations) {
    if (!d.donated_at || !d.donor_name) continue

    // 날짜만 추출 (YYYY-MM-DD)
    const date = d.donated_at.split('T')[0].split(' ')[0]

    if (!donorDailyTotals.has(d.donor_name)) {
      donorDailyTotals.set(d.donor_name, new Map())
    }

    const dailyMap = donorDailyTotals.get(d.donor_name)!
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { total: 0, episodes: new Set() })
    }

    const dayData = dailyMap.get(date)!
    dayData.total += d.amount
    dayData.episodes.add(d.episode_id)
  }

  // 3. 시그니처 자격자 분석
  console.log('3. 시그니처 자격자 분석...\n')

  interface SignatureEligibility {
    donor_name: string
    firstSigDays: { date: string; total: number; episodes: number[] }[]
    secondSigDays: { date: string; total: number; episodes: number[] }[]
  }

  const eligibleDonors: SignatureEligibility[] = []

  for (const [donor, dailyMap] of donorDailyTotals) {
    const firstSigDays: { date: string; total: number; episodes: number[] }[] = []
    const secondSigDays: { date: string; total: number; episodes: number[] }[] = []

    for (const [date, data] of dailyMap) {
      if (data.total >= SECOND_SIG_THRESHOLD) {
        secondSigDays.push({ date, total: data.total, episodes: Array.from(data.episodes) })
      } else if (data.total >= FIRST_SIG_THRESHOLD) {
        firstSigDays.push({ date, total: data.total, episodes: Array.from(data.episodes) })
      }
    }

    if (firstSigDays.length > 0 || secondSigDays.length > 0) {
      eligibleDonors.push({
        donor_name: donor,
        firstSigDays,
        secondSigDays
      })
    }
  }

  // 정렬: 2번째 시그 자격 있는 사람 우선, 그 다음 1번째 시그 자격자
  eligibleDonors.sort((a, b) => {
    const aMax = Math.max(
      ...a.secondSigDays.map(d => d.total),
      ...a.firstSigDays.map(d => d.total),
      0
    )
    const bMax = Math.max(
      ...b.secondSigDays.map(d => d.total),
      ...b.firstSigDays.map(d => d.total),
      0
    )
    return bMax - aMax
  })

  // 4. 결과 출력
  console.log('=' .repeat(70))
  console.log('시그니처 자격자 목록')
  console.log('=' .repeat(70))

  // 2번째 시그 자격자 (15만 이상)
  const secondSigEligible = eligibleDonors.filter(d => d.secondSigDays.length > 0)
  console.log(`\n📌 2번째 시그 자격자 (당일 ${SECOND_SIG_THRESHOLD.toLocaleString()}+ 하트): ${secondSigEligible.length}명`)
  console.log('-'.repeat(70))

  for (const donor of secondSigEligible) {
    console.log(`\n🏆 ${donor.donor_name}`)
    for (const day of donor.secondSigDays) {
      const epStr = day.episodes.map(e => `${e}화`).join(', ')
      console.log(`   📅 ${day.date}: ${day.total.toLocaleString()} 하트 (${epStr})`)
    }
    // 1번째 시그 자격도 있으면 표시
    if (donor.firstSigDays.length > 0) {
      console.log(`   + 1번째 시그 자격일: ${donor.firstSigDays.length}일`)
    }
  }

  // 1번째 시그만 자격자 (10만~15만)
  const firstSigOnly = eligibleDonors.filter(d => d.secondSigDays.length === 0 && d.firstSigDays.length > 0)
  console.log(`\n\n📌 1번째 시그 자격자 (당일 ${FIRST_SIG_THRESHOLD.toLocaleString()}~${SECOND_SIG_THRESHOLD.toLocaleString()-1} 하트): ${firstSigOnly.length}명`)
  console.log('-'.repeat(70))

  for (const donor of firstSigOnly) {
    console.log(`\n⭐ ${donor.donor_name}`)
    for (const day of donor.firstSigDays) {
      const epStr = day.episodes.map(e => `${e}화`).join(', ')
      console.log(`   📅 ${day.date}: ${day.total.toLocaleString()} 하트 (${epStr})`)
    }
  }

  // 5. 요약
  console.log('\n\n' + '='.repeat(70))
  console.log('요약')
  console.log('='.repeat(70))
  console.log(`2번째 시그 자격자 (15만+): ${secondSigEligible.length}명`)
  console.log(`1번째 시그만 자격자 (10만~15만): ${firstSigOnly.length}명`)
  console.log(`총 시그니처 자격자: ${eligibleDonors.length}명`)

  // 에피소드별 분포
  console.log('\n에피소드별 자격 달성 분포:')
  const epCounts: Record<number, { first: number; second: number }> = {}
  for (const donor of eligibleDonors) {
    for (const day of donor.secondSigDays) {
      for (const ep of day.episodes) {
        if (!epCounts[ep]) epCounts[ep] = { first: 0, second: 0 }
        epCounts[ep].second++
      }
    }
    for (const day of donor.firstSigDays) {
      for (const ep of day.episodes) {
        if (!epCounts[ep]) epCounts[ep] = { first: 0, second: 0 }
        epCounts[ep].first++
      }
    }
  }

  for (const ep of Object.keys(epCounts).map(Number).sort((a, b) => a - b)) {
    console.log(`  ${ep}화: 1번째 시그 ${epCounts[ep].first}건, 2번째 시그 ${epCounts[ep].second}건`)
  }
}

main().catch(console.error)
