'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  getAnalyticsSummary,
  getSeasonList,
  getEpisodeList,
  getEpisodeTrend,
  type AnalyticsSummary,
  type EpisodeTrendData,
} from '@/lib/actions/analytics'

export interface UseAnalyticsSummaryOptions {
  seasonId?: number
  episodeId?: number
  autoLoad?: boolean
}

export interface UseAnalyticsSummaryReturn {
  // 필터 상태
  seasonId: number | undefined
  episodeId: number | undefined
  setSeasonId: (id: number | undefined) => void
  setEpisodeId: (id: number | undefined) => void

  // 데이터
  summary: AnalyticsSummary | null
  episodeTrend: EpisodeTrendData[]

  // 로딩 상태
  isSummaryLoading: boolean
  isEpisodeTrendLoading: boolean

  // 에러
  error: string | null

  // 메타 데이터
  seasons: { id: number; name: string }[]
  episodes: {
    id: number
    title: string
    description: string | null
    season_id: number
    episode_number: number
    broadcast_date: string | null
    is_finalized: boolean
  }[]

  // 액션
  loadSummary: () => Promise<void>
  loadEpisodeTrend: () => Promise<void>
  loadSeasons: () => Promise<void>
  loadEpisodes: () => Promise<void>
  refreshAll: () => Promise<void>
  resetAllData: () => void
}

/**
 * Analytics summary data, season/episode filters, and meta data.
 * This is the "core" analytics hook that manages filter state shared across all sub-hooks.
 */
export function useAnalyticsSummary(
  options: UseAnalyticsSummaryOptions = {}
): UseAnalyticsSummaryReturn {
  const { autoLoad = true } = options

  // 초기 자동 선택 여부 추적 (최초 1회만)
  const hasAutoSelectedSeason = useRef(!!options.seasonId)

  // 필터 상태
  const [seasonId, setSeasonId] = useState<number | undefined>(options.seasonId)
  const [episodeId, setEpisodeId] = useState<number | undefined>(options.episodeId)

  // 데이터 상태
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [episodeTrend, setEpisodeTrend] = useState<EpisodeTrendData[]>([])

  // 메타 데이터
  const [seasons, setSeasons] = useState<{ id: number; name: string }[]>([])
  const [episodes, setEpisodes] = useState<{
    id: number
    title: string
    description: string | null
    season_id: number
    episode_number: number
    broadcast_date: string | null
    is_finalized: boolean
  }[]>([])

  // 로딩 상태
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)
  const [isEpisodeTrendLoading, setIsEpisodeTrendLoading] = useState(false)

  // 에러
  const [error, setError] = useState<string | null>(null)

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
    setEpisodeTrend([])
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

  useEffect(() => {
    if (autoLoad) {
      refreshAll()
    }
  }, [autoLoad, seasonId, episodeId, refreshAll])

  return {
    seasonId,
    episodeId,
    setSeasonId,
    setEpisodeId,
    summary,
    episodeTrend,
    isSummaryLoading,
    isEpisodeTrendLoading,
    error,
    seasons,
    episodes,
    loadSummary,
    loadEpisodeTrend,
    loadSeasons,
    loadEpisodes,
    refreshAll,
    resetAllData,
  }
}
