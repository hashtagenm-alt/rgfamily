'use client'

/**
 * useEpisodes Hook
 *
 * 회차(에피소드) 관련 Repository 훅
 * - 시즌별 회차 조회
 * - 직급전 회차 필터링
 * - 회차별 랭킹 조회
 */

import { useCallback } from 'react'
import { useSupabaseContext } from '@/lib/context'
import { logger } from '@/lib/utils/logger'
import type { Episode } from '@/types/database'

interface EpisodeRankingItem {
  rank: number
  donorId: string | null
  donorName: string
  totalAmount: number
}

interface IEpisodeRepository {
  findBySeason: (seasonId: number, unit?: 'excel' | 'crew') => Promise<Episode[]>
  findRankBattles: (seasonId: number, unit?: 'excel' | 'crew') => Promise<Episode[]>
  getEpisodeRankings: (episodeId: number, limit?: number) => Promise<EpisodeRankingItem[]>
  isVipForEpisode: (userId: string, episodeId: number) => Promise<boolean>
  isVipForRankBattles: (userId: string, seasonId: number) => Promise<boolean>
}

/**
 * Episodes Repository Hook
 * 회차 관련 데이터 접근을 위한 훅
 */
export function useEpisodes(): IEpisodeRepository {
  const supabase = useSupabaseContext()

  // 시즌별 전체 회차 조회
  const findBySeason = useCallback(
    async (seasonId: number, unit?: 'excel' | 'crew'): Promise<Episode[]> => {
      let query = supabase
        .from('episodes')
        .select('*')
        .eq('season_id', seasonId)
        .order('episode_number', { ascending: true })

      if (unit) {
        query = query.eq('unit', unit)
      }

      const { data, error } = await query

      if (error) {
        logger.dbError('findBySeason', 'episodes', error)
        return []
      }

      return data || []
    },
    [supabase]
  )

  // 직급전 회차만 조회
  const findRankBattles = useCallback(
    async (seasonId: number, unit?: 'excel' | 'crew'): Promise<Episode[]> => {
      let query = supabase
        .from('episodes')
        .select('*')
        .eq('season_id', seasonId)
        .eq('is_rank_battle', true)
        .order('episode_number', { ascending: true })

      if (unit) {
        query = query.eq('unit', unit)
      }

      const { data, error } = await query

      if (error) {
        logger.dbError('findRankBattles', 'episodes', error)
        return []
      }

      return data || []
    },
    [supabase]
  )

  // 회차별 랭킹 조회 (RPC 함수 사용)
  const getEpisodeRankings = useCallback(
    async (episodeId: number, limit: number = 50): Promise<EpisodeRankingItem[]> => {
      const { data, error } = await supabase.rpc('get_episode_rankings', {
        p_episode_id: episodeId,
        p_limit: limit,
      })

      if (error) {
        logger.dbError('getEpisodeRankings', 'episodes', error)
        return []
      }

      // snake_case → camelCase 변환
      return (data || []).map(
        (item: {
          rank: number
          donor_id: string | null
          donor_name: string
          total_amount: number
        }) => ({
          rank: item.rank,
          donorId: item.donor_id,
          donorName: item.donor_name,
          totalAmount: item.total_amount,
        })
      )
    },
    [supabase]
  )

  // 특정 회차 VIP 여부 확인 (RPC 함수 사용)
  const isVipForEpisode = useCallback(
    async (userId: string, episodeId: number): Promise<boolean> => {
      const { data, error } = await supabase.rpc('is_vip_for_episode', {
        p_user_id: userId,
        p_episode_id: episodeId,
      })

      if (error) {
        logger.dbError('isVipForEpisode', 'episodes', error)
        return false
      }

      return data === true
    },
    [supabase]
  )

  // 직급전 VIP 여부 확인 (RPC 함수 사용)
  const isVipForRankBattles = useCallback(
    async (userId: string, seasonId: number): Promise<boolean> => {
      const { data, error } = await supabase.rpc('is_vip_for_rank_battles', {
        p_user_id: userId,
        p_season_id: seasonId,
      })

      if (error) {
        logger.dbError('isVipForRankBattles', 'episodes', error)
        return false
      }

      return data === true
    },
    [supabase]
  )

  return {
    findBySeason,
    findRankBattles,
    getEpisodeRankings,
    isVipForEpisode,
    isVipForRankBattles,
  }
}
