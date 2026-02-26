'use server'

import { adminAction, type ActionResult } from './index'
import { nicknameAliases } from '@/lib/utils/nickname-aliases'
import {
  linearRegression,
  fetchFinalizedEpisodeIds,
  fetchAllDonationsExtended,
  type ExtendedDonation,
} from '@/lib/utils/analytics-helpers'

// ExtendedDonation type available from @/lib/utils/analytics-helpers

// ==================== 타입 정의 ====================

export interface BjStats {
  bj_name: string
  total_hearts: number
  donation_count: number
  unique_donors: number
  avg_donation: number
}

export interface TimePatternData {
  hour: number
  total_hearts: number
  donation_count: number
}

export interface DonorBjRelation {
  donor_name: string
  bj_name: string
  total_hearts: number
  donation_count: number
}

export interface DonorPattern {
  donor_name: string
  total_hearts: number
  donation_count: number
  unique_bjs: number
  max_bj_ratio: number
  avg_donation: number
  pattern_type: '올인형' | '분산형' | '소액다건' | '고액소건' | '꾸준형' | '급성장형' | '일반'
  favorite_bj: string
  episodes_participated: number
  first_episode: number
  last_episode: number
  trend: 'increasing' | 'decreasing' | 'stable'
  consistency_score: number   // 0~100, 참여 안정성 (표준편차 기반)
  loyalty_score: number       // 0~100, 참여율 (참여 회차 / 전체 회차)
  recency_score: number       // 0~100, 최근 활동 빈도
  growth_rate: number         // 선형 회귀 기반 성장률 (% per episode)
  bj_distribution: { bj_name: string; hearts: number; percent: number }[]
  peak_hours: { hour: number; count: number }[] // KST 기준, count 내림차순 Top 3
}

export interface EpisodeComparison {
  episode1: {
    id: number
    title: string
    total_hearts: number
    donation_count: number
    unique_donors: number
  }
  episode2: {
    id: number
    title: string
    total_hearts: number
    donation_count: number
    unique_donors: number
  }
  donor_changes: {
    continued: number
    new_donors: number
    left_donors: number
  }
  bj_changes: {
    bj_name: string
    ep1_hearts: number
    ep2_hearts: number
    change: number
    change_percent: number
  }[]
}

export interface DonorSearch {
  donor_name: string
  total_hearts: number
  donation_count: number
  episodes: {
    episode_id: number
    episode_title: string
    hearts: number
    count: number
  }[]
  bj_distribution: {
    bj_name: string
    hearts: number
    percent: number
  }[]
  pattern_type: string
}

export interface AnalyticsSummary {
  total_hearts: number
  total_donations: number
  unique_donors: number
  unique_bjs: number
  avg_donation: number
  top_donor: string
  top_bj: string
}

// ==================== 새로운 타입: 회차별 추이 ====================

export interface EpisodeTrendData {
  episode_id: number
  episode_number: number
  title: string
  description: string | null
  broadcast_date: string
  is_rank_battle: boolean
  total_hearts: number
  donor_count: number
  avg_donation: number
  new_donors: number
  returning_donors: number
}

// ==================== 새로운 타입: 후원자 리텐션 ====================

export interface DonorRetentionData {
  // 시즌 참여 요약 (완결 시즌 기준 분류)
  seasonSummary: {
    total_donors: number
    returning_donors: number     // 2회+ 참여
    returning_rate: number       // %
    core_fans: number            // 60%+ 참여 (핵심 팬)
    regular_donors: number       // 4회~59% 참여 (단골)
    occasional_donors: number    // 2-3회 참여 (간헐)
    onetime_donors: number       // 1회만 참여 (1회성)
    avg_episodes: number         // 평균 참여 회차
    total_episodes: number       // 전체 확정 회차 수
    // 매출 지표
    total_hearts: number
    avg_hearts_per_episode: number
    core_fans_hearts: number
    core_fans_hearts_pct: number
    regular_hearts: number
    regular_hearts_pct: number
    occasional_hearts: number
    occasional_hearts_pct: number
    onetime_hearts: number
    onetime_hearts_pct: number
    top5_donors: { name: string; hearts: number }[]
    top5_hearts_pct: number       // 상위 5명 의존도
    top10_hearts_pct: number      // 상위 10명 의존도
    stable_revenue_ratio: number  // 단골+ 매출 비중 (안정적 매출)
    best_episode: { number: number; hearts: number }
    worst_episode: { number: number; hearts: number }
  }
  cohorts: {
    first_episode: number
    first_episode_title: string
    total_donors: number
    retention: { episode_number: number; retained: number; rate: number }[]
  }[]
  pareto: {
    top_percent: number
    hearts_percent: number
  }[]
  funnel: {
    label: string
    count: number
  }[]
  avgDonationTrend: { episode_number: number; avg_amount: number; median_amount: number }[]
  growthAccounting: {
    episode_number: number
    description: string | null
    is_rank_battle: boolean
    new_donors: number
    retained_donors: number
    resurrected_donors: number
    churned_donors: number
    new_hearts: number
    retained_hearts: number
    resurrected_hearts: number
    lost_hearts: number
    net_growth: number
  }[]
  insights: string[]
}

// ==================== 새로운 타입: BJ 상세 통계 ====================

export interface BjDonorDetail {
  donor_name: string
  total_hearts: number
  donation_count: number
  is_new: boolean
  trend: 'up' | 'down' | 'stable'
  episode_amounts: { episode_number: number; amount: number }[]
}

export interface BjGrowthMetrics {
  growth_rate: number           // 선형 회귀 기반 (% per episode)
  growth_direction: 'up' | 'down' | 'stable'
  consistency: number           // R² (0~100), 추세 일관성
  recent_momentum: number       // 최근 3화 vs 이전 3화 변화율
  episode_growth_line: { episode_number: number; actual: number; trend_line: number; description?: string | null }[]
  new_donor_flow: { episode_number: number; new_count: number; new_hearts: number; returning_count: number; returning_hearts: number }[]
  donor_acquisition_rate: number  // 회차당 평균 신규 후원자 수
  growth_from_new: number       // 신규 후원자 기여 하트 비중 (%)
  growth_from_existing: number  // 기존 후원자 증가분 비중 (%)
}

export interface BjDetailedStats extends BjStats {
  top_donors: BjDonorDetail[]
  new_donor_count: number
  notable_new_donors: string[]
  donor_concentration: {
    donor_name: string
    hearts: number
    percent: number
  }[]
  growth_metrics: BjGrowthMetrics | null
}

// ==================== 새로운 타입: 시간대 패턴 강화 ====================

export interface TimePatternEnhanced {
  overall: TimePatternData[]
  perBj: { bj_name: string; hours: { hour: number; hearts: number; count: number }[]; peak_hour: number }[]
  topDonorTimes: { donor_name: string; total_hearts: number; peak_hour: number; hours: { hour: number; hearts: number }[] }[]
  heatmap: { bj_name: string; hour: number; hearts: number; intensity: number }[]
}

// ==================== 새로운 타입: BJ 에피소드별 추이 ====================

export interface BjEpisodeTrendData {
  bj_name: string
  episodes: {
    episode_number: number
    hearts: number
    donor_count: number
  }[]
}

// ==================== 시그니처 자격 분석 ====================

