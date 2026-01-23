/**
 * Supabase LiveStatus Repository
 * 라이브 상태 데이터 CRUD
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import { ILiveStatusRepository } from '../types'
import type { LiveStatus, InsertTables, UpdateTables } from '@/types/database'

export class SupabaseLiveStatusRepository implements ILiveStatusRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<LiveStatus | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('live_status').select('*').eq('id', id).single()
    )
    return data
  }

  async findByMember(memberId: number): Promise<LiveStatus[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('live_status').select('*').eq('member_id', memberId)
    )
    return data || []
  }

  async findLive(): Promise<LiveStatus[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('live_status').select('*').eq('is_live', true)
    )
    return data || []
  }

  async findAll(): Promise<LiveStatus[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('live_status').select('*')
    )
    return data || []
  }

  async create(data: InsertTables<'live_status'>): Promise<LiveStatus> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('live_status').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'live_status'>): Promise<LiveStatus> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('live_status').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('live_status').delete().eq('id', id)
    )
    if (error) throw error
  }

  async upsertByMemberAndPlatform(data: InsertTables<'live_status'>): Promise<LiveStatus> {
    const { data: upserted, error } = await withRetry(async () =>
      await this.supabase.from('live_status').upsert(data, { onConflict: 'member_id,platform' }).select().single()
    )
    if (error) throw error
    return upserted!
  }
}
