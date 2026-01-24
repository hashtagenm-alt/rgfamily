'use server'

import { adminAction, publicAction, type ActionResult } from './index'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { InsertTables, UpdateTables, VipReward, VipImage } from '@/types/database'

type VipRewardInsert = InsertTables<'vip_rewards'>
type VipRewardUpdate = UpdateTables<'vip_rewards'>
type VipImageInsert = InsertTables<'vip_images'>
type VipImageUpdate = UpdateTables<'vip_images'>

// ==================== VIP Rewards ====================

/**
 * VIP 보상 생성
 */
export async function createVipReward(
  data: VipRewardInsert
): Promise<ActionResult<VipReward>> {
  return adminAction(async (supabase) => {
    const { data: reward, error } = await supabase
      .from('vip_rewards')
      .insert(data)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return reward
  }, ['/admin/vip-rewards', '/ranking/vip'])
}

/**
 * VIP 보상 수정
 */
export async function updateVipReward(
  id: number,
  data: VipRewardUpdate
): Promise<ActionResult<VipReward>> {
  return adminAction(async (supabase) => {
    const { data: reward, error } = await supabase
      .from('vip_rewards')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return reward
  }, ['/admin/vip-rewards', '/ranking/vip'])
}

/**
 * VIP 보상 삭제 (관련 이미지도 CASCADE 삭제)
 */
export async function deleteVipReward(
  id: number
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    const { error } = await supabase
      .from('vip_rewards')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  }, ['/admin/vip-rewards', '/ranking/vip'])
}

/**
 * VIP 보상 목록 조회 (Admin)
 */
export async function getVipRewards(options?: {
  seasonId?: number
  profileId?: string
  episodeId?: number
}): Promise<ActionResult<VipReward[]>> {
  return adminAction(async (supabase) => {
    let query = supabase
      .from('vip_rewards')
      .select('*')
      .order('rank', { ascending: true })

    if (options?.seasonId) {
      query = query.eq('season_id', options.seasonId)
    }
    if (options?.profileId) {
      query = query.eq('profile_id', options.profileId)
    }
    if (options?.episodeId) {
      query = query.eq('episode_id', options.episodeId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    return data || []
  })
}

/**
 * 사용자의 VIP 보상 조회 (공개 - 본인 또는 공개 데이터)
 */
export async function getVipRewardByProfile(
  profileId: string,
  seasonId?: number
): Promise<ActionResult<VipReward | null>> {
  return publicAction(async (supabase) => {
    let query = supabase
      .from('vip_rewards')
      .select('*')
      .eq('profile_id', profileId)

    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    const { data, error } = await query.order('season_id', { ascending: false }).limit(1).single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message)
    }
    return data
  })
}

/**
 * Top N VIP 보상 조회 (공개)
 */
export async function getTopVipRewards(
  seasonId: number,
  limit: number = 3
): Promise<ActionResult<VipReward[]>> {
  return publicAction(async (supabase) => {
    const { data, error } = await supabase
      .from('vip_rewards')
      .select('*')
      .eq('season_id', seasonId)
      .order('rank', { ascending: true })
      .limit(limit)

    if (error) throw new Error(error.message)
    return data || []
  })
}

// ==================== VIP Images ====================

/**
 * VIP 이미지 추가
 */
export async function createVipImage(
  data: VipImageInsert
): Promise<ActionResult<VipImage>> {
  return adminAction(async (supabase) => {
    const { data: image, error } = await supabase
      .from('vip_images')
      .insert(data)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return image
  }, ['/admin/vip-rewards'])
}

/**
 * VIP 이미지 수정
 */
export async function updateVipImage(
  id: number,
  data: VipImageUpdate
): Promise<ActionResult<VipImage>> {
  return adminAction(async (supabase) => {
    const { data: image, error } = await supabase
      .from('vip_images')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return image
  }, ['/admin/vip-rewards'])
}

/**
 * VIP 이미지 삭제
 */
export async function deleteVipImage(
  id: number
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    const { error } = await supabase
      .from('vip_images')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  }, ['/admin/vip-rewards'])
}

/**
 * VIP 이미지 순서 변경
 */
export async function updateVipImageOrder(
  updates: { id: number; order_index: number }[]
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    for (const update of updates) {
      const { error } = await supabase
        .from('vip_images')
        .update({ order_index: update.order_index })
        .eq('id', update.id)

      if (error) throw new Error(error.message)
    }
    return null
  }, ['/admin/vip-rewards'])
}

