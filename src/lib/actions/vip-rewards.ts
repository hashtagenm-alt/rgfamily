'use server'

import { adminAction, publicAction, type ActionResult } from './index'
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
 */
export async function getVipImagesByRewardId(
  rewardId: number
): Promise<ActionResult<VipImage[]>> {
  return publicAction(async (supabase) => {
    const { data, error } = await supabase
      .from('vip_images')
      .select('*')
      .eq('reward_id', rewardId)
      .order('order_index', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
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
