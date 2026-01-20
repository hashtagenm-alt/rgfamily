'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthContext } from '@/lib/context'
import {
  getBjMessagesByVipId,
  createBjMessage,
  deleteBjMessage,
  type BjMessageWithMember,
} from '@/lib/actions/bj-messages'

interface SubmitMessageParams {
  vipProfileId: string
  bjMemberId: number
  messageType: 'text' | 'image' | 'video'
  contentText?: string
  contentUrl?: string
  isPublic?: boolean
}

interface UseBjMessagesResult {
  messages: BjMessageWithMember[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  submitMessage: (params: SubmitMessageParams) => Promise<boolean>
  deleteMessage: (messageId: number) => Promise<boolean>
}

/**
 * BJ 감사 메시지 관리 훅
 *
 * 특정 VIP 프로필에 대한 BJ 감사 메시지 조회/작성/삭제 기능 제공
 * Server Actions를 통해 Supabase와 통신
 */
export function useBjMessages(vipProfileId: string): UseBjMessagesResult {
  const { user } = useAuthContext()
  const [messages, setMessages] = useState<BjMessageWithMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

    // Server Action 호출
    const result = await getBjMessagesByVipId(vipProfileId)

    if (result.error) {
      setError(result.error)
      setMessages([])
      setIsLoading(false)
      return
    }

    setMessages(result.data || [])
    setIsLoading(false)
  }, [vipProfileId, user])

  // 메시지 작성
  const submitMessage = useCallback(
    async (params: SubmitMessageParams): Promise<boolean> => {
      setError(null)

      const result = await createBjMessage({
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

  // 메시지 삭제 (soft delete)
  const deleteMessageHandler = useCallback(
    async (messageId: number): Promise<boolean> => {
      setError(null)

      const result = await deleteBjMessage(messageId)

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

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  return {
    messages,
    isLoading,
    error,
    refetch: fetchMessages,
    submitMessage,
    deleteMessage: deleteMessageHandler,
  }
}
