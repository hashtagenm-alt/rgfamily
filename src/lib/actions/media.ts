'use server'

import { adminAction, publicAction, type ActionResult } from './index'
import { deleteVideo } from '@/lib/cloudflare'
import type { InsertTables, UpdateTables, MediaContent } from '@/types/database'

type MediaInsert = InsertTables<'media_content'>
type MediaUpdate = UpdateTables<'media_content'>

/**
 * 미디어 콘텐츠 생성
 */
export async function createMediaContent(
  data: MediaInsert
): Promise<ActionResult<MediaContent>> {
  return adminAction(async (supabase) => {
    const { data: media, error } = await supabase
      .from('media_content')
      .insert(data)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return media
  }, ['/admin/media', '/'])
}

/**
 * 미디어 콘텐츠 수정
 */
export async function updateMediaContent(
  id: number,
  data: MediaUpdate
): Promise<ActionResult<MediaContent>> {
  return adminAction(async (supabase) => {
    const { data: media, error } = await supabase
      .from('media_content')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return media
  }, ['/admin/media', '/'])
}

/**
 * 미디어 콘텐츠 삭제
 * Cloudflare Stream 영상이 있으면 함께 삭제
 */
export async function deleteMediaContent(
  id: number
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    // 먼저 cloudflare_uid 확인
    const { data: existing } = await supabase
      .from('media_content')
      .select('cloudflare_uid')
      .eq('id', id)
      .single()

    // Cloudflare Stream 영상 삭제 (실패해도 DB 삭제는 진행)
    if (existing?.cloudflare_uid) {
      try {
        await deleteVideo(existing.cloudflare_uid)
      } catch (e) {
        console.error('Cloudflare Stream 영상 삭제 실패:', e)
      }
    }

    const { error } = await supabase
      .from('media_content')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  }, ['/admin/media', '/'])
}

/**
 * Featured 토글
 */
export async function toggleMediaFeatured(
  id: number,
  isFeatured: boolean
): Promise<ActionResult<MediaContent>> {
  return adminAction(async (supabase) => {
    const { data: media, error } = await supabase
      .from('media_content')
      .update({ is_featured: isFeatured })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return media
  }, ['/admin/media', '/'])
}

/**
 * Shorts 목록 조회 (공개)
 */
export async function getShorts(options?: {
  unit?: 'excel' | 'crew'
  featured?: boolean
  limit?: number
}): Promise<ActionResult<MediaContent[]>> {
  return publicAction(async (supabase) => {
    let query = supabase
      .from('media_content')
      .select('*')
      .eq('content_type', 'shorts')
      .order('created_at', { ascending: false })

    if (options?.unit) {
      query = query.eq('unit', options.unit)
    }
    if (options?.featured) {
      query = query.eq('is_featured', true)
    }
    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    return data || []
  })
}

/**
 * VOD 목록 조회 (공개)
 * parent_id가 없는 항목만 반환 (대표 항목 또는 단일 영상)
 *
 * 변경 이력:
 * - 2026-02-03: sortBy 옵션 추가 (title_asc로 회차 오름차순 정렬 지원)
 */
export async function getVODs(options?: {
  unit?: 'excel' | 'crew'
  featured?: boolean
  limit?: number
  sortBy?: 'created_at_desc' | 'title_asc'
}): Promise<ActionResult<MediaContent[]>> {
  return publicAction(async (supabase) => {
    // 기본 정렬: title_asc (회차 오름차순)
    const sortBy = options?.sortBy || 'title_asc'

    let query = supabase
      .from('media_content')
      .select('*')
      .eq('content_type', 'vod')
      .is('parent_id', null)  // 대표 항목만 (파트 1 또는 단일 영상)

    // 정렬 옵션
    if (sortBy === 'title_asc') {
      query = query.order('title', { ascending: true })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    if (options?.unit) {
      query = query.eq('unit', options.unit)
    }
    if (options?.featured) {
      query = query.eq('is_featured', true)
    }
    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    return data || []
  })
}

/**
 * VOD 파트 목록 조회 (연속 재생용)
 * parent_id로 연결된 모든 파트를 part_number 순서대로 반환
 */
export async function getVODParts(parentId: number): Promise<ActionResult<MediaContent[]>> {
  return publicAction(async (supabase) => {
    // 대표 항목 (Part 1) 조회
    const { data: parent, error: parentError } = await supabase
      .from('media_content')
      .select('*')
      .eq('id', parentId)
      .single()

    if (parentError) throw new Error(parentError.message)
    if (!parent) throw new Error('영상을 찾을 수 없습니다')

    // 단일 영상인 경우
    if (parent.total_parts <= 1) {
      return [parent]
    }

    // 자식 파트들 조회
    const { data: children, error: childrenError } = await supabase
      .from('media_content')
      .select('*')
      .eq('parent_id', parentId)
      .order('part_number', { ascending: true })

    if (childrenError) throw new Error(childrenError.message)

    // Part 1 + 나머지 파트 합치기
    return [parent, ...(children || [])]
  })
}

/**
 * Featured 미디어 조회 (공개)
 */
export async function getFeaturedMedia(
  contentType: 'shorts' | 'vod',
  limit: number = 6
): Promise<ActionResult<MediaContent[]>> {
  if (contentType === 'shorts') {
    return getShorts({ featured: true, limit })
  }
  return getVODs({ featured: true, limit })
}

/**
 * 모든 미디어 조회 (Admin)
 */
export async function getAllMediaContent(options?: {
  contentType?: 'shorts' | 'vod'
  page?: number
  limit?: number
}): Promise<ActionResult<{ data: MediaContent[]; count: number }>> {
  return adminAction(async (supabase) => {
    const { contentType, page = 1, limit = 20 } = options || {}
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('media_content')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (contentType) {
      query = query.eq('content_type', contentType)
    }

    const { data, error, count } = await query

    if (error) throw new Error(error.message)
    return { data: data || [], count: count || 0 }
  })
}
