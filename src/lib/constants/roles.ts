/**
 * 역할(Role) 상수 중앙 관리
 *
 * 왜? 권한 상수가 여러 파일에 분산되어 있으면 일관성 유지가 어려움.
 * 한 곳에서 관리하면 변경 시 누락 방지.
 */

/** 사용자 역할 타입 */
export type Role = 'member' | 'bj' | 'vip' | 'moderator' | 'admin' | 'superadmin'

/** 관리자 역할 (admin 페이지 전체 접근) */
export const ADMIN_ROLES = ['admin', 'superadmin'] as const

/** 운영자 역할 (제한적 관리 권한 — BJ 포함) */
export const MODERATOR_ROLES = ['bj', 'moderator', 'admin', 'superadmin'] as const

/** VIP 역할 (VIP 라운지 접근 등 — BJ 포함) */
export const VIP_ROLES = ['bj', 'vip', 'moderator', 'admin', 'superadmin'] as const

/** 역할 배열 타입 */
export type AdminRole = (typeof ADMIN_ROLES)[number]
export type ModeratorRole = (typeof MODERATOR_ROLES)[number]
export type VipRole = (typeof VIP_ROLES)[number]