/**
 * VIP 보상의 이미지 목록 조회 (공개)
 * 왜? VIP 시그니처 이미지는 비로그인 사용자도 볼 수 있어야 함
 * RLS 우회를 위해 service role 클라이언트 사용
 */
export async function getVipImagesByRewardId(
  rewardId: number
): Promise<ActionResult<VipImage[]>> {
  try {
    const serviceClient = createServiceRoleClient()
    const { data, error } = await serviceClient
      .from('vip_images')
      .select('*')
      .eq('reward_id', rewardId)
      .order('order_index', { ascending: true })

    if (error) throw new Error(error.message)
    return { data: data || [], error: null }
  } catch (err) {
    console.error('VIP Images Error:', err)
    return {
      data: null,
      error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
    }
  }
}

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
  totalDonation: number
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
 */
export async function getVipProfileData(
  profileId: string
): Promise<ActionResult<VipProfileData | null>> {
  return publicAction(async (supabase) => {
    // VIP reward 조회
    const { data: reward, error: rewardError } = await supabase
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
        return null
      }

      // 닉네임으로 종합/시즌 랭킹 모두 조회
      let totalRank: number | null = null
      let seasonRank: number | null = null

      if (profileData.nickname) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [totalResult, seasonRankResult] = await Promise.all([
          // 종합 랭킹 조회
          (supabase as any)
            .from('total_rankings_public')
            .select('rank')
            .eq('donor_name', profileData.nickname)
            .single(),
          // 시즌 랭킹 조회
          currentSeason?.id
            ? (supabase as any)
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
        totalDonation: profileData.total_donation || 0,
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
      ? profileData[0] as { nickname: string; avatar_url: string | null; total_donation: number } | undefined
      : profileData as { nickname: string; avatar_url: string | null; total_donation: number } | null

    const seasonData = reward.seasons
    const season = Array.isArray(seasonData)
      ? seasonData[0] as { name: string } | undefined
      : seasonData as { name: string } | null

    // 닉네임으로 종합/시즌 랭킹 조회
    let totalRank: number | null = null
    let seasonRank: number | null = null

    if (profile?.nickname) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [totalResult, seasonRankResult] = await Promise.all([
        // 종합 랭킹 조회
        (supabase as any)
          .from('total_rankings_public')
          .select('rank')
          .eq('donor_name', profile.nickname)
          .single(),
        // 시즌 랭킹 조회 (현재 시즌)
        reward.season_id
          ? (supabase as any)
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
      totalDonation: profile?.total_donation || 0,
      images: (images || []).map((img) => ({
        id: img.id,
        imageUrl: img.image_url,
        title: img.title || '',
        orderIndex: img.order_index,
      })),
    }
  })
}

// ==================== Timeline Events (VIP related) ====================

/**
 * 타임라인 이벤트 생성
 */
export async function createTimelineEvent(
  data: InsertTables<'timeline_events'>
): Promise<ActionResult<unknown>> {
  return adminAction(async (supabase) => {
    const { data: event, error } = await supabase
      .from('timeline_events')
      .insert(data)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return event
  }, ['/admin/timeline', '/timeline'])
}

/**
 * 타임라인 이벤트 수정
 */
export async function updateTimelineEvent(
  id: number,
  data: UpdateTables<'timeline_events'>
): Promise<ActionResult<unknown>> {
  return adminAction(async (supabase) => {
    const { data: event, error } = await supabase
      .from('timeline_events')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return event
  }, ['/admin/timeline', '/timeline'])
}

/**
 * 타임라인 이벤트 삭제
 */
export async function deleteTimelineEvent(
  id: number
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    const { error } = await supabase
      .from('timeline_events')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  }, ['/admin/timeline', '/timeline'])
}

/**
 * 타임라인 이벤트 목록 조회 (공개)
 */
export async function getTimelineEvents(options?: {
  seasonId?: number
  category?: string
}): Promise<ActionResult<unknown[]>> {
  return publicAction(async (supabase) => {
    let query = supabase
      .from('timeline_events')
      .select('*')
      .order('event_date', { ascending: false })

    if (options?.seasonId) {
      query = query.eq('season_id', options.seasonId)
    }
    if (options?.category) {
      query = query.eq('category', options.category)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    return data || []
  })
}
