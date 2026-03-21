'use server'

import { adminAction, superadminAction, authAction, publicAction, type ActionResult } from './index'
import type { InsertTables, UpdateTables, Profile } from '@/types/database'

type ProfileInsert = InsertTables<'profiles'>
type ProfileUpdate = UpdateTables<'profiles'>

/**
 * 프로필 생성 (Admin)
 */
export async function createProfile(data: ProfileInsert): Promise<ActionResult<Profile>> {
  return adminAction(
    async (supabase) => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .insert(data)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return profile
    },
    ['/admin/members']
  )
}

/**
 * 프로필 수정 (Admin)
 */
export async function updateProfileByAdmin(
  id: string,
  data: ProfileUpdate
): Promise<ActionResult<Profile>> {
  return adminAction(
    async (supabase) => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return profile
    },
    ['/admin/members', '/ranking']
  )
}

/**
 * 프로필 삭제 (Admin)
 */
export async function deleteProfile(id: string): Promise<ActionResult<null>> {
  return adminAction(
    async (supabase) => {
      const { error } = await supabase.from('profiles').delete().eq('id', id)

      if (error) throw new Error(error.message)
      return null
    },
    ['/admin/members']
  )
}

/**
 * 역할 변경 (Admin)
 */
export async function updateUserRole(
  id: string,
  role: Profile['role']
): Promise<ActionResult<Profile>> {
  return adminAction(
    async (supabase) => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return profile
    },
    ['/admin/members']
  )
}

/**
 * 닉네임 중복 체크
 */
export async function checkNicknameDuplicate(
  nickname: string,
  excludeUserId?: string
): Promise<ActionResult<boolean>> {
  return publicAction(async (supabase) => {
    let query = supabase.from('profiles').select('id').eq('nickname', nickname)

    if (excludeUserId) {
      query = query.neq('id', excludeUserId)
    }

    const { data, error } = await query.limit(1)

    if (error) throw new Error(error.message)
    return (data?.length || 0) > 0
  })
}

/**
 * 자신의 프로필 수정 (닉네임 중복 체크 포함)
 */
export async function updateMyProfile(
  data: Pick<ProfileUpdate, 'nickname' | 'avatar_url'>
): Promise<ActionResult<Profile>> {
  return authAction(
    async (supabase, userId) => {
      // 닉네임 중복 체크
      if (data.nickname) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('nickname', data.nickname)
          .neq('id', userId)
          .limit(1)

        if (existing && existing.length > 0) {
          throw new Error('이미 사용 중인 닉네임입니다.')
        }
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return profile
    },
    ['/mypage']
  )
}

/**
 * 비밀번호 변경
 */
export async function changePassword(newPassword: string): Promise<ActionResult<null>> {
  return authAction(async (supabase) => {
    // 서버측 비밀번호 검증 (클라이언트 검증만으로는 불충분)
    if (!newPassword || newPassword.length < 6) {
      throw new Error('비밀번호는 최소 6자 이상이어야 합니다.')
    }
    if (newPassword.length > 72) {
      throw new Error('비밀번호는 72자 이하여야 합니다.')
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) throw new Error(error.message)
    return null
  })
}

/**
 * 회원 탈퇴
 */
export async function deleteMyAccount(): Promise<ActionResult<null>> {
  return authAction(async (supabase, userId) => {
    // 1. 프로필 삭제 (soft delete 또는 익명화 처리 가능)
    const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId)

    if (profileError) throw new Error(profileError.message)

    // 2. Supabase Auth에서 사용자 삭제는 Admin API로만 가능
    // 운영자가 Supabase Dashboard에서 직접 처리
    await supabase.auth.signOut()

    return null
  })
}

/**
 * 프로필 목록 조회 (Admin)
 */
export async function getProfiles(options?: {
  page?: number
  limit?: number
  role?: Profile['role']
  unit?: 'excel' | 'crew'
}): Promise<ActionResult<{ data: Profile[]; count: number }>> {
  return adminAction(async (supabase) => {
    const { page = 1, limit = 20, role, unit } = options || {}
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('total_donation', { ascending: false })
      .range(from, to)

    if (role) {
      query = query.eq('role', role)
    }
    if (unit) {
      query = query.eq('unit', unit)
    }

    const { data, error, count } = await query

    if (error) throw new Error(error.message)
    return { data: data || [], count: count || 0 }
  })
}

/**
 * 프로필 조회 (공개)
 */
export async function getProfileById(
  id: string
): Promise<ActionResult<Pick<Profile, 'id' | 'nickname' | 'avatar_url' | 'role' | 'unit'> | null>> {
  return publicAction(async (supabase) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url, role, unit')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message)
    }
    return data
  })
}

/**
 * Top N 후원자 조회 (공개 — 닉네임/아바타만 반환)
 */
export async function getTopDonors(
  limit: number = 50
): Promise<ActionResult<Pick<Profile, 'id' | 'nickname' | 'avatar_url'>[]>> {
  return publicAction(async (supabase) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .gt('total_donation', 0)
      .order('total_donation', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return data || []
  })
}

/**
 * 권한 관리용 회원 목록 조회 (Superadmin 전용)
 */
export async function getUsersForPermissions(): Promise<
  ActionResult<
    {
      id: string
      nickname: string
      email: string | null
      role: string
      total_donation: number
    }[]
  >
> {
  return superadminAction(async (supabase) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname, email, role, total_donation')
      .order('total_donation', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
  })
}

/**
 * 역할 변경 (Superadmin 전용 - 권한 관리 페이지)
 */
export async function updateUserRoleBySuperadmin(
  userId: string,
  role: Profile['role']
): Promise<ActionResult<null>> {
  return superadminAction(
    async (supabase) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)

      if (error) throw new Error(error.message)
      return null
    },
    ['/admin/permissions', '/admin/members']
  )
}
