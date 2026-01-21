/**
 * BJ 멤버 계정 데이터
 *
 * organization 테이블의 BJ 멤버들에게 연결되는 profiles 데이터
 * 실서비스에서는 Supabase Auth로 계정 생성 후 profile_id 연결
 */

import type { Profile } from '@/types/database'
import { getMemberAvatar } from './utils'

// BJ 멤버 정보 (organization.id와 매핑)
export const BJ_MEMBERS = [
  { orgId: 1, name: '가애', email: 'gaea@rgfamily.kr' },
  { orgId: 2, name: '린아', email: 'rina@rgfamily.kr' },
  { orgId: 3, name: '월아', email: 'wola@rgfamily.kr' },
  { orgId: 4, name: '채은', email: 'chaeeun@rgfamily.kr' },
  { orgId: 5, name: '가윤', email: 'gayun@rgfamily.kr' },
  { orgId: 6, name: '설윤', email: 'seolyun@rgfamily.kr' },
  { orgId: 7, name: '한세아', email: 'hansea@rgfamily.kr' },
  { orgId: 8, name: '청아', email: 'cheonga@rgfamily.kr' },
  { orgId: 9, name: '손밍', email: 'sonming@rgfamily.kr' },
  { orgId: 10, name: '해린', email: 'haerin@rgfamily.kr' },
  { orgId: 11, name: '키키', email: 'kiki@rgfamily.kr' },
  { orgId: 12, name: '한백설', email: 'hanbaekseol@rgfamily.kr' },
  { orgId: 13, name: '홍서하', email: 'hongseoha@rgfamily.kr' },
  { orgId: 14, name: '퀸로니', email: 'queenroni@rgfamily.kr' },
] as const

// BJ 프로필 ID 생성 (UUID 형식 시뮬레이션)
export const generateBjProfileId = (orgId: number): string => {
  return `bj-member-${orgId.toString().padStart(4, '0')}`
}

// BJ 프로필 데이터 생성
export const mockBjProfiles: Profile[] = BJ_MEMBERS.map((member) => {
  const avatarKey = member.email.split('@')[0]
  return {
    id: generateBjProfileId(member.orgId),
    nickname: member.name,
    email: member.email,
    avatar_url: getMemberAvatar(avatarKey),
    role: 'member' as const,
    unit: 'excel' as const,
    total_donation: 0,
    pandatv_id: null, // BJ 멤버는 PandaTV 아이디 별도 없음
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  }
})

// organization.profile_id 연결 매핑
// Mock 모드에서 organization 데이터에 profile_id를 추가하기 위한 매핑
export const organizationProfileMapping: Record<number, string> = Object.fromEntries(
  BJ_MEMBERS.map((member) => [member.orgId, generateBjProfileId(member.orgId)])
)

// BJ 프로필 ID로 organization ID 찾기
export const getOrgIdByProfileId = (profileId: string): number | null => {
  const entry = Object.entries(organizationProfileMapping).find(
    ([, pId]) => pId === profileId
  )
  return entry ? parseInt(entry[0]) : null
}

// organization ID로 프로필 ID 찾기
export const getProfileIdByOrgId = (orgId: number): string | null => {
  return organizationProfileMapping[orgId] || null
}

// 이메일로 BJ 프로필 찾기
export const getBjProfileByEmail = (email: string): Profile | null => {
  return mockBjProfiles.find((p) => p.email === email) || null
}

// BJ 멤버인지 확인 (profileId 기준)
export const isBjMemberByProfileId = (profileId: string): boolean => {
  return mockBjProfiles.some((p) => p.id === profileId)
}

// BJ 멤버 정보 조회 (profileId → organization id + name)
export const getBjMemberInfo = (
  profileId: string
): { orgId: number; name: string; imageUrl: string } | null => {
  const profile = mockBjProfiles.find((p) => p.id === profileId)
  if (!profile) return null

  const orgId = getOrgIdByProfileId(profileId)
  if (!orgId) return null

  return {
    orgId,
    name: profile.nickname,
    imageUrl: profile.avatar_url || '',
  }
}
