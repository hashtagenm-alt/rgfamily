'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthContext } from '@/lib/context'
import { checkBjMemberStatus } from '@/lib/actions/bj-messages'

interface BjMemberInfo {
  orgId: number
  name: string
  imageUrl: string | null
}

interface BjMemberStatusResult {
  isBjMember: boolean
  isLoading: boolean
  bjMemberId: number | null
  bjMemberInfo: BjMemberInfo | null
  refetch: () => Promise<void>
}

/**
 * 현재 로그인한 사용자가 BJ 멤버인지 확인하는 훅
 *
 * BJ 멤버는 organization 테이블에 profile_id가 연결된 사용자
 * BJ만 VIP 프로필 페이지에서 감사 메시지를 작성할 수 있음
 */
export function useBjMemberStatus(): BjMemberStatusResult {
  const { user, isLoading: authLoading } = useAuthContext()
  const [isBjMember, setIsBjMember] = useState(false)
  const [bjMemberId, setBjMemberId] = useState<number | null>(null)
  const [bjMemberInfo, setBjMemberInfo] = useState<BjMemberInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchBjMemberStatus = useCallback(async () => {
    setIsLoading(true)

    if (authLoading) return

    if (!user) {
      setIsBjMember(false)
      setBjMemberId(null)
      setBjMemberInfo(null)
      setIsLoading(false)
      return
    }

    // Server Action 호출
    const result = await checkBjMemberStatus()

    if (result.error || !result.data) {
      setIsBjMember(false)
      setBjMemberId(null)
      setBjMemberInfo(null)
      setIsLoading(false)
      return
    }

    setIsBjMember(result.data.isBjMember)
    setBjMemberId(result.data.bjMemberId)
    setBjMemberInfo(result.data.bjMemberInfo)
    setIsLoading(false)
  }, [authLoading, user])

  useEffect(() => {
    fetchBjMemberStatus()
  }, [fetchBjMemberStatus])

  return { isBjMember, isLoading, bjMemberId, bjMemberInfo, refetch: fetchBjMemberStatus }
}