export interface SignatureEligibilityData {
  episodeBreakdown: {
    episodeNumber: number
    episodeTitle: string
    isFinalized: boolean
    donors: {
      donorName: string
      totalAmount: number
      sigAwarded: number | null
      sigLabel: string
    }[]
  }[]
  summary: {
    sig3: { donorName: string; history: { ep: number; amount: number }[] }[]
    sig2: { donorName: string; history: { ep: number; amount: number }[] }[]
    sig1: { donorName: string; history: { ep: number; amount: number }[] }[]
    totalPeople: number
    totalSigs: number
  }
  unsynced: {
    donorName: string
    sigNumber: number
    episodeNumber: number
    amount: number
  }[]
}

const SIG_THRESHOLDS: Record<number, number> = {
  1: 100000,
  2: 150000,
  3: 200000,
}

export async function getSignatureEligibility(
  seasonId?: number
): Promise<ActionResult<SignatureEligibilityData>> {
  return adminAction(async (supabase) => {
    // 에피소드 목록 (미확정 포함 — 실시간 모니터링 목적)
    let epQuery = supabase
      .from('episodes')
      .select('id, episode_number, title, is_finalized')
      .order('episode_number', { ascending: true })

    if (seasonId) {
      epQuery = epQuery.eq('season_id', seasonId)
    }

    const { data: episodes, error: epError } = await epQuery
    if (epError) throw new Error(epError.message)
    if (!episodes || episodes.length === 0) {
      return {
        episodeBreakdown: [],
        summary: { sig3: [], sig2: [], sig1: [], totalPeople: 0, totalSigs: 0 },
        unsynced: [],
      }
    }

    // 전체 후원 데이터 페이지네이션
    const episodeIds = episodes.map(e => e.id)
    const allDonations: { episode_id: number; donor_name: string; amount: number }[] = []
    const pageSize = 1000
    let page = 0

    while (true) {
      const { data, error } = await supabase
        .from('donations')
        .select('episode_id, donor_name, amount')
        .in('episode_id', episodeIds)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) throw new Error(error.message)
      if (!data || data.length === 0) break
      allDonations.push(...(data as { episode_id: number; donor_name: string; amount: number }[]))
      if (data.length < pageSize) break
      page++
    }

    const epIdToNum = new Map(episodes.map(e => [e.id, e.episode_number]))
    const epIdToTitle = new Map(episodes.map(e => [e.id, e.title]))
    const epIdToFinalized = new Map(episodes.map(e => [e.id, e.is_finalized]))

    // 에피소드별 + 후원자별 SUM(amount) 집계
    const epDonorTotals = new Map<number, Map<string, number>>()
    for (const d of allDonations) {
      if (!d.donor_name) continue
      const name = nicknameAliases[d.donor_name] || d.donor_name
      if (!epDonorTotals.has(d.episode_id)) epDonorTotals.set(d.episode_id, new Map())
      const donorMap = epDonorTotals.get(d.episode_id)!
      donorMap.set(name, (donorMap.get(name) || 0) + (d.amount || 0))
    }

    // 시그니처 자격 순차 계산 (스크립트 로직 이식)
    // 먼저 에피소드 순서대로 10만+ 달성 이력 수집
    interface EpDonation { episodeId: number; episodeNumber: number; donorName: string; total: number }
    const qualifiedDonations: EpDonation[] = []

    for (const ep of episodes) {
      const donorMap = epDonorTotals.get(ep.id)
      if (!donorMap) continue
      for (const [donorName, total] of donorMap) {
        if (total >= SIG_THRESHOLDS[1]) {
          qualifiedDonations.push({
            episodeId: ep.id,
            episodeNumber: ep.episode_number,
            donorName,
            total,
          })
        }
      }
    }

    // 후원자별 이력 → 순차 시그 판정
    const donorHistory = new Map<string, EpDonation[]>()
    for (const d of qualifiedDonations) {
      if (!donorHistory.has(d.donorName)) donorHistory.set(d.donorName, [])
      donorHistory.get(d.donorName)!.push(d)
    }

    interface SigRecord { sigNumber: number; episodeId: number; episodeNumber: number; amount: number }
    const donorSigs = new Map<string, SigRecord[]>()

    for (const [name, history] of donorHistory) {
      history.sort((a, b) => a.episodeNumber - b.episodeNumber)
      const sigs: SigRecord[] = []

      for (const h of history) {
        const nextSig = sigs.length + 1
        if (nextSig > 3) continue
        if (h.total >= SIG_THRESHOLDS[nextSig]) {
          sigs.push({
            sigNumber: nextSig,
            episodeId: h.episodeId,
            episodeNumber: h.episodeNumber,
            amount: h.total,
          })
        }
      }

      if (sigs.length > 0) {
        donorSigs.set(name, sigs)
      }
    }

    // 에피소드별 시그 매핑 (어떤 후원자가 어떤 회차에서 몇 번째 시그를 얻었는지)
    const epSigMap = new Map<number, Map<string, number>>() // episodeId → donorName → sigNumber
    for (const [name, sigs] of donorSigs) {
      for (const s of sigs) {
        if (!epSigMap.has(s.episodeId)) epSigMap.set(s.episodeId, new Map())
        epSigMap.get(s.episodeId)!.set(name, s.sigNumber)
      }
    }

    // episodeBreakdown 빌드
    const episodeBreakdown: SignatureEligibilityData['episodeBreakdown'] = []

    for (const ep of episodes) {
      const donorMap = epDonorTotals.get(ep.id)
      if (!donorMap) {
        episodeBreakdown.push({
          episodeNumber: ep.episode_number,
          episodeTitle: ep.title,
          isFinalized: ep.is_finalized,
          donors: [],
        })
        continue
      }

      // 10만+ 달성자만 필터
      const donors: SignatureEligibilityData['episodeBreakdown'][0]['donors'] = []
      const epSigs = epSigMap.get(ep.id)

      for (const [donorName, totalAmount] of donorMap) {
        if (totalAmount < SIG_THRESHOLDS[1]) continue

        const sigAwarded = epSigs?.get(donorName) ?? null
        let sigLabel = ''

        if (sigAwarded) {
          sigLabel = `🆕 ${sigAwarded}번째 시그`
        } else {
          // 이미 시그를 가진 후원자인지, 아직 기준 미달인지
          const existingSigs = donorSigs.get(donorName)
          const sigCount = existingSigs?.length ?? 0
          if (sigCount >= 3) {
            sigLabel = '✅ 3개 완료'
          } else {
            const nextSig = sigCount + 1
            const needed = SIG_THRESHOLDS[nextSig]
            if (totalAmount < needed) {
              sigLabel = `(${(needed / 10000).toFixed(0)}만 필요)`
            }
          }
        }

        donors.push({ donorName, totalAmount, sigAwarded, sigLabel })
      }

      donors.sort((a, b) => b.totalAmount - a.totalAmount)

      episodeBreakdown.push({
        episodeNumber: ep.episode_number,
        episodeTitle: ep.title,
        isFinalized: ep.is_finalized,
        donors,
      })
    }

    // summary 빌드
    const sig3: SignatureEligibilityData['summary']['sig3'] = []
    const sig2: SignatureEligibilityData['summary']['sig2'] = []
    const sig1: SignatureEligibilityData['summary']['sig1'] = []
    let totalSigs = 0

    for (const [name, sigs] of donorSigs) {
      const history = sigs.map(s => ({ ep: s.episodeNumber, amount: s.amount }))
      totalSigs += sigs.length

      if (sigs.length >= 3) sig3.push({ donorName: name, history })
      else if (sigs.length === 2) sig2.push({ donorName: name, history })
      else if (sigs.length === 1) sig1.push({ donorName: name, history })
    }

    const totalPeople = donorSigs.size

    // DB 미반영 건 비교
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: dbRecords } = await (supabase as any)
      .from('signature_eligibility')
      .select('donor_name, sig_number, episode_number, daily_amount')

    const dbSet = new Set(
      ((dbRecords || []) as { donor_name: string; sig_number: number }[]).map(r => `${r.donor_name}|${r.sig_number}`)
    )

    const unsynced: SignatureEligibilityData['unsynced'] = []
    for (const [name, sigs] of donorSigs) {
      for (const s of sigs) {
        if (!dbSet.has(`${name}|${s.sigNumber}`)) {
          unsynced.push({
            donorName: name,
            sigNumber: s.sigNumber,
            episodeNumber: s.episodeNumber,
            amount: s.amount,
          })
        }
      }
    }

    return {
      episodeBreakdown,
      summary: { sig3, sig2, sig1, totalPeople, totalSigs },
      unsynced,
    }
  })
}

