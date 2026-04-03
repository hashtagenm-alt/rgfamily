'use server'

import { adminAction, publicAction, type ActionResult } from './index'
import type { InsertTables, UpdateTables, Signature, SignatureVideo } from '@/types/database'

type SignatureInsert = InsertTables<'signatures'>
type SignatureUpdate = UpdateTables<'signatures'>

/**
 * 시그니처 생성
 */
export async function createSignature(data: SignatureInsert): Promise<ActionResult<Signature>> {
  return adminAction(
    async (supabase) => {
      const { data: signature, error } = await supabase
        .from('signatures')
        .insert(data)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return signature
    },
    ['/admin/signatures', '/signature']
  )
}

/**
 * 시그니처 수정
 */
export async function updateSignature(
  id: number,
  data: SignatureUpdate
): Promise<ActionResult<Signature>> {
  return adminAction(
    async (supabase) => {
      const { data: signature, error } = await supabase
        .from('signatures')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return signature
    },
    ['/admin/signatures', '/signature']
  )
}

/**
 * 시그니처 삭제
 */
export async function deleteSignature(id: number): Promise<ActionResult<null>> {
  return adminAction(
    async (supabase) => {
      const { error } = await supabase.from('signatures').delete().eq('id', id)

      if (error) throw new Error(error.message)
      return null
    },
    ['/admin/signatures', '/signature']
  )
}

/**
 * 시그니처 목록 조회 (공개)
 */
