'use server'

import { adminAction, type ActionResult } from './index'
import { getActiveSeasonId } from './seasons'

// BJ 멤버 타입
export interface BjMember {
  id: number
  name: string
  unit: 'excel' | 'crew'
  total_contribution: number
  season_contribution: number
}

// 기여도 로그 타입
export interface ContributionLog {
  id: number
  bj_member_id: number
  bj_member?: { name: string }
  episode_id: number | null
  episode?: { episode_number: number; title: string }
  amount: number
  reason: string
  balance_after: number
  event_type: string | null
  created_at: string
}

// 에피소드 타입
export interface ContributionEpisode {
  id: number
  episode_number: number
  title: string
}

// Overview 응답 타입
export interface ContributionOverviewData {
  bjMembers: BjMember[]
  logs: ContributionLog[]
  episodes: ContributionEpisode[]
}

/**
 * BJ 멤버 기여도 현황, 변동 로그, 에피소드 목록을 한번에 조회
 */
export async function getContributionOverview(): Promise<ActionResult<ContributionOverviewData>> {
  return adminAction(async (supabase) => {
    // 독립 쿼리 2개 병렬 실행
    const [bjResult, logsResult] = await Promise.all([
      supabase
        .from('organization')
        .select('id, name, unit, total_contribution, season_contribution')
        .neq('role', '대표')
        .eq('is_active', true)
        .order('season_contribution', { ascending: false }),
      supabase
        .from('contribution_logs')
        .select(
          `
          *,
          organization:bj_member_id(name),
          episodes:episode_id(episode_number, title)
        `
        )
        .order('created_at', { ascending: false })
        .limit(100),
    ])

    if (bjResult.error) throw new Error(bjResult.error.message)
    if (logsResult.error) throw new Error(logsResult.error.message)

    const bjMembers: BjMember[] = (bjResult.data || []).map((bj) => ({
      ...bj,
      total_contribution: bj.total_contribution || 0,
      season_contribution: bj.season_contribution || 0,
    }))

    const logs: ContributionLog[] = (logsResult.data || []).map((log: unknown) => {
      const l = log as Record<string, unknown>
      return {
        ...(l as unknown as ContributionLog),
        bj_member: l.organization as { name: string } | undefined,
        episode: l.episodes as ContributionEpisode | undefined,
      }
    })

    // 에피소드 목록 (현재 활성 시즌) — 시즌 ID 의존이므로 순차 유지
    let episodes: ContributionEpisode[] = []
    try {
      const activeSeasonId = await getActiveSeasonId(supabase)
      const { data: episodesData } = await supabase
        .from('episodes')
        .select('id, episode_number, title')
        .eq('season_id', activeSeasonId)
        .eq('unit', 'excel')
        .order('episode_number', { ascending: false })

      if (episodesData) {
        episodes = episodesData
      }
    } catch {
      // 활성 시즌이 없으면 빈 에피소드 목록 유지
    }

    return { bjMembers, logs, episodes }
  })
}

/**
 * 기여도 변동 로그 조회 (필터 지원)
 */
export async function getContributionLogs(filters?: {
  memberId?: number
  limit?: number
}): Promise<ActionResult<ContributionLog[]>> {
  return adminAction(async (supabase) => {
    let query = supabase
      .from('contribution_logs')
      .select(
        `
        *,
        organization:bj_member_id(name),
        episodes:episode_id(episode_number, title)
      `
      )
      .order('created_at', { ascending: false })

    if (filters?.memberId) {
      query = query.eq('bj_member_id', filters.memberId)
    }

    query = query.limit(filters?.limit || 100)

    const { data, error } = await query

    if (error) throw new Error(error.message)

    return (data || []).map((log: unknown) => {
      const l = log as Record<string, unknown>
      return {
        ...(l as unknown as ContributionLog),
        bj_member: l.organization as { name: string } | undefined,
        episode: l.episodes as ContributionEpisode | undefined,
      }
    })
  })
}

/**
 * 기여도 수정 (추가/차감)
 */
export async function adjustContribution(
  memberId: number,
  amount: number,
  reason: string,
  episodeId?: number
): Promise<ActionResult<null>> {
  return adminAction(
    async (supabase) => {
      // 멤버 현재 기여도 조회
      const { data: member, error: memberError } = await supabase
        .from('organization')
        .select('season_contribution')
        .eq('id', memberId)
        .single()

      if (memberError || !member) {
        throw new Error('멤버 정보를 찾을 수 없습니다.')
      }

      const newBalance = (member.season_contribution || 0) + amount

      // 현재 시즌 조회
      let activeSeasonId: number | undefined
      try {
        activeSeasonId = await getActiveSeasonId(supabase)
      } catch {
        // 활성 시즌이 없으면 undefined 유지
      }

      // 기여도 로그 추가
      const { error: logError } = await supabase.from('contribution_logs').insert({
        bj_member_id: memberId,
        season_id: activeSeasonId,
        episode_id: episodeId || null,
        amount,
        reason,
        balance_after: newBalance,
        event_type: 'manual',
      })

      if (logError) throw new Error(logError.message)

      return null
    },
    ['/admin/contributions']
  )
}