// ==================== BJ별 후원 현황 ====================

export async function getBjStats(
  seasonId?: number,
  episodeId?: number
): Promise<ActionResult<BjStats[]>> {
  return adminAction(async (supabase) => {
    // 페이지네이션으로 전체 데이터 가져오기
    const data = await fetchAllDonations(supabase, seasonId, episodeId)

    // target_bj가 있는 데이터만
    const filteredData = data.filter(d => d.target_bj !== null)

    if (filteredData.length === 0) return []

    // BJ별로 집계
    const bjMap = new Map<string, {
      total_hearts: number
      donation_count: number
      donors: Set<string>
    }>()

    for (const donation of filteredData) {
      const bjName = donation.target_bj?.trim()
      if (!bjName) continue

      if (!bjMap.has(bjName)) {
        bjMap.set(bjName, {
          total_hearts: 0,
          donation_count: 0,
          donors: new Set()
        })
      }

      const bj = bjMap.get(bjName)!
      bj.total_hearts += donation.amount || 0
      bj.donation_count += 1
      if (donation.donor_name) {
        bj.donors.add(nicknameAliases[donation.donor_name] || donation.donor_name)
      }
    }

    // 배열로 변환 및 정렬
    const result: BjStats[] = Array.from(bjMap.entries())
      .map(([bj_name, stats]) => ({
        bj_name,
        total_hearts: stats.total_hearts,
        donation_count: stats.donation_count,
        unique_donors: stats.donors.size,
        avg_donation: Math.round(stats.total_hearts / stats.donation_count)
      }))
      .sort((a, b) => b.total_hearts - a.total_hearts)

    return result
  })
}

// ==================== 시간대별 패턴 ====================

