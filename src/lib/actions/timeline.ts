'use server'

import { adminAction, publicAction, type ActionResult } from './index'
import type { InsertTables, UpdateTables, TimelineEvent } from '@/types/database'

type TimelineEventInsert = InsertTables<'timeline_events'>
type TimelineEventUpdate = UpdateTables<'timeline_events'>

// ==================== Public Actions ====================

/**
 * 타임라인 이벤트 목록 조회 (공개)
 */
export async function getTimelineEvents(options?: {
  seasonId?: number | null
  category?: string | null
  unit?: 'excel' | 'crew' | null
}): Promise<ActionResult<TimelineEvent[]>> {
  return publicAction(async (supabase) => {
    let query = supabase
      .from('timeline_events')
      .select('*')
      .order('event_date', { ascending: false })
      .order('order_index', { ascending: true })

    if (options?.seasonId) {
      query = query.eq('season_id', options.seasonId)
    }

    if (options?.category) {
      query = query.eq('category', options.category)
    }

    if (options?.unit) {
      query = query.eq('unit', options.unit)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    return data || []
  })
}

/**
 * 타임라인 이벤트 상세 조회 (공개)
 */
export async function getTimelineEventById(
  id: number
): Promise<ActionResult<TimelineEvent | null>> {
  return publicAction(async (supabase) => {
    const { data, error } = await supabase
      .from('timeline_events')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw new Error(error.message)
    return data
  })
}

/**
 * 타임라인 카테고리 목록 조회 (공개)
 */
export async function getTimelineCategories(): Promise<ActionResult<string[]>> {
  return publicAction(async (supabase) => {
    const { data, error } = await supabase
      .from('timeline_events')
      .select('category')
      .not('category', 'is', null)

    if (error) throw new Error(error.message)

    // 중복 제거
    const categories = [...new Set(data?.map(d => d.category).filter(Boolean))] as string[]
    return categories.sort()
  })
}

// ==================== Admin Actions ====================

/**
 * 타임라인 이벤트 생성 (Admin)
 */
export async function createTimelineEvent(
  data: Omit<TimelineEventInsert, 'id' | 'created_at'>
): Promise<ActionResult<TimelineEvent>> {
  return adminAction(async (supabase) => {
    const { data: event, error } = await supabase
      .from('timeline_events')
      .insert(data)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return event
  }, ['/rg/history', '/admin/timeline'])
}

/**
 * 타임라인 이벤트 수정 (Admin)
 */
export async function updateTimelineEvent(
  id: number,
  data: TimelineEventUpdate
): Promise<ActionResult<TimelineEvent>> {
  return adminAction(async (supabase) => {
    const { data: event, error } = await supabase
      .from('timeline_events')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return event
  }, ['/rg/history', '/admin/timeline'])
}

/**
 * 타임라인 이벤트 삭제 (Admin)
 */
export async function deleteTimelineEvent(
  id: number
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    const { error } = await supabase
      .from('timeline_events')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  }, ['/rg/history', '/admin/timeline'])
}

/**
 * 타임라인 이벤트 순서 변경 (Admin)
 */
export async function reorderTimelineEvents(
  eventOrders: { id: number; order_index: number }[]
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    // 순차적으로 업데이트
    for (const { id, order_index } of eventOrders) {
      const { error } = await supabase
        .from('timeline_events')
        .update({ order_index })
        .eq('id', id)

      if (error) throw new Error(error.message)
    }

    return null
  }, ['/rg/history', '/admin/timeline'])
}

/**
 * 모든 타임라인 이벤트 조회 (Admin - 필터 없이)
 */
export async function getAllTimelineEvents(): Promise<ActionResult<TimelineEvent[]>> {
  return adminAction(async (supabase) => {
    const { data, error } = await supabase
      .from('timeline_events')
      .select('*')
      .order('event_date', { ascending: false })
      .order('order_index', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
  })
}
