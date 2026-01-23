'use server'

import { adminAction, type ActionResult } from './index'

// ===== 타입 정의 =====

export type PeriodType = '7d' | '30d' | '90d' | 'all'

export interface DonationStats {
  totalHearts: number
  totalDonors: number
  averageDonation: number
  donationCount: number
  previousPeriod: {
    totalHearts: number
    totalDonors: number
    averageDonation: number
    donationCount: number
  }
  changeRates: {
    heartsChange: number
    donorsChange: number
    averageChange: number
    countChange: number
  }
}

export interface SeasonComparisonItem {
  seasonId: number
  seasonName: string
  totalHearts: number
  totalDonors: number
  episodeCount: number
  averagePerEpisode: number
}

export interface EpisodeDonationItem {
  episodeId: number
  episodeNumber: number
  title: string
  broadcastDate: string
  isRankBattle: boolean
  totalHearts: number
  donorCount: number
}

export interface DailyTrendItem {
  date: string
  totalHearts: number
  donorCount: number
}

export interface DataVerificationItem {
  rank: number
  originalDonorName: string
  originalAmount: number
  processedDonorName: string
  processedAmount: number
  difference: number
  isMatched: boolean
}

export interface TrendAnalysis {
  daily: DailyTrendItem[]
  weeklyGrowth: number
  monthlyGrowth: number
  peakDate: string
  peakAmount: number
}

// ===== 헬퍼 함수 =====

function calculateChangeRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function getPeriodDays(period: PeriodType): number {
  switch (period) {
    case '7d': return 7
    case '30d': return 30
    case '90d': return 90
    case 'all': return 365 * 10 // 전체 기간
  }
}

// ===== Server Actions =====

/**
 * 기간별 후원 통계
 */
export async function getDonationStats(
  period: PeriodType,
  seasonId?: number
): Promise<ActionResult<DonationStats>> {
  return adminAction(async (supabase) => {
    const days = getPeriodDays(period)
    const now = new Date()
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const previousStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000)

    // 현재 기간 통계
    let currentQuery = supabase
      .from('donations')
      .select('amount, donor_name')
      .gte('created_at', startDate.toISOString())

    if (seasonId) {
      currentQuery = currentQuery.eq('season_id', seasonId)
    }

    const { data: currentData, error: currentError } = await currentQuery

    if (currentError) throw new Error(currentError.message)

    // 이전 기간 통계
    let previousQuery = supabase
      .from('donations')
      .select('amount, donor_name')
      .gte('created_at', previousStartDate.toISOString())
      .lt('created_at', startDate.toISOString())

    if (seasonId) {
      previousQuery = previousQuery.eq('season_id', seasonId)
    }

    const { data: previousData, error: previousError } = await previousQuery

    if (previousError) throw new Error(previousError.message)

    // 현재 기간 계산
    const currentTotalHearts = currentData?.reduce((sum, d) => sum + d.amount, 0) || 0
    const currentUniqueDonors = new Set(currentData?.map(d => d.donor_name) || []).size
    const currentCount = currentData?.length || 0
    const currentAverage = currentCount > 0 ? Math.round(currentTotalHearts / currentCount) : 0

    // 이전 기간 계산
    const previousTotalHearts = previousData?.reduce((sum, d) => sum + d.amount, 0) || 0
    const previousUniqueDonors = new Set(previousData?.map(d => d.donor_name) || []).size
    const previousCount = previousData?.length || 0
    const previousAverage = previousCount > 0 ? Math.round(previousTotalHearts / previousCount) : 0

    return {
      totalHearts: currentTotalHearts,
      totalDonors: currentUniqueDonors,
      averageDonation: currentAverage,
      donationCount: currentCount,
      previousPeriod: {
        totalHearts: previousTotalHearts,
        totalDonors: previousUniqueDonors,
        averageDonation: previousAverage,
        donationCount: previousCount,
      },
      changeRates: {
        heartsChange: calculateChangeRate(currentTotalHearts, previousTotalHearts),
        donorsChange: calculateChangeRate(currentUniqueDonors, previousUniqueDonors),
        averageChange: calculateChangeRate(currentAverage, previousAverage),
        countChange: calculateChangeRate(currentCount, previousCount),
      },
    }
  })
}

/**
 * 시즌별 비교 데이터
 */
