/**
 * Supabase Organization Repository
 * 조직도 데이터 CRUD
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import { IOrganizationRepository } from '../types'
import type { Organization, InsertTables, UpdateTables } from '@/types/database'

export class SupabaseOrganizationRepository implements IOrganizationRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<Organization | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('organization').select('*').eq('id', id).single()
    )
    return data
  }

  async findByUnit(unit: 'excel' | 'crew'): Promise<Organization[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('organization').select('*').eq('unit', unit).eq('is_active', true).order('position_order')
    )
    return data || []
  }

  async findLiveMembers(): Promise<Organization[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('organization').select('*').eq('is_live', true)
    )
    return data || []
  }

  async findAll(): Promise<Organization[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('organization').select('*').eq('is_active', true).order('position_order')
    )
    return data || []
  }

  async create(data: InsertTables<'organization'>): Promise<Organization> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('organization').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'organization'>): Promise<Organization> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('organization').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('organization').delete().eq('id', id)
    )
    if (error) throw error
  }
}
