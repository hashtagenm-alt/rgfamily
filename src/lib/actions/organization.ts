'use server'

import { adminAction, publicAction, type ActionResult } from './index'
import type { InsertTables, UpdateTables, Organization } from '@/types/database'

type OrganizationInsert = InsertTables<'organization'>
type OrganizationUpdate = UpdateTables<'organization'>

/**
 * 조직 멤버 생성
 */
export async function createOrganizationMember(
  data: OrganizationInsert
): Promise<ActionResult<Organization>> {
  return adminAction(async (supabase) => {
    const { data: member, error } = await supabase
      .from('organization')
      .insert(data)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return member
  }, ['/admin/organization', '/organization'])
}

/**
 * 조직 멤버 수정
 */
export async function updateOrganizationMember(
  id: number,
  data: OrganizationUpdate
): Promise<ActionResult<Organization>> {
  return adminAction(async (supabase) => {
    const { data: member, error } = await supabase
      .from('organization')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return member
  }, ['/admin/organization', '/organization'])
}

/**
 * 조직 멤버 삭제
 */
export async function deleteOrganizationMember(
  id: number
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    const { error } = await supabase
      .from('organization')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  }, ['/admin/organization', '/organization'])
}

/**
 * 라이브 상태 토글
 */
export async function toggleLiveStatus(
  id: number,
  isLive: boolean
): Promise<ActionResult<Organization>> {
  return adminAction(async (supabase) => {
    const { data: member, error } = await supabase
      .from('organization')
      .update({ is_live: isLive })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return member
  }, ['/admin/organization', '/organization', '/'])
}

/**
 * 조직도 순서 변경
 */
export async function updateOrganizationOrder(
  updates: { id: number; position_order: number }[]
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    for (const update of updates) {
      const { error } = await supabase
        .from('organization')
        .update({ position_order: update.position_order })
        .eq('id', update.id)

      if (error) throw new Error(error.message)
    }
    return null
  }, ['/admin/organization', '/organization'])
}

/**
 * 조직 멤버 목록 조회 (공개)
 */
export async function getOrganizationMembers(options?: {
  unit?: 'excel' | 'crew'
  activeOnly?: boolean
}): Promise<ActionResult<Organization[]>> {
  return publicAction(async (supabase) => {
    let query = supabase
      .from('organization')
      .select('*')
      .order('position_order', { ascending: true })

    if (options?.unit) {
      query = query.eq('unit', options.unit)
    }
    if (options?.activeOnly !== false) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    return data || []
  })
}

/**
 * 프로필 목록 조회 (멤버 연결용)
 */
export async function getProfilesForLinking(): Promise<ActionResult<{ id: string; nickname: string }[]>> {
  return adminAction(async (supabase) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname')
      .order('nickname')

    if (error) throw new Error(error.message)
    return data || []
  })
}

/**
 * 조직 멤버 삭제 전처리 (자식 parent_id null + live_status 삭제)
 */
export async function prepareOrgMemberDelete(
  memberId: number
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    // 1. 자식 멤버들의 parent_id를 null로 변경 (self-referencing FK)
    const { error: parentError } = await supabase
      .from('organization')
      .update({ parent_id: null })
      .eq('parent_id', memberId)

    if (parentError) throw new Error(`parent_id 업데이트 실패: ${parentError.message}`)

    // 2. 연관된 live_status 레코드 삭제 (FK 제약 조건)
    const { error: liveError } = await supabase
      .from('live_status')
      .delete()
      .eq('member_id', memberId)

    if (liveError) throw new Error(`live_status 삭제 실패: ${liveError.message}`)

    return null
  })
}

/**
 * 라이브 멤버 조회 (공개)
 */
export async function getLiveMembers(): Promise<ActionResult<Organization[]>> {
  return publicAction(async (supabase) => {
    const { data, error } = await supabase
      .from('organization')
      .select('*')
      .eq('is_live', true)
      .eq('is_active', true)
      .order('position_order', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
  })
}
