'use server'

import { adminAction, type ActionResult } from '../index'
import {
  linearRegression,
  fetchAllDonationsExtended,
  fetchFinalizedEpisodes,
} from '@/lib/utils/analytics-helpers'
import type {
  ChurnPredictionData,
  ChurnPredictionEntry,
} from './types'
import { buildDonorEpisodeMap, getRiskLevel } from './advanced-helpers'

// ==================== getAdvancedChurnPrediction ====================

export async function getAdvancedChurnPrediction(
  seasonId?: number
): Promise<ActionResult<ChurnPredictionData>> {
  return adminAction(async (supabase) => {
    const episodes = await fetchFinalizedEpisodes(supabase, seasonId)
    if (episodes.length < 3) {
      return {
        entries: [],
        summary: {
          danger_count: 0,
          warning_count: 0,
          watch_count: 0,
          safe_count: 0,
          total_at_risk_hearts: 0,
        },
      }
    }

    const finalizedIds = episodes.map((e) => e.id)
    const donations = await fetchAllDonationsExtended(supabase, seasonId)
    const filteredDonations = donations.filter(
      (d) => d.episode_id && finalizedIds.includes(d.episode_id)
    )

    const { donorEpMap, donorTotalHearts, donorFavoriteBj } =
      buildDonorEpisodeMap(filteredDonations, episodes)

    const sortedEps = [...episodes].sort(
      (a, b) => a.episode_number - b.episode_number
    )
    const epIdToIdx = new Map(sortedEps.map((e, i) => [e.id, i]))
    const totalEps = sortedEps.length

    // 최근 3회차 ID (마지막 3개 에피소드)
    const last3Eps = sortedEps.slice(Math.max(0, totalEps - 3))

    // 직급전 / 일반 에피소드
    const rankBattleEpIds = new Set(
      sortedEps.filter((e) => e.is_rank_battle).map((e) => e.id)
    )
    const regularEpIds = new Set(
      sortedEps.filter((e) => !e.is_rank_battle).map((e) => e.id)
    )

    // 고액 기준: 상위 20%
    const allHearts = [...donorTotalHearts.values()].sort((a, b) => b - a)
    const highValueThreshold =
      allHearts.length > 0
        ? allHearts[Math.floor(allHearts.length * 0.2)] || 0
        : 0

    const entries: ChurnPredictionEntry[] = []

    for (const [name, epMap] of donorEpMap) {
      if (epMap.size < 1) continue

      const totalHearts = donorTotalHearts.get(name) || 0
      const favBj = donorFavoriteBj.get(name) || '(없음)'

      // --- Signal 1: 최근 불참 (0-35) ---
      const missedRecent = last3Eps.filter((e) => !epMap.has(e.id)).length

      let frequencySignal = 0
      if (missedRecent === 3) frequencySignal = 35
      else if (missedRecent === 2) frequencySignal = 20
      else if (missedRecent === 1) frequencySignal = 5

      // --- Signal 2: 부재 기간 (0-30) ---
      let gapSinceLast = totalEps
      for (let i = sortedEps.length - 1; i >= 0; i--) {
        if (epMap.has(sortedEps[i].id)) {
          gapSinceLast = sortedEps.length - 1 - i
          break
        }
      }

      let gapSignal = 0
      if (gapSinceLast >= 6) gapSignal = 30
      else if (gapSinceLast >= 5) gapSignal = 25
      else if (gapSinceLast >= 4) gapSignal = 20
      else if (gapSinceLast >= 3) gapSignal = 15
      else if (gapSinceLast >= 2) gapSignal = 8

      // --- Signal 3: 금액 감소 추세 (0-20) ---
      const amountPoints: { x: number; y: number }[] = []
      for (const [epId, data] of epMap) {
        const idx = epIdToIdx.get(epId)
        if (idx !== undefined) {
          amountPoints.push({ x: idx, y: data.hearts })
        }
      }

      let amountSignal = 0
      if (amountPoints.length >= 3) {
        const reg = linearRegression(amountPoints)
        const avgAmount = totalHearts / epMap.size
        if (avgAmount > 0) {
          const slopeRatio = reg.slope / avgAmount
          if (slopeRatio < -0.05) {
            amountSignal = Math.min(20, Math.round(Math.abs(slopeRatio) * 80))
          }
        }
      }

      // --- Signal 4: 직급전 불참 (0-15) ---
      let rankBattleSignal = 0
      if (rankBattleEpIds.size >= 2 && regularEpIds.size >= 2) {
        const regularParticipation = [...regularEpIds].filter((id) =>
          epMap.has(id)
        ).length
        const rbParticipation = [...rankBattleEpIds].filter((id) =>
          epMap.has(id)
        ).length

        const regularRate = regularParticipation / regularEpIds.size
        const rbRate = rbParticipation / rankBattleEpIds.size

        if (regularRate > 0.3 && rbRate < regularRate * 0.5) {
          const gap = regularRate - rbRate
          rankBattleSignal = Math.min(15, Math.round(gap * 30))
        }
      }

      const riskScore =
        frequencySignal + gapSignal + amountSignal + rankBattleSignal
      const riskLevel = getRiskLevel(riskScore)

      // --- 추천 문구 생성 ---
      let recommendation = ''
      const isHighValue = totalHearts >= highValueThreshold

      if (gapSinceLast >= 5) {
        recommendation = isHighValue
          ? `${name}님은 ${gapSinceLast}회차째 불참 중인 고액 후원자입니다. ${favBj}를 통해 개별 연락을 검토하세요.`
          : `${name}님이 ${gapSinceLast}회차째 참여하지 않고 있습니다.`
      } else if (missedRecent >= 2 && isHighValue) {
        recommendation = `${name}님은 핵심 후원자인데 최근 ${missedRecent}회 연속 불참입니다. ${favBj}에게 감사 언급을 부탁하세요.`
      } else if (missedRecent >= 2 && amountSignal >= 8) {
        recommendation = `${name}님의 참여 빈도와 후원 금액이 모두 줄고 있습니다.`
      } else if (missedRecent >= 2) {
        recommendation = `${name}님이 최근 ${missedRecent}회 불참입니다. 모니터링이 필요합니다.`
      } else {
        recommendation = `${name}님의 활동이 감소 추세입니다.`
      }

      if (riskScore >= 30) {
        entries.push({
          donor_name: name,
          total_hearts: totalHearts,
          favorite_bj: favBj,
          risk_score: riskScore,
          risk_level: riskLevel,
          signals: {
            frequency: frequencySignal,
            gap: gapSignal,
            amount: amountSignal,
            rank_battle: rankBattleSignal,
          },
          recommendation,
        })
      }
    }

    entries.sort(
      (a, b) => b.total_hearts - a.total_hearts || b.risk_score - a.risk_score
    )

    const top30 = entries.slice(0, 30)

    const summary = {
      danger_count: top30.filter((e) => e.risk_level === '위험').length,
      warning_count: top30.filter((e) => e.risk_level === '주의').length,
      watch_count: top30.filter((e) => e.risk_level === '관심').length,
      safe_count: top30.filter((e) => e.risk_level === '안전').length,
      total_at_risk_hearts: top30
        .filter((e) => e.risk_level !== '안전')
        .reduce((sum, e) => sum + e.total_hearts, 0),
    }

    return { entries: top30, summary }
  })
}
