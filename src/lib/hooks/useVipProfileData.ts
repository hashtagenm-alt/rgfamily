'use client'

/**
 * VIP 프로필 데이터 Hook
 *
 * VIP 개인 페이지에서 사용하는 데이터 조회
 * - Mock 모드: mockVipRewardsDB, mockVipImages, mockProfiles 사용
 * - 실서비스: Supabase에서 직접 조회
 */

import { useState, useEffect, useCallback } from 'react'
import { useSupabaseContext } from '@/lib/context'
import { USE_MOCK_DATA } from '@/lib/config'
import { mockVipRewardsDB, mockVipImages, mockProfiles, mockSeasons } from '@/lib/mock'
import { withRetry } from '@/lib/utils/fetch-with-retry'

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
  const supabase = useSupabaseContext()
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

      // 실서비스 모드: Supabase에서 조회
      const { data: reward, error: rewardError } = await withRetry(async () =>
        await supabase
          .from('vip_rewards')
          .select(`
            id,
            profile_id,
            rank,
            personal_message,
            dedication_video_url,
            season_id,
            profiles:profile_id (nickname, avatar_url, total_donation),
            seasons:season_id (name)
          `)
          .eq('profile_id', profileId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
      )

      // vip_rewards에 데이터가 없으면 프로필/랭킹 데이터에서 직접 조회 (Fallback)
      if (rewardError && (rewardError.code === 'PGRST116' || rewardError.code === '42501')) {
        // 병렬 쿼리: 프로필, 시즌 데이터 동시 조회
        const [profileResult, seasonResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, nickname, avatar_url, total_donation, unit')
            .eq('id', profileId)
            .single(),
          supabase
            .from('seasons')
            .select('id, name')
            .eq('is_active', true)
            .single(),
        ])

        const profileData = profileResult.data
        const currentSeason = seasonResult.data

        if (!profileData) {
          setError('프로필 정보를 찾을 수 없습니다.')
          setIsLoading(false)
          return
        }

        // 닉네임으로 total_donation_rankings에서 랭킹 조회
        let rank = 0
        if (profileData.nickname) {
          const { data: rankingData } = await supabase
            .from('total_donation_rankings')
            .select('rank')
            .eq('donor_name', profileData.nickname)
            .single()

          rank = rankingData?.rank || 0
        }

        // 프로필 데이터는 항상 로드 (VIP 여부와 무관하게 페이지 표시)
        // VIP 전용 콘텐츠 제한은 페이지 컴포넌트에서 처리

        // Fallback 데이터 설정
        setData({
          id: 0,
          profileId: profileData.id,
          nickname: profileData.nickname || '알 수 없음',
          avatarUrl: profileData.avatar_url || null,
          rank: rank,
          personalMessage: null,
          dedicationVideoUrl: null,
          seasonName: currentSeason?.name || '',
          totalDonation: profileData.total_donation || 0,
          images: [],
        })
        setIsLoading(false)
        return
      }

      if (rewardError) {
        console.error('vip_rewards 쿼리 에러:', {
          code: rewardError.code,
          message: rewardError.message,
          details: rewardError.details,
          hint: rewardError.hint,
        })
        throw new Error(`VIP 데이터 조회 실패: ${rewardError.message || rewardError.code || 'Unknown error'}`)
      }

      // VIP 이미지 조회
      const { data: images } = await withRetry(async () =>
        await supabase
          .from('vip_images')
          .select('id, image_url, title, order_index')
          .eq('reward_id', reward.id)
          .order('order_index', { ascending: true })
      )

      // Supabase returns joined data - handle both array and object cases
      const profileData = reward.profiles
      const profile = Array.isArray(profileData)
        ? profileData[0] as { nickname: string; avatar_url: string | null; total_donation: number } | undefined
        : profileData as { nickname: string; avatar_url: string | null; total_donation: number } | null

      const seasonData = reward.seasons
      const season = Array.isArray(seasonData)
        ? seasonData[0] as { name: string } | undefined
        : seasonData as { name: string } | null

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
        images: (images || []).map((img) => ({
          id: img.id,
          imageUrl: img.image_url,
          title: img.title || '',
          orderIndex: img.order_index,
        })),
      })
    } catch (err) {
      // 에러 상세 로깅
      const errorDetails = err instanceof Error
        ? { message: err.message, name: err.name, stack: err.stack }
        : typeof err === 'object' && err !== null
          ? { ...err, code: (err as { code?: string }).code, message: (err as { message?: string }).message }
          : { raw: String(err) }
      console.error('VIP 데이터 로드 실패:', errorDetails)
      setError('VIP 정보를 불러오는 데 실패했습니다.')
    }

    setIsLoading(false)
  }, [supabase, profileId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}
