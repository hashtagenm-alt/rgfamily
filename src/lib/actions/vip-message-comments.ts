'use server'

import { authAction, adminAction, type ActionResult } from './index'
import { checkOwnerOrAdminPermission, throwPermissionError } from './permissions'
import type { VipMessageComment, VipMessageCommentWithAuthor } from '@/types/database'

// ==================== 타입 정의 ====================

export interface CommentWithAuthorAndReplies extends VipMessageCommentWithAuthor {
  reply_count?: number
}

export interface GetCommentsOptions {
  limit?: number
  offset?: number
  includeReplies?: boolean
}

export interface GetCommentsResult {
  comments: CommentWithAuthorAndReplies[]
  total: number
  hasMore: boolean
}

// ==================== 댓글 조회 ====================

/**
 * 특정 메시지의 댓글 조회 (페이지네이션 지원)
 * - 로그인한 모든 사용자 조회 가능
 * - 대댓글 포함 옵션
 */
export async function getVipMessageComments(
  messageId: number,
  options: GetCommentsOptions = {}
): Promise<ActionResult<GetCommentsResult>> {
  return authAction(async (supabase) => {
    const { limit = 10, offset = 0, includeReplies = true } = options

    // 루트 댓글 조회 (parent_id가 null인 것만)
    const { data: comments, error, count } = await supabase
      .from('vip_message_comments')
      .select(`
        *,
        profiles:author_id (
          nickname,
          avatar_url,
          role
        )
      `, { count: 'exact' })
      .eq('message_id', messageId)
      .is('parent_id', null)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw new Error(error.message)

    // 대댓글 조회 (옵션)
    let commentsWithReplies: CommentWithAuthorAndReplies[] = []

    if (includeReplies && comments && comments.length > 0) {
      const commentIds = comments.map(c => c.id)

      // 모든 대댓글 조회
      const { data: allReplies, error: repliesError } = await supabase
        .from('vip_message_comments')
        .select(`
          *,
          profiles:author_id (
            nickname,
            avatar_url,
            role
          )
        `)
        .in('parent_id', commentIds)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      if (repliesError) throw new Error(repliesError.message)

      // 댓글에 대댓글 매핑
      commentsWithReplies = comments.map(comment => {
        const authorInfo = comment.profiles
        const author = Array.isArray(authorInfo) ? authorInfo[0] : authorInfo

        const replies = (allReplies || [])
          .filter(reply => reply.parent_id === comment.id)
          .map(reply => {
            const replyAuthorInfo = reply.profiles
            const replyAuthor = Array.isArray(replyAuthorInfo) ? replyAuthorInfo[0] : replyAuthorInfo
            return {
              ...reply,
              author: replyAuthor ? {
                nickname: replyAuthor.nickname,
                avatar_url: replyAuthor.avatar_url,
                role: replyAuthor.role,
              } : undefined,
            } as VipMessageCommentWithAuthor
          })

        return {
          ...comment,
          author: author ? {
            nickname: author.nickname,
            avatar_url: author.avatar_url,
            role: author.role,
          } : undefined,
          replies,
          reply_count: replies.length,
        } as CommentWithAuthorAndReplies
      })
    } else {
      commentsWithReplies = (comments || []).map(comment => {
        const authorInfo = comment.profiles
        const author = Array.isArray(authorInfo) ? authorInfo[0] : authorInfo
        return {
          ...comment,
          author: author ? {
            nickname: author.nickname,
            avatar_url: author.avatar_url,
            role: author.role,
          } : undefined,
          replies: [],
          reply_count: 0,
        } as CommentWithAuthorAndReplies
      })
    }

    const total = count || 0
    const hasMore = offset + limit < total

    return {
      comments: commentsWithReplies,
      total,
      hasMore,
    }
  })
}

// ==================== 댓글 작성 ====================

/**
 * VIP 메시지 댓글 작성
 * - 로그인한 모든 사용자 작성 가능
 * - parentId가 있으면 대댓글
 */
