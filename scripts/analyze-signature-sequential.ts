/**
 * 개인 시그니처 자격 분석 (순차적 회차별)
 * - 1번째 시그: 어느 회차든 당일 10만+ 하트
 * - 2번째 시그: 1번째 이후 다른 회차에서 당일 15만+ 하트
 * - 3번째 시그: 2번째 이후 또 다른 회차에서 당일 20만+ 하트
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, serviceRoleKey)

const FIRST_SIG_THRESHOLD = 100000   // 10만 하트
const SECOND_SIG_THRESHOLD = 150000  // 15만 하트
const THIRD_SIG_THRESHOLD = 200000   // 20만 하트

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
    if (data.length < pageSize) break
    page++
  }

  return allData
}

// 에피소드 ID를 화수로 변환
function getEpisodeNumber(episodeId: number): number {
  // 12화 = episode_id 12, 13화 = 13, ... 17화 = 17 (6화)
  // 실제 매핑: 12->1화, 13->2화, 14->3화, 15->4화, 16->5화, 17->6화
  const mapping: Record<number, number> = {
    12: 1, 13: 2, 14: 3, 15: 4, 16: 5, 17: 6
  }
  return mapping[episodeId] || episodeId
}

async function main() {
  console.log('=== 개인 시그니처 자격 분석 (순차적 회차별) ===')
  console.log(`1번째 시그: 당일 ${FIRST_SIG_THRESHOLD.toLocaleString()}+ 하트`)
  console.log(`2번째 시그: 다른 회차에서 당일 ${SECOND_SIG_THRESHOLD.toLocaleString()}+ 하트`)
  console.log(`3번째 시그: 또 다른 회차에서 당일 ${THIRD_SIG_THRESHOLD.toLocaleString()}+ 하트\n`)

  // 1. 전체 후원 데이터 조회
  console.log('1. 시즌 1 전체 후원 데이터 조회...')
  const donations = await fetchAllDonations()
  console.log(`총 ${donations.length}건 조회 완료\n`)

  // 2. 후원자별, 회차별, 날짜별 집계
  // donor -> episode -> date -> total
  const donorEpisodeDailyTotals: Map<string, Map<number, Map<string, number>>> = new Map()

  for (const d of donations) {
    if (!d.donated_at || !d.donor_name) continue

    const date = d.donated_at.split('T')[0].split(' ')[0]
    const ep = d.episode_id

    if (!donorEpisodeDailyTotals.has(d.donor_name)) {
      donorEpisodeDailyTotals.set(d.donor_name, new Map())
    }
    const epMap = donorEpisodeDailyTotals.get(d.donor_name)!

    if (!epMap.has(ep)) {
      epMap.set(ep, new Map())
    }
    const dateMap = epMap.get(ep)!

    dateMap.set(date, (dateMap.get(date) || 0) + d.amount)
  }

  // 3. 각 후원자의 회차별 최고 당일 누적 계산
  interface EpisodeMax {
    episodeId: number
    episodeNum: number
    date: string
    maxDaily: number
  }

  interface DonorSignatureStatus {
    donor_name: string
    episodeMaxes: EpisodeMax[]  // 각 회차별 최고 당일 누적
    signatures: number          // 획득한 시그니처 개수
    sigDetails: { sigNum: number; episodeNum: number; amount: number; date: string }[]
  }

  const donorStatuses: DonorSignatureStatus[] = []

  for (const [donor, epMap] of donorEpisodeDailyTotals) {
    const episodeMaxes: EpisodeMax[] = []

    for (const [ep, dateMap] of epMap) {
      // 해당 회차에서 최고 당일 누적 찾기
      let maxDaily = 0
      let maxDate = ''
      for (const [date, total] of dateMap) {
        if (total > maxDaily) {
          maxDaily = total
          maxDate = date
        }
      }

      if (maxDaily > 0) {
        episodeMaxes.push({
          episodeId: ep,
          episodeNum: getEpisodeNumber(ep),
          date: maxDate,
          maxDaily
        })
      }
    }

    // 회차 순서로 정렬
    episodeMaxes.sort((a, b) => a.episodeNum - b.episodeNum)

    // 순차적으로 시그니처 계산
    let signatures = 0
    const sigDetails: { sigNum: number; episodeNum: number; amount: number; date: string }[] = []
    const usedEpisodes = new Set<number>()

    // 1번째 시그 (10만+)
    for (const em of episodeMaxes) {
      if (em.maxDaily >= FIRST_SIG_THRESHOLD && !usedEpisodes.has(em.episodeNum)) {
        signatures = 1
        sigDetails.push({ sigNum: 1, episodeNum: em.episodeNum, amount: em.maxDaily, date: em.date })
        usedEpisodes.add(em.episodeNum)
        break
      }
    }

    // 2번째 시그 (15만+, 다른 회차)
    if (signatures >= 1) {
      for (const em of episodeMaxes) {
        if (em.maxDaily >= SECOND_SIG_THRESHOLD && !usedEpisodes.has(em.episodeNum)) {
          signatures = 2
          sigDetails.push({ sigNum: 2, episodeNum: em.episodeNum, amount: em.maxDaily, date: em.date })
          usedEpisodes.add(em.episodeNum)
          break
        }
      }
    }

    // 3번째 시그 (20만+, 또 다른 회차)
    if (signatures >= 2) {
      for (const em of episodeMaxes) {
        if (em.maxDaily >= THIRD_SIG_THRESHOLD && !usedEpisodes.has(em.episodeNum)) {
          signatures = 3
          sigDetails.push({ sigNum: 3, episodeNum: em.episodeNum, amount: em.maxDaily, date: em.date })
          usedEpisodes.add(em.episodeNum)
          break
        }
      }
    }

    if (signatures > 0) {
      donorStatuses.push({
        donor_name: donor,
        episodeMaxes,
        signatures,
        sigDetails
      })
    }
  }

  // 시그니처 개수 내림차순 정렬
  donorStatuses.sort((a, b) => {
    if (b.signatures !== a.signatures) return b.signatures - a.signatures
    // 같은 시그 개수면 총 금액으로
    const aTotal = a.episodeMaxes.reduce((s, e) => s + e.maxDaily, 0)
    const bTotal = b.episodeMaxes.reduce((s, e) => s + e.maxDaily, 0)
    return bTotal - aTotal
  })

  // 4. 결과 출력
  console.log('='.repeat(80))
  console.log('시그니처 자격자 분석 결과')
  console.log('='.repeat(80))

  // 3개 시그 자격자
  const threeSig = donorStatuses.filter(d => d.signatures === 3)
  console.log(`\n🏆🏆🏆 3개 시그니처 자격자: ${threeSig.length}명`)
  console.log('-'.repeat(80))
  for (const donor of threeSig) {
    console.log(`\n${donor.donor_name}`)
    for (const sig of donor.sigDetails) {
      console.log(`  ${sig.sigNum}번째 시그: ${sig.episodeNum}화에서 ${sig.amount.toLocaleString()} 하트 (${sig.date})`)
    }
  }

  // 2개 시그 자격자
  const twoSig = donorStatuses.filter(d => d.signatures === 2)
  console.log(`\n\n🏆🏆 2개 시그니처 자격자: ${twoSig.length}명`)
  console.log('-'.repeat(80))
  for (const donor of twoSig) {
    console.log(`\n${donor.donor_name}`)
    for (const sig of donor.sigDetails) {
      console.log(`  ${sig.sigNum}번째 시그: ${sig.episodeNum}화에서 ${sig.amount.toLocaleString()} 하트 (${sig.date})`)
    }
    // 3번째 시그 가능성 체크
    const usedEps = new Set(donor.sigDetails.map(s => s.episodeNum))
    const potential3rd = donor.episodeMaxes.find(e => e.maxDaily >= THIRD_SIG_THRESHOLD && !usedEps.has(e.episodeNum))
    if (!potential3rd) {
      const closest = donor.episodeMaxes
        .filter(e => !usedEps.has(e.episodeNum))
        .sort((a, b) => b.maxDaily - a.maxDaily)[0]
      if (closest) {
        const needed = THIRD_SIG_THRESHOLD - closest.maxDaily
        console.log(`  → 3번째 시그까지 ${needed.toLocaleString()} 하트 부족 (${closest.episodeNum}화: ${closest.maxDaily.toLocaleString()})`)
      }
    }
  }

  // 1개 시그 자격자
  const oneSig = donorStatuses.filter(d => d.signatures === 1)
  console.log(`\n\n🏆 1개 시그니처 자격자: ${oneSig.length}명`)
  console.log('-'.repeat(80))
  for (const donor of oneSig) {
    console.log(`\n${donor.donor_name}`)
    for (const sig of donor.sigDetails) {
      console.log(`  ${sig.sigNum}번째 시그: ${sig.episodeNum}화에서 ${sig.amount.toLocaleString()} 하트 (${sig.date})`)
    }
    // 2번째 시그 가능성 체크
    const usedEps = new Set(donor.sigDetails.map(s => s.episodeNum))
    const potential2nd = donor.episodeMaxes.find(e => e.maxDaily >= SECOND_SIG_THRESHOLD && !usedEps.has(e.episodeNum))
    if (!potential2nd) {
      const closest = donor.episodeMaxes
        .filter(e => !usedEps.has(e.episodeNum))
        .sort((a, b) => b.maxDaily - a.maxDaily)[0]
      if (closest) {
        const needed = SECOND_SIG_THRESHOLD - closest.maxDaily
        console.log(`  → 2번째 시그까지 ${needed.toLocaleString()} 하트 부족 (${closest.episodeNum}화: ${closest.maxDaily.toLocaleString()})`)
      }
    }
  }

  // 5. 요약
  console.log('\n\n' + '='.repeat(80))
  console.log('요약')
  console.log('='.repeat(80))
  console.log(`3개 시그니처 자격: ${threeSig.length}명`)
  console.log(`2개 시그니처 자격: ${twoSig.length}명`)
  console.log(`1개 시그니처 자격: ${oneSig.length}명`)
  console.log(`총 시그니처 자격자: ${donorStatuses.length}명`)

  // 전체 자격자 테이블
  console.log('\n\n전체 시그니처 자격자 목록:')
  console.log('-'.repeat(80))
  console.log('닉네임'.padEnd(25) + '시그 개수'.padEnd(10) + '상세')
  console.log('-'.repeat(80))
  for (const donor of donorStatuses) {
    const details = donor.sigDetails.map(s => `${s.sigNum}번째(${s.episodeNum}화)`).join(', ')
    console.log(`${donor.donor_name.padEnd(25)}${String(donor.signatures).padEnd(10)}${details}`)
  }
}

main().catch(console.error)
