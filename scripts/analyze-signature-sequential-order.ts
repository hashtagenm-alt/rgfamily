/**
 * 개인 시그니처 자격 분석 (회차 순서대로)
 * - 1번째 시그: 당일 10만+ 하트
 * - 2번째 시그: 이후 회차에서 당일 15만+ 하트
 * - 3번째 시그: 그 이후 회차에서 당일 20만+ 하트
 * ※ 반드시 회차 순서대로 (1화→2화→3화...)
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

// 에피소드 ID → 화수 매핑
const EPISODE_ORDER: Record<number, number> = {
  12: 1, 13: 2, 14: 3, 15: 4, 16: 5, 17: 6
}

async function fetchAllDonations() {
  const allData: { donor_name: string; amount: number; donated_at: string; episode_id: number }[] = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('donations')
      .select('donor_name, amount, donated_at, episode_id')
      .eq('season_id', 1)
      .in('episode_id', [12, 13, 14, 15, 16, 17])
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

async function main() {
  console.log('=== 개인 시그니처 자격 분석 (회차 순서대로) ===')
  console.log(`1번째 시그: 당일 ${FIRST_SIG_THRESHOLD.toLocaleString()}+ 하트`)
  console.log(`2번째 시그: 이후 회차에서 당일 ${SECOND_SIG_THRESHOLD.toLocaleString()}+ 하트`)
  console.log(`3번째 시그: 그 이후 회차에서 당일 ${THIRD_SIG_THRESHOLD.toLocaleString()}+ 하트`)
  console.log(`※ 반드시 회차 순서대로 (1화→2화→3화→4화→5화→6화)\n`)

  const donations = await fetchAllDonations()
  console.log(`총 ${donations.length}건 분석\n`)

  // 후원자별, 회차별, 날짜별 집계
  const donorData: Map<string, Map<number, Map<string, number>>> = new Map()

  for (const d of donations) {
    if (!d.donated_at || !d.donor_name) continue

    let date = d.donated_at
    if (date.includes('T')) date = date.split('T')[0]
    else if (date.includes(' ')) date = date.split(' ')[0]

    const epNum = EPISODE_ORDER[d.episode_id]
    if (!epNum) continue

    if (!donorData.has(d.donor_name)) {
      donorData.set(d.donor_name, new Map())
    }
    const epMap = donorData.get(d.donor_name)!

    if (!epMap.has(epNum)) {
      epMap.set(epNum, new Map())
    }
    const dateMap = epMap.get(epNum)!
    dateMap.set(date, (dateMap.get(date) || 0) + d.amount)
  }

  // 각 후원자의 회차별 최고 당일 누적 계산
  interface EpisodeMax {
    episodeNum: number
    maxDaily: number
    date: string
  }

  interface DonorResult {
    donor_name: string
    episodeMaxes: EpisodeMax[]
    signatures: number
    sigDetails: { sigNum: number; episodeNum: number; amount: number }[]
  }

  const results: DonorResult[] = []

  for (const [donor, epMap] of donorData) {
    const episodeMaxes: EpisodeMax[] = []

    // 1~6화 순서대로 처리
    for (let epNum = 1; epNum <= 6; epNum++) {
      const dateMap = epMap.get(epNum)
      if (!dateMap) continue

      let maxDaily = 0
      let maxDate = ''
      for (const [date, total] of dateMap) {
        if (total > maxDaily) {
          maxDaily = total
          maxDate = date
        }
      }

      if (maxDaily > 0) {
        episodeMaxes.push({ episodeNum: epNum, maxDaily, date: maxDate })
      }
    }

    // 회차 순서대로 시그니처 계산
    let signatures = 0
    const sigDetails: { sigNum: number; episodeNum: number; amount: number }[] = []
    let lastSigEpisode = 0

    // 1번째 시그 (10만+) - 가장 빠른 회차에서
    for (const em of episodeMaxes) {
      if (em.maxDaily >= FIRST_SIG_THRESHOLD) {
        signatures = 1
        sigDetails.push({ sigNum: 1, episodeNum: em.episodeNum, amount: em.maxDaily })
        lastSigEpisode = em.episodeNum
        break
      }
    }

    // 2번째 시그 (15만+) - 1번째 시그 이후 회차에서
    if (signatures >= 1) {
      for (const em of episodeMaxes) {
        if (em.episodeNum > lastSigEpisode && em.maxDaily >= SECOND_SIG_THRESHOLD) {
          signatures = 2
          sigDetails.push({ sigNum: 2, episodeNum: em.episodeNum, amount: em.maxDaily })
          lastSigEpisode = em.episodeNum
          break
        }
      }
    }

    // 3번째 시그 (20만+) - 2번째 시그 이후 회차에서
    if (signatures >= 2) {
      for (const em of episodeMaxes) {
        if (em.episodeNum > lastSigEpisode && em.maxDaily >= THIRD_SIG_THRESHOLD) {
          signatures = 3
          sigDetails.push({ sigNum: 3, episodeNum: em.episodeNum, amount: em.maxDaily })
          lastSigEpisode = em.episodeNum
          break
        }
      }
    }

    if (signatures > 0) {
      results.push({ donor_name: donor, episodeMaxes, signatures, sigDetails })
    }
  }

  // 시그니처 개수 내림차순 정렬
  results.sort((a, b) => {
    if (b.signatures !== a.signatures) return b.signatures - a.signatures
    const aTotal = a.sigDetails.reduce((s, d) => s + d.amount, 0)
    const bTotal = b.sigDetails.reduce((s, d) => s + d.amount, 0)
    return bTotal - aTotal
  })

  // 결과 출력
  console.log('='.repeat(80))
  console.log('시그니처 자격자 (회차 순서대로)')
  console.log('='.repeat(80))

  // 3개 시그
  const threeSig = results.filter(r => r.signatures === 3)
  console.log(`\n🏆🏆🏆 3개 시그니처: ${threeSig.length}명`)
  console.log('-'.repeat(80))
  for (const r of threeSig) {
    console.log(`\n${r.donor_name}`)
    for (const s of r.sigDetails) {
      console.log(`  ${s.sigNum}번째 시그: ${s.episodeNum}화 → ${s.amount.toLocaleString()} 하트`)
    }
  }

  // 2개 시그
  const twoSig = results.filter(r => r.signatures === 2)
  console.log(`\n\n🏆🏆 2개 시그니처: ${twoSig.length}명`)
  console.log('-'.repeat(80))
  for (const r of twoSig) {
    console.log(`\n${r.donor_name}`)
    for (const s of r.sigDetails) {
      console.log(`  ${s.sigNum}번째 시그: ${s.episodeNum}화 → ${s.amount.toLocaleString()} 하트`)
    }
    // 3번째 시그 가능성 체크
    const lastEp = r.sigDetails[r.sigDetails.length - 1].episodeNum
    const nextEps = r.episodeMaxes.filter(e => e.episodeNum > lastEp)
    if (nextEps.length > 0) {
      const best = nextEps.sort((a, b) => b.maxDaily - a.maxDaily)[0]
      if (best.maxDaily < THIRD_SIG_THRESHOLD) {
        console.log(`  → 3번째까지: ${best.episodeNum}화에서 ${(THIRD_SIG_THRESHOLD - best.maxDaily).toLocaleString()} 부족`)
      }
    }
  }

  // 1개 시그
  const oneSig = results.filter(r => r.signatures === 1)
  console.log(`\n\n🏆 1개 시그니처: ${oneSig.length}명`)
  console.log('-'.repeat(80))
  for (const r of oneSig) {
    console.log(`\n${r.donor_name}`)
    for (const s of r.sigDetails) {
      console.log(`  ${s.sigNum}번째 시그: ${s.episodeNum}화 → ${s.amount.toLocaleString()} 하트`)
    }
    // 2번째 시그 가능성 체크
    const lastEp = r.sigDetails[0].episodeNum
    const nextEps = r.episodeMaxes.filter(e => e.episodeNum > lastEp)
    if (nextEps.length > 0) {
      const best = nextEps.sort((a, b) => b.maxDaily - a.maxDaily)[0]
      if (best.maxDaily < SECOND_SIG_THRESHOLD) {
        console.log(`  → 2번째까지: ${best.episodeNum}화에서 ${(SECOND_SIG_THRESHOLD - best.maxDaily).toLocaleString()} 부족`)
      } else {
        console.log(`  → 2번째 가능: ${best.episodeNum}화에서 ${best.maxDaily.toLocaleString()} 하트`)
      }
    }
  }

  // 요약
  console.log('\n\n' + '='.repeat(80))
  console.log('요약')
  console.log('='.repeat(80))
  console.log(`3개 시그니처: ${threeSig.length}명`)
  console.log(`2개 시그니처: ${twoSig.length}명`)
  console.log(`1개 시그니처: ${oneSig.length}명`)
  console.log(`총 자격자: ${results.length}명`)
}

main().catch(console.error)