export async function getTimePattern(
  seasonId?: number,
  episodeId?: number
): Promise<ActionResult<TimePatternData[]>> {
  return adminAction(async (supabase) => {
    // 특정 회차 미지정 시 확정된 회차만
    let finalizedIds: number[] | null = null
    if (!episodeId) {
      finalizedIds = await fetchFinalizedEpisodeIds(supabase, seasonId)
      if (finalizedIds.length === 0) return []
    }

    // 페이지네이션으로 전체 데이터 가져오기
    const allData: { donated_at: string; amount: number }[] = []
    let page = 0
    const pageSize = 1000

    while (true) {
      let query = supabase
        .from('donations')
        .select('donated_at, amount')
        .not('donated_at', 'is', null)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (episodeId) {
        query = query.eq('episode_id', episodeId)
      } else {
        query = query.in('episode_id', finalizedIds!)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      if (!data || data.length === 0) break
      allData.push(...(data as { donated_at: string; amount: number }[]))
      if (data.length < pageSize) break
      page++
    }

    if (allData.length === 0) return []

    // 시간대별 집계
    const hourMap = new Map<number, { total_hearts: number; donation_count: number }>()

    for (let i = 0; i < 24; i++) {
      hourMap.set(i, { total_hearts: 0, donation_count: 0 })
    }

    for (const donation of allData) {
      if (!donation.donated_at) continue
      const hour = new Date(donation.donated_at).getUTCHours()
      const hourData = hourMap.get(hour)!
      hourData.total_hearts += donation.amount || 0
      hourData.donation_count += 1
    }

    return Array.from(hourMap.entries())
      .map(([hour, stats]) => ({
        hour,
        total_hearts: stats.total_hearts,
        donation_count: stats.donation_count
      }))
      .sort((a, b) => a.hour - b.hour)
  })
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
      const lastEpNum = allEpNums[allEpNums.length - 1] ?? 0
      const missedRecent = allEpNums.slice(-2).filter(ep => !stats.episodeHearts.has(ep)).length

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

// ==================== 에피소드 비교 ====================

export async function compareEpisodes(
  episode1Id: number,
  episode2Id: number
): Promise<ActionResult<EpisodeComparison>> {
  return adminAction(async (supabase) => {
    // 에피소드 정보 조회
    const { data: episodes, error: epError } = await supabase
      .from('episodes')
      .select('id, title')
      .in('id', [episode1Id, episode2Id])

    if (epError) throw new Error(epError.message)

    const ep1Info = episodes?.find(e => e.id === episode1Id)
    const ep2Info = episodes?.find(e => e.id === episode2Id)

    // 각 에피소드 후원 데이터 조회
    const [ep1Result, ep2Result] = await Promise.all([
      supabase.from('donations').select('donor_name, target_bj, amount').eq('episode_id', episode1Id),
      supabase.from('donations').select('donor_name, target_bj, amount').eq('episode_id', episode2Id)
    ])

    if (ep1Result.error) throw new Error(ep1Result.error.message)
    if (ep2Result.error) throw new Error(ep2Result.error.message)

    const ep1Data = ep1Result.data || []
    const ep2Data = ep2Result.data || []

    // 에피소드별 통계
    const ep1Donors = new Set(ep1Data.map(d => d.donor_name ? (nicknameAliases[d.donor_name] || d.donor_name) : '').filter(Boolean))
    const ep2Donors = new Set(ep2Data.map(d => d.donor_name ? (nicknameAliases[d.donor_name] || d.donor_name) : '').filter(Boolean))

    const ep1Total = ep1Data.reduce((sum, d) => sum + (d.amount || 0), 0)
    const ep2Total = ep2Data.reduce((sum, d) => sum + (d.amount || 0), 0)

    // 후원자 변화
    const continued = [...ep1Donors].filter(d => ep2Donors.has(d)).length
    const new_donors = [...ep2Donors].filter(d => !ep1Donors.has(d)).length
    const left_donors = [...ep1Donors].filter(d => !ep2Donors.has(d)).length

    // BJ별 변화
    const bjStats1 = new Map<string, number>()
    const bjStats2 = new Map<string, number>()

    for (const d of ep1Data) {
      if (d.target_bj) {
        bjStats1.set(d.target_bj, (bjStats1.get(d.target_bj) || 0) + (d.amount || 0))
      }
    }
    for (const d of ep2Data) {
      if (d.target_bj) {
        bjStats2.set(d.target_bj, (bjStats2.get(d.target_bj) || 0) + (d.amount || 0))
      }
    }

    const allBjs = new Set([...bjStats1.keys(), ...bjStats2.keys()])
    const bj_changes = [...allBjs].map(bj_name => {
      const ep1_hearts = bjStats1.get(bj_name) || 0
      const ep2_hearts = bjStats2.get(bj_name) || 0
      const change = ep2_hearts - ep1_hearts
      const change_percent = ep1_hearts > 0
        ? Math.round(((ep2_hearts - ep1_hearts) / ep1_hearts) * 100)
        : (ep2_hearts > 0 ? 100 : 0)
      return { bj_name, ep1_hearts, ep2_hearts, change, change_percent }
    }).sort((a, b) => b.change - a.change)

    return {
      episode1: {
        id: episode1Id,
        title: ep1Info?.title || `에피소드 ${episode1Id}`,
        total_hearts: ep1Total,
        donation_count: ep1Data.length,
        unique_donors: ep1Donors.size
      },
      episode2: {
        id: episode2Id,
        title: ep2Info?.title || `에피소드 ${episode2Id}`,
        total_hearts: ep2Total,
        donation_count: ep2Data.length,
        unique_donors: ep2Donors.size
      },
      donor_changes: { continued, new_donors, left_donors },
      bj_changes
    }
  })
}

// ==================== 후원자 검색 ====================

export async function searchDonor(
  donorName: string,
  seasonId?: number
): Promise<ActionResult<DonorSearch | null>> {
  return adminAction(async (supabase) => {
    let query = supabase
      .from('donations')
      .select('donor_name, target_bj, amount, episode_id')
      .ilike('donor_name', `%${donorName}%`)

    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) return null

    // 에피소드 정보 조회
    const episodeIds = [...new Set(data.map(d => d.episode_id).filter((id): id is number => id !== null))]
    const episodeMap = new Map<number, string>()

    if (episodeIds.length > 0) {
      const { data: episodes } = await supabase
        .from('episodes')
        .select('id, title')
        .in('id', episodeIds)

      if (episodes) {
        for (const ep of episodes) {
          episodeMap.set(ep.id, ep.title)
        }
      }
    }

    // 데이터 집계
    const total_hearts = data.reduce((sum, d) => sum + (d.amount || 0), 0)
    const donation_count = data.length

    // 에피소드별 집계
    const epStats = new Map<number, { hearts: number; count: number }>()
    for (const d of data) {
      if (d.episode_id) {
        if (!epStats.has(d.episode_id)) {
          epStats.set(d.episode_id, { hearts: 0, count: 0 })
        }
        const stat = epStats.get(d.episode_id)!
        stat.hearts += d.amount || 0
        stat.count += 1
      }
    }

    const episodes = [...epStats.entries()].map(([episode_id, stats]) => ({
      episode_id,
      episode_title: episodeMap.get(episode_id) || `에피소드 ${episode_id}`,
      hearts: stats.hearts,
      count: stats.count
    }))

    // BJ별 분포
    const bjStats = new Map<string, number>()
    for (const d of data) {
      if (d.target_bj) {
        bjStats.set(d.target_bj, (bjStats.get(d.target_bj) || 0) + (d.amount || 0))
      }
    }

    const bj_distribution = [...bjStats.entries()]
      .map(([bj_name, hearts]) => ({
        bj_name,
        hearts,
        percent: Math.round((hearts / total_hearts) * 100)
      }))
      .sort((a, b) => b.hearts - a.hearts)

    // 패턴 분류
    const unique_bjs = bjStats.size
    const avg_donation = Math.round(total_hearts / donation_count)
    const max_bj_ratio = bj_distribution[0]?.percent || 0

    let pattern_type = '일반'
    if (max_bj_ratio >= 80) {
      pattern_type = '올인형'
    } else if (unique_bjs >= 3 && max_bj_ratio < 50) {
      pattern_type = '분산형'
    } else if (avg_donation < 5000 && donation_count >= 5) {
      pattern_type = '소액다건'
    } else if (avg_donation >= 10000 && donation_count <= 3) {
      pattern_type = '고액소건'
    }

    return {
      donor_name: data[0].donor_name,
      total_hearts,
      donation_count,
      episodes,
      bj_distribution,
      pattern_type
    }
  })
}

// ==================== 헬퍼: 페이지네이션으로 전체 데이터 가져오기 ====================

// fetchFinalizedEpisodeIds → imported from @/lib/utils/analytics-helpers

async function fetchAllDonations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  seasonId?: number,
  episodeId?: number,
  _selectFields: string = 'donor_name, target_bj, amount'
): Promise<{ donor_name: string; target_bj: string | null; amount: number }[]> {
  // 특정 회차 미지정 시 확정된 회차의 donation만 조회
  let finalizedIds: number[] | null = null
  if (!episodeId) {
    finalizedIds = await fetchFinalizedEpisodeIds(supabase, seasonId)
    if (finalizedIds.length === 0) return []
  }

  const allData: { donor_name: string; target_bj: string | null; amount: number }[] = []
  let page = 0
  const pageSize = 1000

  while (true) {
    let query = supabase
      .from('donations')
      .select('donor_name, target_bj, amount')
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (episodeId) {
      query = query.eq('episode_id', episodeId)
    } else {
      query = query.in('episode_id', finalizedIds!)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break

    allData.push(...(data as { donor_name: string; target_bj: string | null; amount: number }[]))
    if (data.length < pageSize) break
    page++
  }

  return allData
}

// fetchAllDonationsExtended, ExtendedDonation → imported from @/lib/utils/analytics-helpers

// ==================== 요약 통계 ====================

export async function getAnalyticsSummary(
  seasonId?: number,
  episodeId?: number
): Promise<ActionResult<AnalyticsSummary>> {
  return adminAction(async (supabase) => {
    // 페이지네이션으로 전체 데이터 가져오기
    const data = await fetchAllDonations(supabase, seasonId, episodeId)

    // target_bj가 있는 데이터만 필터링 (BJ별 분석용)
    const dataWithBj = data.filter(d => d.target_bj !== null)

    if (data.length === 0) {
      return {
        total_hearts: 0,
        total_donations: 0,
        unique_donors: 0,
        unique_bjs: 0,
        avg_donation: 0,
        top_donor: '-',
        top_bj: '-'
      }
    }

    // 전체 데이터 기준 통계
    const total_hearts = data.reduce((sum, d) => sum + (d.amount || 0), 0)
    const total_donations = data.length
    const donors = new Set(data.map(d => d.donor_name ? (nicknameAliases[d.donor_name] || d.donor_name) : '').filter(Boolean))

    // BJ 관련은 target_bj 있는 데이터만
    const bjs = new Set(dataWithBj.map(d => d.target_bj).filter(Boolean))

    // 상위 후원자 (전체 기준)
    const donorHearts = new Map<string, number>()
    for (const d of data) {
      if (d.donor_name) {
        const name = nicknameAliases[d.donor_name] || d.donor_name
        donorHearts.set(name, (donorHearts.get(name) || 0) + (d.amount || 0))
      }
    }
    const topDonorEntry = [...donorHearts.entries()].sort((a, b) => b[1] - a[1])[0]

    // 상위 BJ (target_bj 있는 데이터만)
    const bjHearts = new Map<string, number>()
    for (const d of dataWithBj) {
      if (d.target_bj) {
        bjHearts.set(d.target_bj, (bjHearts.get(d.target_bj) || 0) + (d.amount || 0))
      }
    }
    const topBjEntry = [...bjHearts.entries()].sort((a, b) => b[1] - a[1])[0]

    return {
      total_hearts,
      total_donations,
      unique_donors: donors.size,
      unique_bjs: bjs.size,
      avg_donation: Math.round(total_hearts / total_donations),
      top_donor: topDonorEntry?.[0] || '-',
      top_bj: topBjEntry?.[0] || '-'
    }
  })
}

// ==================== 에피소드 목록 ====================

export async function getEpisodeList(seasonId?: number): Promise<ActionResult<{
  id: number
  title: string
  description: string | null
  season_id: number
  episode_number: number
  broadcast_date: string | null
  is_finalized: boolean
}[]>> {
  return adminAction(async (supabase) => {
    let query = supabase
      .from('episodes')
      .select('id, title, description, season_id, episode_number, broadcast_date, is_finalized')
      .order('episode_number', { ascending: true })

    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    return data || []
  })
}

// ==================== 시즌 목록 ====================

export async function getSeasonList(): Promise<ActionResult<{
  id: number
  name: string
}[]>> {
  return adminAction(async (supabase) => {
    const { data, error } = await supabase
      .from('seasons')
      .select('id, name')
      .order('id', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
  })
}

// ==================== 회차별 추이 ====================

export async function getEpisodeTrend(
  seasonId?: number
): Promise<ActionResult<EpisodeTrendData[]>> {
  return adminAction(async (supabase) => {
    // 에피소드 목록 조회 (확정된 회차만)
    let epQuery = supabase
      .from('episodes')
      .select('id, episode_number, title, description, broadcast_date, is_rank_battle')
      .eq('is_finalized', true)
      .order('episode_number', { ascending: true })

    if (seasonId) {
      epQuery = epQuery.eq('season_id', seasonId)
    }

    const { data: episodes, error: epError } = await epQuery
    if (epError) throw new Error(epError.message)
    if (!episodes || episodes.length === 0) return []

    // 전체 후원 데이터 배치 쿼리 (N+1 제거)
    const episodeIds = episodes.map(e => e.id)
    const allDonations: { episode_id: number; donor_name: string; amount: number }[] = []
    const pageSize = 1000
    let page = 0

    while (true) {
      const { data, error } = await supabase
        .from('donations')
        .select('episode_id, donor_name, amount')
        .in('episode_id', episodeIds)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) throw new Error(error.message)
      if (!data || data.length === 0) break
      allDonations.push(...(data as { episode_id: number; donor_name: string; amount: number }[]))
      if (data.length < pageSize) break
      page++
    }

    // 에피소드별 집계 + 누적 후원자 Set으로 신규/재참여 계산
    const seenDonors = new Set<string>()
    const result: EpisodeTrendData[] = []

    for (const ep of episodes) {
      const epDonations = allDonations.filter(d => d.episode_id === ep.id)
      const epDonors = new Set(epDonations.map(d => d.donor_name ? (nicknameAliases[d.donor_name] || d.donor_name) : '').filter(Boolean))
      const totalHearts = epDonations.reduce((s, d) => s + (d.amount || 0), 0)

      let newDonors = 0
      let returningDonors = 0

      for (const donor of epDonors) {
        if (seenDonors.has(donor)) {
          returningDonors++
        } else {
          newDonors++
        }
      }

      // 누적에 추가
      for (const donor of epDonors) {
        seenDonors.add(donor)
      }

      result.push({
        episode_id: ep.id,
        episode_number: ep.episode_number,
        title: ep.title,
        description: ep.description ?? null,
        broadcast_date: ep.broadcast_date,
        is_rank_battle: ep.is_rank_battle,
        total_hearts: totalHearts,
        donor_count: epDonors.size,
        avg_donation: epDonors.size > 0 ? Math.round(totalHearts / epDonations.length) : 0,
        new_donors: newDonors,
        returning_donors: returningDonors,
      })
    }

    return result
  })
}

// ==================== 후원자 리텐션 분석 ====================

export async function getDonorRetention(
  seasonId?: number
): Promise<ActionResult<DonorRetentionData>> {
  return adminAction(async (supabase) => {
    // 에피소드 목록 (확정된 회차만 — totalEpisodes 기반 계산 정합성)
    let epQuery = supabase
      .from('episodes')
      .select('id, episode_number, title, description, is_rank_battle')
      .eq('is_finalized', true)
      .order('episode_number', { ascending: true })

    if (seasonId) {
      epQuery = epQuery.eq('season_id', seasonId)
    }

    const { data: episodes, error: epError } = await epQuery
    if (epError) throw new Error(epError.message)
    if (!episodes || episodes.length === 0) {
      return {
        seasonSummary: {
          total_donors: 0, returning_donors: 0, returning_rate: 0,
          core_fans: 0, regular_donors: 0, occasional_donors: 0, onetime_donors: 0,
          avg_episodes: 0, total_episodes: 0,
          total_hearts: 0, avg_hearts_per_episode: 0,
          core_fans_hearts: 0, core_fans_hearts_pct: 0,
          regular_hearts: 0, regular_hearts_pct: 0,
          occasional_hearts: 0, occasional_hearts_pct: 0,
          onetime_hearts: 0, onetime_hearts_pct: 0,
          top5_donors: [], top5_hearts_pct: 0, top10_hearts_pct: 0,
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

    // 전체 후원 데이터 배치 쿼리 (N+1 제거)
    const episodeIds = episodes.map(e => e.id)
    const allDonations: { episode_id: number; donor_name: string; amount: number }[] = []
    const pageSize = 1000
    let fetchPage = 0

    while (true) {
      const { data, error } = await supabase
        .from('donations')
        .select('episode_id, donor_name, amount')
        .in('episode_id', episodeIds)
        .range(fetchPage * pageSize, (fetchPage + 1) * pageSize - 1)

      if (error) throw new Error(error.message)
      if (!data || data.length === 0) break
      allDonations.push(...(data as { episode_id: number; donor_name: string; amount: number }[]))
      if (data.length < pageSize) break
      fetchPage++
    }

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

    const episodeNumberMap = new Map(episodes.map(e => [e.id, e.episode_number]))
    const episodeTitleMap = new Map(episodes.map(e => [e.episode_number, e.title]))
    const episodeDescMap = new Map(episodes.map(e => [e.episode_number, (e.description as string | null) ?? null]))
    const episodeRankBattleMap = new Map(episodes.map(e => [e.episode_number, !!(e.is_rank_battle)]))
    const episodeNumbers = episodes.map(e => e.episode_number).sort((a, b) => a - b)
    const totalEpisodes = episodeNumbers.length
    const lastEp = episodeNumbers[episodeNumbers.length - 1]
    const secondLastEp = episodeNumbers.length >= 2 ? episodeNumbers[episodeNumbers.length - 2] : null

    // donor → 참여 에피소드 번호 Set (O(1) 검색용)
    const donorEpNumSet = new Map<string, Set<number>>()
    const donorFirstEp = new Map<string, number>()
    for (const [donor, epIds] of donorEpisodes) {
      const epNumsSet = new Set([...epIds].map(id => episodeNumberMap.get(id) ?? 0))
      donorEpNumSet.set(donor, epNumsSet)
      const sorted = [...epNumsSet].sort((a, b) => a - b)
      donorFirstEp.set(donor, sorted[0])
    }

    // === Growth Accounting: 에피소드별 신규/유지/복귀/이탈 분해 ===
    // donor → episode_number → hearts (growthAccounting용)
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

      let newDonorsGA = 0, retainedDonorsGA = 0, resurrectedDonorsGA = 0, churnedDonorsGA = 0
      let newHeartsGA = 0, retainedHeartsGA = 0, resurrectedHeartsGA = 0, lostHeartsGA = 0

      const curDonors = new Set<string>()
      const prevDonors = new Set<string>()
      const earlierDonors = new Set<string>()

      for (const name of allDonorNames) {
        const epSet = donorEpNumSet.get(name)!
        if (epSet.has(curEp)) curDonors.add(name)
        if (prevEp !== null && epSet.has(prevEp)) prevDonors.add(name)
        // "earlier" = any episode before prevEp
        for (let j = 0; j < i - 1; j++) {
          if (epSet.has(episodeNumbers[j])) { earlierDonors.add(name); break }
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
      .filter(epNum => cohortMap.has(epNum))
      .map(epNum => {
        const cohortDonors = cohortMap.get(epNum)!
        const retention = episodeNumbers
          .filter(n => n >= epNum)
          .map(targetEp => {
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
    let coreFans = 0        // 60%+ 참여 (예: 15회 중 9회+)
    let regularDonors = 0   // 4회 ~ (60%-1) 참여
    let occasionalDonors = 0 // 2-3회 참여
    let onetimeDonors = 0   // 1회만 참여
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
    const returningRate = totalDonorCount > 0 ? Math.round((returningDonors / totalDonorCount) * 100 * 10) / 10 : 0
    const avgEpisodes = totalDonorCount > 0 ? Math.round((totalParticipation / totalDonorCount) * 10) / 10 : 0

    // === 매출 지표 계산 ===
    const totalHeartsAll = [...donorHearts.values()].reduce((s, h) => s + h, 0)
    const avgHeartsPerEpisode = totalEpisodes > 0 ? Math.round(totalHeartsAll / totalEpisodes) : 0

    // 세그먼트별 하트 (핵심 팬 / 단골 / 간헐 / 1회성)
    let coreFansHearts = 0, regularHeartsSum = 0, occasionalHeartsSum = 0, onetimeHeartsSum = 0
    for (const [donor] of donorEpisodes) {
      const count = donorEpNumSet.get(donor)?.size ?? 0
      const hearts = donorHearts.get(donor) || 0
      if (count >= coreThreshold) coreFansHearts += hearts
      else if (count >= 4) regularHeartsSum += hearts
      else if (count >= 2) occasionalHeartsSum += hearts
      else onetimeHeartsSum += hearts
    }

    const pctOf = (v: number) => totalHeartsAll > 0 ? Math.round((v / totalHeartsAll) * 1000) / 10 : 0

    // 상위 후원자 의존도
    const sortedByHearts = [...donorHearts.entries()].sort((a, b) => b[1] - a[1])
    const top5Hearts = sortedByHearts.slice(0, 5).reduce((s, [, h]) => s + h, 0)
    const top10Hearts = sortedByHearts.slice(0, 10).reduce((s, [, h]) => s + h, 0)
    const top5Donors = sortedByHearts.slice(0, 5).map(([name, hearts]) => ({ name, hearts }))

    // 매출 안정성: 단골(4회+) 이상 후원자의 하트 비중
    const stableRevenue = coreFansHearts + regularHeartsSum
    const stableRevenueRatio = totalHeartsAll > 0 ? Math.round((stableRevenue / totalHeartsAll) * 1000) / 10 : 0

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
    const twoPlus = [...donorEpisodes.values()].filter(s => s.size >= 2).length
    const fourPlus = [...donorEpisodes.values()].filter(s => s.size >= 4).length
    const eightPlus = [...donorEpisodes.values()].filter(s => s.size >= 8).length
    const tenPlus = [...donorEpisodes.values()].filter(s => s.size >= 10).length

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

    const avgDonationTrend = episodeNumbers.map(epNum => {
      const amounts = epDonationAmounts.get(epNum) || []
      const avg = amounts.length > 0 ? Math.round(amounts.reduce((s, a) => s + a, 0) / amounts.length) : 0
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
        insights.push(`매출의 ${stableRevenueRatio}%가 단골(4회+) 이상에서 발생합니다. 안정적인 수익 구조입니다.`)
      } else {
        insights.push(`단골(4회+) 이상의 매출 비중이 ${stableRevenueRatio}%입니다. 1회성/간헐 후원자 의존도가 높아 변동 위험이 있습니다.`)
      }
    }

    // 상위 의존도 경고
    if (pctOf(top5Hearts) >= 30) {
      insights.push(`상위 5명이 전체 매출의 ${pctOf(top5Hearts)}%를 차지합니다. 핵심 후원자 관리가 최우선입니다.`)
    }

    // 핵심 팬 가치
    if (coreFans > 0 && totalHeartsAll > 0) {
      const avgCoreFanHearts = Math.round(coreFansHearts / coreFans)
      insights.push(`핵심 팬 ${coreFans}명의 1인당 평균 ${formatNum(avgCoreFanHearts)} 하트 — 전체 매출의 ${pctOf(coreFansHearts)}%입니다.`)
    }

    // 1회성 매출 비중
    if (onetimeDonors > 0 && totalHeartsAll > 0) {
      const onetimeRevPct = pctOf(onetimeHeartsSum)
      if (onetimeRevPct >= 15) {
        insights.push(`1회성 후원자(${onetimeDonors}명)가 매출의 ${onetimeRevPct}%를 발생시켰습니다. 재참여 유도 시 성장 여지가 큽니다.`)
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

// ==================== BJ 에피소드별 추이 ====================

export async function getBjEpisodeTrend(
  seasonId?: number
): Promise<ActionResult<BjEpisodeTrendData[]>> {
  return adminAction(async (supabase) => {
    // 에피소드 목록 (확정된 회차만)
    let epQuery = supabase
      .from('episodes')
      .select('id, episode_number')
      .eq('is_finalized', true)
      .order('episode_number', { ascending: true })

    if (seasonId) {
      epQuery = epQuery.eq('season_id', seasonId)
    }

    const { data: episodes, error: epError } = await epQuery
    if (epError) throw new Error(epError.message)
    if (!episodes || episodes.length === 0) return []

    const episodeIdToNumber = new Map(episodes.map(e => [e.id, e.episode_number]))

    // bj_episode_performances 테이블 시도
    const { data: perfData, error: perfError } = await supabase
      .from('bj_episode_performances')
      .select('episode_id, bj_member_id, donation_hearts, donation_count')
      .in('episode_id', episodes.map(e => e.id))

    if (!perfError && perfData && perfData.length > 0) {
      // BJ 멤버 이름 조회
      const bjMemberIds = [...new Set(perfData.map(p => p.bj_member_id))]
      const { data: members } = await supabase
        .from('organization')
        .select('id, name')
        .in('id', bjMemberIds)

      const memberNameMap = new Map((members || []).map(m => [m.id, m.name]))

      // BJ별 에피소드 집계
      const bjMap = new Map<string, Map<number, { hearts: number; donor_count: number }>>()

      for (const p of perfData) {
        const bjName = memberNameMap.get(p.bj_member_id) || `BJ#${p.bj_member_id}`
        const epNum = episodeIdToNumber.get(p.episode_id) ?? 0

        if (!bjMap.has(bjName)) bjMap.set(bjName, new Map())
        bjMap.get(bjName)!.set(epNum, {
          hearts: p.donation_hearts,
          donor_count: p.donation_count,
        })
      }

      return buildBjTrendResult(bjMap, episodes.map(e => e.episode_number))
    }

    // Fallback: donations 테이블에서 배치 집계 (N+1 제거)
    const allDonations: { episode_id: number; target_bj: string | null; amount: number; donor_name: string }[] = []
    const pageSize = 1000
    let fallbackPage = 0

    while (true) {
      const { data, error } = await supabase
        .from('donations')
        .select('episode_id, target_bj, amount, donor_name')
        .in('episode_id', episodes.map(e => e.id))
        .not('target_bj', 'is', null)
        .range(fallbackPage * pageSize, (fallbackPage + 1) * pageSize - 1)

      if (error) throw new Error(error.message)
      if (!data || data.length === 0) break
      allDonations.push(...(data as typeof allDonations))
      if (data.length < pageSize) break
      fallbackPage++
    }

    const bjMap = new Map<string, Map<number, { hearts: number; donors: Set<string> }>>()

    for (const d of allDonations) {
      const bjName = d.target_bj?.trim()
      if (!bjName) continue
      const epNum = episodeIdToNumber.get(d.episode_id) ?? 0

      if (!bjMap.has(bjName)) bjMap.set(bjName, new Map())
      const epMap = bjMap.get(bjName)!
      if (!epMap.has(epNum)) epMap.set(epNum, { hearts: 0, donors: new Set() })
      const stat = epMap.get(epNum)!
      stat.hearts += d.amount || 0
      if (d.donor_name) stat.donors.add(nicknameAliases[d.donor_name] || d.donor_name)
    }

    // Set을 count로 변환
    const bjMapConverted = new Map<string, Map<number, { hearts: number; donor_count: number }>>()
    for (const [bj, epMap] of bjMap) {
      const converted = new Map<number, { hearts: number; donor_count: number }>()
      for (const [epNum, stat] of epMap) {
        converted.set(epNum, { hearts: stat.hearts, donor_count: stat.donors.size })
      }
      bjMapConverted.set(bj, converted)
    }

    return buildBjTrendResult(bjMapConverted, episodes.map(e => e.episode_number))
  })
}

function buildBjTrendResult(
  bjMap: Map<string, Map<number, { hearts: number; donor_count: number }>>,
  episodeNumbers: number[]
): BjEpisodeTrendData[] {
  const result: BjEpisodeTrendData[] = []

  for (const [bj_name, epMap] of bjMap) {
    const episodes = episodeNumbers.map(epNum => {
      const stat = epMap.get(epNum)
      return {
        episode_number: epNum,
        hearts: stat?.hearts ?? 0,
        donor_count: stat?.donor_count ?? 0,
      }
    })
    const totalHearts = episodes.reduce((s, e) => s + e.hearts, 0)
    result.push({ bj_name, episodes, _totalHearts: totalHearts } as BjEpisodeTrendData & { _totalHearts: number })
  }

  // 총 하트 기준 정렬
  return result
    .sort((a, b) => {
      const aTotal = (a as BjEpisodeTrendData & { _totalHearts: number })._totalHearts
      const bTotal = (b as BjEpisodeTrendData & { _totalHearts: number })._totalHearts
      return bTotal - aTotal
    })
    .map(({ bj_name, episodes }) => ({ bj_name, episodes }))
}

// ==================== BJ 상세 통계 ====================

export async function getBjDetailedStats(
  seasonId?: number,
  episodeId?: number
): Promise<ActionResult<BjDetailedStats[]>> {
  return adminAction(async (supabase) => {
    // 에피소드 목록 (특정 회차 미지정 시 확정된 회차만)
    let epQuery = supabase
      .from('episodes')
      .select('id, episode_number, broadcast_date, description')
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

    const epIdToNum = new Map(episodes.map(e => [e.id, e.episode_number]))
    const epNumToDesc = new Map(episodes.map(e => [e.episode_number, e.description as string | null]))

    // 최신 회차 판별 (broadcast_date 기준)
    const sortedEps = [...episodes]
      .filter(e => e.broadcast_date)
      .sort((a, b) => new Date(b.broadcast_date).getTime() - new Date(a.broadcast_date).getTime())
    const latestEpId = sortedEps[0]?.id
    const latestEpNum = latestEpId ? epIdToNum.get(latestEpId) ?? 0 : 0

    // 전체 후원 데이터
    const allData = await fetchAllDonationsExtended(supabase, seasonId, episodeId)
    const data = allData.filter(d => d.target_bj !== null)
    if (data.length === 0) return []

    // BJ별 → 후원자별 → 에피소드별 하트
    type DonorEpData = Map<number, number> // episode_number → hearts
    type BjDonorData = Map<string, { total: number; count: number; episodes: DonorEpData }>
    const bjDonorMap = new Map<string, BjDonorData>()
    const bjTotals = new Map<string, { total_hearts: number; donation_count: number; donors: Set<string> }>()

    for (const d of data) {
      const bj = d.target_bj?.trim()
      if (!bj || !d.donor_name) continue
      const donorName = nicknameAliases[d.donor_name] || d.donor_name
      const epNum = d.episode_id ? (epIdToNum.get(d.episode_id) ?? 0) : 0

      if (!bjDonorMap.has(bj)) bjDonorMap.set(bj, new Map())
      const donorMap = bjDonorMap.get(bj)!
      if (!donorMap.has(donorName)) donorMap.set(donorName, { total: 0, count: 0, episodes: new Map() })
      const dd = donorMap.get(donorName)!
      dd.total += d.amount || 0
      dd.count += 1
      if (epNum > 0) dd.episodes.set(epNum, (dd.episodes.get(epNum) || 0) + (d.amount || 0))

      if (!bjTotals.has(bj)) bjTotals.set(bj, { total_hearts: 0, donation_count: 0, donors: new Set() })
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
      const donorEntries = [...donorMap.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 10)

      const top_donors: BjDonorDetail[] = donorEntries.map(([name, dd]) => {
        const epEntries = [...dd.episodes.entries()].sort((a, b) => a[0] - b[0])
        const episode_amounts = epEntries.map(([episode_number, amount]) => ({ episode_number, amount }))

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
          const firstAvg = firstHalfEps.reduce((s, ep) => s + (dd.episodes.get(ep) || 0), 0) / firstHalfEps.length
          const secondAvg = secondHalfEps.reduce((s, ep) => s + (dd.episodes.get(ep) || 0), 0) / secondHalfEps.length
          if (secondAvg > firstAvg * 1.2) trend = 'up'
          else if (secondAvg < firstAvg * 0.8) trend = 'down'
        }

        return { donor_name: name, total_hearts: dd.total, donation_count: dd.count, is_new, trend, episode_amounts }
      })

      // 신규 후원자 수
      let newDonorCount = 0
      const notableNew: string[] = []
      const q25 = donorEntries.length >= 4 ? donorEntries[Math.floor(donorEntries.length * 0.25)][1].total : 0

      for (const [name, dd] of donorMap) {
        const epNums = [...dd.episodes.keys()]
        const hasBeforeLatest = epNums.some(n => n < latestEpNum)
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
      const allEpNums = [...epIdToNum.values()].sort((a, b) => a - b)
      let growthMetrics: BjGrowthMetrics | null = null

      if (allEpNums.length >= 3) {
        // 이 BJ의 에피소드별 하트 합산
        const epHeartsMap = new Map<number, number>()
        for (const [, dd] of donorMap) {
          for (const [epNum, hearts] of dd.episodes) {
            epHeartsMap.set(epNum, (epHeartsMap.get(epNum) || 0) + hearts)
          }
        }

        // 참여한 에피소드만으로 회귀 (불참=0 포함하면 중도하차와 용병데이가 왜곡됨)
        const participatedEps = allEpNums.filter(ep => (epHeartsMap.get(ep) || 0) > 0)
        const regressionPoints = participatedEps.map((ep, i) => ({
          x: i,
          y: epHeartsMap.get(ep) || 0,
        }))

        const reg = linearRegression(regressionPoints)
        const meanY = regressionPoints.length > 0
          ? regressionPoints.reduce((s, p) => s + p.y, 0) / regressionPoints.length
          : 1
        // 성장률: 회차당 평균 대비 slope 비율 (%)
        const growthRate = meanY > 0 ? Math.round((reg.slope / meanY) * 100) : 0

        // 추세선 데이터 (모든 에피소드 포함, 불참은 0)
        const episodeGrowthLine = allEpNums.map(ep => {
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
            const recentAvg = recent3.reduce((s, ep) => s + (epHeartsMap.get(ep) || 0), 0) / recent3.length
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
          let newCount = 0, newHearts = 0, returningCount = 0, returningHearts = 0
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
            newDonorFlow.push({ episode_number: epNum, new_count: newCount, new_hearts: newHearts, returning_count: returningCount, returning_hearts: returningHearts })
          }
          totalNewHearts += newHearts
          totalReturningHearts += returningHearts
        }

        const totalAllHearts = totalNewHearts + totalReturningHearts
        const donorAcquisitionRate = participatedEps.length > 0
          ? Math.round((newDonorFlow.reduce((s, f) => s + f.new_count, 0) / participatedEps.length) * 10) / 10
          : 0

        growthMetrics = {
          growth_rate: growthRate,
          growth_direction: growthRate > 5 ? 'up' : growthRate < -5 ? 'down' : 'stable',
          consistency: Math.round(reg.r_squared * 100),
          recent_momentum: recentMomentum,
          episode_growth_line: episodeGrowthLine,
          new_donor_flow: newDonorFlow,
          donor_acquisition_rate: donorAcquisitionRate,
          growth_from_new: totalAllHearts > 0 ? Math.round((totalNewHearts / totalAllHearts) * 100) : 0,
          growth_from_existing: totalAllHearts > 0 ? Math.round((totalReturningHearts / totalAllHearts) * 100) : 0,
        }
      }

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

// ==================== 시간대 패턴 강화 ====================

export async function getTimePatternEnhanced(
  seasonId?: number,
  episodeId?: number
): Promise<ActionResult<TimePatternEnhanced>> {
  return adminAction(async (supabase) => {
    // 특정 회차 미지정 시 확정된 회차만
    let finalizedIds: number[] | null = null
    if (!episodeId) {
      finalizedIds = await fetchFinalizedEpisodeIds(supabase, seasonId)
      if (finalizedIds.length === 0) {
        return { overall: [], perBj: [], topDonorTimes: [], heatmap: [] }
      }
    }

    // 페이지네이션으로 전체 데이터
    const allData: { donated_at: string; amount: number; target_bj: string | null; donor_name: string }[] = []
    let page = 0
    const pageSize = 1000

    while (true) {
      let query = supabase
        .from('donations')
        .select('donated_at, amount, target_bj, donor_name')
        .not('donated_at', 'is', null)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (episodeId) query = query.eq('episode_id', episodeId)
      else query = query.in('episode_id', finalizedIds!)

      const { data, error } = await query
      if (error) throw new Error(error.message)
      if (!data || data.length === 0) break
      allData.push(...(data as typeof allData))
      if (data.length < pageSize) break
      page++
    }

    if (allData.length === 0) {
      return { overall: [], perBj: [], topDonorTimes: [], heatmap: [] }
    }

    // 전체 24시간 집계
    const hourMap = new Map<number, { total_hearts: number; donation_count: number }>()
    for (let i = 0; i < 24; i++) hourMap.set(i, { total_hearts: 0, donation_count: 0 })

    // BJ별 24시간 집계
    const bjHourMap = new Map<string, Map<number, { hearts: number; count: number }>>()

    // 후원자별 집계
    const donorTotalMap = new Map<string, number>()
    const donorHourMap = new Map<string, Map<number, number>>()

    for (const d of allData) {
      const hour = new Date(d.donated_at).getUTCHours()
      const amount = d.amount || 0

      // overall
      const h = hourMap.get(hour)!
      h.total_hearts += amount
      h.donation_count += 1

      // perBj
      const bj = d.target_bj?.trim()
      if (bj) {
        if (!bjHourMap.has(bj)) {
          bjHourMap.set(bj, new Map())
          for (let i = 0; i < 24; i++) bjHourMap.get(bj)!.set(i, { hearts: 0, count: 0 })
        }
        const bh = bjHourMap.get(bj)!.get(hour)!
        bh.hearts += amount
        bh.count += 1
      }

      // donor
      if (d.donor_name) {
        const donorName = nicknameAliases[d.donor_name] || d.donor_name
        donorTotalMap.set(donorName, (donorTotalMap.get(donorName) || 0) + amount)
        if (!donorHourMap.has(donorName)) donorHourMap.set(donorName, new Map())
        const dm = donorHourMap.get(donorName)!
        dm.set(hour, (dm.get(hour) || 0) + amount)
      }
    }

    const overall: TimePatternData[] = Array.from(hourMap.entries())
      .map(([hour, stats]) => ({ hour, total_hearts: stats.total_hearts, donation_count: stats.donation_count }))
      .sort((a, b) => a.hour - b.hour)

    // perBj
    const perBj = [...bjHourMap.entries()].map(([bj_name, hMap]) => {
      const hours = Array.from(hMap.entries())
        .map(([hour, s]) => ({ hour, hearts: s.hearts, count: s.count }))
        .sort((a, b) => a.hour - b.hour)
      const peak_hour = hours.reduce((max, h) => h.hearts > max.hearts ? h : max, hours[0]).hour
      return { bj_name, hours, peak_hour }
    }).sort((a, b) => {
      const aTotal = a.hours.reduce((s, h) => s + h.hearts, 0)
      const bTotal = b.hours.reduce((s, h) => s + h.hearts, 0)
      return bTotal - aTotal
    })

    // topDonorTimes (Top 15)
    const top15Donors = [...donorTotalMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)
    const topDonorTimes = top15Donors.map(([donor_name, total_hearts]) => {
      const hMap = donorHourMap.get(donor_name) || new Map()
      const hours: { hour: number; hearts: number }[] = []
      for (let i = 0; i < 24; i++) hours.push({ hour: i, hearts: hMap.get(i) || 0 })
      const peak_hour = hours.reduce((max, h) => h.hearts > max.hearts ? h : max, hours[0]).hour
      return { donor_name, total_hearts, peak_hour, hours }
    })

    // heatmap
    let maxHearts = 0
    const heatmapRaw: { bj_name: string; hour: number; hearts: number }[] = []
    for (const bj of perBj) {
      for (const h of bj.hours) {
        heatmapRaw.push({ bj_name: bj.bj_name, hour: h.hour, hearts: h.hearts })
        if (h.hearts > maxHearts) maxHearts = h.hearts
      }
    }
    const heatmap = heatmapRaw.map(h => ({ ...h, intensity: maxHearts > 0 ? h.hearts / maxHearts : 0 }))

    return { overall, perBj, topDonorTimes, heatmap }
  })
}
