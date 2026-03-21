'use server'

import { adminAction, type ActionResult } from '../index'
import {
  linearRegression,
  fetchAllDonationsExtended,
  fetchFinalizedEpisodes,
} from '@/lib/utils/analytics-helpers'
import type {
  BjInsightsData,
  BjInsightEntry,
} from './types'
import { normalizeName } from './advanced-helpers'

// ==================== getBjActionableInsights ====================

export async function getBjActionableInsights(
  seasonId?: number,
  episodeId?: number
): Promise<ActionResult<BjInsightsData>> {
  return adminAction(async (supabase) => {
    const episodes = await fetchFinalizedEpisodes(supabase, seasonId)
    if (episodes.length === 0) {
      return { global_retention_rate: 0, entries: [] }
    }

    const finalizedIds = episodes.map((e) => e.id)
    const donations = await fetchAllDonationsExtended(
      supabase,
      seasonId,
      episodeId
    )
    const filteredDonations = episodeId
      ? donations
      : donations.filter(
          (d) => d.episode_id && finalizedIds.includes(d.episode_id)
        )

    const sortedEps = [...episodes].sort(
      (a, b) => a.episode_number - b.episode_number
    )
    const epIdToIdx = new Map(sortedEps.map((e, i) => [e.id, i]))
    const epIdToInfo = new Map(sortedEps.map((e) => [e.id, e]))

    // BJ별 → 에피소드별 → 도너별 하트
    const bjEpDonorMap = new Map<
      string,
      Map<number, Map<string, number>>
    >()

    for (const d of filteredDonations) {
      if (!d.donor_name || !d.target_bj || !d.episode_id) continue
      const name = normalizeName(d.donor_name)
      const bj = d.target_bj
      const amount = d.amount || 0

      if (!bjEpDonorMap.has(bj)) bjEpDonorMap.set(bj, new Map())
      const epMap = bjEpDonorMap.get(bj)!
      if (!epMap.has(d.episode_id)) epMap.set(d.episode_id, new Map())
      const donorMap = epMap.get(d.episode_id)!
      donorMap.set(name, (donorMap.get(name) || 0) + amount)
    }

    const entries: BjInsightEntry[] = []

    // 전체 평균 신규 후원자 정착률 (비교용)
    let globalNewDonorCount = 0
    let globalReturnedCount = 0

    // 1차 패스: 각 BJ의 신규 도너 정착률 계산 (글로벌 평균 산출용)
    for (const [_bj, epMap] of bjEpDonorMap) {
      const bjSortedEpIds = [...epMap.keys()]
        .filter((id) => epIdToIdx.has(id))
        .sort((a, b) => (epIdToIdx.get(a) || 0) - (epIdToIdx.get(b) || 0))

      const seenDonors = new Set<string>()
      const newDonors = new Map<string, number>()

      for (const epId of bjSortedEpIds) {
        const donors = epMap.get(epId)!
        for (const [donor] of donors) {
          if (!seenDonors.has(donor)) {
            seenDonors.add(donor)
            newDonors.set(donor, epIdToIdx.get(epId) || 0)
          }
        }
      }

      const lastEpIdx = sortedEps.length - 1
      for (const [donor, firstIdx] of newDonors) {
        if (firstIdx >= lastEpIdx) continue
        globalNewDonorCount++
        let returnCount = 0
        for (const epId of bjSortedEpIds) {
          const idx = epIdToIdx.get(epId) || 0
          if (idx > firstIdx && epMap.get(epId)?.has(donor)) {
            returnCount++
          }
        }
        if (returnCount >= 1) globalReturnedCount++
      }
    }

    const globalRetentionRate =
      globalNewDonorCount > 0
        ? Math.round((globalReturnedCount / globalNewDonorCount) * 1000) / 10
        : 0

    // 2차 패스: 실제 분석
    for (const [bj, epMap] of bjEpDonorMap) {
      const bjSortedEpIds = [...epMap.keys()]
        .filter((id) => epIdToIdx.has(id))
        .sort((a, b) => (epIdToIdx.get(a) || 0) - (epIdToIdx.get(b) || 0))

      if (bjSortedEpIds.length === 0) continue

      // --- 성장 추세 (linearRegression) ---
      const epHearts: { x: number; y: number }[] = bjSortedEpIds.map(
        (epId) => {
          const donors = epMap.get(epId)!
          let total = 0
          for (const [, h] of donors) total += h
          return { x: epIdToIdx.get(epId) || 0, y: total }
        }
      )

      // --- 도너 건강 분포 ---
      const donorTimelines = new Map<string, { idx: number; hearts: number }[]>()
      for (const epId of bjSortedEpIds) {
        const donors = epMap.get(epId)!
        const idx = epIdToIdx.get(epId) || 0
        for (const [donor, hearts] of donors) {
          if (!donorTimelines.has(donor))
            donorTimelines.set(donor, [])
          donorTimelines.get(donor)!.push({ idx, hearts })
        }
      }

      const health = { growing: 0, stable: 0, declining: 0, at_risk: 0 }
      for (const [, timeline] of donorTimelines) {
        if (timeline.length < 2) {
          health.stable++
          continue
        }
        const reg = linearRegression(
          timeline.map((t) => ({ x: t.idx, y: t.hearts }))
        )
        const avgH =
          timeline.reduce((s, t) => s + t.hearts, 0) / timeline.length
        const slopeRatio = avgH > 0 ? reg.slope / avgH : 0

        const lastIdx = sortedEps[sortedEps.length - 1]
          ? epIdToIdx.get(sortedEps[sortedEps.length - 1].id) || 0
          : 0
        const maxDonorIdx = Math.max(...timeline.map((t) => t.idx))
        const gap = lastIdx - maxDonorIdx

        if (gap >= 3) {
          health.at_risk++
        } else if (slopeRatio > 0.05) {
          health.growing++
        } else if (slopeRatio < -0.05) {
          health.declining++
        } else {
          health.stable++
        }
      }

      // --- 직급전 효과 ---
      let rankBattleAvg = 0
      let regularAvg = 0
      let rbCount = 0
      let regCount = 0

      for (const epId of bjSortedEpIds) {
        const info = epIdToInfo.get(epId)
        const donors = epMap.get(epId)!
        let total = 0
        for (const [, h] of donors) total += h

        if (info?.is_rank_battle) {
          rankBattleAvg += total
          rbCount++
        } else {
          regularAvg += total
          regCount++
        }
      }

      rankBattleAvg = rbCount > 0 ? rankBattleAvg / rbCount : 0
      regularAvg = regCount > 0 ? regularAvg / regCount : 0
      const rankBattleEffect =
        regularAvg > 0
          ? Math.round((rankBattleAvg / regularAvg) * 100) / 100
          : 0

      // --- 신규 후원자 정착률 ---
      const seenDonors = new Set<string>()
      const newDonors = new Map<string, number>()

      for (const epId of bjSortedEpIds) {
        const donors = epMap.get(epId)!
        const idx = epIdToIdx.get(epId) || 0
        for (const [donor] of donors) {
          if (!seenDonors.has(donor)) {
            seenDonors.add(donor)
            newDonors.set(donor, idx)
          }
        }
      }

      let newCount = 0
      let returnedCount = 0
      const lastEpIdx2 = sortedEps.length - 1
      for (const [donor, firstIdx] of newDonors) {
        if (firstIdx >= lastEpIdx2) continue
        newCount++
        let returned = false
        for (const epId of bjSortedEpIds) {
          const idx = epIdToIdx.get(epId) || 0
          if (idx > firstIdx && epMap.get(epId)?.has(donor)) {
            returned = true
            break
          }
        }
        if (returned) returnedCount++
      }

      const newDonorRetentionRate =
        newCount > 0 ? Math.round((returnedCount / newCount) * 1000) / 10 : 0

      // --- 인사이트 생성 (최대 3개) ---
      const actionableInsights: string[] = []

      if (rbCount > 0 && rankBattleEffect > 1.1) {
        const pctUp = Math.round((rankBattleEffect - 1) * 100)
        actionableInsights.push(
          `직급전에서 평소 대비 +${pctUp}% 후원을 받습니다`
        )
      } else if (rbCount > 0 && rankBattleEffect < 0.9 && rankBattleEffect > 0) {
        const pctDown = Math.round((1 - rankBattleEffect) * 100)
        actionableInsights.push(
          `직급전에서 오히려 후원이 ${pctDown}% 감소합니다. 직급전 전략 재검토가 필요합니다`
        )
      }

      if (
        newCount >= 3 &&
        newDonorRetentionRate < globalRetentionRate &&
        globalRetentionRate > 0
      ) {
        actionableInsights.push(
          `신규 후원자 정착률이 ${newDonorRetentionRate}%로 낮습니다 (평균 ${globalRetentionRate}%). 신규 후원자에게 방송 중 이름 불러주기를 시도하세요`
        )
      } else if (newCount >= 3 && newDonorRetentionRate > globalRetentionRate * 1.2) {
        actionableInsights.push(
          `신규 후원자 정착률이 ${newDonorRetentionRate}%로 우수합니다 (평균 ${globalRetentionRate}%)`
        )
      }

      if (epHearts.length >= 3) {
        const reg = linearRegression(epHearts)
        const avgTotal =
          epHearts.reduce((s, p) => s + p.y, 0) / epHearts.length
        const growthPct =
          avgTotal > 0
            ? Math.round((reg.slope / avgTotal) * 1000) / 10
            : 0

        if (growthPct > 5) {
          actionableInsights.push(
            `회차당 ${growthPct}% 성장 중입니다. 현재 전략을 유지하세요`
          )
        } else if (growthPct < -5) {
          actionableInsights.push(
            `회차당 ${Math.abs(growthPct)}% 하락 추세입니다. 이벤트/콜라보로 전환이 필요합니다`
          )
        }
      }

      const totalDonors =
        health.growing + health.stable + health.declining + health.at_risk
      if (totalDonors > 0) {
        const atRiskPct = Math.round(
          ((health.declining + health.at_risk) / totalDonors) * 100
        )
        if (atRiskPct >= 40 && actionableInsights.length < 3) {
          actionableInsights.push(
            `후원자 중 ${atRiskPct}%가 하락/이탈 위험입니다. 핵심 후원자 리텐션에 집중하세요`
          )
        }
      }

      // --- 최고/최저 에피소드 ---
      let bestEp: BjInsightEntry['best_episode'] = null
      let worstEp: BjInsightEntry['worst_episode'] = null
      if (epHearts.length >= 2) {
        const participated = epHearts.filter(e => e.y > 0)
        if (participated.length >= 2) {
          const best = participated.reduce((max, e) => e.y > max.y ? e : max, participated[0])
          const worst = participated.reduce((min, e) => e.y < min.y ? e : min, participated[0])
          const bestInfo = [...epIdToInfo.values()].find(e => (epIdToIdx.get(e.id) || 0) === best.x)
          const worstInfo = [...epIdToInfo.values()].find(e => (epIdToIdx.get(e.id) || 0) === worst.x)
          if (bestInfo) {
            bestEp = { episode_number: bestInfo.episode_number, hearts: best.y, description: bestInfo.description }
          }
          if (worstInfo && worst.x !== best.x) {
            worstEp = { episode_number: worstInfo.episode_number, hearts: worst.y, description: worstInfo.description }
          }
        }
      }

      entries.push({
        bj_name: bj,
        donor_health: health,
        rank_battle_effect: rankBattleEffect,
        new_donor_retention_rate: newDonorRetentionRate,
        best_episode: bestEp,
        worst_episode: worstEp,
        actionable_insights: actionableInsights.slice(0, 3),
      })
    }

    entries.sort((a, b) => {
      const aDonors =
        a.donor_health.growing +
        a.donor_health.stable +
        a.donor_health.declining +
        a.donor_health.at_risk
      const bDonors =
        b.donor_health.growing +
        b.donor_health.stable +
        b.donor_health.declining +
        b.donor_health.at_risk
      return bDonors - aDonors
    })

    return { global_retention_rate: globalRetentionRate, entries }
  })
}
