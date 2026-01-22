/**
 * 권한 검증 유틸리티
 *
 * 왜? 권한 체크 로직이 posts.ts, vip-messages.ts, bj-messages.ts에 중복됨.
 *     통합해서 일관성 유지하고 유지보수 편하게 함.
 *
 * Note: 'use server' 제거 - 이 파일의 함수들은 다른 서버 액션 내에서 호출되는
 *       유틸리티 함수이므로 별도의 서버 액션으로 노출할 필요 없음.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const ADMIN_ROLES = ['admin', 'superadmin'] as const
export const MODERATOR_ROLES = ['admin', 'superadmin', 'moderator'] as const

export interface PermissionCheckResult {
  hasPermission: boolean
  isAdmin: boolean
  isModerator: boolean
  role: string | null
}

/**
 * 사용자 역할 조회
 */
export async function getUserRole(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  return profile?.role || null
}

/**
 * Admin 권한 확인 (admin, superadmin)
 */
export function isAdmin(role: string | null): boolean {
  return role !== null && ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])
}

/**
 * Moderator 권한 확인 (admin, superadmin, moderator)
 */
export function isModerator(role: string | null): boolean {
  return role !== null && MODERATOR_ROLES.includes(role as (typeof MODERATOR_ROLES)[number])
}

/**
 * 소유자 또는 Moderator 권한 확인
 * - 게시글/댓글 수정/삭제에 사용
 */
export async function checkOwnerOrModeratorPermission(
  supabase: SupabaseClient<Database>,
  userId: string,
  resourceOwnerId: string
): Promise<PermissionCheckResult> {
  // 본인이면 바로 허용
  if (userId === resourceOwnerId) {
    return { hasPermission: true, isAdmin: false, isModerator: false, role: null }
  }

  // 권한 조회
  const role = await getUserRole(supabase, userId)
  const hasModeratorRole = isModerator(role)

  return {
    hasPermission: hasModeratorRole,
    isAdmin: isAdmin(role),
    isModerator: hasModeratorRole,
    role,
  }
}

/**
 * 소유자 또는 Admin 권한 확인
 * - VIP/BJ 메시지 수정/삭제에 사용 (moderator 제외)
 */
export async function checkOwnerOrAdminPermission(
  supabase: SupabaseClient<Database>,
  userId: string,
  resourceOwnerId: string
): Promise<PermissionCheckResult> {
  // 본인이면 바로 허용
  if (userId === resourceOwnerId) {
    return { hasPermission: true, isAdmin: false, isModerator: false, role: null }
  }

  // 권한 조회
  const role = await getUserRole(supabase, userId)
  const hasAdminRole = isAdmin(role)

  return {
    hasPermission: hasAdminRole,
    isAdmin: hasAdminRole,
    isModerator: isModerator(role),
    role,
  }
}

/**
 * 권한 에러 throw
 */
export function throwPermissionError(action: '수정' | '삭제' | '접근'): never {
  throw new Error(`${action} 권한이 없습니다.`)
}
