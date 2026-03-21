'use server'

import { adminAction, authAction, publicAction, type ActionResult } from './index'
import type { InsertTables, UpdateTables, VipReward } from '@/types/database'

type VipRewardInsert = InsertTables<'vip_rewards'>
type VipRewardUpdate = UpdateTables<'vip_rewards'>

// ==================== VIP Rewards CRUD ====================

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

/**
 * VIP 본인 소개글 수정 (본인만)
 * 왜? VIP 본인이 자신의 소개글을 수정할 수 있어야 함
 */
export async function updateVipPersonalMessage(
  rewardId: number,
  personalMessage: string
): Promise<ActionResult<VipReward>> {
  return authAction(async (supabase, userId) => {
    // 해당 VIP 보상이 본인 것인지 확인
    const { data: reward, error: fetchError } = await supabase
      .from('vip_rewards')
      .select('profile_id')
      .eq('id', rewardId)
      .single()

    if (fetchError) throw new Error('VIP 정보를 찾을 수 없습니다.')
    if (reward.profile_id !== userId) throw new Error('본인의 소개글만 수정할 수 있습니다.')

    // 소개글 업데이트
    const { data: updated, error } = await supabase
      .from('vip_rewards')
      .update({ personal_message: personalMessage.trim() || null })
      .eq('id', rewardId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return updated
  }, ['/ranking/vip'])
}

// ==================== VIP Admin 조회 (Admin Page용) ====================

/**
 * VIP 보상 목록 조회 (Admin) - 프로필/시즌 조인 포함
 * 왜? admin 페이지에서 닉네임, 시즌명을 함께 표시하기 위함
 */
export async function getVipRewardsWithJoins(): Promise<ActionResult<{
  id: number
  profileId: string
  nickname: string
  seasonId: number
  seasonName: string
  rank: number
  personalMessage: string
  dedicationVideoUrl: string
  createdAt: string
}[]>> {
  return adminAction(async (supabase) => {
    const { data, error } = await supabase
      .from('vip_rewards')
      .select(`
        id,
        profile_id,
        season_id,
        rank,
        personal_message,
        dedication_video_url,
        created_at,
        profiles:profile_id (nickname),
        seasons:season_id (name)
      `)
      .order('rank', { ascending: true })

    if (error) throw new Error(error.message)

    return (data || []).map((row) => {
      const profileData = row.profiles
      const profile = Array.isArray(profileData) ? profileData[0] : profileData
      const seasonData = row.seasons
      const season = Array.isArray(seasonData) ? seasonData[0] : seasonData
      return {
        id: row.id,
        profileId: row.profile_id,
        nickname: (profile as { nickname: string } | null)?.nickname || '',
        seasonId: row.season_id,
        seasonName: (season as { name: string } | null)?.name || '',
        rank: row.rank,
        personalMessage: row.personal_message || '',
        dedicationVideoUrl: row.dedication_video_url || '',
        createdAt: row.created_at,
      }
    })
  })
}

/**
 * VIP 프로필 목록 조회 (Admin) - VIP 역할 또는 후원 상위 100명
 * 왜? VIP 보상 추가 시 대상 사용자를 선택하기 위함
 */
export async function getVipProfiles(): Promise<ActionResult<{ id: string; nickname: string }[]>> {
  return adminAction(async (supabase) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname, role, total_donation')
      .or('role.eq.vip,total_donation.gt.0')
      .order('total_donation', { ascending: false })
      .limit(100)

    if (error) throw new Error(error.message)

    // VIP 우선 정렬, 그 외는 총 후원 순
    const sorted = (data || []).sort((a, b) => {
      if (a.role === 'vip' && b.role !== 'vip') return -1
      if (a.role !== 'vip' && b.role === 'vip') return 1
      return (b.total_donation || 0) - (a.total_donation || 0)
    })

    return sorted.map((p) => ({ id: p.id, nickname: p.nickname || '' }))
  })
}

/**
 * VIP 이미지 개수 조회 (Admin) - 보상 ID 목록에 대한 이미지 개수
 * 왜? 보상 목록 테이블에서 이미지 개수를 표시하기 위함
 */
export async function getVipImageCounts(
  rewardIds: number[]
): Promise<ActionResult<Record<number, number>>> {
  return adminAction(async (supabase) => {
    if (rewardIds.length === 0) return {}

    const { data, error } = await supabase
      .from('vip_images')
      .select('reward_id')
      .in('reward_id', rewardIds)

    if (error) throw new Error(error.message)

    const counts: Record<number, number> = {}
    rewardIds.forEach((id) => (counts[id] = 0))
    ;(data || []).forEach((img) => {
      counts[img.reward_id] = (counts[img.reward_id] || 0) + 1
    })
    return counts
  })
}
