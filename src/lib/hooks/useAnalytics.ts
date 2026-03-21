'use client'

import { useCallback, useMemo } from 'react'
import { useAnalyticsSummary } from './useAnalyticsSummary'
import { useAnalyticsDonors } from './useAnalyticsDonors'
import { useAnalyticsBj } from './useAnalyticsBj'
import { useAnalyticsAdvanced } from './useAnalyticsAdvanced'

import type {
  AnalyticsSummary,
  BjStats,
  TimePatternData,
  DonorBjRelation,
  DonorPattern,
  EpisodeComparison,
  DonorSearch,
  EpisodeTrendData,
  DonorRetentionData,
  BjEpisodeTrendData,
  BjDetailedStats,
  TimePatternEnhanced,
  SignatureEligibilityData,
  ChurnPredictionData,
  RFMData,
  BjAffinityData,
  BjInsightsData,
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
  signatureEligibility: SignatureEligibilityData | null
  churnPrediction: ChurnPredictionData | null
  rfmAnalysis: RFMData | null
  bjAffinity: BjAffinityData | null
  bjInsights: BjInsightsData | null

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
  isSignatureLoading: boolean
  isChurnPredictionLoading: boolean
  isRfmLoading: boolean
  isBjAffinityLoading: boolean
  isBjInsightsLoading: boolean

  // 에러
  error: string | null

  // 메타 데이터
  seasons: { id: number; name: string }[]
  episodes: { id: number; title: string; description: string | null; season_id: number; episode_number: number; broadcast_date: string | null; is_finalized: boolean }[]

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
  loadSignatureEligibility: () => Promise<void>
  loadChurnPrediction: () => Promise<void>
  loadRfmAnalysis: () => Promise<void>
  loadBjAffinity: () => Promise<void>
  loadBjInsights: () => Promise<void>
  refreshAll: () => Promise<void>
}

/**
 * Composition root for all analytics hooks.
 * Delegates to domain-specific sub-hooks while preserving the original API surface.
 *
 * For new code, prefer importing the sub-hooks directly:
 * - useAnalyticsSummary: filter state, summary, seasons/episodes
 * - useAnalyticsDonors: donor patterns, search, retention, time patterns
 * - useAnalyticsBj: BJ stats, episode trends, detailed stats, signature eligibility
 * - useAnalyticsAdvanced: churn prediction, RFM, BJ affinity/insights, episode comparison
 */
