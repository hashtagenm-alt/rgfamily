/**
 * Supabase Guestbook Repository
 * 헌정 방명록 데이터 CRUD
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import { IGuestbookRepository } from '../types'
import type { TributeGuestbook, InsertTables, UpdateTables } from '@/types/database'

export class SupabaseGuestbookRepository implements IGuestbookRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<TributeGuestbook | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('tribute_guestbook').select('*').eq('id', id).eq('is_deleted', false).single()
    )
    return data
  }

  async findByTributeUser(tributeUserId: string): Promise<TributeGuestbook[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('tribute_guestbook').select('*').eq('tribute_user_id', tributeUserId).eq('is_deleted', false).order('created_at', { ascending: false })
    )
    return data || []
  }

  async findApproved(tributeUserId: string): Promise<TributeGuestbook[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('tribute_guestbook').select('*').eq('tribute_user_id', tributeUserId).eq('is_approved', true).eq('is_deleted', false).order('created_at', { ascending: false })
    )
    return data || []
  }

  async findAll(): Promise<TributeGuestbook[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('tribute_guestbook').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
    )
    return data || []
  }

  async create(data: InsertTables<'tribute_guestbook'>): Promise<TributeGuestbook> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('tribute_guestbook').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'tribute_guestbook'>): Promise<TributeGuestbook> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('tribute_guestbook').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    // Soft delete
    const { error } = await withRetry(async () =>
      await this.supabase.from('tribute_guestbook').update({ is_deleted: true }).eq('id', id)
    )
    if (error) throw error
  }
}
