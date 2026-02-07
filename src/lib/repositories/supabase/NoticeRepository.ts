/**
 * Supabase Notice Repository
 * 공지사항 데이터 CRUD
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import { INoticeRepository } from '../types'
import type { Notice, InsertTables, UpdateTables } from '@/types/database'

export class SupabaseNoticeRepository implements INoticeRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<Notice | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('notices').select('*').eq('id', id).single()
    )
    return data
  }

  async findRecent(limit: number): Promise<Notice[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(limit)
    )
    return data || []
  }

  async findPublished(): Promise<(Notice & { author_nickname?: string })[]> {
    const { data } = await withRetry(async () =>
      await this.supabase
        .from('notices')
        .select('*, author:profiles!author_id(nickname)')
        // 새 글(display_order=NULL)이 먼저, 그 다음 수동 정렬된 항목
        .order('display_order', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: false })
    )
    // author 정보를 평탄화
    return (data || []).map(notice => ({
      ...notice,
      author_nickname: (notice.author as { nickname: string } | null)?.nickname || '운영자',
      author: undefined, // 원본 객체 제거
    }))
  }

  async findAll(): Promise<Notice[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('notices').select('*').order('created_at', { ascending: false })
    )
    return data || []
  }

  async create(data: InsertTables<'notices'>): Promise<Notice> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('notices').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'notices'>): Promise<Notice> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('notices').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('notices').delete().eq('id', id)
    )
    if (error) throw error
  }
}
