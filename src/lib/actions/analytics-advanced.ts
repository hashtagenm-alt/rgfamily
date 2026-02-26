'use server'

import { adminAction, type ActionResult } from './index'
// nicknameAliases accessed via normalizeDonorName from helpers
import {
  linearRegression,
  fetchAllDonationsExtended,
  fetchFinalizedEpisodes,
  normalizeDonorName,
  type ExtendedDonation,
} from '@/lib/utils/analytics-helpers'

// ==================== 타입 정의 ====================

// --- 1. Churn Prediction ---

export interface ChurnPredictionEntry {
  donor_name: string
  total_hearts: number
  favorite_bj: string
  risk_score: number // 0-100
  risk_level: '위험' | '주의' | '관심' | '안전'
  signals: {
    frequency: number // 최근 불참 (0-35)
    gap: number // 부재 기간 (0-30)
    amount: number // 금액 추세 (0-20)
    rank_battle: number // 직급전 불참 (0-15)
  }
  recommendation: string
}

export interface ChurnPredictionData {
  entries: ChurnPredictionEntry[]
  summary: {
    danger_count: number
    warning_count: number
    watch_count: number
    safe_count: number
    total_at_risk_hearts: number
  }
}

// --- 2. RFM Analysis ---

export interface RFMEntry {
  donor_name: string
  total_hearts: number
  recency: number // episodes since last donation
  frequency: number // participation rate %
  monetary: number // total hearts
  r_score: number // 1-5
  f_score: number // 1-5
  m_score: number // 1-5
  rfm_code: string // 'R5F4M3'
  segment: string // Korean segment name
  recommendation: string // Korean recommendation
}

export interface RFMData {
  entries: RFMEntry[]
  segmentSummary: {
    segment: string
    count: number
    total_hearts: number
    avg_recency: number
  }[]
}

// --- 3. BJ Affinity Matrix ---

export interface BjAffinityEntry {
  bj_a: string
  bj_b: string
  shared_donors: number
  overlap_pct_a: number
  overlap_pct_b: number
  shared_hearts_a: number
  shared_hearts_b: number
  top_shared_donors: { name: string; hearts_a: number; hearts_b: number }[]
}

export interface BjExclusivity {
  bj_name: string
  total_donors: number
  exclusive_donors: number
  exclusive_pct: number
}

export interface BjAffinityData {
  matrix: BjAffinityEntry[]
  exclusivity: BjExclusivity[]
  insights: string[]
}

// --- 4. BJ Actionable Insights ---

export interface BjInsightEntry {
  bj_name: string
  donor_health: {
    growing: number
    stable: number
    declining: number
    at_risk: number
  }
  rank_battle_effect: number // ratio: rank_battle_avg / regular_avg
  new_donor_retention_rate: number // % of new donors who returned 2+ times
  best_episode: { episode_number: number; hearts: number; description?: string | null } | null
  worst_episode: { episode_number: number; hearts: number; description?: string | null } | null
  actionable_insights: string[] // Korean recommendations, max 3
}

export interface BjInsightsData {
  global_retention_rate: number // 전체 평균 신규 후원자 정착률
  entries: BjInsightEntry[]
}


// ==================== 내부 헬퍼 ====================

interface EpisodeInfo {
  id: number
  episode_number: number
  is_rank_battle: boolean
}

/** 닉네임 정규화 (helpers에서 import한 함수의 별칭) */
function normalizeName(raw: string): string {
  return normalizeDonorName(raw)
}

// fetchFinalizedEpisodes → imported from @/lib/utils/analytics-helpers

