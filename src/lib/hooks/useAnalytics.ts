'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  getBjStats,
  getTimePattern,
  getDonorBjRelations,
  getDonorPatterns,
  compareEpisodes,
  searchDonor,
  getAnalyticsSummary,
  getEpisodeList,
  getSeasonList,
  getEpisodeTrend,
  getDonorRetention,
  getBjEpisodeTrend,
  getBjDetailedStats,
  getTimePatternEnhanced,
  type BjStats,
  type TimePatternData,
  type DonorBjRelation,
  type DonorPattern,
  type EpisodeComparison,
  type DonorSearch,
  type AnalyticsSummary,
  type EpisodeTrendData,
  type DonorRetentionData,
  type BjEpisodeTrendData,
  type BjDetailedStats,
  type TimePatternEnhanced,
} from '@/lib/actions/analytics'

interface UseAnalyticsOptions {
  seasonId?: number
  episodeId?: number
  autoLoad?: boolean
}

interface UseAnalyticsReturn {
  // 필터 상태
  seasonId: number | undefined
  episodeId: number | undefined
  setSeasonId: (id: number | undefined) => void
  setEpisodeId: (id: number | undefined) => void

  // 데이터
  summary: AnalyticsSummary | null
  bjStats: BjStats[]
  timePattern: TimePatternData[]
  donorBjRelations: DonorBjRelation[]
  donorPatterns: DonorPattern[]
  episodeComparison: EpisodeComparison | null
  donorSearchResult: DonorSearch | null
  episodeTrend: EpisodeTrendData[]
  donorRetention: DonorRetentionData | null
  bjEpisodeTrend: BjEpisodeTrendData[]
  bjDetailedStats: BjDetailedStats[]
  timePatternEnhanced: TimePatternEnhanced | null

  // 로딩 상태
  isLoading: boolean
  isSummaryLoading: boolean
  isBjStatsLoading: boolean
  isTimePatternLoading: boolean
  isDonorPatternsLoading: boolean
  isComparisonLoading: boolean
  isSearchLoading: boolean
  isEpisodeTrendLoading: boolean
  isDonorRetentionLoading: boolean
  isBjEpisodeTrendLoading: boolean
  isBjDetailedStatsLoading: boolean
  isTimePatternEnhancedLoading: boolean

  // 에러
  error: string | null

  // 메타 데이터
  seasons: { id: number; name: string }[]
  episodes: { id: number; title: string; season_id: number; episode_number: number; broadcast_date: string | null; is_finalized: boolean }[]

  // 액션
  loadSummary: () => Promise<void>
  loadBjStats: () => Promise<void>
  loadTimePattern: () => Promise<void>
  loadDonorBjRelations: (limit?: number) => Promise<void>
  loadDonorPatterns: () => Promise<void>
  loadEpisodeComparison: (ep1Id: number, ep2Id: number) => Promise<void>
  searchDonorByName: (name: string) => Promise<void>
  loadSeasons: () => Promise<void>
  loadEpisodes: () => Promise<void>
  loadEpisodeTrend: () => Promise<void>
  loadDonorRetention: () => Promise<void>
  loadBjEpisodeTrend: () => Promise<void>
  loadBjDetailedStats: () => Promise<void>
  loadTimePatternEnhanced: () => Promise<void>
  refreshAll: () => Promise<void>
}

