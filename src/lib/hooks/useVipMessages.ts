'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthContext } from '@/lib/context'
import {
  getVipMessagesByVipId,
  getVipMessagesPaginated,
  createVipMessage,
  updateVipMessage,
  deleteVipMessage,
  toggleVipMessageVisibility,
  type VipMessageWithAuthor,
} from '@/lib/actions/vip-messages'

interface SubmitMessageParams {
  vipProfileId: string
  messageType: 'text' | 'image' | 'video'
  contentText?: string
  contentUrl?: string
  isPublic?: boolean
}

interface UpdateMessageParams {
  messageId: number
  contentText?: string
  contentUrl?: string
  isPublic?: boolean
}

interface UseVipMessagesResult {
  messages: VipMessageWithAuthor[]
  isLoading: boolean
  error: string | null
  total: number
  hasMore: boolean
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
  submitMessage: (params: SubmitMessageParams) => Promise<boolean>
  updateMessage: (params: UpdateMessageParams) => Promise<boolean>
  deleteMessage: (messageId: number) => Promise<boolean>
  toggleVisibility: (messageId: number) => Promise<boolean>
  canWrite: boolean
}

interface UseVipMessagesOptions {
  limit?: number
  paginated?: boolean
  includeCommentCount?: boolean
}

/**
 * VIP 개인 메시지 관리 훅
 *
 * 특정 VIP 프로필에 대한 개인 메시지 조회/작성/수정/삭제 기능 제공
 * Server Actions를 통해 Supabase와 통신
 *
 * @param vipProfileId - VIP 프로필 ID
 * @param options - 옵션 (limit, paginated, includeCommentCount)
 */
export function useVipMessages(
  vipProfileId: string,
  options: UseVipMessagesOptions = {}
): UseVipMessagesResult {
  const { user } = useAuthContext()
  const { limit = 10, paginated = false, includeCommentCount = true } = options

  const [messages, setMessages] = useState<VipMessageWithAuthor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  // VIP 본인만 작성 가능
  const canWrite = user?.id === vipProfileId

  const fetchMessages = useCallback(async (resetOffset = true) => {
    setIsLoading(true)
    setError(null)

    if (!vipProfileId) {
      setMessages([])
      setIsLoading(false)
      return
    }

    // 로그인하지 않은 경우
    if (!user) {
      setMessages([])
      setIsLoading(false)
      return
    }

    const currentOffset = resetOffset ? 0 : offset

    try {
      if (paginated) {
        // 페이지네이션 모드
        const result = await getVipMessagesPaginated(vipProfileId, {
          limit,
          offset: currentOffset,
          includeCommentCount,
        })

        if (result.error) {
          if (result.error.includes('does not exist') || result.error.includes('42P01')) {
            setMessages([])
            setError(null)
          } else {
            setError(result.error)
            setMessages([])
          }
          setIsLoading(false)
          return
        }

        if (result.data) {
          if (resetOffset) {
            setMessages(result.data.messages)
            setOffset(limit)
          } else {
            setMessages((prev) => [...prev, ...result.data!.messages])
            setOffset((prev) => prev + limit)
          }
          setTotal(result.data.total)
          setHasMore(result.data.hasMore)
        }
      } else {
        // 기존 모드 (전체 조회)
        const result = await getVipMessagesByVipId(vipProfileId)

        if (result.error) {
          if (result.error.includes('does not exist') || result.error.includes('42P01')) {
            setMessages([])
            setError(null)
          } else {
            setError(result.error)
            setMessages([])
          }
          setIsLoading(false)
          return
        }

        setMessages(result.data || [])
        setTotal(result.data?.length || 0)
        setHasMore(false)
      }
    } catch (err) {
      console.error('VIP 메시지 조회 실패:', err)
      setMessages([])
      setError(null)
    } finally {
      setIsLoading(false)
    }
  }, [vipProfileId, user, paginated, limit, offset, includeCommentCount])

  // 더 불러오기 (페이지네이션 모드)
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || !paginated) return
    await fetchMessages(false)
  }, [hasMore, isLoading, paginated, fetchMessages])

  // 메시지 작성
  const submitMessage = useCallback(
    async (params: SubmitMessageParams): Promise<boolean> => {
      setError(null)

      const result = await createVipMessage({
        vipProfileId: params.vipProfileId,
        messageType: params.messageType,
        contentText: params.contentText,
        contentUrl: params.contentUrl,
        isPublic: params.isPublic,
      })

      if (result.error) {
        setError(result.error)
        return false
      }

      // 성공 시 목록 새로고침
      await fetchMessages()
      return true
    },
    [fetchMessages]
  )

  // 메시지 수정
  const updateMessageHandler = useCallback(
    async (params: UpdateMessageParams): Promise<boolean> => {
      setError(null)

      const result = await updateVipMessage(params.messageId, {
        contentText: params.contentText,
        contentUrl: params.contentUrl,
        isPublic: params.isPublic,
      })

      if (result.error) {
        setError(result.error)
        return false
      }

      // 성공 시 목록 새로고침
      await fetchMessages()
      return true
    },
    [fetchMessages]
  )

  // 메시지 삭제 (soft delete)
  const deleteMessageHandler = useCallback(
    async (messageId: number): Promise<boolean> => {
      setError(null)

      const result = await deleteVipMessage(messageId)

      if (result.error) {
        setError(result.error)
        return false
      }

      // 성공 시 목록에서 제거
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
      return true
    },
    []
  )

  // 공개/비공개 토글
  const toggleVisibilityHandler = useCallback(
    async (messageId: number): Promise<boolean> => {
      setError(null)

      const result = await toggleVipMessageVisibility(messageId)

      if (result.error) {
        setError(result.error)
        return false
      }

      // 성공 시 목록 새로고침
      await fetchMessages()
      return true
    },
    [fetchMessages]
  )

  useEffect(() => {
    fetchMessages(true)
  }, [vipProfileId, user])

  return {
    messages,
    isLoading,
    error,
    total,
    hasMore,
    refetch: () => fetchMessages(true),
    loadMore,
    submitMessage,
    updateMessage: updateMessageHandler,
    deleteMessage: deleteMessageHandler,
    toggleVisibility: toggleVisibilityHandler,
    canWrite,
  }
}
