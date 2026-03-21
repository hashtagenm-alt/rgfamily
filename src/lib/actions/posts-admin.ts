'use server'

import { moderatorAction, type ActionResult } from './index'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Post } from '@/types/database'

/**
 * 관리자용 게시글 목록 조회 (Moderator+)
 * - 댓글 수 포함, 프로필 닉네임 조인
 * CLAUDE.md S17: /admin/posts - moderator+
 */
export async function getAdminPosts(options?: {
  boardType?: 'free' | 'vip'
}): Promise<ActionResult<{
  id: number
  title: string
  content: string
  authorId: string
  authorName: string
  boardType: 'free' | 'vip'
  viewCount: number
  commentCount: number
  isAnonymous: boolean
  createdAt: string
}[]>> {
  return moderatorAction(async (supabase) => {
    let query = supabase
      .from('posts')
      .select('*, profiles!author_id(nickname), comments(id)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(500)

    if (options?.boardType) {
      query = query.eq('board_type', options.boardType)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    return (data || []).map((p) => {
      const profile = p.profiles as { nickname?: string } | null
      const commentsArr = p.comments as unknown[] | null
      return {
        id: p.id,
        title: p.title,
        content: p.content,
        authorId: p.author_id,
        authorName: profile?.nickname || '익명',
        boardType: p.board_type as 'free' | 'vip',
        viewCount: p.view_count || 0,
        commentCount: commentsArr?.length || 0,
        isAnonymous: p.is_anonymous || false,
        createdAt: p.created_at,
      }
    })
  })
}

/**
 * 관리자용 댓글 목록 조회 (Moderator+)
 * - 프로필 닉네임 포함
 * CLAUDE.md S17: /admin/posts - moderator+
 */
export async function getAdminComments(
  postId: number
): Promise<ActionResult<{
  id: number
  content: string
  authorName: string
  createdAt: string
}[]>> {
  return moderatorAction(async (supabase) => {
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles!author_id(nickname)')
      .eq('post_id', postId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)

    return (data || []).map((c) => {
      const profile = c.profiles as { nickname?: string } | null
      return {
        id: c.id,
        content: c.content,
        authorName: c.is_anonymous ? '익명' : (profile?.nickname || '익명'),
        createdAt: c.created_at,
      }
    })
  })
}

/**
 * 관리자용 게시글 생성 (Moderator+)
 * - 서버에서 현재 사용자 ID를 자동 설정
 * CLAUDE.md S17: /admin/posts - moderator+
 */
export async function createAdminPost(data: {
  title: string
  content: string
  board_type: 'free' | 'vip'
  is_anonymous: boolean
}): Promise<ActionResult<Post>> {
  return moderatorAction(async (supabase) => {
    // 현재 사용자 가져오기
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('로그인이 필요합니다.')

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        title: data.title,
        content: data.content,
        board_type: data.board_type,
        author_id: user.id,
        is_anonymous: data.is_anonymous,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return post
  }, ['/admin/posts', '/community/free', '/community/vip'])
}

/**
 * 관리자용 게시글 수정 (Moderator+)
 * CLAUDE.md S17: /admin/posts - moderator+
 */
export async function updateAdminPost(
  id: number,
  data: {
    title: string
    content: string
    board_type: 'free' | 'vip'
    is_anonymous: boolean
  }
): Promise<ActionResult<Post>> {
  return moderatorAction(async (supabase) => {
    const { data: post, error } = await supabase
      .from('posts')
      .update({
        title: data.title,
        content: data.content,
        board_type: data.board_type,
        is_anonymous: data.is_anonymous,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return post
  }, ['/admin/posts', '/community/free', '/community/vip'])
}

/**
 * 관리자용 게시글 삭제 - Soft Delete (Moderator+)
 * CLAUDE.md S17: /admin/posts - moderator+
 */
export async function deleteAdminPost(
  id: number
): Promise<ActionResult<null>> {
  return moderatorAction(async (supabase) => {
    const serviceClient = createServiceRoleClient()
    const { error } = await serviceClient
      .from('posts')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  }, ['/admin/posts', '/community/free', '/community/vip'])
}

/**
 * 관리자용 댓글 삭제 - Soft Delete (Moderator+)
 * CLAUDE.md S17: /admin/posts - moderator+
 */
export async function deleteAdminComment(
  id: number
): Promise<ActionResult<null>> {
  return moderatorAction(async (supabase) => {
    const serviceClient = createServiceRoleClient()
    const { error } = await serviceClient
      .from('comments')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  }, ['/admin/posts', '/community/free', '/community/vip'])
}

/**
 * 게시글 강제 삭제 (Moderator+ - Hard Delete)
 * CLAUDE.md S17: /admin/posts - moderator+
 */
export async function hardDeletePost(
  id: number
): Promise<ActionResult<null>> {
  return moderatorAction(async (supabase) => {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  }, ['/admin/posts', '/community/free', '/community/vip'])
}

/**
 * 게시글 복구 (Moderator+)
 * CLAUDE.md S17: /admin/posts - moderator+
 */
export async function restorePost(
  id: number
): Promise<ActionResult<Post>> {
  return moderatorAction(async (supabase) => {
    const { data: post, error } = await supabase
      .from('posts')
      .update({ is_deleted: false })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return post
  }, ['/admin/posts', '/community/free', '/community/vip'])
}
