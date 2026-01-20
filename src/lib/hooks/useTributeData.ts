'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSupabaseContext, useAuthContext } from '@/lib/context'
import { USE_MOCK_DATA } from '@/lib/config'
import {
  mockProfiles,
  mockVipRewards,
  getVipRewardByProfileId,
  getHallOfFameByUserId,
  type HallOfFameHonor,
} from '@/lib/mock'
import {
  checkTributePageAccess,
  type AccessDeniedReason,
} from '@/lib/auth/access-control'

export interface UseTributeDataOptions {
  userId: string
}

export interface UseTributeDataReturn {
  hallOfFameData: HallOfFameHonor[] | null
  primaryHonor: HallOfFameHonor | null
  isLoading: boolean
  authLoading: boolean
  accessDenied: AccessDeniedReason | null
  isContentRestricted: boolean // 콘텐츠 블러 처리 필요 여부
  refetch: () => Promise<void>
}

export function useTributeData({ userId }: UseTributeDataOptions): UseTributeDataReturn {
  const supabase = useSupabaseContext()
  const { user, profile, isLoading: authLoading } = useAuthContext()
  const [hallOfFameData, setHallOfFameData] = useState<HallOfFameHonor[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState<AccessDeniedReason | null>(null)
  const [isContentRestricted, setIsContentRestricted] = useState(true)

  // 접근 제어 확인 - 페이지 진입은 항상 허용, 콘텐츠만 제한
  useEffect(() => {
    if (authLoading) return

    // Admin은 모든 콘텐츠 접근 가능
    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'
    if (isAdmin) {
      setIsContentRestricted(false)
      setAccessDenied(null)
      return
    }

    // 본인 페이지인 경우 콘텐츠 접근 가능
    const isOwner = user?.id === userId
    if (isOwner) {
      setIsContentRestricted(false)
      setAccessDenied(null)
      return
    }

    // 그 외 - 페이지 진입은 허용하되 콘텐츠는 블러 처리
    setIsContentRestricted(true)
    setAccessDenied(null)
  }, [userId, user, profile, authLoading])

  const fetchTributeData = useCallback(async () => {
    // 접근 거부 상태면 데이터 로드 스킵
    if (accessDenied) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    // Mock 데이터 모드
    if (USE_MOCK_DATA) {
      // 명예의 전당 데이터 확인 (시즌 TOP 3 + 회차별 고액 후원자)
      const hofData = getHallOfFameByUserId(userId)
      if (hofData && hofData.length > 0) {
        setHallOfFameData(hofData)
        setIsLoading(false)
        return
      }

      // 일반 VIP 데이터 (fallback)
      const mockProfile = mockProfiles.find(p => p.id === userId) || mockProfiles[0]
      const mockReward = getVipRewardByProfileId(userId) || mockVipRewards[0]

      // 일반 VIP도 HallOfFame 형식으로 변환
      const fallbackHofData: HallOfFameHonor[] = [{
        id: `fallback-${mockProfile.id}`,
        donorId: mockProfile.id,
        donorName: mockProfile.nickname,
        donorAvatar: mockProfile.avatar_url || '',
        honorType: 'season_top3',
        rank: mockReward?.rank || 1,
        seasonId: 4,
        seasonName: '시즌 4',
        amount: mockProfile.total_donation,
        unit: mockProfile.unit as 'excel' | 'crew' | null,
        tributeMessage: mockReward?.personalMessage ?? undefined,
        tributeVideoUrl: mockReward?.dedicationVideoUrl ?? undefined,
        tributeImageUrl: mockReward?.giftImages?.[0]?.url,
        createdAt: new Date().toISOString(),
      }]
      setHallOfFameData(fallbackHofData)
      setIsLoading(false)
      return
    }

    // Supabase 모드
    try {
      const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'

      // 시즌 TOP 3 보상 데이터 + 프로필 + 시즌 + 이미지
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('vip_rewards')
        .select(`
          id,
          profile_id,
          season_id,
          rank,
          personal_message,
          dedication_video_url,
          created_at,
          profiles:profile_id (
            id,
            nickname,
            avatar_url,
            total_donation,
            unit
          ),
          seasons:season_id (
            id,
            name
          ),
          vip_images (
            image_url,
            order_index
          )
        `)
        .eq('profile_id', userId)
        .lte('rank', 3)
        .order('created_at', { ascending: false })

      if (rewardsError) {
        // 테이블이 없거나 권한 문제 시 mock 데이터로 fallback
        console.warn('VIP 보상 테이블 조회 실패, mock 데이터로 대체:', rewardsError.message || rewardsError)

        // Mock 데이터로 fallback
        const mockProfile = mockProfiles.find(p => p.id === userId) || mockProfiles[0]
        const mockReward = getVipRewardByProfileId(userId) || mockVipRewards[0]

        if (mockProfile && mockReward) {
          const fallbackHofData: HallOfFameHonor[] = [{
            id: `fallback-${mockProfile.id}`,
            donorId: mockProfile.id,
            donorName: mockProfile.nickname,
            donorAvatar: mockProfile.avatar_url || '',
            honorType: 'season_top3',
            rank: mockReward?.rank || 1,
            seasonId: 4,
            seasonName: '시즌 4',
            amount: mockProfile.total_donation,
            unit: mockProfile.unit as 'excel' | 'crew' | null,
            tributeMessage: mockReward?.personalMessage ?? undefined,
            tributeVideoUrl: mockReward?.dedicationVideoUrl ?? undefined,
            tributeImageUrl: mockReward?.giftImages?.[0]?.url,
            createdAt: new Date().toISOString(),
          }]
          setHallOfFameData(fallbackHofData)
        }
        setIsLoading(false)
        return
      }

      // vip_rewards에 데이터가 없으면 donations/profiles에서 직접 조회 (Fallback)
      if (!rewardsData || rewardsData.length === 0) {
        // 프로필 조회
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, nickname, avatar_url, total_donation, unit')
          .eq('id', userId)
          .single()

        if (!profileData) {
          setAccessDenied(isAdmin ? 'page_not_found' : 'not_qualified')
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
          // 후원자별 총액 집계
          const totals = rankingData.reduce((acc, d) => {
            if (d.donor_id) {
              acc[d.donor_id] = (acc[d.donor_id] || 0) + d.amount
            }
            return acc
          }, {} as Record<string, number>)

          // 순위 계산
          const sortedDonors = Object.entries(totals)
            .sort(([, a], [, b]) => b - a)
            .map(([id], idx) => ({ id, rank: idx + 1 }))

          const found = sortedDonors.find(d => d.id === userId)
          rank = found?.rank || 0
        }

        // Top 50 이내가 아니면 접근 거부
        if (rank === 0 || rank > 50) {
          setAccessDenied(isAdmin ? 'page_not_found' : 'not_qualified')
          setIsLoading(false)
          return
        }

        // Fallback 데이터 생성
        const fallbackHofData: HallOfFameHonor[] = [{
          id: `fallback-${profileData.id}`,
          donorId: profileData.id,
          donorName: profileData.nickname || '알 수 없음',
          donorAvatar: profileData.avatar_url || '',
          honorType: 'season_top3',
          rank: rank,
          seasonId: currentSeason?.id || 0,
          seasonName: currentSeason?.name || '',
          amount: profileData.total_donation || 0,
          unit: profileData.unit as 'excel' | 'crew' | null,
          createdAt: new Date().toISOString(),
        }]

        setHallOfFameData(fallbackHofData)
        setIsLoading(false)
        return
      }

      type ProfileJoin = {
        id: string
        nickname: string
        avatar_url: string | null
        total_donation: number
        unit: string | null
      }
      type SeasonJoin = { id: number; name: string }
      type VipImageJoin = { image_url: string; order_index: number }

      const hofData: HallOfFameHonor[] = rewardsData.map((reward) => {
        const profileData = reward.profiles as ProfileJoin | ProfileJoin[] | null
        const seasonData = reward.seasons as SeasonJoin | SeasonJoin[] | null
        const imageData = reward.vip_images as VipImageJoin[] | null
        const profileJoin = Array.isArray(profileData) ? profileData[0] : profileData
        const seasonJoin = Array.isArray(seasonData) ? seasonData[0] : seasonData
        const tributeImages = (imageData || [])
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
          .map((img) => img.image_url)

        return {
          id: `reward-${reward.id}`,
          donorId: reward.profile_id,
          donorName: profileJoin?.nickname || '알 수 없음',
          donorAvatar: profileJoin?.avatar_url || '',
          honorType: 'season_top3' as const,
          rank: reward.rank,
          seasonId: reward.season_id,
          seasonName: seasonJoin?.name || '',
          amount: profileJoin?.total_donation || 0,
          unit: profileJoin?.unit as 'excel' | 'crew' | null,
          tributeMessage: reward.personal_message || undefined,
          tributeVideoUrl: reward.dedication_video_url || undefined,
          tributeImages: tributeImages.length > 0 ? tributeImages : undefined,
          createdAt: reward.created_at,
        }
      })

      setHallOfFameData(hofData)
      setIsLoading(false)
    } catch (error) {
      console.error('Tribute 데이터 로드 실패:', error)
      setIsLoading(false)
    }
  }, [supabase, userId, accessDenied, profile])

  useEffect(() => {
    if (!authLoading && !accessDenied) {
      fetchTributeData()
    }
  }, [fetchTributeData, authLoading, accessDenied])

  const primaryHonor = hallOfFameData?.[0] ?? null

  return {
    hallOfFameData,
    primaryHonor,
    isLoading,
    authLoading,
    accessDenied,
    isContentRestricted,
    refetch: fetchTributeData,
  }
}
