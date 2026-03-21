'use server'

import { publicAction, type ActionResult } from './index'
import { createServiceRoleClient } from '@/lib/supabase/server'

// ==================== VIP 프로필 데이터 조회 (공개) ====================

export interface VipProfileData {
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

/**
 * VIP 프로필 데이터 조회 (공개 - 비로그인 사용자도 접근 가능)
 *
 * 왜? VIP 시그니처 이미지는 누구나 볼 수 있어야 함.
 * BJ 감사 콘텐츠는 별도 API에서 권한 제어함.
 *
 * 변경 이력:
 * - 2026-02-03: vip_clickable_profiles View 체크 추가
 *   시그니처 자격자(11명)만 VIP 개인페이지 접근 가능
 */
export async function getVipProfileData(
  profileId: string
): Promise<ActionResult<VipProfileData | null>> {
  return publicAction(async (supabase) => {
    // 1단계: VIP 클릭 자격 확인 (signature_eligibility 기반)
    // vip_clickable_profiles View에 없으면 VIP 페이지 접근 불가
    const { data: vipEligible, error: eligibleError } = await supabase
      .from('vip_clickable_profiles')
      .select('profile_id')
      .eq('profile_id', profileId)
      .maybeSingle()

    // VIP 자격이 없으면 null 반환 (404 처리됨)
    if (eligibleError || !vipEligible) {
      return null
    }

    // VIP reward 조회
    const { data: reward, error: rewardError } = await supabase
      .from('vip_rewards')
      .select(
        `
        id,
        profile_id,
        rank,
        personal_message,
        dedication_video_url,
        season_id,
        profiles:profile_id (nickname, avatar_url, total_donation),
        seasons:season_id (name)
      `
      )
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // vip_rewards에 데이터가 없으면 프로필/랭킹 데이터에서 직접 조회 (Fallback)
    if (rewardError && (rewardError.code === 'PGRST116' || rewardError.code === '42501')) {
      // 병렬 쿼리: 프로필, 시즌 데이터 동시 조회
      const [profileResult, seasonResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, nickname, avatar_url, total_donation, unit')
          .eq('id', profileId)
          .single(),
        supabase.from('seasons').select('id, name').eq('is_active', true).single(),
      ])

      const profileData = profileResult.data
      const currentSeason = seasonResult.data

      if (!profileData) {
        return null
      }

      // 닉네임으로 종합/시즌 랭킹 모두 조회
      let totalRank: number | null = null
      let seasonRank: number | null = null

      if (profileData.nickname) {
        const [totalResult, seasonRankResult] = await Promise.all([
          // 종합 랭킹 조회
          supabase
            .from('total_rankings_public')
            .select('rank')
            .eq('donor_name', profileData.nickname)
            .single(),
          // 시즌 랭킹 조회
          currentSeason?.id
            ? supabase
                .from('season_rankings_public')
                .select('rank')
                .eq('season_id', currentSeason.id)
                .eq('donor_name', profileData.nickname)
                .single()
            : Promise.resolve({ data: null }),
        ])

        totalRank = totalResult.data?.rank || null
        seasonRank = seasonRankResult.data?.rank || null
      }

      // Fallback 데이터 반환
      return {
        id: 0,
        profileId: profileData.id,
        nickname: profileData.nickname || '알 수 없음',
        avatarUrl: profileData.avatar_url || null,
        rank: totalRank || seasonRank || 0,
        totalRank,
        seasonRank,
        personalMessage: null,
        dedicationVideoUrl: null,
        seasonName: currentSeason?.name || '',
        viewerScore: (profileData.total_donation || 0) * 50,
        images: [],
      }
    }

    if (rewardError) {
      throw new Error(`VIP 데이터 조회 실패: ${rewardError.message}`)
    }

    // VIP 이미지 조회 - RLS 우회를 위해 service role 클라이언트 사용
    // 왜? vip_images는 공개 조회가 필요하지만 RLS 정책이 없어서 anon key로 조회 불가
    const serviceClient = createServiceRoleClient()
    const { data: images } = await serviceClient
      .from('vip_images')
      .select('id, image_url, title, order_index')
      .eq('reward_id', reward.id)
      .order('order_index', { ascending: true })

    // Supabase returns joined data - handle both array and object cases
    const profileData = reward.profiles
    const profile = Array.isArray(profileData)
      ? (profileData[0] as
          | { nickname: string; avatar_url: string | null; total_donation: number }
          | undefined)
      : (profileData as {
          nickname: string
          avatar_url: string | null
          total_donation: number
        } | null)

    const seasonData = reward.seasons
    const season = Array.isArray(seasonData)
      ? (seasonData[0] as { name: string } | undefined)
      : (seasonData as { name: string } | null)

    // 닉네임으로 종합/시즌 랭킹 조회
    let totalRank: number | null = null
    let seasonRank: number | null = null

    if (profile?.nickname) {
      const [totalResult, seasonRankResult] = await Promise.all([
        // 종합 랭킹 조회
        supabase
          .from('total_rankings_public')
          .select('rank')
          .eq('donor_name', profile.nickname)
          .single(),
        // 시즌 랭킹 조회 (현재 시즌)
        reward.season_id
          ? supabase
              .from('season_rankings_public')
              .select('rank')
              .eq('season_id', reward.season_id)
              .eq('donor_name', profile.nickname)
              .single()
          : Promise.resolve({ data: null }),
      ])

      totalRank = totalResult.data?.rank || null
      seasonRank = seasonRankResult.data?.rank || null
    }

    return {
      id: reward.id,
      profileId: reward.profile_id,
      nickname: profile?.nickname || '알 수 없음',
      avatarUrl: profile?.avatar_url || null,
      rank: reward.rank,
      totalRank,
      seasonRank,
      personalMessage: reward.personal_message,
      dedicationVideoUrl: reward.dedication_video_url,
      seasonName: season?.name || '',
      viewerScore: (profile?.total_donation || 0) * 50,
      images: (images || []).map((img) => ({
        id: img.id,
        imageUrl: img.image_url,
        title: img.title || '',
        orderIndex: img.order_index,
      })),
    }
  })
}
