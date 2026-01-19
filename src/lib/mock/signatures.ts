/**
 * Mock Signatures Data
 * cnine.kr 스타일 - 번호 기반 시그니처 시스템
 *
 * 새 구조:
 * - signatures 테이블: sig_number, title, description, thumbnail_url, unit, is_group
 * - signature_videos 테이블: signature_id, member_id, video_url, created_at
 */

import { getPicsumThumbnail } from './utils'

// 시그니처 멤버별 영상 타입
export interface SignatureVideo {
  id: number
  memberId: number
  memberName: string
  memberImage: string | null
  videoUrl: string
  createdAt: string
}

// 시그니처 타입
export interface SignatureData {
  id: number
  sigNumber: number // 시그니처 번호 (1, 2, 3...)
  title: string
  description: string
  thumbnailUrl: string
  unit: 'excel' | 'crew'
  isGroup: boolean // 단체 시그 여부
  videos: SignatureVideo[] // 멤버별 영상들
  createdAt: string
}

// 기존 타입 호환을 위한 export (deprecated)
export interface Signature {
  id: number
  title: string
  description: string | null
  unit: 'excel' | 'crew'
  member_name: string
  media_type: 'video' | 'gif' | 'image'
  media_url: string
  thumbnail_url: string
  tags: string[]
  view_count: number
  is_featured: boolean
  created_at: string
}

