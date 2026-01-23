'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  getDonationStats,
  getSeasonComparison,
  getEpisodeDonations,
  verifyDonationData,
  getTrendAnalysis,
  getVipStats,
  getActiveDonorStats,
  type PeriodType,
  type DonationStats,
  type SeasonComparisonItem,
  type EpisodeDonationItem,
  type DataVerificationItem,
  type TrendAnalysis,
} from '@/lib/actions/analytics'

interface UseAnalyticsOptions {
  initialPeriod?: PeriodType
  seasonId?: number
  autoFetch?: boolean
}

interface UseAnalyticsReturn {
  // 데이터
  donationStats: DonationStats | null
  seasonComparison: SeasonComparisonItem[]
  episodeDonations: EpisodeDonationItem[]
  verificationData: DataVerificationItem[]
  trendAnalysis: TrendAnalysis | null
  vipStats: { totalVips: number; newVipsThisMonth: number; change: number } | null
  activeDonorStats: { activeDonors: number; change: number } | null

  // 상태
  isLoading: boolean
  error: string | null
  period: PeriodType
  selectedSeasonId: number | null

  // 액션
  setPeriod: (period: PeriodType) => void
  setSelectedSeasonId: (seasonId: number | null) => void
  fetchDonationStats: () => Promise<void>
  fetchSeasonComparison: () => Promise<void>
  fetchEpisodeDonations: (seasonId: number) => Promise<void>
  fetchVerificationData: (seasonId: number, limit?: number) => Promise<void>
  fetchTrendAnalysis: () => Promise<void>
  fetchVipStats: () => Promise<void>
  fetchActiveDonorStats: () => Promise<void>
  fetchAll: () => Promise<void>
  refetch: () => Promise<void>
}

export function useAnalytics(options: UseAnalyticsOptions = {}): UseAnalyticsReturn {
  const {
    initialPeriod = '30d',
    seasonId,
    autoFetch = true,
  } = options

  // 상태
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<PeriodType>(initialPeriod)
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(seasonId || null)

  // 데이터
  const [donationStats, setDonationStats] = useState<DonationStats | null>(null)
  const [seasonComparison, setSeasonComparison] = useState<SeasonComparisonItem[]>([])
  const [episodeDonations, setEpisodeDonations] = useState<EpisodeDonationItem[]>([])
  const [verificationData, setVerificationData] = useState<DataVerificationItem[]>([])
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis | null>(null)
  const [vipStats, setVipStats] = useState<{ totalVips: number; newVipsThisMonth: number; change: number } | null>(null)
  const [activeDonorStats, setActiveDonorStats] = useState<{ activeDonors: number; change: number } | null>(null)

  // 후원 통계 가져오기
  const fetchDonationStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getDonationStats(period, selectedSeasonId || undefined)
      if (result.error) {
        setError(result.error)
      } else {
        setDonationStats(result.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '통계 로드 실패')
    } finally {
      setIsLoading(false)
    }
  }, [period, selectedSeasonId])

  // 시즌 비교 데이터 가져오기
  const fetchSeasonComparison = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getSeasonComparison()
      if (result.error) {
        setError(result.error)
      } else {
        setSeasonComparison(result.data || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '시즌 비교 데이터 로드 실패')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 에피소드별 후원 데이터 가져오기
  const fetchEpisodeDonations = useCallback(async (seasonIdParam: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getEpisodeDonations(seasonIdParam)
      if (result.error) {
        setError(result.error)
      } else {
        setEpisodeDonations(result.data || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '에피소드 데이터 로드 실패')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 데이터 검증 가져오기
  const fetchVerificationData = useCallback(async (seasonIdParam: number, limit: number = 50) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await verifyDonationData(seasonIdParam, limit)
      if (result.error) {
        setError(result.error)
      } else {
        setVerificationData(result.data || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '검증 데이터 로드 실패')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 트렌드 분석 가져오기
  const fetchTrendAnalysis = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getTrendAnalysis(period, selectedSeasonId || undefined)
      if (result.error) {
        setError(result.error)
      } else {
        setTrendAnalysis(result.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '트렌드 분석 로드 실패')
    } finally {
      setIsLoading(false)
    }
  }, [period, selectedSeasonId])

  // VIP 통계 가져오기
  const fetchVipStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getVipStats()
      if (result.error) {
        setError(result.error)
      } else {
        setVipStats(result.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'VIP 통계 로드 실패')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 활성 후원자 통계 가져오기
  const fetchActiveDonorStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getActiveDonorStats()
      if (result.error) {
        setError(result.error)
      } else {
        setActiveDonorStats(result.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '활성 후원자 통계 로드 실패')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 모든 데이터 가져오기
  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      await Promise.all([
        getDonationStats(period, selectedSeasonId || undefined).then(r => {
          if (!r.error) setDonationStats(r.data)
        }),
        getSeasonComparison().then(r => {
          if (!r.error) setSeasonComparison(r.data || [])
        }),
        getTrendAnalysis(period, selectedSeasonId || undefined).then(r => {
          if (!r.error) setTrendAnalysis(r.data)
        }),
        getVipStats().then(r => {
          if (!r.error) setVipStats(r.data)
        }),
        getActiveDonorStats().then(r => {
          if (!r.error) setActiveDonorStats(r.data)
        }),
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드 실패')
    } finally {
      setIsLoading(false)
    }
  }, [period, selectedSeasonId])

  // 새로고침
  const refetch = useCallback(async () => {
    await fetchAll()
    if (selectedSeasonId) {
      await Promise.all([
        fetchEpisodeDonations(selectedSeasonId),
        fetchVerificationData(selectedSeasonId),
      ])
    }
  }, [fetchAll, fetchEpisodeDonations, fetchVerificationData, selectedSeasonId])

  // 초기 로드
  useEffect(() => {
    if (autoFetch) {
      fetchAll()
    }
  }, [autoFetch, fetchAll])

  // 기간 변경 시 재로드
  useEffect(() => {
    if (autoFetch && donationStats) {
      fetchDonationStats()
      fetchTrendAnalysis()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  // 시즌 변경 시 에피소드 데이터 로드
  useEffect(() => {
    if (autoFetch && selectedSeasonId) {
      fetchEpisodeDonations(selectedSeasonId)
      fetchVerificationData(selectedSeasonId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeasonId])

  return {
    // 데이터
    donationStats,
    seasonComparison,
    episodeDonations,
    verificationData,
    trendAnalysis,
    vipStats,
    activeDonorStats,

    // 상태
    isLoading,
    error,
    period,
    selectedSeasonId,

    // 액션
    setPeriod,
    setSelectedSeasonId,
    fetchDonationStats,
    fetchSeasonComparison,
    fetchEpisodeDonations,
    fetchVerificationData,
    fetchTrendAnalysis,
    fetchVipStats,
    fetchActiveDonorStats,
    fetchAll,
    refetch,
  }
}

export default useAnalytics