export async function getSignatures(options?: {
  unit?: 'excel' | 'crew'
  isGroup?: boolean
  sigNumberMin?: number
  sigNumberMax?: number
  limit?: number
}): Promise<ActionResult<Signature[]>> {
  return publicAction(async (supabase) => {
    let query = supabase.from('signatures').select('*').order('sig_number', { ascending: true })

    if (options?.unit) {
      query = query.eq('unit', options.unit)
    }
    if (options?.isGroup !== undefined) {
      // is_group 컬럼이 DB에 추가되면 as any 제거 가능
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = (query as any).eq('is_group', options.isGroup)
    }
    if (options?.sigNumberMin !== undefined) {
      query = query.gte('sig_number', options.sigNumberMin)
    }
    if (options?.sigNumberMax !== undefined) {
      query = query.lte('sig_number', options.sigNumberMax)
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
 * 시그니처 상세 조회 (공개)
 */
export async function getSignatureById(id: number): Promise<ActionResult<Signature | null>> {
  return publicAction(async (supabase) => {
    const { data, error } = await supabase.from('signatures').select('*').eq('id', id).single()

    if (error) throw new Error(error.message)
    return data
  })
}

// ==================== Signature Videos ====================

type SignatureVideoInsert = InsertTables<'signature_videos'>
type SignatureVideoUpdate = UpdateTables<'signature_videos'>

/**
 * 시그니처 영상 생성
 */
export async function createSignatureVideo(
  data: SignatureVideoInsert
): Promise<ActionResult<SignatureVideo>> {
  return adminAction(
    async (supabase) => {
      const { data: video, error } = await supabase
        .from('signature_videos')
        .insert(data)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return video
    },
    ['/admin/signatures', '/signature']
  )
}

/**
 * 시그니처 영상 수정
 */
export async function updateSignatureVideo(
  id: number,
  data: SignatureVideoUpdate
): Promise<ActionResult<SignatureVideo>> {
  return adminAction(
    async (supabase) => {
      const { data: video, error } = await supabase
        .from('signature_videos')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return video
    },
    ['/admin/signatures', '/signature']
  )
}

/**
 * 시그니처 영상 삭제
 */
export async function deleteSignatureVideo(id: number): Promise<ActionResult<null>> {
  return adminAction(
    async (supabase) => {
      const { error } = await supabase.from('signature_videos').delete().eq('id', id)

      if (error) throw new Error(error.message)
      return null
    },
    ['/admin/signatures', '/signature']
  )
}

/**
 * 시그니처별 영상 목록 조회 (공개)
 */
export async function getSignatureVideos(
  signatureId: number
): Promise<ActionResult<SignatureVideo[]>> {
  return publicAction(async (supabase) => {
    const { data, error } = await supabase
      .from('signature_videos')
      .select('*')
      .eq('signature_id', signatureId)
      .eq('is_published', true)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
  })
}

/**
 * 시그니처 영상 공개/비공개 토글
 */
export async function toggleSignatureVideoPublished(
  id: number,
  isPublished: boolean
): Promise<ActionResult<SignatureVideo>> {
  return adminAction(
    async (supabase) => {
      const { data: video, error } = await supabase
        .from('signature_videos')
        .update({ is_published: isPublished })
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return video
    },
    ['/admin/signatures', '/signature']
  )
}

// ==================== Admin 전용 조회 액션 ====================

/** 시그니처 + 영상 카운트 조회 (관리자 목록 페이지용) */
export interface SignatureWithVideoCount extends Signature {
  videoCount: number
}

export async function getSignaturesWithVideoCounts(): Promise<
  ActionResult<SignatureWithVideoCount[]>
> {
  return adminAction(async (supabase) => {
    // 모든 시그니처 조회
    const { data: signatures, error: sigError } = await supabase
      .from('signatures')
      .select('*')
      .order('sig_number', { ascending: true })

    if (sigError) throw new Error(sigError.message)

    if (!signatures || signatures.length === 0) return []

    // 영상 카운트 일괄 조회
    const sigIds = signatures.map((s) => s.id)
    const { data: videos, error: vidError } = await supabase
      .from('signature_videos')
      .select('signature_id')
      .in('signature_id', sigIds)

    if (vidError) throw new Error(vidError.message)

    const counts: Record<number, number> = {}
    ;(videos || []).forEach((row) => {
      counts[row.signature_id] = (counts[row.signature_id] || 0) + 1
    })

    return signatures.map((s) => ({
      ...s,
      videoCount: counts[s.id] || 0,
    }))
  })
}

/** 시그니처 상세 조회 (관리자용) */
export async function getSignatureDetail(id: number): Promise<ActionResult<Signature | null>> {
  return adminAction(async (supabase) => {
    const { data, error } = await supabase.from('signatures').select('*').eq('id', id).single()

    if (error) throw new Error(error.message)
    return data
  })
}

/** 시그니처 영상 목록 조회 (관리자용 - 공개/비공개 모두 포함, 멤버 정보 조인) */
export interface SignatureVideoWithMember {
  id: number
  signatureId: number
  memberId: number
  memberName: string
  memberImageUrl: string | null
  videoUrl: string
  cloudflareUid: string | null
  vimeoId: string | null
  isPublished: boolean
  createdAt: string
}

export async function getSignatureVideosAdmin(
  signatureId: number
): Promise<ActionResult<SignatureVideoWithMember[]>> {
  return adminAction(async (supabase) => {
    const { data, error } = await supabase
      .from('signature_videos')
      .select('*, organization!member_id(name, image_url)')
      .eq('signature_id', signatureId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)

    return (data || []).map((v) => {
      const member = v.organization as { name: string; image_url: string | null } | null
      return {
        id: v.id,
        signatureId: v.signature_id,
        memberId: v.member_id,
        memberName: member?.name || '알 수 없음',
        memberImageUrl: member?.image_url || null,
        videoUrl: v.video_url,
        cloudflareUid: v.cloudflare_uid || null,
        vimeoId: v.vimeo_id || null,
        isPublished: v.is_published ?? true,
        createdAt: v.created_at,
      }
    })
  })
}

/** 부서별 BJ 멤버 목록 조회 (관리자용 - 드롭다운 등) */
export interface OrgMemberItem {
  id: number
  name: string
  imageUrl: string | null
  unit: 'excel' | 'crew'
}

export async function getBjMembersByUnit(
  unit: 'excel' | 'crew'
): Promise<ActionResult<OrgMemberItem[]>> {
  return adminAction(async (supabase) => {
    const { data, error } = await supabase
      .from('organization')
      .select('id, name, image_url, unit')
      .eq('unit', unit)
      .eq('is_active', true)
      .order('name')

    if (error) throw new Error(error.message)

    return (data || []).map((m) => ({
      id: m.id,
      name: m.name,
      imageUrl: m.image_url,
      unit: m.unit,
    }))
  })
}

/** 시그니처 단일 필드 인라인 수정 (관리자용) */
export async function updateSignatureField(
  id: number,
  field: string,
  value: unknown
): Promise<ActionResult<null>> {
  return adminAction(
    async (supabase) => {
      const dbFieldMap: Record<string, string> = {
        sigNumber: 'sig_number',
        title: 'title',
        thumbnailUrl: 'thumbnail_url',
      }
      const dbField = dbFieldMap[field] || field

      const { error } = await supabase
        .from('signatures')
        .update({ [dbField]: value })
        .eq('id', id)

      if (error) throw new Error(error.message)
      return null
    },
    ['/admin/signatures', '/signature']
  )
}
