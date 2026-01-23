/**
 * Supabase Season Repository
 * 시즌 데이터 CRUD
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import { ISeasonRepository } from '../types'
import type { Season, InsertTables, UpdateTables } from '@/types/database'

export class SupabaseSeasonRepository implements ISeasonRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<Season | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('seasons').select('*').eq('id', id).single()
    )
    return data
  }

  async findActive(): Promise<Season | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('seasons').select('*').eq('is_active', true).single()
    )
    return data
  }

  async findAll(): Promise<Season[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('seasons').select('*').order('start_date', { ascending: false })
    )
    return data || []
  }

  async create(data: InsertTables<'seasons'>): Promise<Season> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('seasons').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'seasons'>): Promise<Season> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('seasons').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('seasons').delete().eq('id', id)
    )
    if (error) throw error
  }
}
