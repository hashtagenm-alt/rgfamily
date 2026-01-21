/**
 * Access Control Utilities
 *
 * 페이지 및 기능 접근 권한 검사
 */

import { USE_MOCK_DATA } from '@/lib/config'
import {
  hasHonorPageQualification,
  getHallOfFameByUserId,
} from '@/lib/mock/hall-of-fame'
import type { Profile } from '@/types/database'

export type AccessDeniedReason =
  | 'not_authenticated'
  | 'not_owner'
  | 'not_qualified'
  | 'page_not_found'

export interface TributeAccessResult {
  hasAccess: boolean
  reason?: AccessDeniedReason
  isAdmin?: boolean
  isOwner?: boolean
}

/**
 * 헌정 페이지 접근 권한 확인
 *
 * 접근 조건:
 * 1. Admin 역할 → 모든 페이지 접근 가능
 * 2. 본인 페이지 + 자격 보유 → 접근 가능
 * 3. 그 외 → 접근 불가
 */
export function checkTributePageAccess(
  targetUserId: string,
  currentUser: { id: string } | null,
  profile: Profile | null
): TributeAccessResult {
  // 1. 비로그인 사용자
  if (!currentUser) {
    return {
      hasAccess: false,
      reason: 'not_authenticated',
    }
  }

  // 2. Admin은 모든 페이지 접근 가능
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'
  if (isAdmin) {
    return {
      hasAccess: true,
      isAdmin: true,
      isOwner: currentUser.id === targetUserId,
    }
  }

  // 3. 본인 페이지 확인
  const isOwner = currentUser.id === targetUserId
  if (!isOwner) {
    return {
      hasAccess: false,
      reason: 'not_owner',
      isOwner: false,
    }
  }

  // 4. 헌정 페이지 자격 확인 (시즌 TOP 3 또는 회차별 고액 후원자)
  if (USE_MOCK_DATA) {
    const hasQualification = hasHonorPageQualification(targetUserId)
    if (!hasQualification) {
      return {
        hasAccess: false,
        reason: 'not_qualified',
        isOwner: true,
      }
    }
  }
  // Supabase 자격 확인은 useTributeData에서 처리

  // 5. 헌정 데이터가 존재하는지 확인
  if (USE_MOCK_DATA) {
    const hofData = getHallOfFameByUserId(targetUserId)
    if (!hofData || hofData.length === 0) {
      return {
        hasAccess: false,
        reason: 'page_not_found',
        isOwner: true,
      }
    }
  }

  return {
    hasAccess: true,
    isOwner: true,
    isAdmin: false,
  }
}

/**
 * VIP 역할 목록
 */
const VIP_ROLES = ['vip', 'moderator', 'admin', 'superadmin'] as const

/**
 * VIP 라운지 접근 권한 확인 (Top 50)
 */
export function checkVipLoungeAccess(
  userRank: number | null,
  profile: Profile | null
): boolean {
  // Admin은 항상 접근 가능
  if (profile?.role === 'admin' || profile?.role === 'superadmin') {
    return true
  }

  // Top 50 이내만 접근 가능
  return userRank !== null && userRank <= 50
}

/**
 * VIP 글쓰기 권한 확인 (Role + Rank 기반)
 *
 * 조건:
 * 1. Role이 VIP_ROLES 중 하나 (vip, moderator, admin, superadmin)
 * 2. 또는 Rank가 50 이내
 */
export function checkVipWriteAccess(
  userRank: number | null,
  profile: Profile | null
): boolean {
  // Role 기반 VIP 체크
  if (profile?.role && VIP_ROLES.includes(profile.role as typeof VIP_ROLES[number])) {
    return true
  }

  // Rank 기반 VIP 체크 (Top 50)
  return userRank !== null && userRank <= 50
}

/**
 * Admin 페이지 접근 권한 확인
 * - superadmin: 최고 관리자
 * - admin: 일반 관리자
 * - moderator: 운영진 (제한적 Admin 접근)
 */
export function checkAdminAccess(profile: Profile | null): boolean {
  if (!profile) return false
  return ['admin', 'superadmin', 'moderator'].includes(profile.role)
}

/**
 * 완전한 Admin 권한 확인 (admin/superadmin만)
 */
export function checkFullAdminAccess(profile: Profile | null): boolean {
  return profile?.role === 'admin' || profile?.role === 'superadmin'
}

/**
 * 접근 거부 사유 메시지
 */
export function getAccessDeniedMessage(reason: AccessDeniedReason): {
  title: string
  description: string
} {
  switch (reason) {
    case 'not_authenticated':
      return {
        title: '로그인이 필요합니다',
        description: '헌정 페이지를 보려면 로그인해주세요.',
      }
    case 'not_owner':
      return {
        title: '접근 권한이 없습니다',
        description: '본인의 헌정 페이지만 확인할 수 있습니다.',
      }
    case 'not_qualified':
      return {
        title: '헌정 페이지 자격이 없습니다',
        description: '시즌 TOP 3 또는 회차별 고액 후원자만 헌정 페이지를 받을 수 있습니다.',
      }
    case 'page_not_found':
      return {
        title: '페이지를 찾을 수 없습니다',
        description: '요청한 헌정 페이지가 존재하지 않습니다.',
      }
    default:
      return {
        title: '접근할 수 없습니다',
        description: '이 페이지에 접근할 권한이 없습니다.',
      }
  }
}
