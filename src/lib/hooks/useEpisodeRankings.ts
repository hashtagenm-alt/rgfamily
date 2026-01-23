'use client'

/**
 * useEpisodeRankings Hook
 *
 * 회차(직급전) 기반 VIP 시스템 훅
 * - 직급전 회차 목록 조회
 * - 회차별 Top 50 랭킹 조회
 * - VIP 여부 확인
 */

import { useState, useCallback, useEffect } from 'react'
import { useAuthContext, useRankings } from '@/lib/context'
import { useEpisodes } from './useEpisodes'
import type { Episode } from '@/types/database'

interface EpisodeRankingItem {
  rank: number
  donorId: string | null
  donorName: string
  totalAmount: number
}

interface UseEpisodeRankingsOptions {
  seasonId: number | null
  limit?: number
}

interface UseEpisodeRankingsReturn {
  episodes: Episode[]             // 직급전 회차 목록
  rankings: EpisodeRankingItem[]  // 선택된 회차/시즌 Top 50
  selectedEpisodeId: number | null
  isVip: boolean
  isLoading: boolean
  error: string | null
  setSelectedEpisodeId: (id: number | null) => void
  refetch: () => Promise<void>
}

export function useEpisodeRankings({
  seasonId,
  limit = 50,
}: UseEpisodeRankingsOptions): UseEpisodeRankingsReturn {
  // Repository/Context hooks
  const episodesRepo = useEpisodes()
  const rankingsRepo = useRankings()
  const { user } = useAuthContext()

  // State
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [rankings, setRankings] = useState<EpisodeRankingItem[]>([])
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(null)
  const [isVip, setIsVip] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 직급전 회차 목록 로드
  const fetchEpisodes = useCallback(async () => {
    if (!seasonId) {
      setEpisodes([])
      return
    }

    try {
      const rankBattles = await episodesRepo.findRankBattles(seasonId)
      setEpisodes(rankBattles)
    } catch (err) {
      console.error('회차 로드 실패:', err)
      setEpisodes([])
    }
  }, [episodesRepo, seasonId])

  // 랭킹 데이터 로드
  const fetchRankings = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (selectedEpisodeId) {
        // 특정 회차의 랭킹 조회
        const data = await episodesRepo.getEpisodeRankings(selectedEpisodeId, limit)
        setRankings(data)

        // VIP 여부 확인 (해당 회차 Top 50)
        if (user?.id) {
          const vipStatus = await episodesRepo.isVipForEpisode(user.id, selectedEpisodeId)
          setIsVip(vipStatus)
        }
      } else if (seasonId) {
        // 전체 회차 선택 시 시즌 전체 랭킹 조회
        const data = await rankingsRepo.getRankings({
          seasonId,
          unitFilter: 'all',
        })
        // RankingItem을 EpisodeRankingItem 형태로 변환
        setRankings(
          data.slice(0, limit).map((item, index) => ({
            rank: index + 1,
            donorId: item.donorId,
            donorName: item.donorName,
            totalAmount: item.totalAmount,
          }))
        )

        // VIP 여부 확인 (시즌 내 직급전 Top 50)
        if (user?.id) {
          const vipStatus = await episodesRepo.isVipForRankBattles(user.id, seasonId)
          setIsVip(vipStatus)
        }
      } else {
        // 시즌 미선택 시 전체 랭킹
        const data = await rankingsRepo.getRankings({
          seasonId: null,
          unitFilter: 'all',
        })
        setRankings(
          data.slice(0, limit).map((item, index) => ({
            rank: index + 1,
            donorId: item.donorId,
            donorName: item.donorName,
            totalAmount: item.totalAmount,
          }))
        )
        setIsVip(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '랭킹을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [episodesRepo, rankingsRepo, selectedEpisodeId, seasonId, limit, user?.id])

  // 시즌 변경 시 회차 목록 리로드
  useEffect(() => {
    fetchEpisodes()
    // 시즌 변경 시 회차 선택 초기화
    setSelectedEpisodeId(null)
  }, [fetchEpisodes])

  // 회차 변경 시 랭킹 리로드
  useEffect(() => {
    fetchRankings()
  }, [fetchRankings])

  return {
    episodes,
    rankings,
    selectedEpisodeId,
    isVip,
    isLoading,
    error,
    setSelectedEpisodeId,
    refetch: fetchRankings,
  }
}
