'use server'

import { moderatorAction, publicAction, type ActionResult } from './index'
import type { InsertTables, UpdateTables, Schedule } from '@/types/database'

type ScheduleInsert = InsertTables<'schedules'>
type ScheduleUpdate = UpdateTables<'schedules'>

/**
 * 일정 생성
 */
export async function createSchedule(
  data: ScheduleInsert
): Promise<ActionResult<Schedule>> {
  return moderatorAction(async (supabase) => {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: schedule, error } = await supabase
      .from('schedules')
      .insert({
        ...data,
        created_by: user?.id
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return schedule
  }, ['/admin/schedules', '/schedule'])
}

/**
 * 일정 수정
 */
export async function updateSchedule(
  id: number,
  data: ScheduleUpdate
): Promise<ActionResult<Schedule>> {
  return moderatorAction(async (supabase) => {
    const { data: schedule, error } = await supabase
      .from('schedules')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return schedule
  }, ['/admin/schedules', '/schedule'])
}

/**
 * 일정 삭제
 */
export async function deleteSchedule(
  id: number
): Promise<ActionResult<null>> {
  return moderatorAction(async (supabase) => {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  }, ['/admin/schedules', '/schedule'])
}

/**
 * 일정 목록 조회 (공개)
 */
export async function getSchedules(options?: {
  startDate?: string
  endDate?: string
  unit?: 'excel' | 'crew'
  eventType?: Schedule['event_type']
}): Promise<ActionResult<Schedule[]>> {
  return publicAction(async (supabase) => {
    let query = supabase
      .from('schedules')
      .select('*')
      .order('start_datetime', { ascending: true })

    if (options?.startDate) {
      query = query.gte('start_datetime', options.startDate)
    }
    if (options?.endDate) {
      query = query.lte('start_datetime', options.endDate)
    }
    if (options?.unit) {
      query = query.eq('unit', options.unit)
    }
    if (options?.eventType) {
      query = query.eq('event_type', options.eventType)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    return data || []
  })
}

/**
 * 이번 달 일정 조회 (공개)
 */
export async function getThisMonthSchedules(): Promise<ActionResult<Schedule[]>> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

  return getSchedules({
    startDate: startOfMonth,
    endDate: endOfMonth
  })
}

/**
 * 특정 날짜의 일정 조회 (공개)
 */
export async function getSchedulesByDate(
  date: string
): Promise<ActionResult<Schedule[]>> {
  return publicAction(async (supabase) => {
    const startOfDay = `${date}T00:00:00`
    const endOfDay = `${date}T23:59:59`

    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .or(`start_datetime.gte.${startOfDay},start_datetime.lte.${endOfDay}`)
      .order('start_datetime', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
  })
}