/** 후원 데이터를 에피소드별 도너 맵으로 변환 */
function buildDonorEpisodeMap(
  donations: ExtendedDonation[],
  episodes: EpisodeInfo[]
): {
  /** donor -> episode_id -> { hearts, bj_map } */
  donorEpMap: Map<string, Map<number, { hearts: number; bjMap: Map<string, number> }>>
  /** donor -> total hearts */
  donorTotalHearts: Map<string, number>
  /** donor -> favorite bj */
  donorFavoriteBj: Map<string, string>
  /** donor -> bj -> hearts */
  donorBjMap: Map<string, Map<string, number>>
  /** episode_id set */
  episodeIdSet: Set<number>
} {
  const episodeIdSet = new Set(episodes.map((e) => e.id))
  const donorEpMap = new Map<
    string,
    Map<number, { hearts: number; bjMap: Map<string, number> }>
  >()
  const donorTotalHearts = new Map<string, number>()
  const donorBjMap = new Map<string, Map<string, number>>()

  for (const d of donations) {
    if (!d.donor_name || !d.episode_id) continue
    if (!episodeIdSet.has(d.episode_id)) continue

    const name = normalizeName(d.donor_name)
    const amount = d.amount || 0
    const bj = d.target_bj || '(미지정)'

    // donorEpMap
    if (!donorEpMap.has(name)) donorEpMap.set(name, new Map())
    const epMap = donorEpMap.get(name)!
    if (!epMap.has(d.episode_id)) {
      epMap.set(d.episode_id, { hearts: 0, bjMap: new Map() })
    }
    const entry = epMap.get(d.episode_id)!
    entry.hearts += amount
    entry.bjMap.set(bj, (entry.bjMap.get(bj) || 0) + amount)

    // total
    donorTotalHearts.set(name, (donorTotalHearts.get(name) || 0) + amount)

    // bj map
    if (!donorBjMap.has(name)) donorBjMap.set(name, new Map())
    const bjMap = donorBjMap.get(name)!
    bjMap.set(bj, (bjMap.get(bj) || 0) + amount)
  }

  // favorite bj
  const donorFavoriteBj = new Map<string, string>()
  for (const [name, bjMap] of donorBjMap) {
    let maxBj = ''
    let maxHearts = 0
    for (const [bj, hearts] of bjMap) {
      if (hearts > maxHearts) {
        maxHearts = hearts
        maxBj = bj
      }
    }
    donorFavoriteBj.set(name, maxBj)
  }

  return { donorEpMap, donorTotalHearts, donorFavoriteBj, donorBjMap, episodeIdSet }
}

/** 리스크 레벨 판정 */
function getRiskLevel(score: number): '위험' | '주의' | '관심' | '안전' {
  if (score >= 75) return '위험'
  if (score >= 50) return '주의'
  if (score >= 25) return '관심'
  return '안전'
}

/** 퀀타일 점수를 개별 값에 직접 매핑 */
function assignQuintileScores(
  items: { key: string; value: number }[],
  ascending: boolean
): Map<string, number> {
  const sorted = [...items].sort((a, b) =>
    ascending ? a.value - b.value : b.value - a.value
  )
  const n = sorted.length
  const result = new Map<string, number>()

  for (let i = 0; i < n; i++) {
    const percentile = n > 1 ? i / (n - 1) : 0.5
    let score: number
    // ascending=true: 정렬 뒤쪽(높은값)이 높은 점수
    // ascending=false: 정렬 뒤쪽(낮은값)이 높은 점수 → 여기선 앞쪽(최상위)이 점수 5
    // ascending=true: 높은 값 → 높은 점수 (빈도, 금액)
    // ascending=false: 낮은 값 → 높은 점수 (최근성: 0이 가장 좋음)
    // 정렬 방향이 반전되므로, 동일한 percentile 기준으로 점수를 매기면
    // ascending=false에서는 자연스럽게 낮은 값이 높은 점수를 받음
    if (percentile >= 0.8) score = 5
    else if (percentile >= 0.6) score = 4
    else if (percentile >= 0.4) score = 3
    else if (percentile >= 0.2) score = 2
    else score = 1
    result.set(sorted[i].key, score)
  }

  return result
}

// ==================== 1. getAdvancedChurnPrediction ====================
//
// 이탈 예측 핵심 원리:
// - Signal 1 "최근 불참": 최근 3회차 중 몇 번 빠졌는가 (가장 중요, 0-35)
// - Signal 2 "부재 기간": 마지막 참여 이후 몇 회차가 지났는가 (0-30)
// - Signal 3 "금액 추세": 후원 금액이 줄고 있는가 (보조, 0-20)
// - Signal 4 "직급전 불참": 일반 회차는 오지만 직급전에 안 오는가 (보조, 0-15)
//
// 합산 0-100 → 30점 이상만 표시
// 주의: "미키처럼 활발한데 마지막 1회만 빠진 사람"은 잡히면 안 됨
//       "르큐리처럼 오래전부터 안 오는 사람"이 잡혀야 함

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
      // 최소 1회 이상 참여한 사람만 (데이터 있어야 판단 가능)
      if (epMap.size < 1) continue

      const totalHearts = donorTotalHearts.get(name) || 0
      const favBj = donorFavoriteBj.get(name) || '(없음)'

      // --- Signal 1: 최근 불참 (0-35) ---
      // 최근 3회차 중 몇 번 빠졌는가
      const missedRecent = last3Eps.filter((e) => !epMap.has(e.id)).length

      let frequencySignal = 0
      if (missedRecent === 3) frequencySignal = 35       // 최근 3회 모두 불참
      else if (missedRecent === 2) frequencySignal = 20  // 최근 2회 불참
      else if (missedRecent === 1) frequencySignal = 5   // 최근 1회 불참 (약한 신호)
      // missedRecent === 0 → 0 (활발하게 활동 중)

      // --- Signal 2: 부재 기간 (0-30) ---
      // 마지막 참여 에피소드 이후 몇 회차가 지났는가
      let gapSinceLast = totalEps // 기본: 전체 (참여 없으면 최대)
      for (let i = sortedEps.length - 1; i >= 0; i--) {
        if (epMap.has(sortedEps[i].id)) {
          gapSinceLast = sortedEps.length - 1 - i // 0=마지막 회차 참여, 1=직전 참여 등
          break
        }
      }

      let gapSignal = 0
      if (gapSinceLast >= 6) gapSignal = 30      // 6회차+ 부재 → 사실상 이탈
      else if (gapSinceLast >= 5) gapSignal = 25
      else if (gapSinceLast >= 4) gapSignal = 20
      else if (gapSinceLast >= 3) gapSignal = 15
      else if (gapSinceLast >= 2) gapSignal = 8   // 2회차 전 마지막 참여
      // gapSinceLast 0-1 → 0 (최근에 참여)

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
            // 5% 이상 감소 추세만 반영
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

        // 일반 회차는 참여하지만 직급전에는 불참 (30%+ 차이)
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
        // 장기 부재
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

      // 30점 이상만 표시 (최근 2회 불참 + 부재 기간 2회 이상이면 28점 → 아슬아슬)
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

    // 하트 많은 후원자 우선 정렬 (고액 후원자 이탈이 더 중요)
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

