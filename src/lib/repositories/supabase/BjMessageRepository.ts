/**
 * Supabase BjMessage Repository
 * BJ 감사 메시지 데이터 CRUD
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import { IBjMessageRepository } from '../types'
import type { BjThankYouMessage, InsertTables, UpdateTables } from '@/types/database'

export class SupabaseBjMessageRepository implements IBjMessageRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<BjThankYouMessage | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('bj_thank_you_messages').select('*').eq('id', id).eq('is_deleted', false).single()
    )
    return data
  }

  async findByVipProfile(vipProfileId: string): Promise<BjThankYouMessage[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('bj_thank_you_messages').select('*').eq('vip_profile_id', vipProfileId).eq('is_deleted', false).order('created_at', { ascending: false })
    )
    return data || []
  }

  async findByBjMember(bjMemberId: number): Promise<BjThankYouMessage[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('bj_thank_you_messages').select('*').eq('bj_member_id', bjMemberId).eq('is_deleted', false).order('created_at', { ascending: false })
    )
    return data || []
  }

  async findPublicByVipProfile(vipProfileId: string): Promise<BjThankYouMessage[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('bj_thank_you_messages').select('*').eq('vip_profile_id', vipProfileId).eq('is_public', true).eq('is_deleted', false).order('created_at', { ascending: false })
    )
    return data || []
  }

  async findAll(): Promise<BjThankYouMessage[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('bj_thank_you_messages').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
    )
    return data || []
  }

  async create(data: InsertTables<'bj_thank_you_messages'>): Promise<BjThankYouMessage> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('bj_thank_you_messages').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'bj_thank_you_messages'>): Promise<BjThankYouMessage> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('bj_thank_you_messages').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('bj_thank_you_messages').delete().eq('id', id)
    )
    if (error) throw error
  }

  async softDelete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('bj_thank_you_messages').update({ is_deleted: true }).eq('id', id)
    )
    if (error) throw error
  }
}
