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
const realTopDonors = [
  { name: '미키™', unit: 'excel', role: 'vip', donation: 5200000 },
  { name: '미드굿♣️가애', unit: 'excel', role: 'vip', donation: 4850000 },
  { name: '농심육개장라면', unit: 'excel', role: 'vip', donation: 4320000 },
  { name: '[RG]✨린아의발굴™', unit: 'excel', role: 'vip', donation: 3980000 },
  { name: '❥CaNnOt', unit: 'crew', role: 'vip', donation: 3650000 },
  { name: '태린공주❤️줄여보자', unit: 'excel', role: 'vip', donation: 3420000 },
  { name: '⭐건빵이미래쥐', unit: 'crew', role: 'vip', donation: 3180000 },
  { name: '[RG]린아✨여행™', unit: 'excel', role: 'vip', donation: 2950000 },
  { name: '가윤이꼬❤️털이', unit: 'excel', role: 'vip', donation: 2780000 },
  { name: '언제나♬', unit: 'crew', role: 'vip', donation: 2580000 },
]

// 후원자 데이터 생성기
function generateProfiles(): Profile[] {
  const donorData = [
    ...realTopDonors,
    { name: 'gul***', unit: 'excel', role: 'vip', donation: 450000 },
    { name: '핑크하트', unit: 'excel', role: 'vip', donation: 420000 },
    { name: '별빛수호자', unit: 'crew', role: 'vip', donation: 380000 },
    { name: '달콤한팬심', unit: 'excel', role: 'vip', donation: 350000 },
    { name: '행복한오늘', unit: 'crew', role: 'vip', donation: 320000 },
    { name: '영원한서포터', unit: 'excel', role: 'vip', donation: 300000 },
    { name: '나노사랑', unit: 'excel', role: 'vip', donation: 280000 },
    { name: '크루지킴이', unit: 'crew', role: 'vip', donation: 260000 },
    { name: '밤하늘별', unit: 'excel', role: 'vip', donation: 240000 },
    { name: '골든에이지', unit: 'crew', role: 'vip', donation: 220000 },
    { name: '러브앤조이', unit: 'excel', role: 'vip', donation: 200000 },
    { name: '스타라이트', unit: 'excel', role: 'vip', donation: 185000 },
    { name: '팬심가득', unit: 'crew', role: 'vip', donation: 170000 },
    { name: '응원단장', unit: 'excel', role: 'vip', donation: 155000 },
    { name: '행복전도사', unit: 'crew', role: 'vip', donation: 140000 },
    { name: '사랑의하트', unit: 'excel', role: 'vip', donation: 128000 },
    { name: '빛나는별', unit: 'excel', role: 'vip', donation: 118000 },
    { name: '달빛천사', unit: 'crew', role: 'vip', donation: 108000 },
    { name: '은하수', unit: 'excel', role: 'vip', donation: 100000 },
    { name: '무지개빛', unit: 'crew', role: 'vip', donation: 92000 },
    { name: '햇살가득', unit: 'excel', role: 'member', donation: 85000 },
    { name: '꿈꾸는별', unit: 'excel', role: 'member', donation: 78000 },
    { name: '하늘빛', unit: 'crew', role: 'member', donation: 72000 },
    { name: '바다향기', unit: 'excel', role: 'member', donation: 66000 },
    { name: '산들바람', unit: 'crew', role: 'member', donation: 60000 },
    { name: '봄날의꽃', unit: 'excel', role: 'member', donation: 55000 },
    { name: '여름밤꿈', unit: 'crew', role: 'member', donation: 50000 },
    { name: '가을단풍', unit: 'excel', role: 'member', donation: 46000 },
    { name: '겨울눈꽃', unit: 'crew', role: 'member', donation: 42000 },
    { name: '사계절', unit: 'excel', role: 'member', donation: 38000 },
    { name: '황금날개', unit: 'excel', role: 'member', donation: 35000 },
    { name: '은빛날개', unit: 'crew', role: 'member', donation: 32000 },
    { name: '청동날개', unit: 'excel', role: 'member', donation: 29000 },
    { name: '다이아몬드', unit: 'crew', role: 'member', donation: 26000 },
    { name: '에메랄드', unit: 'excel', role: 'member', donation: 24000 },
    { name: '루비하트', unit: 'excel', role: 'member', donation: 22000 },
    { name: '사파이어', unit: 'crew', role: 'member', donation: 20000 },
    { name: '진주빛', unit: 'excel', role: 'member', donation: 18000 },
    { name: '오팔빛깔', unit: 'crew', role: 'member', donation: 16500 },
    { name: '자수정', unit: 'excel', role: 'member', donation: 15000 },
    { name: '달나라토끼', unit: 'crew', role: 'member', donation: 13500 },
    { name: '별똥별', unit: 'excel', role: 'member', donation: 12000 },
    { name: '유성우', unit: 'crew', role: 'member', donation: 10800 },
    { name: '은하계', unit: 'excel', role: 'member', donation: 9600 },
    { name: '우주탐험', unit: 'crew', role: 'member', donation: 8500 },
    { name: '판타지아', unit: 'excel', role: 'member', donation: 7500 },
    { name: '드림캐처', unit: 'crew', role: 'member', donation: 6500 },
    { name: '럭키스타', unit: 'excel', role: 'member', donation: 5500 },
    { name: '매직걸', unit: 'crew', role: 'member', donation: 4500 },
    { name: '원더풀', unit: 'excel', role: 'member', donation: 3500 },
  ]

  return donorData.map((donor, index) => ({
    id: `user-${index + 1}`,
    nickname: donor.name,
    email: null,
    avatar_url: null, // 후원자는 프로필 사진 없음 → 이니셜 표시
    role: donor.role as 'vip' | 'member',
    unit: donor.unit as 'excel' | 'crew',
    total_donation: donor.donation,
    created_at: new Date(2024, Math.floor(index / 5), (index % 28) + 1).toISOString(),
    updated_at: new Date(2025, 0, 1).toISOString(),
  }))
}

export const mockProfiles: Profile[] = [
  mockAdminProfile,
  ...generateProfiles()
]

// 랭킹용 정렬된 프로필
export const rankedProfiles = mockProfiles
  .filter(p => p.id !== 'admin-user' && (p.total_donation || 0) > 0)
  .sort((a, b) => (b.total_donation || 0) - (a.total_donation || 0))