// ==================== 2. getDonorRFMAnalysis ====================

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
      const recency = lastEpIdx - data.lastEpIdx // 0 = 가장 최근
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
      false // 낮은 recency = 높은 점수
    )
    const fScores = assignQuintileScores(
      donors.map((d) => ({ key: d.name, value: d.frequency })),
      true // 높은 frequency = 높은 점수
    )
    const mScores = assignQuintileScores(
      donors.map((d) => ({ key: d.name, value: d.monetary })),
      true // 높은 monetary = 높은 점수
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

// ==================== 3. getBjAffinityMatrix ====================

export async function getBjAffinityMatrix(
  seasonId?: number
): Promise<ActionResult<BjAffinityData>> {
  return adminAction(async (supabase) => {
    const episodes = await fetchFinalizedEpisodes(supabase, seasonId)
    if (episodes.length === 0) {
      return { matrix: [], exclusivity: [], insights: [] }
    }

    const finalizedIdSet = new Set(episodes.map(e => e.id))
    const donations = await fetchAllDonationsExtended(supabase, seasonId)
    const filteredDonations = donations.filter(
      (d) => d.episode_id && finalizedIdSet.has(d.episode_id)
    )

    // BJ별 도너 세트 + 도너-BJ별 하트
    const bjDonorsMap = new Map<string, Set<string>>()
    const bjDonorHearts = new Map<string, Map<string, number>>()
    const donorBjs = new Map<string, Set<string>>()

    for (const d of filteredDonations) {
      if (!d.donor_name || !d.target_bj) continue
      const name = normalizeName(d.donor_name)
      const bj = d.target_bj
      const amount = d.amount || 0

      if (!bjDonorsMap.has(bj)) bjDonorsMap.set(bj, new Set())
      bjDonorsMap.get(bj)!.add(name)

      if (!bjDonorHearts.has(bj)) bjDonorHearts.set(bj, new Map())
      const donorMap = bjDonorHearts.get(bj)!
      donorMap.set(name, (donorMap.get(name) || 0) + amount)

      if (!donorBjs.has(name)) donorBjs.set(name, new Set())
      donorBjs.get(name)!.add(bj)
    }

    const bjNames = [...bjDonorsMap.keys()].sort()

    // BJ 쌍별 겹침 분석
    const matrix: BjAffinityEntry[] = []

    for (let i = 0; i < bjNames.length; i++) {
      for (let j = i + 1; j < bjNames.length; j++) {
        const bjA = bjNames[i]
        const bjB = bjNames[j]
        const donorsA = bjDonorsMap.get(bjA)!
        const donorsB = bjDonorsMap.get(bjB)!

        const sharedDonors = [...donorsA].filter((d) => donorsB.has(d))
        if (sharedDonors.length === 0) continue

        const heartsA = bjDonorHearts.get(bjA)!
        const heartsB = bjDonorHearts.get(bjB)!

        const sharedHeartsA = sharedDonors.reduce(
          (sum, d) => sum + (heartsA.get(d) || 0),
          0
        )
        const sharedHeartsB = sharedDonors.reduce(
          (sum, d) => sum + (heartsB.get(d) || 0),
          0
        )

        // 고액 순 공유 후원자 Top 5
        const topShared = sharedDonors
          .map(d => ({
            name: d,
            hearts_a: heartsA.get(d) || 0,
            hearts_b: heartsB.get(d) || 0,
          }))
          .sort((a, b) => (b.hearts_a + b.hearts_b) - (a.hearts_a + a.hearts_b))
          .slice(0, 5)

        matrix.push({
          bj_a: bjA,
          bj_b: bjB,
          shared_donors: sharedDonors.length,
          overlap_pct_a:
            donorsA.size > 0
              ? Math.round((sharedDonors.length / donorsA.size) * 1000) / 10
              : 0,
          overlap_pct_b:
            donorsB.size > 0
              ? Math.round((sharedDonors.length / donorsB.size) * 1000) / 10
              : 0,
          shared_hearts_a: sharedHeartsA,
          shared_hearts_b: sharedHeartsB,
          top_shared_donors: topShared,
        })
      }
    }

    // 정렬: 겹침 많은 순
    matrix.sort((a, b) => b.shared_donors - a.shared_donors)

    // BJ별 전용 후원자 비율
    const exclusivity: BjExclusivity[] = bjNames.map((bj) => {
      const donors = bjDonorsMap.get(bj)!
      const exclusiveDonors = [...donors].filter((d) => {
        const bjSet = donorBjs.get(d)
        return bjSet !== undefined && bjSet.size === 1
      })

      return {
        bj_name: bj,
        total_donors: donors.size,
        exclusive_donors: exclusiveDonors.length,
        exclusive_pct:
          donors.size > 0
            ? Math.round((exclusiveDonors.length / donors.size) * 1000) / 10
            : 0,
      }
    })

    exclusivity.sort((a, b) => b.exclusive_pct - a.exclusive_pct)

    // 인사이트 생성
    const insights: string[] = []

    // 겹침이 가장 큰 BJ 쌍
    if (matrix.length > 0) {
      const top = matrix[0]
      const avgOverlap = Math.round(
        (top.overlap_pct_a + top.overlap_pct_b) / 2
      )
      insights.push(
        `${top.bj_a}↔${top.bj_b} 후원자 겹침 ${avgOverlap}% → 콜라보 방송 추천`
      )
    }

    // 전용 후원자 비율이 가장 높은 BJ
    if (exclusivity.length > 0) {
      const topExcl = exclusivity[0]
      insights.push(
        `${topExcl.bj_name}은(는) 전용 후원자 비율 ${topExcl.exclusive_pct}%로 독자적 팬층이 강합니다`
      )
    }

    // 전용 후원자 비율이 가장 낮은 BJ
    if (exclusivity.length > 1) {
      const lowest = exclusivity[exclusivity.length - 1]
      if (lowest.exclusive_pct < 30) {
        insights.push(
          `${lowest.bj_name}은(는) 전용 후원자 비율 ${lowest.exclusive_pct}%로 다른 BJ와 후원자 공유가 많습니다`
        )
      }
    }

    // 상위 3개 쌍 중 비대칭 겹침 (한쪽만 많이 겹치는 경우)
    for (const entry of matrix.slice(0, 3)) {
      const diff = Math.abs(entry.overlap_pct_a - entry.overlap_pct_b)
      if (diff >= 20) {
        const dependent =
          entry.overlap_pct_a > entry.overlap_pct_b
            ? entry.bj_a
            : entry.bj_b
        const independent =
          entry.overlap_pct_a > entry.overlap_pct_b
            ? entry.bj_b
            : entry.bj_a
        insights.push(
          `${dependent}의 후원자가 ${independent}에도 많이 겹치지만 반대는 적습니다 → ${dependent}의 팬이 ${independent}으로 유입 가능성`
        )
      }
    }

    return { matrix, exclusivity, insights }
  })
}

// ==================== 4. getBjActionableInsights ====================

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
      const newDonors = new Map<string, number>() // name -> first ep idx

      for (const epId of bjSortedEpIds) {
        const donors = epMap.get(epId)!
        for (const [donor] of donors) {
          if (!seenDonors.has(donor)) {
            seenDonors.add(donor)
            newDonors.set(donor, epIdToIdx.get(epId) || 0)
          }
        }
      }

      // 신규 후원자 중 1회 이상 재방문 비율 (마지막 EP 신규는 재방문 기회 없으므로 제외)
      const lastEpIdx = sortedEps.length - 1
      for (const [donor, firstIdx] of newDonors) {
        if (firstIdx >= lastEpIdx) continue // 마지막 에피소드 신규 → 분모 제외
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
      // 도너별 에피소드 하트 시계열
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

        // 최근 참여 여부 (마지막 2회차)
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
        if (firstIdx >= lastEpIdx2) continue // 마지막 EP 신규 → 재방문 기회 없으므로 제외
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

      // 직급전 효과
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

      // 신규 후원자 정착률
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

      // 성장/하락 추세
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

      // 도너 건강 비율
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
        // 참여한 에피소드만 대상 (hearts > 0)
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

    // 도너 수 기준 정렬 (큰 BJ 순)
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
