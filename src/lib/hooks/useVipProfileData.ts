'use client'

/**
 * VIP 프로필 데이터 Hook
 *
 * VIP 개인 페이지에서 사용하는 데이터 조회
 * - Mock 모드: mockVipRewardsDB, mockVipImages, mockProfiles 사용
 * - 실서비스: Server Action(publicAction)을 통해 조회
 *
 * 왜? 비로그인 사용자도 VIP 시그니처 이미지를 볼 수 있어야 함.
 * Server Action의 publicAction을 사용하면 RLS 우회 가능.
 */

import { useState, useEffect, useCallback } from 'react'
import { USE_MOCK_DATA } from '@/lib/config'
import { mockVipRewardsDB, mockVipImages, mockProfiles, mockSeasons } from '@/lib/mock'
import { getVipProfileData } from '@/lib/actions/vip-rewards'

export interface VipRewardData {
  id: number
  profileId: string
  nickname: string
  avatarUrl: string | null
  rank: number
  personalMessage: string | null
  dedicationVideoUrl: string | null
  seasonName: string
  totalDonation: number
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
      // Mock 모드: Mock 데이터 사용
      if (USE_MOCK_DATA) {
        const reward = mockVipRewardsDB.find(r => r.profile_id === profileId)

        if (!reward) {
          setError('등록된 VIP 보상 정보가 없습니다.')
          setIsLoading(false)
          return
        }

        const profile = mockProfiles.find(p => p.id === profileId)
        const season = mockSeasons.find(s => s.id === reward.season_id)
        const images = mockVipImages
          .filter(img => img.reward_id === reward.id)
          .sort((a, b) => a.order_index - b.order_index)

        setData({
          id: reward.id,
          profileId: reward.profile_id,
          nickname: profile?.nickname || '알 수 없음',
          avatarUrl: profile?.avatar_url || null,
          rank: reward.rank,
          personalMessage: reward.personal_message,
          dedicationVideoUrl: reward.dedication_video_url,
          seasonName: season?.name || '',
          totalDonation: profile?.total_donation || 0,
          images: images.map(img => ({
            id: img.id,
            imageUrl: img.image_url,
            title: img.title || '',
            orderIndex: img.order_index,
          })),
        })
        setIsLoading(false)
        return
      }

      // 실서비스 모드: Server Action을 통해 조회 (publicAction 사용)
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
      console.error('VIP 데이터 로드 실패:', err)
      setError('VIP 정보를 불러오는 데 실패했습니다.')
    }

    setIsLoading(false)
  }, [profileId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}
