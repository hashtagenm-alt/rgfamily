'use server'

import { adminAction, type ActionResult } from './index'
import { getActiveSeasonId } from './seasons'
import type { BjRank, BjRankHistoryWithDetails } from '@/types/database'

// BJ 멤버 (직급 배정 탭용)
export interface BjMemberForRank {
  id: number
  name: string
  image_url: string | null
  unit: 'excel' | 'crew'
  current_rank_id: number | null
  current_rank: BjRank | null
}

// 직급 배정 변경 항목
export interface RankAssignment {
  bjId: number
  newRankId: number | null
  oldRankId: number | null
}

/**
 * BJ 직급 목록 조회
 */
export async function getBjRanks(): Promise<ActionResult<BjRank[]>> {
  return adminAction(async (supabase) => {
    const { data, error } = await supabase
      .from('bj_ranks')
      .select('*')
      .order('level', { ascending: true })

    if (error) throw new Error(error.message)
    return (data || []) as BjRank[]
  })
}

/**
 * BJ 멤버 목록 조회 (직급 정보 포함)
 */
export async function getBjMembersForRank(): Promise<ActionResult<BjMemberForRank[]>> {
  return adminAction(async (supabase) => {
    // BJ 멤버 조회
    const { data: bjData, error: bjError } = await supabase
      .from('organization')
      .select('id, name, image_url, unit, current_rank_id')
      .neq('role', '대표')
      .eq('is_active', true)
      .order('position_order', { ascending: true })

    if (bjError) throw new Error(bjError.message)

    // 직급 목록 조회
    const { data: ranksData, error: ranksError } = await supabase.from('bj_ranks').select('*')

    if (ranksError) throw new Error(ranksError.message)

    const ranksList: BjRank[] = (ranksData || []) as BjRank[]

    // 직급 정보 매핑
    const bjWithRanks: BjMemberForRank[] = (bjData || []).map((bj) => ({
      ...bj,
      current_rank: ranksList.find((r) => r.id === bj.current_rank_id) || null,
    }))

    return bjWithRanks
  })
}

/**
 * 직급 변동 이력 조회 (최근 50건)
 */
export async function getRankHistory(): Promise<ActionResult<BjRankHistoryWithDetails[]>> {
  return adminAction(async (supabase) => {
    const { data, error } = await supabase
      .from('bj_rank_history')
      .select(
        `
        *,
        organization:bj_member_id(name),
        bj_ranks!bj_rank_history_rank_id_fkey(id, name, color),
        previous:bj_ranks!bj_rank_history_previous_rank_id_fkey(id, name, color)
      `
      )
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw new Error(error.message)

    // Supabase JOIN 결과를 타입에 맞게 매핑
    const mapped: BjRankHistoryWithDetails[] = (data || []).map((h: unknown) => {
      const r = h as Record<string, unknown>
      return {
        ...(r as unknown as BjRankHistoryWithDetails),
        bj_member: r.organization as { name: string; image_url: string | null } | undefined,
        rank: r.bj_ranks as BjRank | undefined,
        previous_rank: r.previous as BjRank | undefined,
      }
    })

    return mapped
  })
}

/**
 * 직급 정보 수정
 */
export async function updateBjRank(
  rankId: number,
  data: Pick<BjRank, 'name' | 'color' | 'description'>
): Promise<ActionResult<BjRank>> {
  return adminAction(
    async (supabase) => {
      const { data: updated, error } = await supabase
        .from('bj_ranks')
        .update({
          name: data.name,
          color: data.color,
          description: data.description,
        })
        .eq('id', rankId)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return updated as BjRank
    },
    ['/admin/ranks']
  )
}

/**
 * 직급 배정 저장 (organization 업데이트 + bj_rank_history 기록을 단일 액션으로 처리)
 */
export async function saveRankAssignments(
  assignments: RankAssignment[],
  ranks: BjRank[]
): Promise<ActionResult<{ updated: number }>> {
  return adminAction(
    async (supabase) => {
      // 현재 시즌 조회
      let seasonId: number | undefined
      try {
        seasonId = await getActiveSeasonId(supabase)
      } catch {
        // 활성 시즌이 없으면 seasonId = undefined 유지
      }
      let updatedCount = 0

      // 변경된 항목만 처리
      for (const assignment of assignments) {
        if (assignment.newRankId === assignment.oldRankId) continue

        // 새 직급명 조회 (current_rank 문자열 동기화용)
        const newRank = ranks.find((r) => r.id === assignment.newRankId)
        const rankName = newRank?.name || null

        // organization 테이블 업데이트 (current_rank_id + current_rank 모두)
        const { error: updateError } = await supabase
          .from('organization')
          .update({
            current_rank_id: assignment.newRankId,
            current_rank: rankName,
          })
          .eq('id', assignment.bjId)

        if (updateError) throw new Error(updateError.message)

        // 직급 변동 이력 추가 (새 직급이 있을 때만)
        if (assignment.newRankId) {
          const { error: historyError } = await supabase.from('bj_rank_history').insert({
            bj_member_id: assignment.bjId,
            season_id: seasonId,
            rank_id: assignment.newRankId,
            previous_rank_id: assignment.oldRankId,
            change_reason: '관리자 직급 배정',
            is_rank_battle: false,
          })

          if (historyError) throw new Error(historyError.message)
        }

        updatedCount++
      }

      return { updated: updatedCount }
    },
    ['/admin/ranks', '/admin/organization', '/organization']
  )
}
