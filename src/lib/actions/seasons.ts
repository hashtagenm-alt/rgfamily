'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { adminAction, publicAction, type ActionResult } from './index'
import type { InsertTables, UpdateTables, Season } from '@/types/database'

/** 내부용: Server Action 내부에서 활성 시즌 ID를 조회하는 헬퍼 */
export async function getActiveSeasonId(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .single()
  if (error || !data) throw new Error('활성 시즌을 찾을 수 없습니다.')
  return data.id
}

type SeasonInsert = InsertTables<'seasons'>
type SeasonUpdate = UpdateTables<'seasons'>

/**
 * 시즌 생성
 */
export async function createSeason(
  data: SeasonInsert
): Promise<ActionResult<Season>> {
  return adminAction(async (supabase) => {
    const { data: season, error } = await supabase
      .from('seasons')
      .insert(data)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return season
  }, ['/admin/seasons', '/ranking'])
}

/**
 * 시즌 수정
 */
export async function updateSeason(
  id: number,
  data: SeasonUpdate
): Promise<ActionResult<Season>> {
  return adminAction(async (supabase) => {
    const { data: season, error } = await supabase
      .from('seasons')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return season
  }, ['/admin/seasons', '/ranking'])
}

/**
 * 시즌 삭제
 */
export async function deleteSeason(
  id: number
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    const { error } = await supabase
      .from('seasons')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  }, ['/admin/seasons', '/ranking'])
}

/**
 * 활성 시즌 설정 (다른 시즌은 비활성화)
 */
export async function setActiveSeason(
  id: number
): Promise<ActionResult<Season>> {
  return adminAction(async (supabase) => {
    // 원자적 시즌 활성화 (트랜잭션 보장 — 비활성화+활성화 동시 처리)
    const { error: rpcError } = await supabase.rpc('set_active_season', {
      p_season_id: id,
    })

    if (rpcError) throw new Error(rpcError.message)

    // 활성화된 시즌 조회하여 반환
    const { data: season, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw new Error(error.message)
    return season
  }, ['/admin/seasons', '/ranking'])
}

/**
 * 모든 시즌 조회 (공개)
 */
export async function getSeasons(): Promise<ActionResult<Season[]>> {
  return publicAction(async (supabase) => {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .order('start_date', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
  })
}

/**
 * 다른 시즌 비활성화 (활성 시즌 변경 전 호출)
 * - beforeSave 콜백에서 사용
 */
export async function deactivateOtherSeasons(
  excludeId: number
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    const { error } = await supabase
      .from('seasons')
      .update({ is_active: false })
      .neq('id', excludeId)

    if (error) throw new Error(error.message)
    return null
  })
}

/**
 * 시즌 목록 조회 (Admin - 에피소드 관리용)
 */
export async function getSeasonsForAdmin(): Promise<ActionResult<{ id: number; name: string; is_active: boolean }[]>> {
  return adminAction(async (supabase) => {
    const { data, error } = await supabase
      .from('seasons')
      .select('id, name, is_active')
      .order('start_date', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
  })
}

/**
 * 활성 시즌 조회 (공개)
 */
export async function getActiveSeason(): Promise<ActionResult<Season | null>> {
  return publicAction(async (supabase) => {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message)
    }
    return data
  })
}
