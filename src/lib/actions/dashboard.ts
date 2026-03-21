'use server'

import { adminAction, type ActionResult } from './index'
import { getActiveSeasonId } from './seasons'

interface BjRank {
  id: number
  name: string
  level: number
  color: string | null
}

interface BjStatus {
  id: number
  name: string
  image_url: string | null
  unit: 'excel' | 'crew'
  role: string
  is_active: boolean
  current_rank_id: number | null
  current_rank?: BjRank | null
}

interface SeasonStats {
  currentEpisode: number
  totalEpisodes: number
  activeBjCount: number
}

export interface DashboardData {
  ranks: BjRank[]
  bjList: BjStatus[]
  seasonStats: SeasonStats | null
}

/**
 * BJ 대시보드 데이터 조회 (직급, BJ 목록, 시즌 통계)
 */
export async function getDashboardData(): Promise<ActionResult<DashboardData>> {
  return adminAction(async (supabase) => {
    // 1+2. 독립 쿼리 병렬 실행
    const [ranksResult, bjResult] = await Promise.all([
      supabase.from('bj_ranks').select('*').order('level', { ascending: true }),
      supabase
        .from('organization')
        .select('*')
        .neq('role', '대표')
        .order('position_order', { ascending: true }),
    ])

    const ranks: BjRank[] = ranksResult.error ? [] : ((ranksResult.data || []) as BjRank[])

    if (bjResult.error) throw new Error(bjResult.error.message)
    const bjData = bjResult.data

    // 직급 정보 매핑
    const bjList: BjStatus[] = (bjData || []).map((bj) => ({
      id: bj.id,
      name: bj.name,
      image_url: bj.image_url,
      unit: bj.unit,
      role: bj.role,
      is_active: bj.is_active ?? true,
      current_rank_id: bj.current_rank_id,
      current_rank: ranks.find((r) => r.id === bj.current_rank_id) || null,
    }))

    // 3. 시즌 통계 계산
    let seasonStats: SeasonStats | null = null

    try {
      const activeSeasonId = await getActiveSeasonId(supabase)

      const { count: episodeCount } = await supabase
        .from('episodes')
        .select('*', { count: 'exact', head: true })
        .eq('season_id', activeSeasonId)

      const { data: latestEpisode } = await supabase
        .from('episodes')
        .select('episode_number')
        .eq('season_id', activeSeasonId)
        .order('episode_number', { ascending: false })
        .limit(1)
        .single()

      seasonStats = {
        currentEpisode: latestEpisode?.episode_number || 0,
        totalEpisodes: episodeCount || 0,
        activeBjCount: bjList.length,
      }
    } catch {
      // 활성 시즌이 없으면 seasonStats = null 유지
    }

    return { ranks, bjList, seasonStats }
  })
}
