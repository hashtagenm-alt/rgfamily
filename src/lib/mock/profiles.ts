/**
 * Mock Profiles Data - Expanded for realistic service
 * 후원자/사용자 데이터 (50명 확장)
 *
 * 참고: 후원자는 프로필 사진이 없으므로 avatar_url을 null로 설정
 *       → 컴포넌트에서 화려한 닉네임 이니셜로 표시
 */

import type { Profile } from '@/types/database'
import { getPlaceholderAvatar } from './utils'

// Mock Admin 계정 (admin/admin으로 로그인 가능)
export const mockAdminProfile: Profile = {
  id: 'admin-user',
  nickname: 'Admin',
  email: 'admin@example.com',  // Mock email - not real
  avatar_url: getPlaceholderAvatar('admin'),
  role: 'superadmin',
  unit: null,
  total_donation: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-12-30T00:00:00Z',
}

// 실제 후원 랭킹 Top 10 (2026년 1월 기준)
// 순위만 확정 - 하트 개수는 미정
const realTopDonors = [
  { name: '미키™', unit: 'excel', role: 'vip' },
  { name: '미드굿♣️가애', unit: 'excel', role: 'vip' },
  { name: '농심육개장라면', unit: 'excel', role: 'vip' },
  { name: '[RG]✨린아의발굴™', unit: 'excel', role: 'vip' },
  { name: '❥CaNnOt', unit: 'crew', role: 'vip' },
  { name: '태린공주❤️줄여보자', unit: 'excel', role: 'vip' },
  { name: '⭐건빵이미래쥐', unit: 'crew', role: 'vip' },
  { name: '[RG]린아✨여행™', unit: 'excel', role: 'vip' },
  { name: '가윤이꼬❤️털이', unit: 'excel', role: 'vip' },
  { name: '언제나♬', unit: 'crew', role: 'vip' },
]

// 11위 이하 후원자 (Mock 데이터)
const otherDonors = [
  { name: 'gul***', unit: 'excel', role: 'vip' },
  { name: '핑크하트', unit: 'excel', role: 'vip' },
  { name: '별빛수호자', unit: 'crew', role: 'vip' },
  { name: '달콤한팬심', unit: 'excel', role: 'vip' },
  { name: '행복한오늘', unit: 'crew', role: 'vip' },
  { name: '영원한서포터', unit: 'excel', role: 'vip' },
  { name: '나노사랑', unit: 'excel', role: 'vip' },
  { name: '크루지킴이', unit: 'crew', role: 'vip' },
  { name: '밤하늘별', unit: 'excel', role: 'vip' },
  { name: '골든에이지', unit: 'crew', role: 'vip' },
  { name: '러브앤조이', unit: 'excel', role: 'vip' },
  { name: '스타라이트', unit: 'excel', role: 'vip' },
  { name: '팬심가득', unit: 'crew', role: 'vip' },
  { name: '응원단장', unit: 'excel', role: 'vip' },
  { name: '행복전도사', unit: 'crew', role: 'vip' },
  { name: '사랑의하트', unit: 'excel', role: 'vip' },
  { name: '빛나는별', unit: 'excel', role: 'vip' },
  { name: '달빛천사', unit: 'crew', role: 'vip' },
  { name: '은하수', unit: 'excel', role: 'vip' },
  { name: '무지개빛', unit: 'crew', role: 'vip' },
  { name: '햇살가득', unit: 'excel', role: 'member' },
  { name: '꿈꾸는별', unit: 'excel', role: 'member' },
  { name: '하늘빛', unit: 'crew', role: 'member' },
  { name: '바다향기', unit: 'excel', role: 'member' },
  { name: '산들바람', unit: 'crew', role: 'member' },
  { name: '봄날의꽃', unit: 'excel', role: 'member' },
  { name: '여름밤꿈', unit: 'crew', role: 'member' },
  { name: '가을단풍', unit: 'excel', role: 'member' },
  { name: '겨울눈꽃', unit: 'crew', role: 'member' },
  { name: '사계절', unit: 'excel', role: 'member' },
  { name: '황금날개', unit: 'excel', role: 'member' },
  { name: '은빛날개', unit: 'crew', role: 'member' },
  { name: '청동날개', unit: 'excel', role: 'member' },
  { name: '다이아몬드', unit: 'crew', role: 'member' },
  { name: '에메랄드', unit: 'excel', role: 'member' },
  { name: '루비하트', unit: 'excel', role: 'member' },
  { name: '사파이어', unit: 'crew', role: 'member' },
  { name: '진주빛', unit: 'excel', role: 'member' },
  { name: '오팔빛깔', unit: 'crew', role: 'member' },
  { name: '자수정', unit: 'excel', role: 'member' },
]

// 후원자 데이터 생성기
function generateProfiles(): Profile[] {
  // Top 10 실제 후원자 + 나머지 Mock 후원자
  const donorData = [...realTopDonors, ...otherDonors]

  return donorData.map((donor, index) => ({
    id: `user-${index + 1}`,
    nickname: donor.name,
    email: null,
    avatar_url: null, // 후원자는 프로필 사진 없음 → 이니셜 표시
    role: donor.role as 'vip' | 'member',
    unit: donor.unit as 'excel' | 'crew',
    total_donation: 0, // 하트 개수 미정 (0 = 미표시)
    created_at: new Date(2024, Math.floor(index / 5), (index % 28) + 1).toISOString(),
    updated_at: new Date(2025, 0, 1).toISOString(),
  }))
}

export const mockProfiles: Profile[] = [
  mockAdminProfile,
  ...generateProfiles()
]

// 랭킹용 정렬된 프로필 (순위 인덱스 기반 - 하트 개수 미정)
export const rankedProfiles = mockProfiles
  .filter(p => p.id !== 'admin-user')
  // user-1이 1등, user-2가 2등... 순서로 정렬
  .sort((a, b) => {
    const aIndex = parseInt(a.id.replace('user-', '')) || 999
    const bIndex = parseInt(b.id.replace('user-', '')) || 999
    return aIndex - bIndex
  })
