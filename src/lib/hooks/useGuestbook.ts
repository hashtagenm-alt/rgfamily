/**
 * useGuestbook Hook
 *
 * 헌정 페이지 방명록 데이터 관리
 * - 방명록 조회 (Supabase)
 * - 방명록 작성 (인증된 사용자)
 */

import { useState, useEffect, useCallback } from 'react'
import type { GuestbookEntry } from '@/types/tribute'
import { useAuthContext, useSupabaseContext } from '@/lib/context'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import { logger } from '@/lib/utils/logger'

interface UseGuestbookOptions {
  tributeUserId: string
}

interface UseGuestbookReturn {
  entries: GuestbookEntry[]
  isLoading: boolean
  error: string | null
  submitEntry: (message: string) => Promise<boolean>
  isSubmitting: boolean
  canWrite: boolean
  refetch: () => void
}

export function useGuestbook({ tributeUserId }: UseGuestbookOptions): UseGuestbookReturn {
  const supabase = useSupabaseContext()
  const { user, profile, isAuthenticated } = useAuthContext()
  const [entries, setEntries] = useState<GuestbookEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 작성 권한: 로그인된 사용자만
  const canWrite = isAuthenticated && !!user

  // 방명록 조회
  const fetchGuestbook = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Supabase에서 방명록 조회
      const { data, error: fetchError } = await withRetry(async () =>
        await supabase
          .from('tribute_guestbook')
          .select('*')
          .eq('tribute_user_id', tributeUserId)
          .eq('is_approved', true)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
      )

      if (fetchError) {
        logger.warn('방명록 테이블 조회 실패', { context: { error: fetchError.message || fetchError } })
        setEntries([])
      } else {
        // DB 데이터를 GuestbookEntry 형식으로 변환
        const converted: GuestbookEntry[] = (data || []).map((row) => ({
          id: row.id,
          tribute_user_id: row.tribute_user_id,
          author_id: row.author_id,
          author_name: row.author_name,
          message: row.message,
          is_member: row.is_member,
          created_at: row.created_at,
          author_unit: row.author_unit || null,
        }))
        setEntries(converted)
      }
    } catch (err) {
      setError('방명록을 불러오는데 실패했습니다.')
      logger.error('Guestbook fetch error', err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, tributeUserId])

  // 방명록 작성
  const submitEntry = useCallback(async (message: string): Promise<boolean> => {
    if (!canWrite || !user || !profile) {
      setError('로그인이 필요합니다.')
      return false
    }

    if (!message.trim()) {
      setError('메시지를 입력해주세요.')
      return false
    }

    if (message.length > 500) {
      setError('메시지는 500자 이내로 작성해주세요.')
      return false
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Supabase에 방명록 작성
      const { data: insertedData, error: insertError } = await withRetry(async () =>
        await supabase
          .from('tribute_guestbook')
          .insert({
            tribute_user_id: tributeUserId,
            author_id: user.id,
            author_name: profile.nickname || '익명',
            message: message.trim(),
            is_member: profile.unit !== null,
          })
          .select()
          .single()
      )

      if (insertError) {
        logger.warn('방명록 작성 실패, 로컬 상태에 추가', { context: { error: insertError.message || insertError } })
        const newEntry: GuestbookEntry = {
          id: Date.now(),
          tribute_user_id: tributeUserId,
          author_id: user.id,
          author_name: profile.nickname || '익명',
          message: message.trim(),
          is_member: profile.unit !== null,
          created_at: new Date().toISOString(),
          author_unit: profile.unit,
        }
        setEntries(prev => [newEntry, ...prev])
        return true
      }

      // 성공 시 로컬 상태 업데이트
      const newEntry: GuestbookEntry = {
        id: insertedData.id,
        tribute_user_id: insertedData.tribute_user_id,
        author_id: insertedData.author_id,
        author_name: insertedData.author_name,
        message: insertedData.message,
        is_member: insertedData.is_member,
        created_at: insertedData.created_at,
        author_unit: profile.unit,
      }
      setEntries(prev => [newEntry, ...prev])
      return true
    } catch (err) {
      setError('방명록 작성에 실패했습니다.')
      logger.error('Guestbook submit error', err)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [supabase, canWrite, user, profile, tributeUserId])

  // 초기 로드
  useEffect(() => {
    fetchGuestbook()
  }, [fetchGuestbook])

  return {
    entries,
    isLoading,
    error,
    submitEntry,
    isSubmitting,
    canWrite,
    refetch: fetchGuestbook,
  }
}
