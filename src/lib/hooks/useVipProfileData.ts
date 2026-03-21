'use client'

/**
 * VIP 프로필 데이터 Hook
 *
 * VIP 개인 페이지에서 사용하는 데이터 조회
 * - Server Action(publicAction)을 통해 조회
 *
 * 왜? 비로그인 사용자도 VIP 시그니처 이미지를 볼 수 있어야 함.
 * Server Action의 publicAction을 사용하면 RLS 우회 가능.
 */

import { useState, useEffect, useCallback } from 'react'
import { getVipProfileData } from '@/lib/actions/vip-rewards'
import { logger } from '@/lib/utils/logger'

export interface VipRewardData {
  id: number
  profileId: string
  nickname: string
  avatarUrl: string | null
  rank: number
  /** 종합 후원 랭킹 (역대 누적) */
  totalRank: number | null
  /** 현재 시즌 랭킹 */
  seasonRank: number | null
  personalMessage: string | null
  dedicationVideoUrl: string | null
  seasonName: string
  viewerScore: number
  images: {
    id: number
    imageUrl: string
    title: string
    orderIndex: number
  }[]
}

interface UseVipProfileDataResult {
  data: VipRewardData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useVipProfileData(profileId: string): UseVipProfileDataResult {
  const [data, setData] = useState<VipRewardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Server Action을 통해 조회 (publicAction 사용)
      const result = await getVipProfileData(profileId)

      if (result.error) {
        throw new Error(result.error)
      }

      if (!result.data) {
        setError('프로필 정보를 찾을 수 없습니다.')
        setIsLoading(false)
        return
      }

      setData(result.data)
    } catch (err) {
      logger.error('VIP 데이터 로드 실패', err)
      setError('VIP 정보를 불러오는 데 실패했습니다.')
    }

    setIsLoading(false)
  }, [profileId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}
