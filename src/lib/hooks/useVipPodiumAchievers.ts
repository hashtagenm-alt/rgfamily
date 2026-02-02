'use client'

/**
 * VIP 클릭 가능 프로필 Hook
 *
 * vip_clickable_profiles View에서 시그니처 자격자 중
 * 아바타가 있는 profile_id 목록을 조회합니다.
 *
 * 변경 이력:
 * - 2026-02-03: vip_rewards → vip_clickable_profiles View 기반으로 변경
 *   (시그니처 자격자 11명 중 아바타 있는 7명만 VIP 페이지 클릭 가능)
 */

import { useState, useEffect, useCallback } from 'react'
import { useSupabaseContext } from '@/lib/context'
import { USE_MOCK_DATA } from '@/lib/config'
import { mockVipRewardsDB } from '@/lib/mock'
import { withRetry } from '@/lib/utils/fetch-with-retry'

interface UseVipPodiumAchieversResult {
  /** VIP 클릭 가능 profile_id 목록 */
  podiumProfileIds: string[]
  /** 특정 profile_id가 VIP 클릭 가능한지 확인 */
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

      // Supabase 모드: vip_clickable_profiles View에서 조회
      // 시그니처 자격자 + 아바타 있는 프로필만 포함
      const { data, error: queryError } = await withRetry(async () =>
        await supabase
          .from('vip_clickable_profiles')
          .select('profile_id')
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

      const ids = (data || []).map(r => r.profile_id).filter(Boolean)
      setPodiumProfileIds([...new Set(ids)])
    } catch (err) {
      console.error('VIP 클릭 가능 프로필 조회 실패:', err)
      setError('VIP 정보를 불러오는 데 실패했습니다.')
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
