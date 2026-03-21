'use server'

import { adminAction, type ActionResult } from './index'
import { getActiveSeasonId } from './seasons'
// 상벌금 기록 (조인 포함)
export interface PrizePenaltyRecord {
  id: number
  bj_member_id: number
  bj_member?: { name: string }
  episode_id: number | null
  episode?: { episode_number: number; title: string }
  season_id: number | null
  type: 'prize' | 'penalty'
  amount: number
  description: string | null
  is_paid: boolean
  paid_at: string | null
  created_at: string
}

// BJ 멤버 기여 통계
export interface BjContributionStat {
  id: number
  name: string
  unit: 'excel' | 'crew'
  total_prize: number
  total_penalty: number
  prize_balance: number
}

// 에피소드 정보
export interface EpisodeInfo {
  id: number
  episode_number: number
  title: string
}

/**
 * 상벌금 기록 조회 (조인 포함)
 */
export async function getPrizePenalties(): Promise<ActionResult<PrizePenaltyRecord[]>> {
  return adminAction(async (supabase) => {
    const { data, error } = await supabase
      .from('prize_penalties')
      .select(
        `
        *,
        organization:bj_member_id(name),
        episodes:episode_id(episode_number, title)
      `
      )
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw new Error(error.message)

    return (data || []).map((r: Record<string, unknown>) => ({
      ...r,
      bj_member: r.organization as { name: string } | undefined,
      episode: r.episodes as { episode_number: number; title: string } | undefined,
    })) as PrizePenaltyRecord[]
  })
}

/**
 * BJ 멤버별 기여 통계 조회
 */
export async function getBjContributionStats(): Promise<ActionResult<BjContributionStat[]>> {
  return adminAction(async (supabase) => {
    const { data, error } = await supabase
      .from('organization')
      .select('id, name, unit, total_prize, total_penalty, prize_balance')
      .neq('role', '대표')
      .eq('is_active', true)
      .order('prize_balance', { ascending: false })

    if (error) throw new Error(error.message)

    return (data || []).map((bj: Record<string, unknown>) => ({
      ...bj,
      total_prize: (bj.total_prize as number) || 0,
      total_penalty: (bj.total_penalty as number) || 0,
      prize_balance: (bj.prize_balance as number) || 0,
    })) as BjContributionStat[]
  })
}

/**
 * 현재 시즌 에피소드 목록 조회
 */
export async function getCurrentSeasonEpisodes(): Promise<ActionResult<EpisodeInfo[]>> {
  return adminAction(async (supabase) => {
    let activeSeasonId: number
    try {
      activeSeasonId = await getActiveSeasonId(supabase)
    } catch {
      return []
    }

    const { data: episodesData, error: episodesError } = await supabase
      .from('episodes')
      .select('id, episode_number, title')
      .eq('season_id', activeSeasonId)
      .eq('unit', 'excel')
      .order('episode_number', { ascending: false })

    if (episodesError) throw new Error(episodesError.message)

    return (episodesData || []) as EpisodeInfo[]
  })
}

/**
 * 상벌금 기록 생성
 */
export async function createPrizePenalty(data: {
  bjId: number
  type: 'prize' | 'penalty'
  amount: number
  description: string | null
  episodeId: number | null
}): Promise<ActionResult<null>> {
  return adminAction(
    async (supabase) => {
      // 현재 시즌 ID 조회
      let activeSeasonId: number | null = null
      try {
        activeSeasonId = await getActiveSeasonId(supabase)
      } catch {
        // 활성 시즌이 없으면 null 유지
      }

      const { error } = await supabase.from('prize_penalties').insert({
        bj_member_id: data.bjId,
        season_id: activeSeasonId,
        episode_id: data.episodeId,
        type: data.type,
        amount: data.amount,
        description: data.description,
        is_paid: false,
      })

      if (error) throw new Error(error.message)
      return null
    },
    ['/admin/prizes']
  )
}

/**
 * 상벌금 지급 완료 처리
 */
export async function markPrizePenaltyPaid(id: number): Promise<ActionResult<null>> {
  return adminAction(
    async (supabase) => {
      const { error } = await supabase
        .from('prize_penalties')
        .update({ is_paid: true, paid_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw new Error(error.message)
      return null
    },
    ['/admin/prizes']
  )
}

/**
 * 상벌금 기록 삭제
 */
export async function deletePrizePenalty(id: number): Promise<ActionResult<null>> {
  return adminAction(
    async (supabase) => {
      const { error } = await supabase.from('prize_penalties').delete().eq('id', id)

      if (error) throw new Error(error.message)
      return null
    },
    ['/admin/prizes']
  )
}
