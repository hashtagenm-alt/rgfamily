/**
 * Supabase Profile Repository
 * 프로필 데이터 CRUD
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import { IProfileRepository } from '../types'
import type { Profile, InsertTables, UpdateTables } from '@/types/database'

export class SupabaseProfileRepository implements IProfileRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string): Promise<Profile | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('profiles').select('*').eq('id', id).single()
    )
    return data
  }

  async findByNickname(nickname: string): Promise<Profile | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('profiles').select('*').eq('nickname', nickname).single()
    )
    return data
  }

  async findVipMembers(): Promise<Profile[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('profiles').select('*').eq('role', 'vip')
    )
    return data || []
  }

  async findAll(): Promise<Profile[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('profiles').select('*')
    )
    return data || []
  }

  async create(data: InsertTables<'profiles'>): Promise<Profile> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('profiles').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: string, data: UpdateTables<'profiles'>): Promise<Profile> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('profiles').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: string): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('profiles').delete().eq('id', id)
    )
    if (error) throw error
  }
}
