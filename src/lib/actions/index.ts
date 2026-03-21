'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'
import { ADMIN_ROLES, MODERATOR_ROLES } from '@/lib/constants/roles'

export type ActionResult<T> = {
  data: T | null
  error: string | null
}

/**
 * Admin 권한이 필요한 Server Action 래퍼
 * - 인증 확인
 * - Admin/Superadmin 권한 확인
 * - 에러 처리
 * - 캐시 무효화
 */
export async function adminAction<T>(
  action: (supabase: SupabaseClient<Database>) => Promise<T>,
  revalidatePaths?: string[]
): Promise<ActionResult<T>> {
  try {
    const supabase = await createServerSupabaseClient()

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { data: null, error: '로그인이 필요합니다.' }
    }

    // Admin 권한 확인
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { data: null, error: '프로필을 찾을 수 없습니다.' }
    }

    if (!(ADMIN_ROLES as readonly string[]).includes(profile.role)) {
      return { data: null, error: '관리자 권한이 필요합니다.' }
    }

    // Action 실행
    const result = await action(supabase)

    // 캐시 무효화
    if (revalidatePaths) {
      revalidatePaths.forEach(path => revalidatePath(path))
    }

    return { data: result, error: null }
  } catch (err) {
    logger.error('Admin Action Error', err)
    return {
      data: null,
      error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
    }
  }
}

/**
 * Moderator+ 권한이 필요한 Server Action 래퍼
 * - 인증 확인
 * - Moderator/Admin/Superadmin 권한 확인
 * - 에러 처리
 * - 캐시 무효화
 *
 * CLAUDE.md §17 기준: banners, notices, schedules, posts 관리에 사용
 */
export async function moderatorAction<T>(
  action: (supabase: SupabaseClient<Database>) => Promise<T>,
  revalidatePaths?: string[]
): Promise<ActionResult<T>> {
  try {
    const supabase = await createServerSupabaseClient()

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { data: null, error: '로그인이 필요합니다.' }
    }

    // Moderator 권한 확인
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { data: null, error: '프로필을 찾을 수 없습니다.' }
    }

    if (!(MODERATOR_ROLES as readonly string[]).includes(profile.role)) {
      return { data: null, error: '운영진 권한이 필요합니다.' }
    }

    // Action 실행
    const result = await action(supabase)

    // 캐시 무효화
    if (revalidatePaths) {
      revalidatePaths.forEach(path => revalidatePath(path))
    }

    return { data: result, error: null }
  } catch (err) {
    logger.error('Moderator Action Error', err)
    return {
      data: null,
      error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
    }
  }
}

/**
 * Superadmin 전용 Server Action 래퍼
 * - 인증 확인
 * - Superadmin 권한만 허용
 * - 에러 처리
 * - 캐시 무효화
 *
 * CLAUDE.md §17 기준: permissions 관리에 사용
 */
export async function superadminAction<T>(
  action: (supabase: SupabaseClient<Database>) => Promise<T>,
  revalidatePaths?: string[]
): Promise<ActionResult<T>> {
  try {
    const supabase = await createServerSupabaseClient()

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { data: null, error: '로그인이 필요합니다.' }
    }

    // Superadmin 권한 확인
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { data: null, error: '프로필을 찾을 수 없습니다.' }
    }

    if (profile.role !== 'superadmin') {
      return { data: null, error: '최고 관리자 권한이 필요합니다.' }
    }

    // Action 실행
    const result = await action(supabase)

    // 캐시 무효화
    if (revalidatePaths) {
      revalidatePaths.forEach(path => revalidatePath(path))
    }

    return { data: result, error: null }
  } catch (err) {
    logger.error('Superadmin Action Error', err)
    return {
      data: null,
      error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
    }
  }
}

/**
 * 인증된 사용자만 접근 가능한 Server Action 래퍼
 * - 인증 확인
 * - 에러 처리
 * - 캐시 무효화
 */
export async function authAction<T>(
  action: (supabase: SupabaseClient<Database>, userId: string) => Promise<T>,
  revalidatePaths?: string[]
): Promise<ActionResult<T>> {
  try {
    const supabase = await createServerSupabaseClient()

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { data: null, error: '로그인이 필요합니다.' }
    }

    // Action 실행
    const result = await action(supabase, user.id)

    // 캐시 무효화
    if (revalidatePaths) {
      revalidatePaths.forEach(path => revalidatePath(path))
    }

    return { data: result, error: null }
  } catch (err) {
    logger.error('Auth Action Error', err)
    return {
      data: null,
      error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
    }
  }
}

/**
 * 공개 Server Action 래퍼 (인증 불필요)
 * - 에러 처리만
 */
export async function publicAction<T>(
  action: (supabase: SupabaseClient<Database>) => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const supabase = await createServerSupabaseClient()
    const result = await action(supabase)
    return { data: result, error: null }
  } catch (err) {
    logger.error('Public Action Error', err)
    return {
      data: null,
      error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
    }
  }
}
