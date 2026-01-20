'use client'

/**
 * VIP 프로필 데이터 Hook
 *
 * VIP 개인 페이지에서 사용하는 데이터 조회
 * - Mock 모드: mockVipRewardsDB, mockVipImages, mockProfiles 사용
 * - 실서비스: Supabase에서 직접 조회
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuthContext, useSupabaseContext } from '@/lib/context'
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
  const { user, isLoading: authLoading } = useAuthContext()
  const [data, setData] = useState<VipRewardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (authLoading) {
        return
      }

      if (!user) {
        setData(null)
        setError('로그인이 필요합니다.')
        setIsLoading(false)
        return
      }

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

      // vip_rewards에 데이터가 없으면 프로필/후원 데이터에서 직접 조회 (Fallback)
      if (rewardError && (rewardError.code === 'PGRST116' || rewardError.code === '42501')) {
        // 프로필 조회
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, nickname, avatar_url, total_donation, unit')
          .eq('id', profileId)
          .single()

        if (!profileData) {
          setError('프로필 정보를 찾을 수 없습니다.')
          setIsLoading(false)
          return
        }

        // 현재 시즌 조회
        const { data: currentSeason } = await supabase
          .from('seasons')
          .select('id, name')
          .eq('is_active', true)
          .single()

        // 후원 랭킹에서 순위 계산
        const { data: rankingData } = await supabase
          .from('donations')
          .select('donor_id, amount')

        let rank = 0
        if (rankingData) {
          const totals = rankingData.reduce((acc, d) => {
            if (d.donor_id) {
              acc[d.donor_id] = (acc[d.donor_id] || 0) + d.amount
            }
            return acc
          }, {} as Record<string, number>)

          const sortedDonors = Object.entries(totals)
            .sort(([, a], [, b]) => b - a)
            .map(([id], idx) => ({ id, rank: idx + 1 }))

          const found = sortedDonors.find(d => d.id === profileId)
          rank = found?.rank || 0
        }

        // Top 50 이내가 아니면 에러
        if (rank === 0 || rank > 50) {
          setError('VIP 자격이 없습니다. (Top 50 이내만 조회 가능)')
          setIsLoading(false)
          return
        }

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
        throw rewardError
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
      console.error('VIP 데이터 로드 실패:', err)
      setError('VIP 정보를 불러오는 데 실패했습니다.')
    }

    setIsLoading(false)
  }, [supabase, profileId, user, authLoading])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}
