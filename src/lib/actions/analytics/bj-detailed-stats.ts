'use server'

import { adminAction, type ActionResult } from '../index'
import { nicknameAliases } from '@/lib/utils/nickname-aliases'
import { linearRegression, fetchAllDonationsExtended } from '@/lib/utils/analytics-helpers'

import type { BjDetailedStats, BjDonorDetail, BjGrowthMetrics } from './types'

// ==================== BJ 상세 통계 ====================

export async function getBjDetailedStats(
  seasonId?: number,
  episodeId?: number
): Promise<ActionResult<BjDetailedStats[]>> {
  return adminAction(async (supabase) => {
    // 에피소드 목록 (특정 회차 미지정 시 확정된 엑셀부 회차만)
    // NOTE: fetchFinalizedEpisodes 헬퍼 미사용 — broadcast_date 필드 필요 + episodeId 지정 시 is_finalized 필터 스킵 로직
    let epQuery = supabase
      .from('episodes')
      .select('id, episode_number, broadcast_date, description')
      .eq('unit', 'excel')
      .order('episode_number', { ascending: true })

    if (episodeId) {
      epQuery = epQuery.eq('id', episodeId)
    } else {
      epQuery = epQuery.eq('is_finalized', true)
    }
    if (seasonId) epQuery = epQuery.eq('season_id', seasonId)

    const { data: episodes, error: epError } = await epQuery
    if (epError) throw new Error(epError.message)
    if (!episodes || episodes.length === 0) return []

    const epIdToNum = new Map(episodes.map((e) => [e.id, e.episode_number]))
    const epNumToDesc = new Map(
      episodes.map((e) => [e.episode_number, e.description as string | null])
    )

    // 최신 회차 판별 (broadcast_date 기준)
    const sortedEps = [...episodes]
      .filter((e) => e.broadcast_date)
      .sort((a, b) => new Date(b.broadcast_date).getTime() - new Date(a.broadcast_date).getTime())
    const latestEpId = sortedEps[0]?.id
    const latestEpNum = latestEpId ? (epIdToNum.get(latestEpId) ?? 0) : 0

    // 전체 후원 데이터
    const allData = await fetchAllDonationsExtended(supabase, seasonId, episodeId)
    const data = allData.filter((d) => d.target_bj !== null)
    if (data.length === 0) return []

    // BJ별 → 후원자별 → 에피소드별 하트
    type DonorEpData = Map<number, number> // episode_number → hearts
    type BjDonorData = Map<string, { total: number; count: number; episodes: DonorEpData }>
    const bjDonorMap = new Map<string, BjDonorData>()
    const bjTotals = new Map<
      string,
      { total_hearts: number; donation_count: number; donors: Set<string> }
    >()

    for (const d of data) {
      const bj = d.target_bj?.trim()
      if (!bj || !d.donor_name) continue
      const donorName = nicknameAliases[d.donor_name] || d.donor_name
      const epNum = d.episode_id ? (epIdToNum.get(d.episode_id) ?? 0) : 0

      if (!bjDonorMap.has(bj)) bjDonorMap.set(bj, new Map())
      const donorMap = bjDonorMap.get(bj)!
      if (!donorMap.has(donorName))
        donorMap.set(donorName, { total: 0, count: 0, episodes: new Map() })
      const dd = donorMap.get(donorName)!
      dd.total += d.amount || 0
      dd.count += 1
      if (epNum > 0) dd.episodes.set(epNum, (dd.episodes.get(epNum) || 0) + (d.amount || 0))

      if (!bjTotals.has(bj))
        bjTotals.set(bj, { total_hearts: 0, donation_count: 0, donors: new Set() })
      const bt = bjTotals.get(bj)!
      bt.total_hearts += d.amount || 0
      bt.donation_count += 1
      bt.donors.add(donorName)
    }

    const result: BjDetailedStats[] = []

    for (const [bj_name, donorMap] of bjDonorMap) {
      const bt = bjTotals.get(bj_name)!
      const totalHearts = bt.total_hearts
      const donorCount = bt.donation_count
      const uniqueDonors = bt.donors.size

      // Top 10 후원자
      const donorEntries = [...donorMap.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)

      const top_donors: BjDonorDetail[] = donorEntries.map(([name, dd]) => {
        const epEntries = [...dd.episodes.entries()].sort((a, b) => a[0] - b[0])
        const episode_amounts = epEntries.map(([episode_number, amount]) => ({
          episode_number,
          amount,
        }))

        // is_new: 최신 회차에만 후원 이력
        const hasBeforeLatest = epEntries.some(([epNum]) => epNum < latestEpNum)
        const is_new = !hasBeforeLatest && epEntries.some(([epNum]) => epNum === latestEpNum)

        // trend: 전체 시즌 에피소드 기준 전반/후반 비교 (불참=0 포함)
        const allEpNumsSorted = [...epIdToNum.values()].sort((a, b) => a - b)
        let trend: 'up' | 'down' | 'stable' = 'stable'
        if (allEpNumsSorted.length >= 2) {
          const mid = Math.floor(allEpNumsSorted.length / 2)
          const firstHalfEps = allEpNumsSorted.slice(0, mid)
          const secondHalfEps = allEpNumsSorted.slice(mid)
          const firstAvg =
            firstHalfEps.reduce((s, ep) => s + (dd.episodes.get(ep) || 0), 0) / firstHalfEps.length
          const secondAvg =
            secondHalfEps.reduce((s, ep) => s + (dd.episodes.get(ep) || 0), 0) /
            secondHalfEps.length
          if (secondAvg > firstAvg * 1.2) trend = 'up'
          else if (secondAvg < firstAvg * 0.8) trend = 'down'
        }

        return {
          donor_name: name,
          total_hearts: dd.total,
          donation_count: dd.count,
          is_new,
          trend,
          episode_amounts,
        }
      })

      // 신규 후원자 수
      let newDonorCount = 0
      const notableNew: string[] = []
      const q25 =
        donorEntries.length >= 4 ? donorEntries[Math.floor(donorEntries.length * 0.25)][1].total : 0

      for (const [name, dd] of donorMap) {
        const epNums = [...dd.episodes.keys()]
        const hasBeforeLatest = epNums.some((n) => n < latestEpNum)
        if (!hasBeforeLatest && epNums.includes(latestEpNum)) {
          newDonorCount++
          if (dd.total >= q25 && q25 > 0) notableNew.push(name)
        }
      }

      // 후원 집중도
      const donor_concentration = donorEntries.map(([name, dd]) => ({
        donor_name: name,
        hearts: dd.total,
        percent: totalHearts > 0 ? Math.round((dd.total / totalHearts) * 100) : 0,
      }))

      // ===== 성장 분석 (선형 회귀 기반) =====
      const growthMetrics = computeGrowthMetrics(donorMap, epIdToNum, epNumToDesc)

      result.push({
        bj_name,
        total_hearts: totalHearts,
        donation_count: donorCount,
        unique_donors: uniqueDonors,
        avg_donation: donorCount > 0 ? Math.round(totalHearts / donorCount) : 0,
        top_donors,
        new_donor_count: newDonorCount,
        notable_new_donors: notableNew.slice(0, 5),
        donor_concentration,
        growth_metrics: growthMetrics,
      })
    }

    return result.sort((a, b) => b.total_hearts - a.total_hearts)
  })
}