// cnine 스타일 시그니처 데이터 (새 구조)
export const mockSignatureData: SignatureData[] = [
  {
    id: 1,
    sigNumber: 1,
    title: 'valkyries',
    description: '',
    thumbnailUrl: getPicsumThumbnail(1001, 400, 400),
    unit: 'excel',
    isGroup: false,
    videos: [
      { id: 1, memberId: 1, memberName: '주성', memberImage: getPicsumThumbnail(101, 100, 100), videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', createdAt: '2025-12-13T10:00:00Z' },
      { id: 2, memberId: 2, memberName: '해밍', memberImage: getPicsumThumbnail(102, 100, 100), videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', createdAt: '2025-12-13T11:00:00Z' },
      { id: 3, memberId: 3, memberName: '슬하', memberImage: getPicsumThumbnail(103, 100, 100), videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', createdAt: '2025-12-08T14:00:00Z' },
    ],
    createdAt: '2024-12-01T10:00:00Z',
  },
  {
    id: 2,
    sigNumber: 2,
    title: '첫눈',
    description: '',
    thumbnailUrl: getPicsumThumbnail(1002, 400, 400),
    unit: 'excel',
    isGroup: false,
    videos: [
      { id: 4, memberId: 4, memberName: '채은', memberImage: getPicsumThumbnail(104, 100, 100), videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', createdAt: '2025-12-10T10:00:00Z' },
      { id: 5, memberId: 5, memberName: '가윤', memberImage: getPicsumThumbnail(105, 100, 100), videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', createdAt: '2025-12-09T10:00:00Z' },
    ],
    createdAt: '2024-11-15T14:00:00Z',
  },
  {
    id: 3,
    sigNumber: 3,
    title: '내 얘길 들어봐',
    description: '',
    thumbnailUrl: getPicsumThumbnail(1003, 400, 400),
    unit: 'excel',
    isGroup: true,
    videos: [
      { id: 6, memberId: 6, memberName: '설윤', memberImage: getPicsumThumbnail(106, 100, 100), videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', createdAt: '2025-12-05T10:00:00Z' },
    ],
    createdAt: '2024-11-20T16:00:00Z',
  },
  {
    id: 4,
    sigNumber: 4,
    title: 'taylor swift',
    description: '',
    thumbnailUrl: getPicsumThumbnail(1004, 400, 400),
    unit: 'excel',
    isGroup: false,
    videos: [
      { id: 7, memberId: 7, memberName: '한세아', memberImage: getPicsumThumbnail(107, 100, 100), videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', createdAt: '2025-11-28T10:00:00Z' },
      { id: 8, memberId: 8, memberName: '청아', memberImage: getPicsumThumbnail(108, 100, 100), videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', createdAt: '2025-11-25T10:00:00Z' },
    ],
    createdAt: '2024-10-25T11:00:00Z',
  },
  {
    id: 5,
    sigNumber: 5,
    title: '날라리',
    description: '',
    thumbnailUrl: getPicsumThumbnail(1005, 400, 400),
    unit: 'excel',
    isGroup: false,
    videos: [],
    createdAt: '2024-11-10T14:00:00Z',
  },
  {
    id: 6,
    sigNumber: 6,
    title: '카리나 닮았대',
    description: '',
    thumbnailUrl: getPicsumThumbnail(1006, 400, 400),
    unit: 'excel',
    isGroup: false,
    videos: [
      { id: 10, memberId: 5, memberName: '가윤', memberImage: getPicsumThumbnail(105, 100, 100), videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', createdAt: '2025-11-20T10:00:00Z' },
    ],
    createdAt: '2024-11-20T18:00:00Z',
  },
  {
    id: 7,
    sigNumber: 1,
    title: 'candy thief',
    description: '',
    thumbnailUrl: getPicsumThumbnail(1007, 400, 400),
    unit: 'crew',
    isGroup: false,
    videos: [
      { id: 11, memberId: 8, memberName: '청아', memberImage: getPicsumThumbnail(108, 100, 100), videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', createdAt: '2025-11-15T10:00:00Z' },
    ],
    createdAt: '2024-10-15T10:00:00Z',
  },
  {
    id: 8,
    sigNumber: 7,
    title: '버블버블',
    description: '',
    thumbnailUrl: getPicsumThumbnail(1008, 400, 400),
    unit: 'excel',
    isGroup: false,
    videos: [
      { id: 12, memberId: 4, memberName: '채은', memberImage: getPicsumThumbnail(104, 100, 100), videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', createdAt: '2025-11-10T10:00:00Z' },
    ],
    createdAt: '2024-09-20T14:00:00Z',
  },
  {
    id: 9,
    sigNumber: 2,
    title: '무아',
    description: '',
    thumbnailUrl: getPicsumThumbnail(1009, 400, 400),
    unit: 'crew',
    isGroup: true,
    videos: [
      { id: 13, memberId: 7, memberName: '한세아', memberImage: getPicsumThumbnail(107, 100, 100), videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', createdAt: '2025-10-28T10:00:00Z' },
    ],
    createdAt: '2024-10-01T16:00:00Z',
  },
  {
    id: 10,
    sigNumber: 8,
    title: '빗을따라서',
    description: '',
    thumbnailUrl: getPicsumThumbnail(1010, 400, 400),
    unit: 'excel',
    isGroup: false,
    videos: [
      { id: 14, memberId: 6, memberName: '설윤', memberImage: getPicsumThumbnail(106, 100, 100), videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', createdAt: '2025-10-15T10:00:00Z' },
    ],
    createdAt: '2024-09-15T11:00:00Z',
  },
  {
    id: 11,
    sigNumber: 9,
    title: '하이라이트',
    description: '',
    thumbnailUrl: getPicsumThumbnail(1011, 400, 400),
    unit: 'excel',
    isGroup: true,
    videos: [
      { id: 16, memberId: 4, memberName: '채은', memberImage: getPicsumThumbnail(104, 100, 100), videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', createdAt: '2025-09-28T10:00:00Z' },
    ],
    createdAt: '2024-08-20T14:00:00Z',
  },
  {
    id: 12,
    sigNumber: 3,
    title: '럭키비키',
    description: '',
    thumbnailUrl: getPicsumThumbnail(1012, 400, 400),
    unit: 'crew',
    isGroup: false,
    videos: [
      { id: 17, memberId: 5, memberName: '가윤', memberImage: getPicsumThumbnail(105, 100, 100), videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', createdAt: '2025-09-15T10:00:00Z' },
    ],
    createdAt: '2024-08-10T16:00:00Z',
  },
]

// 기존 형식 호환용 데이터 (deprecated)
export const mockSignatures: Signature[] = mockSignatureData.flatMap(sig =>
  sig.videos.map((video, idx) => ({
    id: video.id,
    title: `${sig.title} (${sig.sigNumber})`,
    description: `${video.memberName}의 시그니처 영상`,
    unit: sig.unit,
    member_name: video.memberName,
    media_type: 'video' as const,
    media_url: video.videoUrl,
    thumbnail_url: sig.thumbnailUrl,
    tags: [sig.title, video.memberName, `${sig.sigNumber}`],
    view_count: 0,
    is_featured: idx === 0,
    created_at: sig.createdAt,
  }))
)

// 필터 카테고리 목록
export const signatureCategories = [
  { id: 'all', label: '전체' },
  { id: 'new', label: '신규' },
  { id: 'group', label: '단체' },
] as const

// 시그 번호 범위 필터
export const signatureRanges = [
  { id: 'all', label: '전체', min: 0, max: Infinity },
  { id: '1-1000', label: '1000~2000', min: 1000, max: 2000 },
  { id: '2001-3000', label: '2000~3000', min: 2000, max: 3000 },
  { id: '3001-5000', label: '3000~5000', min: 3000, max: 5000 },
  { id: '5001-10000', label: '5000~10000', min: 5000, max: 10000 },
  { id: '10001-20000', label: '10000~20000', min: 10000, max: 20000 },
  { id: '20001+', label: '20000~', min: 20000, max: Infinity },
] as const
