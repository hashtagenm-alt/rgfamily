'use server'

import { adminAction, publicAction, type ActionResult } from './index'
import type { InsertTables, UpdateTables, Notice, NoticeWithAttachments, NoticeAttachment } from '@/types/database'

type NoticeInsert = InsertTables<'notices'>
type NoticeUpdate = UpdateTables<'notices'>

// 첨부파일 데이터 타입
interface AttachmentInput {
  file_url: string
  file_name: string
  file_type: 'image' | 'video'
  file_size: number
  display_order: number
}

/**
 * 공지사항 생성
 */
export async function createNotice(
  data: NoticeInsert,
  attachments?: AttachmentInput[]
): Promise<ActionResult<Notice>> {
  return adminAction(async (supabase) => {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: notice, error } = await supabase
      .from('notices')
      .insert({
        ...data,
        author_id: user?.id
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    // 첨부파일 저장
    if (attachments && attachments.length > 0 && notice) {
      const attachmentsToInsert = attachments.map(att => ({
        notice_id: notice.id,
        file_url: att.file_url,
        file_name: att.file_name,
        file_type: att.file_type,
        file_size: att.file_size,
        display_order: att.display_order,
      }))

      const { error: attError } = await supabase
        .from('notice_attachments')
        .insert(attachmentsToInsert)

      if (attError) {
        console.error('Failed to save attachments:', attError)
        // 첨부파일 저장 실패해도 공지사항은 성공으로 처리
      }
    }

    return notice
  }, ['/admin/notices', '/notice'])
}

/**
 * 공지사항 수정
 */
export async function updateNotice(
  id: number,
  data: NoticeUpdate,
  attachments?: AttachmentInput[]
): Promise<ActionResult<Notice>> {
  return adminAction(async (supabase) => {
    const { data: notice, error } = await supabase
      .from('notices')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)

    // 첨부파일 처리: 기존 삭제 후 새로 삽입
    if (attachments !== undefined) {
      // 기존 첨부파일 삭제
      await supabase
        .from('notice_attachments')
        .delete()
        .eq('notice_id', id)

      // 새 첨부파일 삽입
      if (attachments.length > 0) {
        const attachmentsToInsert = attachments.map(att => ({
          notice_id: id,
          file_url: att.file_url,
          file_name: att.file_name,
          file_type: att.file_type,
          file_size: att.file_size,
          display_order: att.display_order,
        }))

        const { error: attError } = await supabase
          .from('notice_attachments')
          .insert(attachmentsToInsert)

        if (attError) {
          console.error('Failed to save attachments:', attError)
        }
      }
    }

    return notice
  }, ['/admin/notices', '/notice', `/notice/${id}`])
}

/**
 * 공지사항 삭제
 */
export async function deleteNotice(
  id: number
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    const { error } = await supabase
      .from('notices')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  }, ['/admin/notices', '/notice'])
}

/**
 * 공지사항 고정/해제
 */
export async function toggleNoticePinned(
  id: number,
  isPinned: boolean
): Promise<ActionResult<Notice>> {
  return adminAction(async (supabase) => {
    const { data: notice, error } = await supabase
      .from('notices')
      .update({ is_pinned: isPinned })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return notice
  }, ['/admin/notices', '/notice'])
}

/**
 * 공지사항 목록 조회 (공개)
 */
export async function getNotices(options?: {
  category?: 'official' | 'excel' | 'crew'
  limit?: number
}): Promise<ActionResult<Notice[]>> {
  return publicAction(async (supabase) => {
    let query = supabase
      .from('notices')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (options?.category) {
      query = query.eq('category', options.category)
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
 * 공지사항 상세 조회 (공개) - 조회수 증가
 */
export async function getNoticeById(
  id: number
): Promise<ActionResult<Notice | null>> {
  return publicAction(async (supabase) => {
    // 먼저 데이터 조회
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw new Error(error.message)

    // 조회수 증가 (별도 업데이트)
    if (data) {
      try {
        await supabase
          .from('notices')
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq('id', id)
      } catch {
        // 조회수 증가 실패해도 무시
      }
    }

    return data
  })
}

/**
 * 공지사항 상세 조회 (첨부파일 포함)
 */
export async function getNoticeWithAttachments(
  id: number
): Promise<ActionResult<NoticeWithAttachments | null>> {
  return publicAction(async (supabase) => {
    // 공지사항 조회
    const { data: notice, error } = await supabase
      .from('notices')
      .select(`
        *,
        author:profiles(nickname, avatar_url)
      `)
      .eq('id', id)
      .single()

    if (error) throw new Error(error.message)
    if (!notice) return null

    // 첨부파일 조회
    const { data: attachments } = await supabase
      .from('notice_attachments')
      .select('*')
      .eq('notice_id', id)
      .order('display_order', { ascending: true })

    // 조회수 증가
    try {
      await supabase
        .from('notices')
        .update({ view_count: (notice.view_count || 0) + 1 })
        .eq('id', id)
    } catch {
      // 무시
    }

    return {
      ...notice,
      attachments: (attachments as NoticeAttachment[]) || [],
      author: notice.author as { nickname: string; avatar_url: string | null } | undefined,
    } as NoticeWithAttachments
  })
}
