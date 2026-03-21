'use server'

import { adminAction, type ActionResult } from './index'

// ==================== Types ====================

interface DataSyncSeason {
  id: number
  name: string
  is_active: boolean
}

interface DataSyncEpisode {
  id: number
  episode_number: number
  title: string
}

interface BjMember {
  id: number
  name: string
}

interface DataSyncMetadata {
  seasons: DataSyncSeason[]
  episodes: DataSyncEpisode[]
  bjMembers: BjMember[]
  activeSeasonId: number | null
}

interface ContributionLog {
  bj_member_id: number
  episode_id: number | null
  season_id: number | null
  amount: number
  reason: string
  balance_after: number
  event_type: string
}

interface PrizePenaltyRecord {
  bj_member_id: number
  episode_id: number | null
  season_id: number | null
  type: 'prize' | 'penalty'
  amount: number
  description: string
  is_paid: boolean
}

interface BulkInsertResult {
  total: number
  success: number
  failed: number
  errors: string[]
}

// ==================== Server Actions ====================

/**
 * 데이터 동기화에 필요한 메타데이터 일괄 조회
 * - 시즌 목록
 * - 활성 시즌의 에피소드 목록
 * - BJ 멤버 목록 (조직도)
 */
export async function getDataSyncMetadata(): Promise<ActionResult<DataSyncMetadata>> {
  return adminAction(async (supabase) => {
    // 시즌 목록 조회
    const { data: seasons, error: seasonsError } = await supabase
      .from('seasons')
      .select('id, name, is_active')
      .order('id', { ascending: false })

    if (seasonsError) throw new Error(seasonsError.message)

    const activeSeasonId = seasons?.find((s) => s.is_active)?.id ?? null

    // 활성 시즌의 에피소드 조회 (엑셀부 기본)
    let episodes: DataSyncEpisode[] = []
    if (activeSeasonId) {
      const { data: episodesData, error: episodesError } = await supabase
        .from('episodes')
        .select('id, episode_number, title')
        .eq('season_id', activeSeasonId)
        .eq('unit', 'excel')
        .order('episode_number', { ascending: false })

      if (episodesError) throw new Error(episodesError.message)
      episodes = episodesData || []
    }

    // BJ 멤버 목록 조회 (CSV 파싱 시 이름 매칭용)
    const { data: bjMembers, error: bjError } = await supabase
      .from('organization')
      .select('id, name')
      .neq('role', '대표')
      .eq('is_active', true)

    if (bjError) throw new Error(bjError.message)

    return {
      seasons: seasons || [],
      episodes,
      bjMembers: bjMembers || [],
      activeSeasonId,
    }
  })
}

/**
 * 시즌 변경 시 해당 시즌의 에피소드 목록 조회
 */
export async function getEpisodesForSeason(
  seasonId: number,
  unit: 'excel' | 'crew' = 'excel'
): Promise<ActionResult<DataSyncEpisode[]>> {
  return adminAction(async (supabase) => {
    const { data, error } = await supabase
      .from('episodes')
      .select('id, episode_number, title')
      .eq('season_id', seasonId)
      .eq('unit', unit)
      .order('episode_number', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
  })
}

/**
 * 기여도 로그 일괄 삽입
 * - 각 행의 현재 잔액을 조회 후 balance_after 계산
 * - 개별 row 단위 에러 핸들링 (부분 성공 허용)
 */
export async function bulkInsertContributions(
  rows: Array<{
    bjMemberId: number
    bjName: string
    amount: number
    reason?: string
  }>,
  seasonId: number | null,
  episodeId: number | null
): Promise<ActionResult<BulkInsertResult>> {
  return adminAction(
    async (supabase) => {
      const result: BulkInsertResult = {
        total: rows.length,
        success: 0,
        failed: 0,
        errors: [],
      }

      // N+1 방지: 전체 organization 잔액을 한번에 조회하여 Map으로 변환
      const memberIds = [...new Set(rows.map((r) => r.bjMemberId))]
      const { data: allMembers, error: membersError } = await supabase
        .from('organization')
        .select('id, total_contribution, season_contribution')
        .in('id', memberIds)

      if (membersError) throw new Error(membersError.message)

      const memberMap = new Map((allMembers || []).map((m) => [m.id, m]))

      for (const row of rows) {
        try {
          const currentBj = memberMap.get(row.bjMemberId)
          const balanceAfter = (currentBj?.season_contribution || 0) + row.amount

          const { error } = await supabase.from('contribution_logs').insert({
            bj_member_id: row.bjMemberId,
            episode_id: episodeId,
            season_id: seasonId,
            amount: row.amount,
            reason: row.reason || 'CSV 일괄 업로드',
            balance_after: balanceAfter,
            event_type: 'csv_upload',
          })

          if (error) throw error

          result.success++
        } catch (err) {
          result.failed++
          result.errors.push(
            `${row.bjName}: ${err instanceof Error ? err.message : '알 수 없는 오류'}`
          )
        }
      }

      return result
    },
    ['/admin/data-sync']
  )
}

/**
 * 상벌금 일괄 삽입
 * - 개별 row 단위 에러 핸들링 (부분 성공 허용)
 */
export async function bulkInsertPrizePenalties(
  rows: Array<{
    bjMemberId: number
    bjName: string
    amount: number
    type: 'prize' | 'penalty'
    reason?: string
  }>,
  seasonId: number | null,
  episodeId: number | null
): Promise<ActionResult<BulkInsertResult>> {
  return adminAction(
    async (supabase) => {
      const result: BulkInsertResult = {
        total: rows.length,
        success: 0,
        failed: 0,
        errors: [],
      }

      for (const row of rows) {
        try {
          const { error } = await supabase.from('prize_penalties').insert({
            bj_member_id: row.bjMemberId,
            episode_id: episodeId,
            season_id: seasonId,
            type: row.type,
            amount: row.amount,
            description: row.reason || 'CSV 일괄 업로드',
            is_paid: false,
          })

          if (error) throw error

          result.success++
        } catch (err) {
          result.failed++
          result.errors.push(
            `${row.bjName}: ${err instanceof Error ? err.message : '알 수 없는 오류'}`
          )
        }
      }

      return result
    },
    ['/admin/data-sync']
  )
}
