'use server'

import { adminAction, type ActionResult } from '../index'
import { nicknameAliases } from '@/lib/utils/nickname-aliases'
import {
  linearRegression,
  fetchAllDonationsExtended,
} from '@/lib/utils/analytics-helpers'

import type {
  DonorPattern,
  DonorBjRelation,
} from './types'

// ==================== 헬퍼: 페이지네이션으로 전체 데이터 가져오기 ====================

async function fetchAllDonations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  seasonId?: number,
  episodeId?: number,
  _selectFields: string = 'donor_name, target_bj, amount'
): Promise<{ donor_name: string; target_bj: string | null; amount: number }[]> {
  // 캐시된 fetchAllDonationsExtended 활용 (중복 DB 조회 방지)
  const data = await fetchAllDonationsExtended(supabase, seasonId, episodeId)
  return data.map(d => ({ donor_name: d.donor_name, target_bj: d.target_bj, amount: d.amount }))
}

// ==================== 후원자→BJ 관계 ====================

export async function getDonorBjRelations(
  seasonId?: number,
  episodeId?: number,
  limit: number = 100
): Promise<ActionResult<DonorBjRelation[]>> {
  return adminAction(async (supabase) => {
    // 페이지네이션으로 전체 데이터 가져오기
    const allData = await fetchAllDonations(supabase, seasonId, episodeId)

    // target_bj가 있는 데이터만 필터링
    const data = allData.filter(d => d.target_bj !== null)

    if (data.length === 0) return []

    // 후원자-BJ 쌍별 집계
    const relationMap = new Map<string, { total_hearts: number; donation_count: number }>()

    for (const donation of data) {
      const key = `${donation.donor_name}|${donation.target_bj}`
      if (!relationMap.has(key)) {
        relationMap.set(key, { total_hearts: 0, donation_count: 0 })
      }
      const rel = relationMap.get(key)!
      rel.total_hearts += donation.amount || 0
      rel.donation_count += 1
    }

    return Array.from(relationMap.entries())
      .map(([key, stats]) => {
        const [donor_name, bj_name] = key.split('|')
        return {
          donor_name,
          bj_name,
          total_hearts: stats.total_hearts,
          donation_count: stats.donation_count
        }
      })
      .sort((a, b) => b.total_hearts - a.total_hearts)
      .slice(0, limit)
  })
}

// ==================== 후원자 패턴 분류 ====================

