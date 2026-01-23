/**
 * Supabase VipImage Repository
 * VIP 이미지 데이터 CRUD
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import { IVipImageRepository } from '../types'
import type { VipImage, InsertTables, UpdateTables } from '@/types/database'

export class SupabaseVipImageRepository implements IVipImageRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<VipImage | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('vip_images').select('*').eq('id', id).single()
    )
    return data
  }

  async findByReward(rewardId: number): Promise<VipImage[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('vip_images').select('*').eq('reward_id', rewardId).order('order_index', { ascending: true })
    )
    return data || []
  }

  async findAll(): Promise<VipImage[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('vip_images').select('*').order('created_at', { ascending: false })
    )
    return data || []
  }

  async create(data: InsertTables<'vip_images'>): Promise<VipImage> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('vip_images').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'vip_images'>): Promise<VipImage> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('vip_images').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('vip_images').delete().eq('id', id)
    )
    if (error) throw error
  }
}
