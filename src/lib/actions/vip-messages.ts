'use server'

import { authAction, adminAction, type ActionResult } from './index'
import { checkOwnerOrAdminPermission, throwPermissionError } from './permissions'
import type { VipPersonalMessage, VipPersonalMessageWithAuthor } from '@/types/database'

// ==================== 타입 정의 ====================

export interface VipMessageWithAuthor extends VipPersonalMessage {
  author?: {
    nickname: string
    avatar_url: string | null
  }
  canViewContent: boolean
  is_private_for_viewer?: boolean
}

// ==================== 메시지 조회 ====================

/**
 * 특정 VIP의 개인 메시지 조회
 * - 로그인한 모든 사용자 조회 가능
 * - 공개 메시지: 모든 로그인 사용자에게 전체 내용 표시
 * - 비공개 메시지: VIP 본인, 작성자, 관리자만 열람 가능
 */
export async function getVipMessagesByVipId(
  vipProfileId: string
): Promise<ActionResult<VipMessageWithAuthor[]>> {
  return authAction(async (supabase, userId) => {
    // 사용자 권한 조회
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'
    const isOwner = userId === vipProfileId

    // 메시지 조회 (작성자 정보 포함)
    const { data, error } = await supabase
      .from('vip_personal_messages')
      .select(`
        *,
        profiles:author_id (
          nickname,
          avatar_url
        )
      `)
      .eq('vip_profile_id', vipProfileId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    // 데이터 변환 (권한에 따라 콘텐츠 필터링)
    const messages: VipMessageWithAuthor[] = []

    for (const msg of data || []) {
      const authorInfo = msg.profiles
      const author = Array.isArray(authorInfo) ? authorInfo[0] : authorInfo

      // 비공개 메시지 열람 권한 체크
      const isAuthor = msg.author_id === userId
      const canViewPrivateContent = isAdmin || isOwner || isAuthor

      // 공개 메시지는 모두 열람 가능, 비공개는 권한 체크
      const canViewContent = msg.is_public || canViewPrivateContent

      // 비공개 + 권한 없음인 경우 콘텐츠 제거
      const safeContentText = canViewContent ? msg.content_text : null
      const safeContentUrl = canViewContent
        ? msg.content_url
        : msg.message_type === 'video'
          ? msg.content_url
          : null

      messages.push({
        id: msg.id,
        vip_profile_id: msg.vip_profile_id,
        author_id: msg.author_id,
        message_type: msg.message_type as 'text' | 'image' | 'video',
        content_text: safeContentText,
        content_url: safeContentUrl,
        is_public: msg.is_public,
        is_deleted: msg.is_deleted,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        author: author
          ? {
              nickname: author.nickname,
              avatar_url: author.avatar_url,
            }
          : undefined,
        is_private_for_viewer: !msg.is_public,
        canViewContent,
      })
    }

    return messages
  })
}

// ==================== 메시지 작성 ====================

/**
 * VIP 개인 메시지 작성
 * - VIP 본인만 작성 가능 (자기 페이지에만)
 */
export async function createVipMessage(data: {
  vipProfileId: string
  messageType: 'text' | 'image' | 'video'
  contentText?: string
  contentUrl?: string
  isPublic?: boolean
}): Promise<ActionResult<VipPersonalMessage>> {
  return authAction(async (supabase, userId) => {
    // VIP 본인만 작성 가능
    if (userId !== data.vipProfileId) {
      throw new Error('자신의 페이지에만 메시지를 작성할 수 있습니다.')
    }

    // VIP 프로필 존재 확인
    const { data: vipProfile, error: vipError } = await supabase
      .from('profiles')
      .select('id, nickname')
      .eq('id', data.vipProfileId)
      .single()

    if (vipError || !vipProfile) {
      throw new Error('프로필을 찾을 수 없습니다.')
    }

    // 메시지 생성
    const { data: message, error } = await supabase
      .from('vip_personal_messages')
      .insert({
        vip_profile_id: data.vipProfileId,
        author_id: userId,
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
 * VIP 개인 메시지 수정
 * - 작성자 본인 또는 관리자만 수정 가능
 */
export async function updateVipMessage(
  messageId: number,
  data: {
    contentText?: string
    contentUrl?: string
    isPublic?: boolean
  }
): Promise<ActionResult<VipPersonalMessage>> {
  return authAction(async (supabase, userId) => {
    // 기존 메시지 조회
    const { data: existingMsg, error: fetchError } = await supabase
      .from('vip_personal_messages')
      .select('*')
      .eq('id', messageId)
      .single()

    if (fetchError || !existingMsg) {
      throw new Error('메시지를 찾을 수 없습니다.')
    }

    // 작성자 또는 Admin 권한 확인
    const permission = await checkOwnerOrAdminPermission(supabase, userId, existingMsg.author_id)
    if (!permission.hasPermission) throwPermissionError('수정')

    // 수정 데이터 구성
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (data.contentText !== undefined) updateData.content_text = data.contentText
    if (data.contentUrl !== undefined) updateData.content_url = data.contentUrl
    if (data.isPublic !== undefined) updateData.is_public = data.isPublic

    // 수정
    const { data: message, error } = await supabase
      .from('vip_personal_messages')
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
 * VIP 개인 메시지 삭제 (soft delete)
 * - 작성자 본인 또는 관리자만 삭제 가능
 */
export async function deleteVipMessage(messageId: number): Promise<ActionResult<null>> {
  return authAction(async (supabase, userId) => {
    // 기존 메시지 조회
    const { data: existingMsg, error: fetchError } = await supabase
      .from('vip_personal_messages')
      .select('*')
      .eq('id', messageId)
      .single()

    if (fetchError || !existingMsg) {
      throw new Error('메시지를 찾을 수 없습니다.')
    }

    // 작성자 또는 Admin 권한 확인
    const permission = await checkOwnerOrAdminPermission(supabase, userId, existingMsg.author_id)
    if (!permission.hasPermission) throwPermissionError('삭제')

    // Soft delete
    const { error } = await supabase
      .from('vip_personal_messages')
      .update({ is_deleted: true })
      .eq('id', messageId)

    if (error) throw new Error(error.message)
    return null
  })
}

// ==================== 공개/비공개 토글 ====================

/**
 * VIP 개인 메시지 공개 상태 토글
 * - 작성자 본인만 토글 가능
 */
export async function toggleVipMessageVisibility(
  messageId: number
): Promise<ActionResult<VipPersonalMessage>> {
  return authAction(async (supabase, userId) => {
    // 기존 메시지 조회
    const { data: existingMsg, error: fetchError } = await supabase
      .from('vip_personal_messages')
      .select('*')
      .eq('id', messageId)
      .single()

    if (fetchError || !existingMsg) {
      throw new Error('메시지를 찾을 수 없습니다.')
    }

    // 작성자 본인만 토글 가능
    if (existingMsg.author_id !== userId) {
      throw new Error('공개 상태 변경 권한이 없습니다.')
    }

    // 토글
    const { data: message, error } = await supabase
      .from('vip_personal_messages')
      .update({
        is_public: !existingMsg.is_public,
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return message
  })
}

// ==================== Admin 전용 ====================

/**
 * 모든 VIP 개인 메시지 조회 (Admin)
 */
export async function getAllVipMessages(options?: {
  vipProfileId?: string
  authorId?: string
}): Promise<ActionResult<VipMessageWithAuthor[]>> {
  return adminAction(async (supabase) => {
    let query = supabase
      .from('vip_personal_messages')
      .select(`
        *,
        profiles:author_id (nickname, avatar_url),
        vip:vip_profile_id (nickname)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (options?.vipProfileId) {
      query = query.eq('vip_profile_id', options.vipProfileId)
    }
    if (options?.authorId) {
      query = query.eq('author_id', options.authorId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    // Admin은 모든 메시지 열람 가능
    return (data || []).map((msg) => ({
      ...msg,
      message_type: msg.message_type as 'text' | 'image' | 'video',
      canViewContent: true,
    })) as VipMessageWithAuthor[]
  })
}

/**
 * VIP 메시지 강제 삭제 (Admin - hard delete)
 */
export async function hardDeleteVipMessage(messageId: number): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    const { error } = await supabase
      .from('vip_personal_messages')
      .delete()
      .eq('id', messageId)

    if (error) throw new Error(error.message)
    return null
  })
}
