'use client'

import { useState, useCallback } from 'react'
import {
  getAdvancedChurnPrediction,
  getDonorRFMAnalysis,
  getBjAffinityMatrix,
  getBjActionableInsights,
  compareEpisodes,
  type ChurnPredictionData,
  type RFMData,
  type BjAffinityData,
  type BjInsightsData,
  type EpisodeComparison,
} from '@/lib/actions/analytics'

export interface UseAnalyticsAdvancedOptions {
  seasonId?: number
  episodeId?: number
}

export interface UseAnalyticsAdvancedReturn {
  // 데이터
  churnPrediction: ChurnPredictionData | null
  rfmAnalysis: RFMData | null
  bjAffinity: BjAffinityData | null
  bjInsights: BjInsightsData | null
  episodeComparison: EpisodeComparison | null

  // 로딩 상태
  isChurnPredictionLoading: boolean
  isRfmLoading: boolean
  isBjAffinityLoading: boolean
  isBjInsightsLoading: boolean
  isComparisonLoading: boolean

  // 에러
  error: string | null

  // 액션
  loadChurnPrediction: () => Promise<void>
  loadRfmAnalysis: () => Promise<void>
  loadBjAffinity: () => Promise<void>
  loadBjInsights: () => Promise<void>
  loadEpisodeComparison: (ep1Id: number, ep2Id: number) => Promise<void>
  resetAdvancedData: () => void
}

/**
 * Advanced analytics: churn prediction, RFM analysis, BJ affinity, BJ insights, episode comparison.
 */
export function useAnalyticsAdvanced(
  options: UseAnalyticsAdvancedOptions = {}
): UseAnalyticsAdvancedReturn {
  const { seasonId, episodeId } = options

  // 데이터 상태
  const [churnPrediction, setChurnPrediction] = useState<ChurnPredictionData | null>(null)
  const [rfmAnalysis, setRfmAnalysis] = useState<RFMData | null>(null)
  const [bjAffinity, setBjAffinity] = useState<BjAffinityData | null>(null)
  const [bjInsights, setBjInsights] = useState<BjInsightsData | null>(null)
  const [episodeComparison, setEpisodeComparison] = useState<EpisodeComparison | null>(null)

  // 로딩 상태
  const [isChurnPredictionLoading, setIsChurnPredictionLoading] = useState(false)
  const [isRfmLoading, setIsRfmLoading] = useState(false)
  const [isBjAffinityLoading, setIsBjAffinityLoading] = useState(false)
  const [isBjInsightsLoading, setIsBjInsightsLoading] = useState(false)
  const [isComparisonLoading, setIsComparisonLoading] = useState(false)

  // 에러
  const [error, setError] = useState<string | null>(null)

  const loadChurnPrediction = useCallback(async () => {
    setIsChurnPredictionLoading(true)
    setError(null)
    const result = await getAdvancedChurnPrediction(seasonId)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setChurnPrediction(result.data)
    }
    setIsChurnPredictionLoading(false)
  }, [seasonId])

  const loadRfmAnalysis = useCallback(async () => {
    setIsRfmLoading(true)
    setError(null)
    const result = await getDonorRFMAnalysis(seasonId)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setRfmAnalysis(result.data)
    }
    setIsRfmLoading(false)
  }, [seasonId])

  const loadBjAffinity = useCallback(async () => {
    setIsBjAffinityLoading(true)
    setError(null)
    const result = await getBjAffinityMatrix(seasonId)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setBjAffinity(result.data)
    }
    setIsBjAffinityLoading(false)
  }, [seasonId])

  const loadBjInsights = useCallback(async () => {
    setIsBjInsightsLoading(true)
    setError(null)
    const result = await getBjActionableInsights(seasonId, episodeId)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setBjInsights(result.data)
    }
    setIsBjInsightsLoading(false)
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

  const resetAdvancedData = useCallback(() => {
    setChurnPrediction(null)
    setRfmAnalysis(null)
    setBjAffinity(null)
    setBjInsights(null)
  }, [])

  return {
    churnPrediction,
    rfmAnalysis,
    bjAffinity,
    bjInsights,
    episodeComparison,
    isChurnPredictionLoading,
    isRfmLoading,
    isBjAffinityLoading,
    isBjInsightsLoading,
    isComparisonLoading,
    error,
    loadChurnPrediction,
    loadRfmAnalysis,
    loadBjAffinity,
    loadBjInsights,
    loadEpisodeComparison,
    resetAdvancedData,
  }
}