export function useAnalytics(options: UseAnalyticsOptions = {}): UseAnalyticsReturn {
  // Core: filter state, summary, seasons/episodes, autoLoad lifecycle
  const summaryHook = useAnalyticsSummary(options)

  // Sub-hooks receive filter state from summaryHook
  const filterOptions = useMemo(
    () => ({ seasonId: summaryHook.seasonId, episodeId: summaryHook.episodeId }),
    [summaryHook.seasonId, summaryHook.episodeId]
  )

  const donorsHook = useAnalyticsDonors(filterOptions)
  const bjHook = useAnalyticsBj(filterOptions)
  const advancedHook = useAnalyticsAdvanced(filterOptions)

  // Aggregate loading
  const isLoading =
    summaryHook.isSummaryLoading ||
    summaryHook.isEpisodeTrendLoading ||
    bjHook.isBjStatsLoading ||
    donorsHook.isTimePatternLoading ||
    donorsHook.isDonorPatternsLoading ||
    advancedHook.isComparisonLoading ||
    donorsHook.isSearchLoading ||
    donorsHook.isDonorRetentionLoading ||
    bjHook.isBjEpisodeTrendLoading ||
    bjHook.isBjDetailedStatsLoading ||
    donorsHook.isTimePatternEnhancedLoading ||
    bjHook.isSignatureLoading ||
    advancedHook.isChurnPredictionLoading ||
    advancedHook.isRfmLoading ||
    advancedHook.isBjAffinityLoading ||
    advancedHook.isBjInsightsLoading

  // Aggregate error (first non-null error)
  const error =
    summaryHook.error ||
    donorsHook.error ||
    bjHook.error ||
    advancedHook.error

  const refreshAll = useCallback(async () => {
    donorsHook.resetDonorData()
    bjHook.resetBjData()
    advancedHook.resetAdvancedData()
    await summaryHook.refreshAll()
  }, [donorsHook, bjHook, advancedHook, summaryHook])

  return {
    // 필터
    seasonId: summaryHook.seasonId,
    episodeId: summaryHook.episodeId,
    setSeasonId: summaryHook.setSeasonId,
    setEpisodeId: summaryHook.setEpisodeId,

    // 데이터
    summary: summaryHook.summary,
    bjStats: bjHook.bjStats,
    timePattern: donorsHook.timePattern,
    donorBjRelations: donorsHook.donorBjRelations,
    donorPatterns: donorsHook.donorPatterns,
    episodeComparison: advancedHook.episodeComparison,
    donorSearchResult: donorsHook.donorSearchResult,
    episodeTrend: summaryHook.episodeTrend,
    donorRetention: donorsHook.donorRetention,
    bjEpisodeTrend: bjHook.bjEpisodeTrend,
    bjDetailedStats: bjHook.bjDetailedStats,
    timePatternEnhanced: donorsHook.timePatternEnhanced,
    signatureEligibility: bjHook.signatureEligibility,
    churnPrediction: advancedHook.churnPrediction,
    rfmAnalysis: advancedHook.rfmAnalysis,
    bjAffinity: advancedHook.bjAffinity,
    bjInsights: advancedHook.bjInsights,

    // 로딩
    isLoading,
    isSummaryLoading: summaryHook.isSummaryLoading,
    isBjStatsLoading: bjHook.isBjStatsLoading,
    isTimePatternLoading: donorsHook.isTimePatternLoading,
    isDonorPatternsLoading: donorsHook.isDonorPatternsLoading,
    isComparisonLoading: advancedHook.isComparisonLoading,
    isSearchLoading: donorsHook.isSearchLoading,
    isEpisodeTrendLoading: summaryHook.isEpisodeTrendLoading,
    isDonorRetentionLoading: donorsHook.isDonorRetentionLoading,
    isBjEpisodeTrendLoading: bjHook.isBjEpisodeTrendLoading,
    isBjDetailedStatsLoading: bjHook.isBjDetailedStatsLoading,
    isTimePatternEnhancedLoading: donorsHook.isTimePatternEnhancedLoading,
    isSignatureLoading: bjHook.isSignatureLoading,
    isChurnPredictionLoading: advancedHook.isChurnPredictionLoading,
    isRfmLoading: advancedHook.isRfmLoading,
    isBjAffinityLoading: advancedHook.isBjAffinityLoading,
    isBjInsightsLoading: advancedHook.isBjInsightsLoading,

    // 에러
    error,

    // 메타
    seasons: summaryHook.seasons,
    episodes: summaryHook.episodes,

    // 액션
    loadSummary: summaryHook.loadSummary,
    loadBjStats: bjHook.loadBjStats,
    loadTimePattern: donorsHook.loadTimePattern,
    loadDonorBjRelations: donorsHook.loadDonorBjRelations,
    loadDonorPatterns: donorsHook.loadDonorPatterns,
    loadEpisodeComparison: advancedHook.loadEpisodeComparison,
    searchDonorByName: donorsHook.searchDonorByName,
    loadSeasons: summaryHook.loadSeasons,
    loadEpisodes: summaryHook.loadEpisodes,
    loadEpisodeTrend: summaryHook.loadEpisodeTrend,
    loadDonorRetention: donorsHook.loadDonorRetention,
    loadBjEpisodeTrend: bjHook.loadBjEpisodeTrend,
    loadBjDetailedStats: bjHook.loadBjDetailedStats,
    loadTimePatternEnhanced: donorsHook.loadTimePatternEnhanced,
    loadSignatureEligibility: bjHook.loadSignatureEligibility,
    loadChurnPrediction: advancedHook.loadChurnPrediction,
    loadRfmAnalysis: advancedHook.loadRfmAnalysis,
    loadBjAffinity: advancedHook.loadBjAffinity,
    loadBjInsights: advancedHook.loadBjInsights,
    refreshAll,
  }
}
