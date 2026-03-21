'use server'

import { adminAction, type ActionResult } from '../index'
import { nicknameAliases } from '@/lib/utils/nickname-aliases'
import { fetchAllDonationsExtended } from '@/lib/utils/analytics-helpers'

import type { DonorRetentionData } from './types'

// ==================== 후원자 리텐션 분석 ====================

export async function getDonorRetention(
  seasonId?: number
): Promise<ActionResult<DonorRetentionData>> {
  return adminAction(async (supabase) => {
    // 에피소드 목록 (확정된 엑셀부 회차만 — totalEpisodes 기반 계산 정합성)
    // NOTE: fetchFinalizedEpisodes 헬퍼 미사용 — title 필드가 추가로 필요 (코호트 라벨용)
    let epQuery = supabase
      .from('episodes')
      .select('id, episode_number, title, description, is_rank_battle')
      .eq('is_finalized', true)
      .eq('unit', 'excel')
      .order('episode_number', { ascending: true })

    if (seasonId) {
      epQuery = epQuery.eq('season_id', seasonId)
    }

    const { data: episodes, error: epError } = await epQuery
    if (epError) throw new Error(epError.message)
    if (!episodes || episodes.length === 0) {
      return {
        seasonSummary: {
          total_donors: 0,
          returning_donors: 0,
          returning_rate: 0,
          core_fans: 0,
          regular_donors: 0,
          occasional_donors: 0,
          onetime_donors: 0,
          avg_episodes: 0,
          total_episodes: 0,
          total_hearts: 0,
          avg_hearts_per_episode: 0,
          core_fans_hearts: 0,
          core_fans_hearts_pct: 0,
          regular_hearts: 0,
          regular_hearts_pct: 0,
          occasional_hearts: 0,
          occasional_hearts_pct: 0,
          onetime_hearts: 0,
          onetime_hearts_pct: 0,
          top5_donors: [],
          top5_hearts_pct: 0,
          top10_hearts_pct: 0,
          stable_revenue_ratio: 0,
          best_episode: { number: 0, hearts: 0 },
          worst_episode: { number: 0, hearts: 0 },
        },
        cohorts: [],
        pareto: [],
        funnel: [],
        avgDonationTrend: [],
        growthAccounting: [],
        insights: [],
      }
    }

    // 캐시된 fetchAllDonationsExtended 활용 (중복 DB 조회 방지)
    const episodeIdSet = new Set(episodes.map((e) => e.id))
    const rawDonations = await fetchAllDonationsExtended(supabase, seasonId)
    const allDonations = rawDonations
      .filter((d) => d.episode_id && episodeIdSet.has(d.episode_id))
      .map((d) => ({ episode_id: d.episode_id!, donor_name: d.donor_name, amount: d.amount }))

    // donor → 참여 에피소드 Map
    const donorEpisodes = new Map<string, Set<number>>()
    const donorHearts = new Map<string, number>()

    for (const d of allDonations) {
      if (!d.donor_name) continue
      // 닉네임 변경 유저 정규화 (구 닉네임 → 현재 닉네임)
      const name = nicknameAliases[d.donor_name] || d.donor_name
      if (!donorEpisodes.has(name)) {
        donorEpisodes.set(name, new Set())
      }
      donorEpisodes.get(name)!.add(d.episode_id)
      donorHearts.set(name, (donorHearts.get(name) || 0) + (d.amount || 0))
    }

    const episodeNumberMap = new Map(episodes.map((e) => [e.id, e.episode_number]))
    const episodeTitleMap = new Map(episodes.map((e) => [e.episode_number, e.title]))
    const episodeDescMap = new Map(
      episodes.map((e) => [e.episode_number, (e.description as string | null) ?? null])
    )
    const episodeRankBattleMap = new Map(
      episodes.map((e) => [e.episode_number, !!e.is_rank_battle])
    )
    const episodeNumbers = episodes.map((e) => e.episode_number).sort((a, b) => a - b)
    const totalEpisodes = episodeNumbers.length

    // donor → 참여 에피소드 번호 Set (O(1) 검색용)
    const donorEpNumSet = new Map<string, Set<number>>()
    const donorFirstEp = new Map<string, number>()
    for (const [donor, epIds] of donorEpisodes) {
      const epNumsSet = new Set([...epIds].map((id) => episodeNumberMap.get(id) ?? 0))
      donorEpNumSet.set(donor, epNumsSet)
      const sorted = [...epNumsSet].sort((a, b) => a - b)
      donorFirstEp.set(donor, sorted[0])
    }

    // === Growth Accounting: 에피소드별 신규/유지/복귀/이탈 분해 ===
    const donorEpHeartsMap = new Map<string, Map<number, number>>()
    for (const d of allDonations) {
      if (!d.donor_name) continue
      const name = nicknameAliases[d.donor_name] || d.donor_name
      const epNum = episodeNumberMap.get(d.episode_id) ?? 0
      if (epNum === 0) continue
      if (!donorEpHeartsMap.has(name)) donorEpHeartsMap.set(name, new Map())
      const epMap = donorEpHeartsMap.get(name)!
      epMap.set(epNum, (epMap.get(epNum) || 0) + (d.amount || 0))
    }

    const growthAccounting: DonorRetentionData['growthAccounting'] = []
    const allDonorNames = [...donorEpisodes.keys()]

    for (let i = 0; i < episodeNumbers.length; i++) {
      const curEp = episodeNumbers[i]
      const prevEp = i > 0 ? episodeNumbers[i - 1] : null

      let newDonorsGA = 0,
        retainedDonorsGA = 0,
        resurrectedDonorsGA = 0,
        churnedDonorsGA = 0
      let newHeartsGA = 0,
        retainedHeartsGA = 0,
        resurrectedHeartsGA = 0,
        lostHeartsGA = 0

      const curDonors = new Set<string>()
      const prevDonors = new Set<string>()
      const earlierDonors = new Set<string>()

      for (const name of allDonorNames) {
        const epSet = donorEpNumSet.get(name)!
        if (epSet.has(curEp)) curDonors.add(name)
        if (prevEp !== null && epSet.has(prevEp)) prevDonors.add(name)
        // "earlier" = any episode before prevEp
        for (let j = 0; j < i - 1; j++) {
          if (epSet.has(episodeNumbers[j])) {
            earlierDonors.add(name)
            break
          }
        }
      }

      for (const name of curDonors) {
        const hearts = donorEpHeartsMap.get(name)?.get(curEp) || 0
        if (prevEp !== null && prevDonors.has(name)) {
          // Retained: in prev + in cur
          retainedDonorsGA++
          retainedHeartsGA += hearts
        } else if (earlierDonors.has(name)) {
          // Resurrected: was in some earlier episode but not prev
          resurrectedDonorsGA++
          resurrectedHeartsGA += hearts
        } else {
          // New: first time ever
          newDonorsGA++
          newHeartsGA += hearts
        }
      }

      // Churned: in prev but not in cur
      if (prevEp !== null) {
        for (const name of prevDonors) {
          if (!curDonors.has(name)) {
            churnedDonorsGA++
            lostHeartsGA += donorEpHeartsMap.get(name)?.get(prevEp) || 0
          }
        }
      }

      growthAccounting.push({
        episode_number: curEp,
        description: episodeDescMap.get(curEp) ?? null,
        is_rank_battle: episodeRankBattleMap.get(curEp) ?? false,
        new_donors: newDonorsGA,
        retained_donors: retainedDonorsGA,
        resurrected_donors: resurrectedDonorsGA,
        churned_donors: churnedDonorsGA,
        new_hearts: newHeartsGA,
        retained_hearts: retainedHeartsGA,
        resurrected_hearts: resurrectedHeartsGA,
        lost_hearts: -lostHeartsGA,
        net_growth: newDonorsGA + resurrectedDonorsGA - churnedDonorsGA,
      })
    }

    // === 코호트 리텐션 ===
    const cohortMap = new Map<number, Set<string>>()
    for (const [donor, firstEp] of donorFirstEp) {
      if (!cohortMap.has(firstEp)) cohortMap.set(firstEp, new Set())
      cohortMap.get(firstEp)!.add(donor)
    }

    const cohorts = episodeNumbers
      .filter((epNum) => cohortMap.has(epNum))
      .map((epNum) => {
        const cohortDonors = cohortMap.get(epNum)!
        const retention = episodeNumbers
          .filter((n) => n >= epNum)
          .map((targetEp) => {
            let retained = 0
            for (const donor of cohortDonors) {
              if (donorEpNumSet.get(donor)!.has(targetEp)) retained++
            }
            return {
              episode_number: targetEp,
              retained,
              rate: cohortDonors.size > 0 ? Math.round((retained / cohortDonors.size) * 100) : 0,
            }
          })

        return {
          first_episode: epNum,
          first_episode_title: episodeTitleMap.get(epNum) || `${epNum}화`,
          total_donors: cohortDonors.size,
          retention,
        }
      })

    // === 시즌 참여 요약 (완결 시즌 기준 분류) ===
    const coreThreshold = Math.ceil(totalEpisodes * 0.6) // 60%+ → 핵심 팬
    let coreFans = 0 // 60%+ 참여 (예: 15회 중 9회+)
    let regularDonors = 0 // 4회 ~ (60%-1) 참여
    let occasionalDonors = 0 // 2-3회 참여
    let onetimeDonors = 0 // 1회만 참여
    let totalParticipation = 0

    for (const [donor] of donorEpisodes) {
      const epNumsSet = donorEpNumSet.get(donor)!
      const count = epNumsSet.size
      totalParticipation += count

      if (count >= coreThreshold) coreFans++
      else if (count >= 4) regularDonors++
      else if (count >= 2) occasionalDonors++
      else onetimeDonors++
    }

    const totalDonorCount = donorEpisodes.size
    const returningDonors = totalDonorCount - onetimeDonors
    const returningRate =
      totalDonorCount > 0 ? Math.round((returningDonors / totalDonorCount) * 100 * 10) / 10 : 0
    const avgEpisodes =
      totalDonorCount > 0 ? Math.round((totalParticipation / totalDonorCount) * 10) / 10 : 0

    // === 매출 지표 계산 ===
    const totalHeartsAll = [...donorHearts.values()].reduce((s, h) => s + h, 0)
    const avgHeartsPerEpisode = totalEpisodes > 0 ? Math.round(totalHeartsAll / totalEpisodes) : 0

    // 세그먼트별 하트 (핵심 팬 / 단골 / 간헐 / 1회성)
    let coreFansHearts = 0,
      regularHeartsSum = 0,
      occasionalHeartsSum = 0,
      onetimeHeartsSum = 0
    for (const [donor] of donorEpisodes) {
      const count = donorEpNumSet.get(donor)?.size ?? 0
      const hearts = donorHearts.get(donor) || 0
      if (count >= coreThreshold) coreFansHearts += hearts
      else if (count >= 4) regularHeartsSum += hearts
      else if (count >= 2) occasionalHeartsSum += hearts
      else onetimeHeartsSum += hearts
    }

    const pctOf = (v: number) =>
      totalHeartsAll > 0 ? Math.round((v / totalHeartsAll) * 1000) / 10 : 0

    // 상위 후원자 의존도
    const sortedByHearts = [...donorHearts.entries()].sort((a, b) => b[1] - a[1])
    const top5Hearts = sortedByHearts.slice(0, 5).reduce((s, [, h]) => s + h, 0)
    const top10Hearts = sortedByHearts.slice(0, 10).reduce((s, [, h]) => s + h, 0)
    const top5Donors = sortedByHearts.slice(0, 5).map(([name, hearts]) => ({ name, hearts }))

    // 매출 안정성: 단골(4회+) 이상 후원자의 하트 비중
    const stableRevenue = coreFansHearts + regularHeartsSum
    const stableRevenueRatio =
      totalHeartsAll > 0 ? Math.round((stableRevenue / totalHeartsAll) * 1000) / 10 : 0

    // 에피소드별 하트 합계 → 최고/최저
    const epHeartsSum = new Map<number, number>()
    for (const d of allDonations) {
      const epNum = episodeNumberMap.get(d.episode_id) ?? 0
      if (epNum > 0) epHeartsSum.set(epNum, (epHeartsSum.get(epNum) || 0) + (d.amount || 0))
    }
    let bestEp = { number: 0, hearts: 0 }
    let worstEp = { number: 0, hearts: Infinity }
    for (const [epNum, hearts] of epHeartsSum) {
      if (hearts > bestEp.hearts) bestEp = { number: epNum, hearts }
      if (hearts < worstEp.hearts) worstEp = { number: epNum, hearts }
    }
    if (worstEp.hearts === Infinity) worstEp = { number: 0, hearts: 0 }

    // === 파레토 분석 ===
    const sortedDonors = [...donorHearts.entries()].sort((a, b) => b[1] - a[1])
    const pareto: DonorRetentionData['pareto'] = []
    let cumHearts = 0

    for (const percent of [5, 10, 20, 30, 50, 80, 100]) {
      const idx = Math.ceil(sortedDonors.length * (percent / 100))
      cumHearts = sortedDonors.slice(0, idx).reduce((s, [, h]) => s + h, 0)
      pareto.push({
        top_percent: percent,
        hearts_percent: totalHeartsAll > 0 ? Math.round((cumHearts / totalHeartsAll) * 100) : 0,
      })
    }

    // === 퍼널 (참여 깊이 분석) ===
    const allDonorCount = donorEpisodes.size
    const twoPlus = [...donorEpisodes.values()].filter((s) => s.size >= 2).length
    const fourPlus = [...donorEpisodes.values()].filter((s) => s.size >= 4).length
    const eightPlus = [...donorEpisodes.values()].filter((s) => s.size >= 8).length
    const tenPlus = [...donorEpisodes.values()].filter((s) => s.size >= 10).length

    const funnel = [
      { label: '전체 후원자', count: allDonorCount },
      { label: '2회+ (재참여)', count: twoPlus },
      { label: '4회+ (단골)', count: fourPlus },
      { label: '8회+ (충성)', count: eightPlus },
      { label: '10회+ (핵심)', count: tenPlus },
    ]

    // === 회차별 평균/중앙값 추이 ===
    const epDonationAmounts = new Map<number, number[]>()
    for (const d of allDonations) {
      const epNum = episodeNumberMap.get(d.episode_id) ?? 0
      if (!epDonationAmounts.has(epNum)) epDonationAmounts.set(epNum, [])
      epDonationAmounts.get(epNum)!.push(d.amount || 0)
    }

    const avgDonationTrend = episodeNumbers.map((epNum) => {
      const amounts = epDonationAmounts.get(epNum) || []
      const avg =
        amounts.length > 0 ? Math.round(amounts.reduce((s, a) => s + a, 0) / amounts.length) : 0
      const sorted = [...amounts].sort((a, b) => a - b)
      const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0
      return { episode_number: epNum, avg_amount: avg, median_amount: median }
    })

    // === 자동 인사이트 (매출 관리 관점) ===
    const formatNum = (n: number) => n.toLocaleString('ko-KR')
    const insights: string[] = []

    // 매출 안정성
    if (stableRevenueRatio > 0) {
      if (stableRevenueRatio >= 60) {
        insights.push(
          `매출의 ${stableRevenueRatio}%가 단골(4회+) 이상에서 발생합니다. 안정적인 수익 구조입니다.`
        )
      } else {
        insights.push(
          `단골(4회+) 이상의 매출 비중이 ${stableRevenueRatio}%입니다. 1회성/간헐 후원자 의존도가 높아 변동 위험이 있습니다.`
        )
      }
    }

    // 상위 의존도 경고
    if (pctOf(top5Hearts) >= 30) {
      insights.push(
        `상위 5명이 전체 매출의 ${pctOf(top5Hearts)}%를 차지합니다. 핵심 후원자 관리가 최우선입니다.`
      )
    }

    // 핵심 팬 가치
    if (coreFans > 0 && totalHeartsAll > 0) {
      const avgCoreFanHearts = Math.round(coreFansHearts / coreFans)
      insights.push(
        `핵심 팬 ${coreFans}명의 1인당 평균 ${formatNum(avgCoreFanHearts)} 하트 — 전체 매출의 ${pctOf(coreFansHearts)}%입니다.`
      )
    }

    // 1회성 매출 비중
    if (onetimeDonors > 0 && totalHeartsAll > 0) {
      const onetimeRevPct = pctOf(onetimeHeartsSum)
      if (onetimeRevPct >= 15) {
        insights.push(
          `1회성 후원자(${onetimeDonors}명)가 매출의 ${onetimeRevPct}%를 발생시켰습니다. 재참여 유도 시 성장 여지가 큽니다.`
        )
      }
    }

    return {
      seasonSummary: {
        total_donors: totalDonorCount,
        returning_donors: returningDonors,
        returning_rate: returningRate,
        core_fans: coreFans,
        regular_donors: regularDonors,
        occasional_donors: occasionalDonors,
        onetime_donors: onetimeDonors,
        avg_episodes: avgEpisodes,
        total_episodes: totalEpisodes,
        // 매출 지표
        total_hearts: totalHeartsAll,
        avg_hearts_per_episode: avgHeartsPerEpisode,
        core_fans_hearts: coreFansHearts,
        core_fans_hearts_pct: pctOf(coreFansHearts),
        regular_hearts: regularHeartsSum,
        regular_hearts_pct: pctOf(regularHeartsSum),
        occasional_hearts: occasionalHeartsSum,
        occasional_hearts_pct: pctOf(occasionalHeartsSum),
        onetime_hearts: onetimeHeartsSum,
        onetime_hearts_pct: pctOf(onetimeHeartsSum),
        top5_donors: top5Donors,
        top5_hearts_pct: pctOf(top5Hearts),
        top10_hearts_pct: pctOf(top10Hearts),
        stable_revenue_ratio: stableRevenueRatio,
        best_episode: bestEp,
        worst_episode: worstEp,
      },
      cohorts,
      pareto,
      funnel,
      avgDonationTrend,
      growthAccounting,
      insights,
    }
  })
}
