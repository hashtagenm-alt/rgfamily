'use client'

/**
 * VIP 포디움 달성자 Hook
 *
 * vip_rewards 테이블에서 한 번이라도 포디움(1~3위)에 올랐던
 * profile_id 목록을 조회합니다.
 */

import { useState, useEffect, useCallback } from 'react'
import { useSupabaseContext } from '@/lib/context'
import { USE_MOCK_DATA } from '@/lib/config'
import { mockVipRewardsDB } from '@/lib/mock'
import { withRetry } from '@/lib/utils/fetch-with-retry'

interface UseVipPodiumAchieversResult {
  /** 포디움 달성자 profile_id 목록 */
  podiumProfileIds: string[]
  /** 특정 profile_id가 포디움 달성자인지 확인 */
  isPodiumAchiever: (profileId: string | null | undefined) => boolean
  /** 로딩 중 여부 */
  isLoading: boolean
  /** 에러 메시지 */
  error: string | null
  /** 데이터 재조회 */
  refetch: () => Promise<void>
}

export function useVipPodiumAchievers(): UseVipPodiumAchieversResult {
  const supabase = useSupabaseContext()
  const [podiumProfileIds, setPodiumProfileIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPodiumAchievers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Mock 모드
      if (USE_MOCK_DATA) {
        const ids = mockVipRewardsDB
          .filter(r => r.rank <= 3)
          .map(r => r.profile_id)
        setPodiumProfileIds([...new Set(ids)])
        setIsLoading(false)
        return
      }

      // Supabase 모드: vip_rewards에서 rank 1~3인 profile_id 조회
      const { data, error: queryError } = await withRetry(async () =>
        await supabase
          .from('vip_rewards')
          .select('profile_id')
          .lte('rank', 3)
      )

      if (queryError) {
        // RLS 정책 오류 등 무시하고 빈 배열 반환
        if (queryError.code === '42501') {
          setPodiumProfileIds([])
          setIsLoading(false)
          return
        }
        throw queryError
      }

      const ids = (data || []).map(r => r.profile_id)
      setPodiumProfileIds([...new Set(ids)])
    } catch (err) {
      console.error('포디움 달성자 조회 실패:', err)
      setError('포디움 달성자 정보를 불러오는 데 실패했습니다.')
      setPodiumProfileIds([])
    }

    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchPodiumAchievers()
  }, [fetchPodiumAchievers])

  const isPodiumAchiever = useCallback(
    (profileId: string | null | undefined): boolean => {
      if (!profileId) return false
      return podiumProfileIds.includes(profileId)
    },
    [podiumProfileIds]
  )

  return {
    podiumProfileIds,
    isPodiumAchiever,
    isLoading,
    error,
    refetch: fetchPodiumAchievers,
  }
}
