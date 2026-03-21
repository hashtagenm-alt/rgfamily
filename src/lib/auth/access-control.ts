/**
 * Access Control Utilities
 *
 * 페이지 및 기능 접근 권한 검사
 */

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

  // Supabase 자격 확인은 useTributeData에서 처리

  return {
    hasAccess: true,
    isOwner: true,
    isAdmin: false,
  }
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
