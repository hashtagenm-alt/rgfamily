/**
 * Supabase Signature Repository
 * 시그니처 데이터 CRUD
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import { ISignatureRepository } from '../types'
import type { Signature, InsertTables, UpdateTables } from '@/types/database'

export class SupabaseSignatureRepository implements ISignatureRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<Signature | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('signatures').select('*').eq('id', id).single()
    )
    return data
  }

  async findByUnit(unit: 'excel' | 'crew'): Promise<Signature[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('signatures').select('*').eq('unit', unit).order('sig_number', { ascending: true })
    )
    return data || []
  }

  async findAll(): Promise<Signature[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('signatures').select('*').order('sig_number', { ascending: true })
    )
    return data || []
  }

  async create(data: InsertTables<'signatures'>): Promise<Signature> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('signatures').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'signatures'>): Promise<Signature> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('signatures').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('signatures').delete().eq('id', id)
    )
    if (error) throw error
  }
}
