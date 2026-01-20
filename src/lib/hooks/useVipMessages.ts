'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthContext } from '@/lib/context'
import {
  getVipMessagesByVipId,
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
  refetch: () => Promise<void>
  submitMessage: (params: SubmitMessageParams) => Promise<boolean>
  updateMessage: (params: UpdateMessageParams) => Promise<boolean>
  deleteMessage: (messageId: number) => Promise<boolean>
  toggleVisibility: (messageId: number) => Promise<boolean>
  canWrite: boolean
}

/**
 * VIP 개인 메시지 관리 훅
 *
 * 특정 VIP 프로필에 대한 개인 메시지 조회/작성/수정/삭제 기능 제공
 * Server Actions를 통해 Supabase와 통신
 */
export function useVipMessages(vipProfileId: string): UseVipMessagesResult {
  const { user } = useAuthContext()
  const [messages, setMessages] = useState<VipMessageWithAuthor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // VIP 본인만 작성 가능
  const canWrite = user?.id === vipProfileId

  const fetchMessages = useCallback(async () => {
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

    try {
      // Server Action 호출
      const result = await getVipMessagesByVipId(vipProfileId)

      if (result.error) {
        // 테이블이 없는 경우 빈 배열로 처리 (에러 숨김)
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
    } catch (err) {
      console.error('VIP 메시지 조회 실패:', err)
      // 테이블이 없어도 에러를 표시하지 않고 빈 상태로 처리
      setMessages([])
      setError(null)
    } finally {
      setIsLoading(false)
    }
  }, [vipProfileId, user])

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
    fetchMessages()
  }, [fetchMessages])

  return {
    messages,
    isLoading,
    error,
    refetch: fetchMessages,
    submitMessage,
    updateMessage: updateMessageHandler,
    deleteMessage: deleteMessageHandler,
    toggleVisibility: toggleVisibilityHandler,
    canWrite,
  }
}
