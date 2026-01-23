/**
 * Supabase Schedule Repository
 * 일정 데이터 CRUD
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import { IScheduleRepository } from '../types'
import type { Schedule, InsertTables, UpdateTables } from '@/types/database'

export class SupabaseScheduleRepository implements IScheduleRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<Schedule | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('schedules').select('*').eq('id', id).single()
    )
    return data
  }

  async findByMonth(year: number, month: number): Promise<Schedule[]> {
    // UTC 기준으로 월의 시작과 끝을 계산
    const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0))
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999))

    const { data, error } = await withRetry(async () =>
      await this.supabase
        .from('schedules')
        .select('*')
        .gte('start_datetime', startOfMonth.toISOString())
        .lte('start_datetime', endOfMonth.toISOString())
        .order('start_datetime', { ascending: true })
    )

    if (error) throw error
    return data || []
  }

  async findByMonthAndUnit(year: number, month: number, unit: string | null): Promise<Schedule[]> {
    // UTC 기준으로 월의 시작과 끝을 계산
    const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0))
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999))

    const { data, error } = await withRetry(async () => {
      let query = this.supabase
        .from('schedules')
        .select('*')
        .gte('start_datetime', startOfMonth.toISOString())
        .lte('start_datetime', endOfMonth.toISOString())
        .order('start_datetime', { ascending: true })

      if (unit && unit !== 'all') {
        query = query.or(`unit.eq.${unit},unit.is.null`)
      }

      return await query
    })

    if (error) throw error
    return data || []
  }

  async findAll(): Promise<Schedule[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('schedules').select('*').order('start_datetime', { ascending: false })
    )
    return data || []
  }

  async create(data: InsertTables<'schedules'>): Promise<Schedule> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('schedules').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'schedules'>): Promise<Schedule> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('schedules').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('schedules').delete().eq('id', id)
    )
    if (error) throw error
  }
}
