/**
 * Supabase Post Repository
 * 게시글 데이터 CRUD
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import { IPostRepository } from '../types'
import type { Post, InsertTables, UpdateTables } from '@/types/database'

export class SupabasePostRepository implements IPostRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<Post | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('posts').select('*').eq('id', id).eq('is_deleted', false).single()
    )
    return data
  }

  async findByCategory(category: string): Promise<Post[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('posts').select('*').eq('board_type', category).eq('is_deleted', false).order('created_at', { ascending: false })
    )
    return data || []
  }

  async findRecent(limit: number): Promise<Post[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('posts').select('*').eq('is_deleted', false).order('created_at', { ascending: false }).limit(limit)
    )
    return data || []
  }

  async findAll(): Promise<Post[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('posts').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
    )
    return data || []
  }

  async create(data: InsertTables<'posts'>): Promise<Post> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('posts').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'posts'>): Promise<Post> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('posts').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    // Soft delete
    const { error } = await withRetry(async () =>
      await this.supabase.from('posts').update({ is_deleted: true }).eq('id', id)
    )
    if (error) throw error
  }

  async incrementViewCount(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.rpc('increment_view_count', { post_id: id })
    )
    // RPC가 없으면 직접 업데이트
    if (error) {
      const post = await this.findById(id)
      if (post) {
        await this.supabase.from('posts').update({ view_count: post.view_count + 1 }).eq('id', id)
      }
    }
  }
}
