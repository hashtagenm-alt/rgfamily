'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { authAction, adminAction, publicAction, type ActionResult } from './index'
import type { InsertTables, UpdateTables, BjThankYouMessage } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type BjMessageInsert = InsertTables<'bj_thank_you_messages'>
type BjMessageUpdate = UpdateTables<'bj_thank_you_messages'>

// BJ 멤버 정보 타입
export interface BjMemberInfo {
  orgId: number
  name: string
  imageUrl: string | null
}

// 메시지 with 멤버 정보 타입
export interface BjMessageWithMember extends BjThankYouMessage {
  bj_member?: {
    name: string
    image_url: string | null
  }
  // 비공개 메시지 여부 (UI에서 잠금 아이콘 표시용)
  is_private_for_viewer?: boolean
  // 비공개 콘텐츠 열람 가능 여부
  canViewContent: boolean
}

// ==================== BJ 멤버 확인 ====================

/**
 * BJ 멤버 여부 확인 및 정보 조회
 */
export async function checkBjMemberStatus(): Promise<
  ActionResult<{ isBjMember: boolean; bjMemberId: number | null; bjMemberInfo: BjMemberInfo | null }>
> {
  return authAction(async (supabase, userId) => {
    const { data: orgData, error } = await supabase
      .from('organization')
      .select('id, name, image_url')
      .eq('profile_id', userId)
      .eq('is_active', true)
      .single()

    if (error || !orgData) {
      return {
        isBjMember: false,
        bjMemberId: null,
        bjMemberInfo: null,
      }
    }

    return {
      isBjMember: true,
      bjMemberId: orgData.id,
      bjMemberInfo: {
        orgId: orgData.id,
        name: orgData.name,
        imageUrl: orgData.image_url,
      },
    }
  })
}

// ==================== 메시지 조회 ====================

/**
 * 특정 VIP의 BJ 감사 메시지 조회
 * - 로그인한 모든 사용자 조회 가능
 * - 공개 메시지: 모든 로그인 사용자에게 전체 내용 표시
 * - 비공개 메시지: 모든 사용자에게 반환되지만, canViewContent 플래그로 열람 권한 구분
 *   - canViewContent=true: VIP 본인, 작성자 BJ, 관리자
 *   - canViewContent=false: 일반 사용자 (제목/썸네일만 표시, 블러 처리)
 */
