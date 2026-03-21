'use server'

import { adminAction, type ActionResult } from '../index'
import {
  fetchAllDonationsExtended,
  fetchFinalizedEpisodes,
} from '@/lib/utils/analytics-helpers'
import type {
  RFMData,
  RFMEntry,
} from './types'
import { normalizeName, assignQuintileScores } from './advanced-helpers'

// ==================== getDonorRFMAnalysis ====================

export async function getDonorRFMAnalysis(
  seasonId?: number
): Promise<ActionResult<RFMData>> {
  return adminAction(async (supabase) => {
    const episodes = await fetchFinalizedEpisodes(supabase, seasonId)
    if (episodes.length === 0) {
      return { entries: [], segmentSummary: [] }
    }

    const finalizedIds = episodes.map((e) => e.id)
    const donations = await fetchAllDonationsExtended(supabase, seasonId)
    const filteredDonations = donations.filter(
      (d) => d.episode_id && finalizedIds.includes(d.episode_id)
    )

    const sortedEps = [...episodes].sort(
      (a, b) => a.episode_number - b.episode_number
    )
    const totalEpisodes = sortedEps.length
    const epIdToIdx = new Map(sortedEps.map((e, i) => [e.id, i]))
    const lastEpIdx = totalEpisodes - 1

    // 도너별 집계
    interface DonorRFMRaw {
      lastEpIdx: number
      participatedEps: Set<number>
      totalHearts: number
    }
    const donorMap = new Map<string, DonorRFMRaw>()

    for (const d of filteredDonations) {
      if (!d.donor_name || !d.episode_id) continue
      const name = normalizeName(d.donor_name)
      const idx = epIdToIdx.get(d.episode_id)
      if (idx === undefined) continue

      if (!donorMap.has(name)) {
        donorMap.set(name, {
          lastEpIdx: idx,
          participatedEps: new Set(),
          totalHearts: 0,
        })
      }
      const entry = donorMap.get(name)!
      entry.lastEpIdx = Math.max(entry.lastEpIdx, idx)
      entry.participatedEps.add(d.episode_id)
      entry.totalHearts += d.amount || 0
    }

    if (donorMap.size === 0) {
      return { entries: [], segmentSummary: [] }
    }

    // RFM 원시값 계산
    const donors: {
      name: string
      recency: number
      frequency: number
      monetary: number
    }[] = []

    for (const [name, data] of donorMap) {
      const recency = lastEpIdx - data.lastEpIdx
      const frequency =
        totalEpisodes > 0
          ? (data.participatedEps.size / totalEpisodes) * 100
          : 0
      const monetary = data.totalHearts

      donors.push({ name, recency, frequency, monetary })
    }

    // 퀀타일 점수 매핑
    const rScores = assignQuintileScores(
      donors.map((d) => ({ key: d.name, value: d.recency })),
      false
    )
    const fScores = assignQuintileScores(
      donors.map((d) => ({ key: d.name, value: d.frequency })),
      true
    )
    const mScores = assignQuintileScores(
      donors.map((d) => ({ key: d.name, value: d.monetary })),
      true
    )

    // 세그먼트 분류
    function classifySegment(r: number, f: number, m: number): string {
      if (r === 5 && f === 5 && m === 5) return '핵심 VIP'
      if (r === 5 && f >= 4 && m >= 4) return '충성 고래'
      if (r >= 4 && f >= 3 && m <= 3) return '성장 잠재력'
      if (r <= 2 && f >= 3 && m >= 4) return '고액 장기부재'
      if (r <= 2 && f <= 2 && m >= 4) return '복귀 대상 고래'
      if (r === 5 && f === 1 && m <= 2) return '신규 관심자'
      if (r <= 2 && f <= 2 && m <= 2) return '장기 부재'
      return '일반'
    }

    function getSegmentRecommendation(segment: string, name: string): string {
      switch (segment) {
        case '핵심 VIP':
          return `${name}님은 가장 소중한 후원자입니다. VIP 전용 혜택과 감사 메시지를 전달하세요.`
        case '충성 고래':
          return `${name}님은 꾸준한 대형 후원자입니다. 특별 이벤트 초대를 고려하세요.`
        case '성장 잠재력':
          return `${name}님은 자주 참여하지만 금액이 작습니다. 참여 보상 프로그램이 효과적일 수 있습니다.`
        case '고액 장기부재':
          return `${name}님은 큰 후원을 했지만 최근 참여가 줄었습니다. 복귀를 위한 리텐션 전략이 필요합니다.`
        case '복귀 대상 고래':
          return `${name}님은 과거 고액 후원자였습니다. 개인 맞춤 복귀 메시지를 보내세요.`
        case '신규 관심자':
          return `${name}님은 최근 참여를 시작했습니다. 환영 메시지와 커뮤니티 안내가 효과적입니다.`
        case '장기 부재':
          return `${name}님은 오래 참여하지 않고 있습니다. 일반적 안내 정도만 유지하세요.`
        default:
          return `${name}님의 참여 패턴을 지속 관찰하세요.`
      }
    }

    const entries: RFMEntry[] = donors.map((d) => {
      const r = rScores.get(d.name) || 3
      const f = fScores.get(d.name) || 3
      const m = mScores.get(d.name) || 3
      const segment = classifySegment(r, f, m)

      return {
        donor_name: d.name,
        total_hearts: d.monetary,
        recency: d.recency,
        frequency: Math.round(d.frequency * 10) / 10,
        monetary: d.monetary,
        r_score: r,
        f_score: f,
        m_score: m,
        rfm_code: `R${r}F${f}M${m}`,
        segment,
        recommendation: getSegmentRecommendation(segment, d.name),
      }
    })

    // 세그먼트 요약
    const segmentGroups = new Map<
      string,
      { count: number; total_hearts: number; recencySum: number }
    >()
    for (const e of entries) {
      if (!segmentGroups.has(e.segment)) {
        segmentGroups.set(e.segment, {
          count: 0,
          total_hearts: 0,
          recencySum: 0,
        })
      }
      const g = segmentGroups.get(e.segment)!
      g.count++
      g.total_hearts += e.total_hearts
      g.recencySum += e.recency
    }

    const segmentSummary = [...segmentGroups.entries()]
      .map(([segment, g]) => ({
        segment,
        count: g.count,
        total_hearts: g.total_hearts,
        avg_recency: g.count > 0 ? Math.round((g.recencySum / g.count) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.total_hearts - a.total_hearts)

    // 정렬: total_hearts desc
    entries.sort((a, b) => b.total_hearts - a.total_hearts)

    return { entries, segmentSummary }
  })
}