export async function createVipMessageComment(data: {
  messageId: number
  content: string
  parentId?: number | null
}): Promise<ActionResult<VipMessageComment>> {
  return authAction(async (supabase, userId) => {
    // 메시지 존재 확인
    const { data: message, error: msgError } = await supabase
      .from('vip_personal_messages')
      .select('id, is_deleted')
      .eq('id', data.messageId)
      .single()

    if (msgError || !message) {
      throw new Error('메시지를 찾을 수 없습니다.')
    }

    if (message.is_deleted) {
      throw new Error('삭제된 메시지에는 댓글을 작성할 수 없습니다.')
    }

    // 대댓글인 경우 부모 댓글 확인
    if (data.parentId) {
      const { data: parentComment, error: parentError } = await supabase
        .from('vip_message_comments')
        .select('id, is_deleted, parent_id')
        .eq('id', data.parentId)
        .single()

      if (parentError || !parentComment) {
        throw new Error('부모 댓글을 찾을 수 없습니다.')
      }

      if (parentComment.is_deleted) {
        throw new Error('삭제된 댓글에는 답글을 작성할 수 없습니다.')
      }

      // 대댓글의 대댓글은 허용하지 않음 (2단계까지만)
      if (parentComment.parent_id !== null) {
        throw new Error('대댓글에는 답글을 작성할 수 없습니다.')
      }
    }

    // 댓글 내용 검증
    if (!data.content.trim()) {
      throw new Error('댓글 내용을 입력해주세요.')
    }

    if (data.content.length > 500) {
      throw new Error('댓글은 500자 이내로 작성해주세요.')
    }

    // 댓글 생성
    const { data: comment, error } = await supabase
      .from('vip_message_comments')
      .insert({
        message_id: data.messageId,
        author_id: userId,
        content: data.content.trim(),
        parent_id: data.parentId || null,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return comment
  })
}

// ==================== 댓글 삭제 ====================

/**
 * VIP 메시지 댓글 삭제 (soft delete)
 * - 작성자 본인 또는 관리자만 삭제 가능
 */
export async function deleteVipMessageComment(commentId: number): Promise<ActionResult<null>> {
  return authAction(async (supabase, userId) => {
    // 기존 댓글 조회
    const { data: existingComment, error: fetchError } = await supabase
      .from('vip_message_comments')
      .select('*')
      .eq('id', commentId)
      .single()

    if (fetchError || !existingComment) {
      throw new Error('댓글을 찾을 수 없습니다.')
    }

    // 작성자 또는 Admin 권한 확인
    const permission = await checkOwnerOrAdminPermission(supabase, userId, existingComment.author_id)
    if (!permission.hasPermission) throwPermissionError('삭제')

    // Soft delete
    const { error } = await supabase
      .from('vip_message_comments')
      .update({ is_deleted: true })
      .eq('id', commentId)

    if (error) throw new Error(error.message)
    return null
  })
}

// ==================== 댓글 수정 ====================

/**
 * VIP 메시지 댓글 수정
 * - 작성자 본인만 수정 가능
 */
export async function updateVipMessageComment(
  commentId: number,
  content: string
): Promise<ActionResult<VipMessageComment>> {
  return authAction(async (supabase, userId) => {
    // 기존 댓글 조회
    const { data: existingComment, error: fetchError } = await supabase
      .from('vip_message_comments')
      .select('*')
      .eq('id', commentId)
      .single()

    if (fetchError || !existingComment) {
      throw new Error('댓글을 찾을 수 없습니다.')
    }

    // 작성자 본인만 수정 가능
    if (existingComment.author_id !== userId) {
      throw new Error('댓글 수정 권한이 없습니다.')
    }

    // 내용 검증
    if (!content.trim()) {
      throw new Error('댓글 내용을 입력해주세요.')
    }

    if (content.length > 500) {
      throw new Error('댓글은 500자 이내로 작성해주세요.')
    }

    // 수정
    const { data: comment, error } = await supabase
      .from('vip_message_comments')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return comment
  })
}

// ==================== Admin 전용 ====================

/**
 * 댓글 강제 삭제 (Admin - hard delete)
 */
export async function hardDeleteVipMessageComment(commentId: number): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    const { error } = await supabase
      .from('vip_message_comments')
      .delete()
      .eq('id', commentId)

    if (error) throw new Error(error.message)
    return null
  })
}

/**
 * 메시지별 댓글 수 조회
 */
export async function getVipMessageCommentCount(messageId: number): Promise<ActionResult<number>> {
  return authAction(async (supabase) => {
    const { count, error } = await supabase
      .from('vip_message_comments')
      .select('*', { count: 'exact', head: true })
      .eq('message_id', messageId)
      .eq('is_deleted', false)

    if (error) throw new Error(error.message)
    return count || 0
  })
}
