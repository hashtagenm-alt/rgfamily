'use client'

import { useState, useCallback } from 'react'
import {
  getBjStats,
  getBjEpisodeTrend,
  getBjDetailedStats,
  getSignatureEligibility,
  type BjStats,
  type BjEpisodeTrendData,
  type BjDetailedStats,
  type SignatureEligibilityData,
} from '@/lib/actions/analytics'

export interface UseAnalyticsBjOptions {
  seasonId?: number
  episodeId?: number
}

export interface UseAnalyticsBjReturn {
  // 데이터
  bjStats: BjStats[]
  bjEpisodeTrend: BjEpisodeTrendData[]
  bjDetailedStats: BjDetailedStats[]
  signatureEligibility: SignatureEligibilityData | null

  // 로딩 상태
  isBjStatsLoading: boolean
  isBjEpisodeTrendLoading: boolean
  isBjDetailedStatsLoading: boolean
  isSignatureLoading: boolean

  // 에러
  error: string | null

  // 액션
  loadBjStats: () => Promise<void>
  loadBjEpisodeTrend: () => Promise<void>
  loadBjDetailedStats: () => Promise<void>
  loadSignatureEligibility: () => Promise<void>
  resetBjData: () => void
}

/**
 * BJ (streamer) analytics: stats, episode trends, detailed stats, signature eligibility.
 */
export function useAnalyticsBj(
  options: UseAnalyticsBjOptions = {}
): UseAnalyticsBjReturn {
  const { seasonId, episodeId } = options

  // 데이터 상태
  const [bjStats, setBjStats] = useState<BjStats[]>([])
  const [bjEpisodeTrend, setBjEpisodeTrend] = useState<BjEpisodeTrendData[]>([])
  const [bjDetailedStats, setBjDetailedStats] = useState<BjDetailedStats[]>([])
  const [signatureEligibility, setSignatureEligibility] = useState<SignatureEligibilityData | null>(null)

  // 로딩 상태
  const [isBjStatsLoading, setIsBjStatsLoading] = useState(false)
  const [isBjEpisodeTrendLoading, setIsBjEpisodeTrendLoading] = useState(false)
  const [isBjDetailedStatsLoading, setIsBjDetailedStatsLoading] = useState(false)
  const [isSignatureLoading, setIsSignatureLoading] = useState(false)

  // 에러
  const [error, setError] = useState<string | null>(null)

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

  const loadSignatureEligibility = useCallback(async () => {
    setIsSignatureLoading(true)
    setError(null)
    const result = await getSignatureEligibility(seasonId)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setSignatureEligibility(result.data)
    }
    setIsSignatureLoading(false)
  }, [seasonId])

  const resetBjData = useCallback(() => {
    setBjStats([])
    setBjEpisodeTrend([])
    setBjDetailedStats([])
    setSignatureEligibility(null)
  }, [])

  return {
    bjStats,
    bjEpisodeTrend,
    bjDetailedStats,
    signatureEligibility,
    isBjStatsLoading,
    isBjEpisodeTrendLoading,
    isBjDetailedStatsLoading,
    isSignatureLoading,
    error,
    loadBjStats,
    loadBjEpisodeTrend,
    loadBjDetailedStats,
    loadSignatureEligibility,
    resetBjData,
  }
}