export async function getDonorPatterns(
  seasonId?: number,
  episodeId?: number
): Promise<ActionResult<DonorPattern[]>> {
  return adminAction(async (supabase) => {
    // 확장 데이터로 에피소드 참여 추적
    const allData = await fetchAllDonationsExtended(supabase, seasonId, episodeId)
    const data = allData.filter(d => d.target_bj !== null)

    if (data.length === 0) return []

    // 에피소드 번호 매핑
    const episodeIds = [...new Set(data.map(d => d.episode_id).filter((id): id is number => id !== null))]
    const epNumberMap = new Map<number, number>()
    if (episodeIds.length > 0) {
      const { data: eps } = await supabase.from('episodes').select('id, episode_number').in('id', episodeIds)
      if (eps) for (const e of eps) epNumberMap.set(e.id, e.episode_number)
    }

    // 후원자별 데이터 집계
    const donorMap = new Map<string, {
      total_hearts: number
      donation_count: number
      bj_hearts: Map<string, number>
      episodeHearts: Map<number, number> // episode_number → hearts
      hourCounts: Map<number, number> // KST hour → count
    }>()

    for (const donation of data) {
      if (!donation.donor_name) continue
      const donor = nicknameAliases[donation.donor_name] || donation.donor_name

      if (!donorMap.has(donor)) {
        donorMap.set(donor, {
          total_hearts: 0,
          donation_count: 0,
          bj_hearts: new Map(),
          episodeHearts: new Map(),
          hourCounts: new Map(),
        })
      }

      const donorData = donorMap.get(donor)!
      donorData.total_hearts += donation.amount || 0
      donorData.donation_count += 1

      const bjName = donation.target_bj || 'unknown'
      donorData.bj_hearts.set(bjName, (donorData.bj_hearts.get(bjName) || 0) + (donation.amount || 0))

      if (donation.episode_id) {
        const epNum = epNumberMap.get(donation.episode_id) ?? 0
        if (epNum > 0) {
          donorData.episodeHearts.set(epNum, (donorData.episodeHearts.get(epNum) || 0) + (donation.amount || 0))
        }
      }

      // 피크 시간대 집계 (donated_at은 KST가 +00:00으로 저장됨, 변환 불필요)
      if (donation.donated_at) {
        const hour = new Date(donation.donated_at).getUTCHours()
        donorData.hourCounts.set(hour, (donorData.hourCounts.get(hour) || 0) + 1)
      }
    }

    // 패턴 분류
    const result: DonorPattern[] = []

    for (const [donor_name, stats] of donorMap.entries()) {
      const unique_bjs = stats.bj_hearts.size
      const avg_donation = Math.round(stats.total_hearts / stats.donation_count)

      let maxBj = ''
      let maxBjHearts = 0
      for (const [bj, hearts] of stats.bj_hearts.entries()) {
        if (hearts > maxBjHearts) { maxBjHearts = hearts; maxBj = bj }
      }

      const max_bj_ratio = stats.total_hearts > 0 ? Math.round((maxBjHearts / stats.total_hearts) * 100) : 0

      // 참여 에피소드 정보
      const epNums = [...stats.episodeHearts.keys()].sort((a, b) => a - b)
      const episodes_participated = epNums.length
      const first_episode = epNums[0] ?? 0
      const last_episode = epNums[epNums.length - 1] ?? 0

      // 모든 에피소드 번호 목록
      const allEpNums = [...new Set(epNumberMap.values())].sort((a, b) => a - b)
      const totalEpisodes = allEpNums.length

      // --- 선형 회귀 기반 추이 ---
      const regressionPoints = allEpNums.map((ep, i) => ({
        x: i,
        y: stats.episodeHearts.get(ep) || 0,
      }))
      const reg = linearRegression(regressionPoints)
      const meanHearts = regressionPoints.length > 0
        ? regressionPoints.reduce((s, p) => s + p.y, 0) / regressionPoints.length
        : 1
      const growthRate = meanHearts > 0 ? Math.round((reg.slope / meanHearts) * 100) : 0

      let trend: DonorPattern['trend'] = 'stable'
      if (growthRate > 5) trend = 'increasing'
      else if (growthRate < -5) trend = 'decreasing'

      // --- 일관성 점수 (참여 회차의 하트 변동 계수 역수) ---
      let consistency_score = 0
      if (episodes_participated >= 2) {
        const heartsArr = epNums.map(ep => stats.episodeHearts.get(ep) || 0)
        const mean = heartsArr.reduce((s, v) => s + v, 0) / heartsArr.length
        const stddev = Math.sqrt(heartsArr.reduce((s, v) => s + (v - mean) ** 2, 0) / heartsArr.length)
        const cv = mean > 0 ? stddev / mean : 1  // 변동 계수
        consistency_score = Math.round(Math.max(0, Math.min(100, (1 - cv) * 100)))
      }

      // --- 충성도 점수 ---
      const loyalty_score = totalEpisodes > 0
        ? Math.round((episodes_participated / totalEpisodes) * 100)
        : 0

      // --- 최근성 점수 (최근 3회차 참여 비중) ---
      let recency_score = 0
      if (totalEpisodes >= 3) {
        const recent3 = allEpNums.slice(-3)
        const recentParticipation = recent3.filter(ep => (stats.episodeHearts.get(ep) || 0) > 0).length
        recency_score = Math.round((recentParticipation / 3) * 100)
      }

      // --- 패턴 분류 (개선된 기준) ---
      let pattern_type: DonorPattern['pattern_type'] = '일반'

      // 급성장형: 성장률 > 15% AND 최근 3회차 중 2회 이상 참여
      if (growthRate > 15 && recency_score >= 67 && episodes_participated >= 3) {
        pattern_type = '급성장형'
      }
      // 꾸준형: 참여율 60% 이상 AND 일관성 40 이상
      else if (loyalty_score >= 60 && consistency_score >= 40 && episodes_participated >= 4) {
        pattern_type = '꾸준형'
      }
      // 올인형: 하트 80% 이상이 한 BJ에게
      else if (max_bj_ratio >= 80) {
        pattern_type = '올인형'
      }
      // 분산형: 3명 이상 BJ에 분산, 최대 50% 미만
      else if (unique_bjs >= 3 && max_bj_ratio < 50) {
        pattern_type = '분산형'
      }
      // 소액다건: 평균 3000 미만 AND 5건 이상
      else if (avg_donation < 3000 && stats.donation_count >= 5) {
        pattern_type = '소액다건'
      }
      // 고액소건: 평균 20000 이상 AND 3건 이하
      else if (avg_donation >= 20000 && stats.donation_count <= 3) {
        pattern_type = '고액소건'
      }

      // BJ 분포
      const bj_distribution = [...stats.bj_hearts.entries()]
        .map(([bj_name, hearts]) => ({
          bj_name,
          hearts,
          percent: stats.total_hearts > 0 ? Math.round((hearts / stats.total_hearts) * 100) : 0,
        }))
        .sort((a, b) => b.hearts - a.hearts)

      // 피크 시간대 Top 3
      const peak_hours = [...stats.hourCounts.entries()]
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)

      result.push({
        donor_name,
        total_hearts: stats.total_hearts,
        donation_count: stats.donation_count,
        unique_bjs,
        max_bj_ratio,
        avg_donation,
        pattern_type,
        favorite_bj: maxBj,
        episodes_participated,
        first_episode,
        last_episode,
        trend,
        consistency_score,
        loyalty_score,
        recency_score,
        growth_rate: growthRate,
        bj_distribution,
        peak_hours,
      })
    }

    return result.sort((a, b) => b.total_hearts - a.total_hearts)
  })
}