export async function getSeasonComparison(): Promise<ActionResult<SeasonComparisonItem[]>> {
  return adminAction(async (supabase) => {
    // 시즌 목록 조회
    const { data: seasons, error: seasonsError } = await supabase
      .from('seasons')
      .select('id, name')
      .order('id', { ascending: true })

    if (seasonsError) throw new Error(seasonsError.message)

    const results: SeasonComparisonItem[] = []

    for (const season of seasons || []) {
      // 시즌별 후원 통계
      const { data: donations, error: donationsError } = await supabase
        .from('donations')
        .select('amount, donor_name')
        .eq('season_id', season.id)

      if (donationsError) throw new Error(donationsError.message)

      // 에피소드 개수
      const { count: episodeCount, error: episodeError } = await supabase
        .from('episodes')
        .select('*', { count: 'exact', head: true })
        .eq('season_id', season.id)

      if (episodeError) throw new Error(episodeError.message)

      const totalHearts = donations?.reduce((sum, d) => sum + d.amount, 0) || 0
      const uniqueDonors = new Set(donations?.map(d => d.donor_name) || []).size
      const epCount = episodeCount || 0

      results.push({
        seasonId: season.id,
        seasonName: season.name,
        totalHearts,
        totalDonors: uniqueDonors,
        episodeCount: epCount,
        averagePerEpisode: epCount > 0 ? Math.round(totalHearts / epCount) : 0,
      })
    }

    return results
  })
}

/**
 * 에피소드별 후원 데이터
 */
export async function getEpisodeDonations(
  seasonId: number
): Promise<ActionResult<EpisodeDonationItem[]>> {
  return adminAction(async (supabase) => {
    // 에피소드 목록 조회
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id, episode_number, title, broadcast_date, is_rank_battle')
      .eq('season_id', seasonId)
      .order('episode_number', { ascending: true })

    if (episodesError) throw new Error(episodesError.message)

    const results: EpisodeDonationItem[] = []

    for (const episode of episodes || []) {
      // 에피소드별 후원 통계
      const { data: donations, error: donationsError } = await supabase
        .from('donations')
        .select('amount, donor_name')
        .eq('episode_id', episode.id)

      if (donationsError) throw new Error(donationsError.message)

      const totalHearts = donations?.reduce((sum, d) => sum + d.amount, 0) || 0
      const uniqueDonors = new Set(donations?.map(d => d.donor_name) || []).size

      results.push({
        episodeId: episode.id,
        episodeNumber: episode.episode_number,
        title: episode.title,
        broadcastDate: episode.broadcast_date,
        isRankBattle: episode.is_rank_battle,
        totalHearts,
        donorCount: uniqueDonors,
      })
    }

    return results
  })
}

/**
 * 데이터 검증 (원본 donations vs season_donation_rankings)
 */
export async function verifyDonationData(
  seasonId: number,
  limit: number = 50
): Promise<ActionResult<DataVerificationItem[]>> {
  return adminAction(async (supabase) => {
    // 원본 donations에서 집계
    const { data: donations, error: donationsError } = await supabase
      .from('donations')
      .select('donor_name, amount')
      .eq('season_id', seasonId)

    if (donationsError) throw new Error(donationsError.message)

    // 후원자별 합계 계산 (원본)
    const originalAggregated = new Map<string, number>()
    donations?.forEach(d => {
      const current = originalAggregated.get(d.donor_name) || 0
      originalAggregated.set(d.donor_name, current + d.amount)
    })

    // 합계 기준 정렬
    const originalRanking = Array.from(originalAggregated.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)

    // 처리 결과 (season_donation_rankings)
    const { data: rankings, error: rankingsError } = await supabase
      .from('season_donation_rankings')
      .select('rank, donor_name, total_amount')
      .eq('season_id', seasonId)
      .order('rank', { ascending: true })
      .limit(limit)

    if (rankingsError) throw new Error(rankingsError.message)

    // 비교 결과 생성
    const results: DataVerificationItem[] = []
    const maxLength = Math.max(originalRanking.length, rankings?.length || 0)

    for (let i = 0; i < maxLength; i++) {
      const original = originalRanking[i]
      const processed = rankings?.[i]

      const originalName = original?.[0] || '-'
      const originalAmount = original?.[1] || 0
      const processedName = processed?.donor_name || '-'
      const processedAmount = processed?.total_amount || 0

      results.push({
        rank: i + 1,
        originalDonorName: originalName,
        originalAmount,
        processedDonorName: processedName,
        processedAmount,
        difference: originalAmount - processedAmount,
        isMatched: originalName === processedName && originalAmount === processedAmount,
      })
    }

    return results
  })
}

