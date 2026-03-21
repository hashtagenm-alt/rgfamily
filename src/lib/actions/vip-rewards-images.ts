'use server'

import { adminAction, type ActionResult } from './index'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import type { InsertTables, UpdateTables, VipImage } from '@/types/database'

type VipImageInsert = InsertTables<'vip_images'>
type VipImageUpdate = UpdateTables<'vip_images'>

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
    logger.error('VIP Images Error', err)
    return {
      data: null,
      error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
    }
  }
}
