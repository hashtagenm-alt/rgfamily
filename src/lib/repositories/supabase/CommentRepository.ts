/**
 * Supabase Comment Repository
 * 댓글 데이터 CRUD
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import { ICommentRepository } from '../types'
import type { Comment, InsertTables, UpdateTables } from '@/types/database'

export class SupabaseCommentRepository implements ICommentRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<Comment | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('comments').select('*').eq('id', id).eq('is_deleted', false).single()
    )
    return data
  }

  async findByPostId(postId: number): Promise<Comment[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('comments').select('*, profiles:author_id(nickname, avatar_url)').eq('post_id', postId).eq('is_deleted', false).order('created_at', { ascending: true })
    )
    return data || []
  }

  async findAll(): Promise<Comment[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('comments').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
    )
    return data || []
  }

  async create(data: InsertTables<'comments'>): Promise<Comment> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('comments').insert(data).select().single()
    )
    if (error) throw error

    // 게시글의 댓글 수 증가 (RPC 없으면 무시)
    try {
      await this.supabase.rpc('increment_comment_count', { p_post_id: data.post_id })
    } catch {
      // RPC function not available, ignore
    }

    return created!
  }

  async update(id: number, data: UpdateTables<'comments'>): Promise<Comment> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('comments').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    // Soft delete
    const { error } = await withRetry(async () =>
      await this.supabase.from('comments').update({ is_deleted: true }).eq('id', id)
    )
    if (error) throw error
  }
}