/**
 * 트렌드 분석 (일별 추이 + 증감률)
 */
export async function getTrendAnalysis(
  period: PeriodType,
  seasonId?: number
): Promise<ActionResult<TrendAnalysis>> {
  return adminAction(async (supabase) => {
    const days = getPeriodDays(period)
    const now = new Date()
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    // 후원 데이터 조회
    let query = supabase
      .from('donations')
      .select('amount, donor_name, created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    const { data: donations, error } = await query

    if (error) throw new Error(error.message)

    // 일별 집계
    const dailyMap = new Map<string, { hearts: number; donors: Set<string> }>()

    donations?.forEach(d => {
      const date = d.created_at.split('T')[0]
      const current = dailyMap.get(date) || { hearts: 0, donors: new Set<string>() }
      current.hearts += d.amount
      current.donors.add(d.donor_name)
      dailyMap.set(date, current)
    })

    // 배열로 변환
    const daily: DailyTrendItem[] = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        totalHearts: data.hearts,
        donorCount: data.donors.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 주간 성장률 계산
    const lastWeek = daily.slice(-7)
    const previousWeek = daily.slice(-14, -7)
    const lastWeekTotal = lastWeek.reduce((sum, d) => sum + d.totalHearts, 0)
    const previousWeekTotal = previousWeek.reduce((sum, d) => sum + d.totalHearts, 0)
    const weeklyGrowth = calculateChangeRate(lastWeekTotal, previousWeekTotal)

    // 월간 성장률 계산
    const lastMonth = daily.slice(-30)
    const previousMonth = daily.slice(-60, -30)
    const lastMonthTotal = lastMonth.reduce((sum, d) => sum + d.totalHearts, 0)
    const previousMonthTotal = previousMonth.reduce((sum, d) => sum + d.totalHearts, 0)
    const monthlyGrowth = calculateChangeRate(lastMonthTotal, previousMonthTotal)

    // 피크 날짜 찾기
    const peak = daily.reduce(
      (max, d) => (d.totalHearts > max.amount ? { date: d.date, amount: d.totalHearts } : max),
      { date: '', amount: 0 }
    )

    return {
      daily,
      weeklyGrowth,
      monthlyGrowth,
      peakDate: peak.date,
      peakAmount: peak.amount,
    }
  })
}

/**
 * VIP 회원 수 및 변동
 */
export async function getVipStats(): Promise<ActionResult<{
  totalVips: number
  newVipsThisMonth: number
  change: number
}>> {
  return adminAction(async (supabase) => {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // 전체 VIP 수
    const { count: totalVips, error: totalError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'vip')

    if (totalError) throw new Error(totalError.message)

    // 이번 달 신규 VIP
    const { count: newThisMonth, error: newError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'vip')
      .gte('created_at', thisMonthStart.toISOString())

    if (newError) throw new Error(newError.message)

    // 지난 달 신규 VIP
    const { count: newLastMonth, error: lastError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'vip')
      .gte('created_at', lastMonthStart.toISOString())
      .lt('created_at', thisMonthStart.toISOString())

    if (lastError) throw new Error(lastError.message)

    return {
      totalVips: totalVips || 0,
      newVipsThisMonth: newThisMonth || 0,
      change: calculateChangeRate(newThisMonth || 0, newLastMonth || 0),
    }
  })
}

/**
 * 활성 후원자 수 (최근 30일 내 후원한 사용자)
 */
export async function getActiveDonorStats(): Promise<ActionResult<{
  activeDonors: number
  change: number
}>> {
  return adminAction(async (supabase) => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    // 최근 30일 후원자
    const { data: recentDonations, error: recentError } = await supabase
      .from('donations')
      .select('donor_name')
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (recentError) throw new Error(recentError.message)

    // 이전 30일 후원자
    const { data: previousDonations, error: previousError } = await supabase
      .from('donations')
      .select('donor_name')
      .gte('created_at', sixtyDaysAgo.toISOString())
      .lt('created_at', thirtyDaysAgo.toISOString())

    if (previousError) throw new Error(previousError.message)

    const recentUnique = new Set(recentDonations?.map(d => d.donor_name) || []).size
    const previousUnique = new Set(previousDonations?.map(d => d.donor_name) || []).size

    return {
      activeDonors: recentUnique,
      change: calculateChangeRate(recentUnique, previousUnique),
    }
  })
}
