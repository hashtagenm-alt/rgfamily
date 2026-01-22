'use server'

import { adminAction, publicAction, type ActionResult } from './index'
import type { InsertTables, UpdateTables, Signature, SignatureVideo } from '@/types/database'

type SignatureInsert = InsertTables<'signatures'>
type SignatureUpdate = UpdateTables<'signatures'>

/**
 * 시그니처 생성
 */
export async function createSignature(
  data: SignatureInsert
): Promise<ActionResult<Signature>> {
  return adminAction(async (supabase) => {
    const { data: signature, error } = await supabase
      .from('signatures')
      .insert(data)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return signature
  }, ['/admin/signatures', '/signature'])
}

/**
 * 시그니처 수정
 */
export async function updateSignature(
  id: number,
  data: SignatureUpdate
): Promise<ActionResult<Signature>> {
  return adminAction(async (supabase) => {
    const { data: signature, error } = await supabase
      .from('signatures')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return signature
  }, ['/admin/signatures', '/signature'])
}

/**
 * 시그니처 삭제
 */
export async function deleteSignature(
  id: number
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    const { error } = await supabase
      .from('signatures')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  }, ['/admin/signatures', '/signature'])
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
    let query = supabase
      .from('signatures')
      .select('*')
      .order('sig_number', { ascending: true })

    if (options?.unit) {
      query = query.eq('unit', options.unit)
    }
    if (options?.isGroup !== undefined) {
      query = query.eq('is_group', options.isGroup)
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
export async function getSignatureById(
  id: number
): Promise<ActionResult<Signature | null>> {
  return publicAction(async (supabase) => {
    const { data, error } = await supabase
      .from('signatures')
      .select('*')
      .eq('id', id)
      .single()

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
  return adminAction(async (supabase) => {
    const { data: video, error } = await supabase
      .from('signature_videos')
      .insert(data)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return video
  }, ['/admin/signatures', '/signature'])
}

/**
 * 시그니처 영상 수정
 */
export async function updateSignatureVideo(
  id: number,
  data: SignatureVideoUpdate
): Promise<ActionResult<SignatureVideo>> {
  return adminAction(async (supabase) => {
    const { data: video, error } = await supabase
      .from('signature_videos')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return video
  }, ['/admin/signatures', '/signature'])
}

/**
 * 시그니처 영상 삭제
 */
export async function deleteSignatureVideo(
  id: number
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    const { error } = await supabase
      .from('signature_videos')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  }, ['/admin/signatures', '/signature'])
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
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
  })
}
