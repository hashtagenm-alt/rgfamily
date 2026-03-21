'use server'

import { authAction, publicAction, type ActionResult } from './index'
import { checkOwnerOrModeratorPermission, throwPermissionError } from './permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { InsertTables, UpdateTables, Comment } from '@/types/database'
import { logger } from '@/lib/utils/logger'

type CommentInsert = InsertTables<'comments'>
type CommentUpdate = UpdateTables<'comments'>

/**
 * 댓글 생성 (인증 필요)
 */
export async function createComment(
  data: Omit<CommentInsert, 'author_id'>
): Promise<ActionResult<Comment>> {
  return authAction(async (supabase, userId) => {
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        ...data,
        author_id: userId
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    // 댓글 수 원자적 증가 (Race Condition 방지)
    try { await supabase.rpc('increment_comment_count', { p_post_id: data.post_id }) } catch (e) { logger.debug('RPC 카운터 증가 실패', { context: { error: e } }) }

    return comment
  })
}

/**
 * 댓글 수정 (작성자 또는 Admin)
 */
export async function updateComment(
  id: number,
  data: CommentUpdate
): Promise<ActionResult<Comment>> {
  return authAction(async (supabase, userId) => {
    const { data: existingComment, error: fetchError } = await supabase
      .from('comments')
      .select('author_id')
      .eq('id', id)
      .single()

    if (fetchError) throw new Error(fetchError.message)

    // 작성자 또는 Moderator 권한 확인
    const permission = await checkOwnerOrModeratorPermission(supabase, userId, existingComment.author_id)
    if (!permission.hasPermission) throwPermissionError('수정')

    const { data: comment, error } = await supabase
      .from('comments')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return comment
  })
}

/**
 * 댓글 삭제 (작성자 또는 Admin)
 */
export async function deleteComment(
  id: number
): Promise<ActionResult<null>> {
  return authAction(async (supabase, userId) => {
    const { data: existingComment, error: fetchError } = await supabase
      .from('comments')
      .select('author_id, post_id')
      .eq('id', id)
      .single()

    if (fetchError) throw new Error(fetchError.message)

    // 작성자 또는 Moderator 권한 확인
    const permission = await checkOwnerOrModeratorPermission(supabase, userId, existingComment.author_id)
    if (!permission.hasPermission) throwPermissionError('삭제')

    // Service Role 클라이언트 사용 (RLS 우회)
    const serviceClient = createServiceRoleClient()
    const { error } = await serviceClient
      .from('comments')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  })
}

/**
 * 게시글의 댓글 목록 조회 (공개)
 */
export async function getCommentsByPostId(
  postId: number
): Promise<ActionResult<Comment[]>> {
  return publicAction(async (supabase) => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
  })
}

/**
 * 게시글 댓글 목록 조회 - 프로필 조인 포함 (공개)
 */
export async function getPostComments(
  postId: number
): Promise<ActionResult<{
  id: number
  content: string
  authorId: string
  authorName: string
  authorAvatar: string | null
  createdAt: string
}[]>> {
  return publicAction(async (supabase) => {
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles!author_id(id, nickname, avatar_url)')
      .eq('post_id', postId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)

    return (data || []).map((c) => {
      const profile = c.profiles as { id?: string; nickname?: string; avatar_url?: string } | null
      return {
        id: c.id,
        content: c.content,
        authorId: c.author_id,
        authorName: profile?.nickname || '익명',
        authorAvatar: profile?.avatar_url || null,
        createdAt: c.created_at,
      }
    })
  })
}

/**
 * 현재 사용자의 좋아요 여부 확인 (인증 필요)
 */
export async function checkUserLike(
  postId: number
): Promise<ActionResult<boolean>> {
  return authAction(async (supabase, userId) => {
    const { data } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle()

    return !!data
  })
}

/**
 * 댓글 추가 (인증 필요)
 */
export async function addComment(
  postId: number,
  content: string
): Promise<ActionResult<{
  id: number
  content: string
  authorId: string
  authorName: string
  authorAvatar: string | null
  createdAt: string
}>> {
  return authAction(async (supabase, userId) => {
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: userId,
        content: content.trim(),
      })
      .select('*, profiles!author_id(id, nickname, avatar_url)')
      .single()

    if (error) throw new Error(error.message)

    // 댓글 수 원자적 증가 (Race Condition 방지)
    try { await supabase.rpc('increment_comment_count', { p_post_id: postId }) } catch (e) { logger.debug('RPC 카운터 증가 실패', { context: { error: e } }) }

    const profile = comment.profiles as { id?: string; nickname?: string; avatar_url?: string } | null
    return {
      id: comment.id,
      content: comment.content,
      authorId: comment.author_id,
      authorName: profile?.nickname || '익명',
      authorAvatar: profile?.avatar_url || null,
      createdAt: comment.created_at,
    }
  })
}

/**
 * 좋아요 토글 (인증 필요)
 * 반환: { liked: boolean, likeCount: number }
 */
export async function toggleLike(
  postId: number
): Promise<ActionResult<{ liked: boolean; likeCount: number }>> {
  return authAction(async (supabase, userId) => {
    // 현재 좋아요 여부 확인
    const { data: existing } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      // 좋아요 취소
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)
      if (error) throw new Error(error.message)

      // like_count 원자적 감소 (Race Condition 방지)
      const { data: newCount } = await supabase.rpc('increment_post_like_count', {
        p_post_id: postId,
        p_delta: -1,
      })

      return { liked: false, likeCount: newCount ?? 0 }
    } else {
      // 좋아요 추가
      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: userId })
      if (error) throw new Error(error.message)

      // like_count 원자적 증가 (Race Condition 방지)
      const { data: newCount } = await supabase.rpc('increment_post_like_count', {
        p_post_id: postId,
        p_delta: 1,
      })

      return { liked: true, likeCount: newCount ?? 0 }
    }
  })
}