// ==================== 성장 분석 헬퍼 ====================

type DonorEpData = Map<number, number>
type BjDonorData = Map<string, { total: number; count: number; episodes: DonorEpData }>

function computeGrowthMetrics(
  donorMap: BjDonorData,
  epIdToNum: Map<number, number>,
  epNumToDesc: Map<number, string | null>
): BjGrowthMetrics | null {
  const allEpNums = [...epIdToNum.values()].sort((a, b) => a - b)

  if (allEpNums.length < 3) return null

  // 이 BJ의 에피소드별 하트 합산
  const epHeartsMap = new Map<number, number>()
  for (const [, dd] of donorMap) {
    for (const [epNum, hearts] of dd.episodes) {
      epHeartsMap.set(epNum, (epHeartsMap.get(epNum) || 0) + hearts)
    }
  }

  // 참여한 에피소드만으로 회귀 (불참=0 포함하면 중도하차와 용병데이가 왜곡됨)
  const participatedEps = allEpNums.filter((ep) => (epHeartsMap.get(ep) || 0) > 0)
  const regressionPoints = participatedEps.map((ep, i) => ({
    x: i,
    y: epHeartsMap.get(ep) || 0,
  }))

  const reg = linearRegression(regressionPoints)
  const meanY =
    regressionPoints.length > 0
      ? regressionPoints.reduce((s, p) => s + p.y, 0) / regressionPoints.length
      : 1
  // 성장률: 회차당 평균 대비 slope 비율 (%)
  const growthRate = meanY > 0 ? Math.round((reg.slope / meanY) * 100) : 0

  // 추세선 데이터 (모든 에피소드 포함, 불참은 0)
  const episodeGrowthLine = allEpNums.map((ep) => {
    const idx = participatedEps.indexOf(ep)
    return {
      episode_number: ep,
      actual: epHeartsMap.get(ep) || 0,
      trend_line: idx >= 0 ? Math.round(reg.slope * idx + reg.intercept) : 0,
      description: epNumToDesc.get(ep) ?? null,
    }
  })

  // 최근 모멘텀: 최근 3회 참여 vs 이전 3회 참여
  let recentMomentum = 0
  if (participatedEps.length >= 4) {
    const recent3 = participatedEps.slice(-3)
    const prev3 = participatedEps.slice(-6, -3)
    if (prev3.length > 0) {
      const recentAvg =
        recent3.reduce((s, ep) => s + (epHeartsMap.get(ep) || 0), 0) / recent3.length
      const prevAvg = prev3.reduce((s, ep) => s + (epHeartsMap.get(ep) || 0), 0) / prev3.length
      recentMomentum = prevAvg > 0 ? Math.round(((recentAvg - prevAvg) / prevAvg) * 100) : 0
    }
  }

  // 에피소드별 신규/기존 후원자 흐름
  const seenDonorsForBj = new Set<string>()
  const newDonorFlow: BjGrowthMetrics['new_donor_flow'] = []
  let totalNewHearts = 0
  let totalReturningHearts = 0

  for (const epNum of allEpNums) {
    let newCount = 0,
      newHearts = 0,
      returningCount = 0,
      returningHearts = 0
    for (const [name, dd] of donorMap) {
      const epAmount = dd.episodes.get(epNum) || 0
      if (epAmount <= 0) continue
      if (seenDonorsForBj.has(name)) {
        returningCount++
        returningHearts += epAmount
      } else {
        newCount++
        newHearts += epAmount
        seenDonorsForBj.add(name)
      }
    }
    if (newCount > 0 || returningCount > 0) {
      newDonorFlow.push({
        episode_number: epNum,
        new_count: newCount,
        new_hearts: newHearts,
        returning_count: returningCount,
        returning_hearts: returningHearts,
      })
    }
    totalNewHearts += newHearts
    totalReturningHearts += returningHearts
  }

  const totalAllHearts = totalNewHearts + totalReturningHearts
  const donorAcquisitionRate =
    participatedEps.length > 0
      ? Math.round(
          (newDonorFlow.reduce((s, f) => s + f.new_count, 0) / participatedEps.length) * 10
        ) / 10
      : 0

  return {
    growth_rate: growthRate,
    growth_direction: growthRate > 5 ? 'up' : growthRate < -5 ? 'down' : 'stable',
    consistency: Math.round(reg.r_squared * 100),
    recent_momentum: recentMomentum,
    episode_growth_line: episodeGrowthLine,
    new_donor_flow: newDonorFlow,
    donor_acquisition_rate: donorAcquisitionRate,
    growth_from_new: totalAllHearts > 0 ? Math.round((totalNewHearts / totalAllHearts) * 100) : 0,
    growth_from_existing:
      totalAllHearts > 0 ? Math.round((totalReturningHearts / totalAllHearts) * 100) : 0,
  }
}
