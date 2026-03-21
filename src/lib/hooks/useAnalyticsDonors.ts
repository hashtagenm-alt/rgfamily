'use client'

import { useState, useCallback } from 'react'
import {
  getDonorPatterns,
  searchDonor,
  getDonorRetention,
  getDonorBjRelations,
  getTimePattern,
  getTimePatternEnhanced,
  type DonorPattern,
  type DonorSearch,
  type DonorRetentionData,
  type DonorBjRelation,
  type TimePatternData,
  type TimePatternEnhanced,
} from '@/lib/actions/analytics'

export interface UseAnalyticsDonorsOptions {
  seasonId?: number
  episodeId?: number
}

export interface UseAnalyticsDonorsReturn {
  // 데이터
  donorPatterns: DonorPattern[]
  donorSearchResult: DonorSearch | null
  donorRetention: DonorRetentionData | null
  donorBjRelations: DonorBjRelation[]
  timePattern: TimePatternData[]
  timePatternEnhanced: TimePatternEnhanced | null

  // 로딩 상태
  isDonorPatternsLoading: boolean
  isSearchLoading: boolean
  isDonorRetentionLoading: boolean
  isTimePatternLoading: boolean
  isTimePatternEnhancedLoading: boolean

  // 에러
  error: string | null

  // 액션
  loadDonorPatterns: () => Promise<void>
  searchDonorByName: (name: string) => Promise<void>
  loadDonorRetention: () => Promise<void>
  loadDonorBjRelations: (limit?: number) => Promise<void>
  loadTimePattern: () => Promise<void>
  loadTimePatternEnhanced: () => Promise<void>
  resetDonorData: () => void
}

/**
 * Donor-related analytics: patterns, search, retention, BJ relations, time patterns.
 */
export function useAnalyticsDonors(
  options: UseAnalyticsDonorsOptions = {}
): UseAnalyticsDonorsReturn {
  const { seasonId, episodeId } = options

  // 데이터 상태
  const [donorPatterns, setDonorPatterns] = useState<DonorPattern[]>([])
  const [donorSearchResult, setDonorSearchResult] = useState<DonorSearch | null>(null)
  const [donorRetention, setDonorRetention] = useState<DonorRetentionData | null>(null)
  const [donorBjRelations, setDonorBjRelations] = useState<DonorBjRelation[]>([])
  const [timePattern, setTimePattern] = useState<TimePatternData[]>([])
  const [timePatternEnhanced, setTimePatternEnhanced] = useState<TimePatternEnhanced | null>(null)

  // 로딩 상태
  const [isDonorPatternsLoading, setIsDonorPatternsLoading] = useState(false)
  const [isSearchLoading, setIsSearchLoading] = useState(false)
  const [isDonorRetentionLoading, setIsDonorRetentionLoading] = useState(false)
  const [isTimePatternLoading, setIsTimePatternLoading] = useState(false)
  const [isTimePatternEnhancedLoading, setIsTimePatternEnhancedLoading] = useState(false)

  // 에러
  const [error, setError] = useState<string | null>(null)

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

  const loadDonorBjRelations = useCallback(async (limit: number = 100) => {
    setError(null)
    const result = await getDonorBjRelations(seasonId, episodeId, limit)
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setDonorBjRelations(result.data)
    }
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

  const resetDonorData = useCallback(() => {
    setDonorPatterns([])
    setTimePattern([])
    setTimePatternEnhanced(null)
    setDonorRetention(null)
  }, [])

  return {
    donorPatterns,
    donorSearchResult,
    donorRetention,
    donorBjRelations,
    timePattern,
    timePatternEnhanced,
    isDonorPatternsLoading,
    isSearchLoading,
    isDonorRetentionLoading,
    isTimePatternLoading,
    isTimePatternEnhancedLoading,
    error,
    loadDonorPatterns,
    searchDonorByName,
    loadDonorRetention,
    loadDonorBjRelations,
    loadTimePattern,
    loadTimePatternEnhanced,
    resetDonorData,
  }
}
