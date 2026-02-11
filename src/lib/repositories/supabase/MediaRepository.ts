/**
 * Supabase Media Repository
 * 미디어 콘텐츠 데이터 CRUD
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import { IMediaRepository } from '../types'
import type { MediaContent, InsertTables, UpdateTables } from '@/types/database'

export class SupabaseMediaRepository implements IMediaRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<MediaContent | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('media_content').select('*').eq('id', id).eq('is_published', true).single()
    )
    return data
  }

  async findByType(type: 'shorts' | 'vod'): Promise<MediaContent[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('media_content').select('*').eq('content_type', type).eq('is_published', true).order('created_at', { ascending: false })
    )
    return data || []
  }

  async findFeatured(): Promise<MediaContent[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('media_content').select('*').eq('is_featured', true).eq('is_published', true).order('created_at', { ascending: false })
    )
    return data || []
  }

  async findAll(): Promise<MediaContent[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('media_content').select('*').eq('is_published', true).order('created_at', { ascending: false })
    )
    return data || []
  }

  async create(data: InsertTables<'media_content'>): Promise<MediaContent> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('media_content').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'media_content'>): Promise<MediaContent> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('media_content').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('media_content').delete().eq('id', id)
    )
    if (error) throw error
  }
}
