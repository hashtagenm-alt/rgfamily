'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthContext } from '@/lib/context'
import {
  getVipMessageComments,
  createVipMessageComment,
  updateVipMessageComment,
  deleteVipMessageComment,
  type CommentWithAuthorAndReplies,
} from '@/lib/actions/vip-message-comments'

interface UseVipMessageCommentsResult {
  comments: CommentWithAuthorAndReplies[]
  isLoading: boolean
  error: string | null
  total: number
  hasMore: boolean
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
  addComment: (content: string, parentId?: number | null) => Promise<boolean>
  editComment: (commentId: number, content: string) => Promise<boolean>
  removeComment: (commentId: number) => Promise<boolean>
  canComment: boolean
  isSubmitting: boolean
}

interface UseVipMessageCommentsOptions {
  limit?: number
  includeReplies?: boolean
}

/**
 * VIP 메시지 댓글 관리 훅
 *
 * 특정 메시지에 대한 댓글 조회/작성/수정/삭제 기능 제공
 * Server Actions를 통해 Supabase와 통신
 */
export function useVipMessageComments(
  messageId: number,
  options: UseVipMessageCommentsOptions = {}
): UseVipMessageCommentsResult {
  const { user } = useAuthContext()
  const { limit = 10, includeReplies = true } = options

  const [comments, setComments] = useState<CommentWithAuthorAndReplies[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 로그인한 사용자만 댓글 작성 가능
  const canComment = !!user

  const fetchComments = useCallback(
    async (resetOffset = true) => {
      setIsLoading(true)
      setError(null)

      if (!messageId) {
        setComments([])
        setIsLoading(false)
        return
      }

      // 로그인하지 않은 경우
      if (!user) {
        setComments([])
        setIsLoading(false)
        return
      }

      const currentOffset = resetOffset ? 0 : offset

      try {
        const result = await getVipMessageComments(messageId, {
          limit,
          offset: currentOffset,
          includeReplies,
        })

        if (result.error) {
          // 테이블이 없는 경우 빈 배열로 처리
          if (result.error.includes('does not exist') || result.error.includes('42P01')) {
            setComments([])
            setError(null)
          } else {
            setError(result.error)
            setComments([])
          }
          setIsLoading(false)
          return
        }

        if (result.data) {
          if (resetOffset) {
            setComments(result.data.comments)
            setOffset(limit)
          } else {
            setComments((prev) => [...prev, ...result.data!.comments])
            setOffset((prev) => prev + limit)
          }
          setTotal(result.data.total)
          setHasMore(result.data.hasMore)
        }
      } catch (err) {
        console.error('댓글 조회 실패:', err)
        setComments([])
        setError(null)
      } finally {
        setIsLoading(false)
      }
    },
    [messageId, user, limit, offset, includeReplies]
  )

  // 더 불러오기
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return
    await fetchComments(false)
  }, [hasMore, isLoading, fetchComments])

  // 댓글 작성
  const addComment = useCallback(
    async (content: string, parentId?: number | null): Promise<boolean> => {
      setError(null)
      setIsSubmitting(true)

      try {
        const result = await createVipMessageComment({
          messageId,
          content,
          parentId,
        })

        if (result.error) {
          setError(result.error)
          return false
        }

        // 성공 시 목록 새로고침
        await fetchComments(true)
        return true
      } finally {
        setIsSubmitting(false)
      }
    },
    [messageId, fetchComments]
  )

  // 댓글 수정
  const editComment = useCallback(
    async (commentId: number, content: string): Promise<boolean> => {
      setError(null)
      setIsSubmitting(true)

      try {
        const result = await updateVipMessageComment(commentId, content)

        if (result.error) {
          setError(result.error)
          return false
        }

        // 성공 시 목록 새로고침
        await fetchComments(true)
        return true
      } finally {
        setIsSubmitting(false)
      }
    },
    [fetchComments]
  )

  // 댓글 삭제
  const removeComment = useCallback(
    async (commentId: number): Promise<boolean> => {
      setError(null)

      const result = await deleteVipMessageComment(commentId)

      if (result.error) {
        setError(result.error)
        return false
      }

      // 성공 시 로컬에서 제거
      setComments((prev) => {
        // 루트 댓글 삭제
        const filtered = prev.filter((c) => c.id !== commentId)
        // 대댓글도 확인해서 제거
        return filtered.map((c) => ({
          ...c,
          replies: c.replies?.filter((r) => r.id !== commentId) || [],
          reply_count: (c.replies?.filter((r) => r.id !== commentId) || []).length,
        }))
      })
      setTotal((prev) => prev - 1)
      return true
    },
    []
  )

  useEffect(() => {
    fetchComments(true)
  }, [messageId, user])

  return {
    comments,
    isLoading,
    error,
    total,
    hasMore,
    refetch: () => fetchComments(true),
    loadMore,
    addComment,
    editComment,
    removeComment,
    canComment,
    isSubmitting,
  }
}
