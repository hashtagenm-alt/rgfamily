'use server'

import { moderatorAction, publicAction, type ActionResult } from './index'
import type { InsertTables, UpdateTables, Banner } from '@/types/database'

type BannerInsert = InsertTables<'banners'>
type BannerUpdate = UpdateTables<'banners'>

/**
 * 배너 생성
 */
export async function createBanner(
  data: BannerInsert
): Promise<ActionResult<Banner>> {
  return moderatorAction(async (supabase) => {
    const { data: banner, error } = await supabase
      .from('banners')
      .insert(data)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return banner
  }, ['/admin/banners', '/'])
}

/**
 * 배너 수정
 */
export async function updateBanner(
  id: number,
  data: BannerUpdate
): Promise<ActionResult<Banner>> {
  return moderatorAction(async (supabase) => {
    const { data: banner, error } = await supabase
      .from('banners')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return banner
  }, ['/admin/banners', '/'])
}

/**
 * 배너 삭제
 */
export async function deleteBanner(
  id: number
): Promise<ActionResult<null>> {
  return moderatorAction(async (supabase) => {
    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  }, ['/admin/banners', '/'])
}

/**
 * 배너 활성/비활성 토글
 */
export async function toggleBannerActive(
  id: number,
  isActive: boolean
): Promise<ActionResult<Banner>> {
  return moderatorAction(async (supabase) => {
    const { data: banner, error } = await supabase
      .from('banners')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return banner
  }, ['/admin/banners', '/'])
}

/**
 * 배너 순서 변경
 */
export async function updateBannerOrder(
  updates: { id: number; display_order: number }[]
): Promise<ActionResult<null>> {
  return moderatorAction(async (supabase) => {
    for (const update of updates) {
      const { error } = await supabase
        .from('banners')
        .update({ display_order: update.display_order })
        .eq('id', update.id)

      if (error) throw new Error(error.message)
    }
    return null
  }, ['/admin/banners', '/'])
}

/**
 * 활성 배너 목록 조회 (공개)
 */
export async function getActiveBanners(): Promise<ActionResult<Banner[]>> {
  return publicAction(async (supabase) => {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
  })
}

/**
 * 모든 배너 목록 조회 (Admin)
 */
export async function getAllBanners(): Promise<ActionResult<Banner[]>> {
  return moderatorAction(async (supabase) => {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
  })
}