export async function getBjMessagesByVipId(
  vipProfileId: string
): Promise<ActionResult<BjMessageWithMember[]>> {
  return authAction(async (supabase, userId) => {
    // 사용자 정보 조회 (role 및 organization 체크)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    // 현재 사용자의 organization ID 조회 (BJ 멤버인지 확인)
    const { data: orgData } = await supabase
      .from('organization')
      .select('id')
      .eq('profile_id', userId)
      .eq('is_active', true)
      .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'
    const isOwner = userId === vipProfileId
    const userBjMemberId = orgData?.id || null

    // 모든 로그인 사용자가 조회 가능 (권한 체크 제거)

    const { data, error } = await supabase
      .from('bj_thank_you_messages')
      .select(`
        *,
        organization:bj_member_id (
          name,
          image_url,
          profile_id
        )
      `)
      .eq('vip_profile_id', vipProfileId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    // 데이터 변환 (비공개 메시지도 반환, canViewContent 플래그로 권한 구분)
    const messages: BjMessageWithMember[] = []

    for (const msg of data || []) {
      const orgInfo = msg.organization
      const org = Array.isArray(orgInfo) ? orgInfo[0] : orgInfo

      // 비공개 메시지 열람 권한 체크
      // - 관리자: 모든 메시지 열람 가능
      // - VIP 본인: 모든 메시지 열람 가능
      // - BJ 멤버: 본인이 작성한 메시지만 열람 가능 (비공개인 경우)
      const isAuthor = userBjMemberId === msg.bj_member_id
      const canViewPrivateContent = isAdmin || isOwner || isAuthor

      // 공개 메시지는 모든 사용자가 열람 가능
      // 비공개 메시지는 canViewPrivateContent가 true인 경우만 열람 가능
      const canViewContent = msg.is_public || canViewPrivateContent

      // 비공개 + 권한 없음인 경우 콘텐츠는 제거 (방어적 처리)
      const safeContentText = canViewContent ? msg.content_text : null
      const safeContentUrl = canViewContent ? msg.content_url : null

      messages.push({
        id: msg.id,
        vip_profile_id: msg.vip_profile_id,
        bj_member_id: msg.bj_member_id,
        message_type: msg.message_type as 'text' | 'image' | 'video',
        content_text: safeContentText,
        content_url: safeContentUrl,
        is_public: msg.is_public,
        is_deleted: msg.is_deleted,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        bj_member: org
          ? {
              name: org.name,
              image_url: org.image_url,
            }
          : undefined,
        // 비공개 메시지임을 UI에서 표시하기 위한 플래그
        is_private_for_viewer: !msg.is_public,
        // 비공개 콘텐츠 열람 가능 여부
        canViewContent,
      })
    }

    return messages
  })
}

/**
 * 특정 BJ가 작성한 메시지 조회 (본인 작성글)
 * - BJ 본인이 작성한 메시지는 항상 열람 가능
 */
export async function getBjMessagesByBjMember(): Promise<ActionResult<BjMessageWithMember[]>> {
  return authAction(async (supabase, userId) => {
    // 현재 사용자의 organization ID 조회
    const { data: orgData, error: orgError } = await supabase
      .from('organization')
      .select('id')
      .eq('profile_id', userId)
      .eq('is_active', true)
      .single()

    if (orgError || !orgData) {
      throw new Error('BJ 멤버가 아닙니다.')
    }

    const { data, error } = await supabase
      .from('bj_thank_you_messages')
      .select(`
        *,
        profiles:vip_profile_id (nickname)
      `)
      .eq('bj_member_id', orgData.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    // BJ 본인이 작성한 메시지는 항상 열람 가능
    return (data || []).map((msg) => ({
      ...msg,
      message_type: msg.message_type as 'text' | 'image' | 'video',
      canViewContent: true,
    })) as BjMessageWithMember[]
  })
}

// ==================== 메시지 작성 ====================

/**
 * BJ 감사 메시지 작성
 * - BJ 멤버만 작성 가능
 * - isPublic: true=공개(기본), false=비공개(VIP본인+작성자만)
 */
export async function createBjMessage(data: {
  vipProfileId: string
  messageType: 'text' | 'image' | 'video'
  contentText?: string
  contentUrl?: string
  isPublic?: boolean
}): Promise<ActionResult<BjThankYouMessage>> {
  return authAction(async (supabase, userId) => {
    // BJ 멤버 확인
    const { data: orgData, error: orgError } = await supabase
      .from('organization')
      .select('id, name')
      .eq('profile_id', userId)
      .eq('is_active', true)
      .single()

    if (orgError || !orgData) {
      throw new Error('BJ 멤버만 메시지를 작성할 수 있습니다.')
    }

    // VIP 프로필 존재 확인
    const { data: vipProfile, error: vipError } = await supabase
      .from('profiles')
      .select('id, nickname')
      .eq('id', data.vipProfileId)
      .single()

    if (vipError || !vipProfile) {
      throw new Error('VIP 프로필을 찾을 수 없습니다.')
    }

    // 메시지 생성 (isPublic 기본값: true)
    const { data: message, error } = await supabase
      .from('bj_thank_you_messages')
      .insert({
        vip_profile_id: data.vipProfileId,
        bj_member_id: orgData.id,
        message_type: data.messageType,
        content_text: data.contentText || null,
        content_url: data.contentUrl || null,
        is_public: data.isPublic ?? true,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return message
  }, [`/ranking/vip/${data.vipProfileId}`])
}

// ==================== 메시지 수정 ====================

/**
 * BJ 감사 메시지 수정
 * - 작성자 본인 또는 관리자만 수정 가능
 * - isPublic 수정도 지원
 */
export async function updateBjMessage(
  messageId: number,
  data: {
    contentText?: string
    contentUrl?: string
    isPublic?: boolean
  }
): Promise<ActionResult<BjThankYouMessage>> {
  return authAction(async (supabase, userId) => {
    // 기존 메시지 조회
    const { data: existingMsg, error: fetchError } = await supabase
      .from('bj_thank_you_messages')
      .select('*, organization:bj_member_id (profile_id)')
      .eq('id', messageId)
      .single()

    if (fetchError || !existingMsg) {
      throw new Error('메시지를 찾을 수 없습니다.')
    }

    // 권한 확인
    const orgData = existingMsg.organization
    const org = Array.isArray(orgData) ? orgData[0] : orgData
    const isAuthor = org?.profile_id === userId

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'

    if (!isAuthor && !isAdmin) {
      throw new Error('수정 권한이 없습니다.')
    }

    // 수정 데이터 구성
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (data.contentText !== undefined) updateData.content_text = data.contentText
    if (data.contentUrl !== undefined) updateData.content_url = data.contentUrl
    if (data.isPublic !== undefined) updateData.is_public = data.isPublic

    // 수정
    const { data: message, error } = await supabase
      .from('bj_thank_you_messages')
      .update(updateData)
      .eq('id', messageId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return message
  })
}

// ==================== 메시지 삭제 ====================

/**
 * BJ 감사 메시지 삭제 (soft delete)
 * - 작성자 본인 또는 관리자만 삭제 가능
 */
export async function deleteBjMessage(messageId: number): Promise<ActionResult<null>> {
  return authAction(async (supabase, userId) => {
    // 기존 메시지 조회
    const { data: existingMsg, error: fetchError } = await supabase
      .from('bj_thank_you_messages')
      .select('*, organization:bj_member_id (profile_id)')
      .eq('id', messageId)
      .single()

    if (fetchError || !existingMsg) {
      throw new Error('메시지를 찾을 수 없습니다.')
    }

    // 권한 확인
    const orgData = existingMsg.organization
    const org = Array.isArray(orgData) ? orgData[0] : orgData
    const isAuthor = org?.profile_id === userId

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'

    if (!isAuthor && !isAdmin) {
      throw new Error('삭제 권한이 없습니다.')
    }

    // Soft delete
    const { error } = await supabase
      .from('bj_thank_you_messages')
      .update({ is_deleted: true })
      .eq('id', messageId)

    if (error) throw new Error(error.message)
    return null
  })
}

// ==================== Admin 전용 ====================

/**
 * 모든 BJ 메시지 조회 (Admin)
 * - Admin은 모든 메시지 열람 가능
 */
export async function getAllBjMessages(options?: {
  vipProfileId?: string
  bjMemberId?: number
}): Promise<ActionResult<BjMessageWithMember[]>> {
  return adminAction(async (supabase) => {
    let query = supabase
      .from('bj_thank_you_messages')
      .select(`
        *,
        organization:bj_member_id (name, image_url),
        profiles:vip_profile_id (nickname)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (options?.vipProfileId) {
      query = query.eq('vip_profile_id', options.vipProfileId)
    }
    if (options?.bjMemberId) {
      query = query.eq('bj_member_id', options.bjMemberId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    // Admin은 모든 메시지 열람 가능
    return (data || []).map((msg) => ({
      ...msg,
      message_type: msg.message_type as 'text' | 'image' | 'video',
      canViewContent: true,
    })) as BjMessageWithMember[]
  })
}

/**
 * BJ 메시지 강제 삭제 (Admin - hard delete)
 */
export async function hardDeleteBjMessage(messageId: number): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    const { error } = await supabase
      .from('bj_thank_you_messages')
      .delete()
      .eq('id', messageId)

    if (error) throw new Error(error.message)
    return null
  })
}