export function useAnalytics(options: UseAnalyticsOptions = {}): UseAnalyticsReturn {
  const { autoLoad = true } = options

  // 초기 자동 선택 여부 추적 (최초 1회만)
  const hasAutoSelectedSeason = useRef(!!options.seasonId)

  // 필터 상태
  const [seasonId, setSeasonId] = useState<number | undefined>(options.seasonId)
  const [episodeId, setEpisodeId] = useState<number | undefined>(options.episodeId)

  // 데이터 상태
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [bjStats, setBjStats] = useState<BjStats[]>([])
  const [timePattern, setTimePattern] = useState<TimePatternData[]>([])
  const [donorBjRelations, setDonorBjRelations] = useState<DonorBjRelation[]>([])
  const [donorPatterns, setDonorPatterns] = useState<DonorPattern[]>([])
  const [episodeComparison, setEpisodeComparison] = useState<EpisodeComparison | null>(null)
  const [donorSearchResult, setDonorSearchResult] = useState<DonorSearch | null>(null)
  const [episodeTrend, setEpisodeTrend] = useState<EpisodeTrendData[]>([])
  const [donorRetention, setDonorRetention] = useState<DonorRetentionData | null>(null)
  const [bjEpisodeTrend, setBjEpisodeTrend] = useState<BjEpisodeTrendData[]>([])
  const [bjDetailedStats, setBjDetailedStats] = useState<BjDetailedStats[]>([])
  const [timePatternEnhanced, setTimePatternEnhanced] = useState<TimePatternEnhanced | null>(null)

  // 메타 데이터
  const [seasons, setSeasons] = useState<{ id: number; name: string }[]>([])
  const [episodes, setEpisodes] = useState<{ id: number; title: string; season_id: number; episode_number: number; broadcast_date: string | null; is_finalized: boolean }[]>([])

  // 로딩 상태
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)
  const [isBjStatsLoading, setIsBjStatsLoading] = useState(false)
  const [isTimePatternLoading, setIsTimePatternLoading] = useState(false)
  const [isDonorPatternsLoading, setIsDonorPatternsLoading] = useState(false)
  const [isComparisonLoading, setIsComparisonLoading] = useState(false)
  const [isSearchLoading, setIsSearchLoading] = useState(false)
  const [isRelationsLoading, setIsRelationsLoading] = useState(false)
  const [isEpisodeTrendLoading, setIsEpisodeTrendLoading] = useState(false)
  const [isDonorRetentionLoading, setIsDonorRetentionLoading] = useState(false)
  const [isBjEpisodeTrendLoading, setIsBjEpisodeTrendLoading] = useState(false)
  const [isBjDetailedStatsLoading, setIsBjDetailedStatsLoading] = useState(false)
  const [isTimePatternEnhancedLoading, setIsTimePatternEnhancedLoading] = useState(false)

  // 에러
  const [error, setError] = useState<string | null>(null)

  // 로드 함수들
  const loadSummary = useCallback(async () => {
    setIsSummaryLoading(true)
    setError(null)
    const result = await getAnalyticsSummary(seasonId, episodeId)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setSummary(result.data)
    }
    setIsSummaryLoading(false)
  }, [seasonId, episodeId])

  const loadBjStats = useCallback(async () => {
    setIsBjStatsLoading(true)
    setError(null)
    const result = await getBjStats(seasonId, episodeId)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setBjStats(result.data)
    }
    setIsBjStatsLoading(false)
  }, [seasonId, episodeId])

  const loadTimePattern = useCallback(async () => {
    setIsTimePatternLoading(true)
    setError(null)
    const result = await getTimePattern(seasonId, episodeId)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setTimePattern(result.data)
    }
    setIsTimePatternLoading(false)
  }, [seasonId, episodeId])

  const loadDonorBjRelations = useCallback(async (limit: number = 100) => {
    setIsRelationsLoading(true)
    setError(null)
    const result = await getDonorBjRelations(seasonId, episodeId, limit)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setDonorBjRelations(result.data)
    }
    setIsRelationsLoading(false)
  }, [seasonId, episodeId])

  const loadDonorPatterns = useCallback(async () => {
    setIsDonorPatternsLoading(true)
    setError(null)
    const result = await getDonorPatterns(seasonId, episodeId)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setDonorPatterns(result.data)
    }
    setIsDonorPatternsLoading(false)
  }, [seasonId, episodeId])

  const loadEpisodeComparison = useCallback(async (ep1Id: number, ep2Id: number) => {
    setIsComparisonLoading(true)
    setError(null)
    const result = await compareEpisodes(ep1Id, ep2Id)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setEpisodeComparison(result.data)
    }
    setIsComparisonLoading(false)
  }, [])

  const searchDonorByName = useCallback(async (name: string) => {
    if (!name.trim()) {
      setDonorSearchResult(null)
      return
    }
    setIsSearchLoading(true)
    setError(null)
    const result = await searchDonor(name, seasonId)
    if (result.error) {
      setError(result.error)
    } else {
      setDonorSearchResult(result.data)
    }
    setIsSearchLoading(false)
  }, [seasonId])

  const loadEpisodeTrend = useCallback(async () => {
    setIsEpisodeTrendLoading(true)
    setError(null)
    const result = await getEpisodeTrend(seasonId)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setEpisodeTrend(result.data)
    }
    setIsEpisodeTrendLoading(false)
  }, [seasonId])

  const loadDonorRetention = useCallback(async () => {
    setIsDonorRetentionLoading(true)
    setError(null)
    const result = await getDonorRetention(seasonId)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setDonorRetention(result.data)
    }
    setIsDonorRetentionLoading(false)
  }, [seasonId])

  const loadBjEpisodeTrend = useCallback(async () => {
    setIsBjEpisodeTrendLoading(true)
    setError(null)
    const result = await getBjEpisodeTrend(seasonId)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setBjEpisodeTrend(result.data)
    }
    setIsBjEpisodeTrendLoading(false)
  }, [seasonId])

  const loadBjDetailedStats = useCallback(async () => {
    setIsBjDetailedStatsLoading(true)
    setError(null)
    const result = await getBjDetailedStats(seasonId, episodeId)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setBjDetailedStats(result.data)
    }
    setIsBjDetailedStatsLoading(false)
  }, [seasonId, episodeId])

  const loadTimePatternEnhanced = useCallback(async () => {
    setIsTimePatternEnhancedLoading(true)
    setError(null)
    const result = await getTimePatternEnhanced(seasonId, episodeId)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setTimePatternEnhanced(result.data)
    }
    setIsTimePatternEnhancedLoading(false)
  }, [seasonId, episodeId])

  const loadSeasons = useCallback(async () => {
    const result = await getSeasonList()
    if (result.data) {
      setSeasons(result.data)
    }
  }, [])

  const loadEpisodes = useCallback(async () => {
    const result = await getEpisodeList(seasonId)
    if (result.data) {
      setEpisodes(result.data)
    }
  }, [seasonId])

  const resetAllData = useCallback(() => {
    setBjStats([])
    setTimePattern([])
    setDonorPatterns([])
    setEpisodeTrend([])
    setDonorRetention(null)
    setBjEpisodeTrend([])
    setBjDetailedStats([])
    setTimePatternEnhanced(null)
  }, [])

  const refreshAll = useCallback(async () => {
    resetAllData()
    await loadSummary()
  }, [resetAllData, loadSummary])

  // 초기 로드
  useEffect(() => {
    loadSeasons()
  }, [loadSeasons])

  useEffect(() => {
    loadEpisodes()
  }, [loadEpisodes])

  // 시즌 자동 선택: 시즌 목록 로드 후 가장 최신 시즌 선택 (최초 1회)
  useEffect(() => {
    if (!hasAutoSelectedSeason.current && seasons.length > 0) {
      hasAutoSelectedSeason.current = true
      const latestSeason = seasons[seasons.length - 1]
      setSeasonId(latestSeason.id)
    }
  }, [seasons])

  // 에피소드 자동 선택: "전체 에피소드"(undefined) 기본값
  // 서버 액션이 is_finalized 필터를 처리하므로 특정 회차 선택 불필요
  // 사용자가 필요 시 드롭다운에서 특정 회차 선택 가능

  useEffect(() => {
    if (autoLoad) {
      refreshAll()
    }
  }, [autoLoad, seasonId, episodeId, refreshAll])

  const isLoading =
    isSummaryLoading ||
    isBjStatsLoading ||
    isTimePatternLoading ||
    isDonorPatternsLoading ||
    isComparisonLoading ||
    isSearchLoading ||
    isRelationsLoading ||
    isEpisodeTrendLoading ||
    isDonorRetentionLoading ||
    isBjEpisodeTrendLoading ||
    isBjDetailedStatsLoading ||
    isTimePatternEnhancedLoading

  return {
    // 필터
    seasonId,
    episodeId,
    setSeasonId,
    setEpisodeId,

    // 데이터
    summary,
    bjStats,
    timePattern,
    donorBjRelations,
    donorPatterns,
    episodeComparison,
    donorSearchResult,
    episodeTrend,
    donorRetention,
    bjEpisodeTrend,
    bjDetailedStats,
    timePatternEnhanced,

    // 로딩
    isLoading,
    isSummaryLoading,
    isBjStatsLoading,
    isTimePatternLoading,
    isDonorPatternsLoading,
    isComparisonLoading,
    isSearchLoading,
    isEpisodeTrendLoading,
    isDonorRetentionLoading,
    isBjEpisodeTrendLoading,
    isBjDetailedStatsLoading,
    isTimePatternEnhancedLoading,

    // 에러
    error,

    // 메타
    seasons,
    episodes,

    // 액션
    loadSummary,
    loadBjStats,
    loadTimePattern,
    loadDonorBjRelations,
    loadDonorPatterns,
    loadEpisodeComparison,
    searchDonorByName,
    loadSeasons,
    loadEpisodes,
    loadEpisodeTrend,
    loadDonorRetention,
    loadBjEpisodeTrend,
    loadBjDetailedStats,
    loadTimePatternEnhanced,
    refreshAll,
  }
}
