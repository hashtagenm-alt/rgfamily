/**
 * Supabase Banner Repository
 * 배너 데이터 CRUD
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import { IBannerRepository } from '../types'
import type { Banner, InsertTables, UpdateTables } from '@/types/database'

export class SupabaseBannerRepository implements IBannerRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<Banner | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('banners').select('*').eq('id', id).single()
    )
    return data
  }

  async findActive(): Promise<Banner[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('banners').select('*').eq('is_active', true).order('display_order', { ascending: true })
    )
    return data || []
  }

  async findAll(): Promise<Banner[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('banners').select('*').order('display_order', { ascending: true })
    )
    return data || []
  }

  async create(data: InsertTables<'banners'>): Promise<Banner> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('banners').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'banners'>): Promise<Banner> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('banners').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('banners').delete().eq('id', id)
    )
    if (error) throw error
  }
}
