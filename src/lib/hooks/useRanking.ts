'use client'

/**
 * useRanking Hook - Repository 패턴 적용
 *
 * 랭킹 데이터 조회 훅
 * - Mock/Supabase 자동 전환 (Repository 계층에서 처리)
 * - 시즌별/유닛별 필터링
 * - VIP Top 50 지원
 * - initialSeasonId: 초기 시즌 ID (시즌 페이지에서 사용)
 */

import { useState, useCallback, useEffect } from 'react'
import { useRankings, useSeasons } from '@/lib/context'
import type { Season } from '@/types/database'
import type { RankingItem, UnitFilter } from '@/types/common'

interface UseRankingOptions {
  initialSeasonId?: number | null
}

interface UseRankingReturn {
  rankings: RankingItem[]
  seasons: Season[]
  currentSeason: Season | null
  selectedSeasonId: number | null
  unitFilter: UnitFilter
  maxAmount: number
  isLoading: boolean
  error: string | null
  setSelectedSeasonId: (id: number | null) => void
  setUnitFilter: (filter: UnitFilter) => void
  refetch: () => Promise<void>
}

export function useRanking(options: UseRankingOptions = {}): UseRankingReturn {
  const { initialSeasonId } = options

  // Repository hooks
  const rankingsRepo = useRankings()
  const seasonsRepo = useSeasons()

  // State - initialSeasonId가 있으면 그 값으로 초기화
  const [rankings, setRankings] = useState<RankingItem[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null)
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(initialSeasonId ?? null)
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 시즌 목록 로드
  const fetchSeasons = useCallback(async () => {
    try {
      const allSeasons = await seasonsRepo.findAll()
      setSeasons(allSeasons)

      const active = await seasonsRepo.findActive()
      setCurrentSeason(active)
    } catch (err) {
      console.error('시즌 로드 실패:', err)
    }
  }, [seasonsRepo])

  // 랭킹 데이터 로드
  const fetchRankings = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await rankingsRepo.getRankings({
        seasonId: selectedSeasonId,
        unitFilter,
      })
      setRankings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '랭킹을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [rankingsRepo, selectedSeasonId, unitFilter])

  // 초기 로드
  useEffect(() => {
    fetchSeasons()
  }, [fetchSeasons])

  useEffect(() => {
    fetchRankings()
  }, [fetchRankings])

  // 최대 후원 금액 (게이지 바 계산용)
  const maxAmount = rankings.length > 0 ? rankings[0].totalAmount : 0

  return {
    rankings,
    seasons,
    currentSeason,
    selectedSeasonId,
    unitFilter,
    maxAmount,
    isLoading,
    error,
    setSelectedSeasonId,
    setUnitFilter,
    refetch: fetchRankings,
  }
}
