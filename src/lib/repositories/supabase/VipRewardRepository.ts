/**
 * Supabase VipReward Repository
 * VIP 리워드 데이터 CRUD
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import { IVipRewardRepository } from '../types'
import type { VipReward, InsertTables, UpdateTables } from '@/types/database'

export class SupabaseVipRewardRepository implements IVipRewardRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<VipReward | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('vip_rewards').select('*').eq('id', id).single()
    )
    return data
  }

  async findByProfile(profileId: string): Promise<VipReward[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('vip_rewards').select('*').eq('profile_id', profileId).order('created_at', { ascending: false })
    )
    return data || []
  }

  async findBySeason(seasonId: number): Promise<VipReward[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('vip_rewards').select('*').eq('season_id', seasonId).order('rank', { ascending: true })
    )
    return data || []
  }

  async findAll(): Promise<VipReward[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('vip_rewards').select('*').order('created_at', { ascending: false })
    )
    return data || []
  }

  async create(data: InsertTables<'vip_rewards'>): Promise<VipReward> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('vip_rewards').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'vip_rewards'>): Promise<VipReward> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('vip_rewards').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('vip_rewards').delete().eq('id', id)
    )
    if (error) throw error
  }
}
