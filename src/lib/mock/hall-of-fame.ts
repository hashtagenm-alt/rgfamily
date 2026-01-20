/**
 * Hall of Fame Mock Data
 *
 * 명예의 전당 - 시즌 TOP 3 및 회차별 고액 후원자 데이터
 */

import { getPlaceholderAvatar, getGradientPlaceholder, getPicsumThumbnail } from './utils'

export interface TributeMemberVideo {
  id: string
  memberName: string
  memberUnit: 'excel' | 'crew'
  message: string
  videoUrl?: string
  thumbnailUrl?: string
}

export interface TributeSignature {
  id: string
  memberName: string
  videoUrl?: string
  thumbnailUrl?: string
}

export interface HallOfFameHonor {
  id: string
  donorId: string
  donorName: string
  donorAvatar: string
  honorType: 'season_top3' | 'episode_high_donor'
  rank?: number // season TOP 3의 경우
  seasonId?: number
  seasonName?: string
  episodeId?: string
  episodeName?: string
  amount: number
  unit: 'excel' | 'crew' | null
  tributeVideoUrl?: string
  tributeImageUrl?: string
  tributeImages?: string[] // 복수 이미지
  tributeMessage?: string
  memberVideos?: TributeMemberVideo[] // 멤버별 감사 영상
  exclusiveSignatures?: TributeSignature[] // VIP 전용 시그니처 리액션
  createdAt: string
}

export interface HallOfFameSeason {
  id: number
  name: string
  startDate: string
  endDate: string
  top3: HallOfFameHonor[]
}

export interface HallOfFameEpisode {
  id: string
  name: string
  date: string
  highDonors: HallOfFameHonor[]
}

// 시즌별 TOP 3 데이터 (profiles.ts의 ID/이름과 일치)
// user-1: 미키™, user-2: 미드굿♣️가애, user-3: 농심육개장라면
export const mockHallOfFameSeasons: HallOfFameSeason[] = [
  {
    id: 4,
    name: '시즌 4',
    startDate: '2024-07-01',
    endDate: '2024-12-31',
    top3: [
      {
        id: 'hof-s4-1',
        donorId: 'user-1',
        donorName: '미키™',
        donorAvatar: getPlaceholderAvatar('미키™'),
        honorType: 'season_top3',
        rank: 1,
        seasonId: 4,
        seasonName: '시즌 4',
        amount: 0, // 하트 개수 미정
        unit: 'excel',
        tributeVideoUrl: 'https://example.com/tribute-s4-1.mp4',
        tributeImageUrl: getGradientPlaceholder('GOLD', ['ffd700', '4a0418']),
        tributeImages: [
          getGradientPlaceholder('GOLD', ['ffd700', '4a0418']),
          getPicsumThumbnail(101),
          getPicsumThumbnail(102),
        ],
        tributeMessage: '최고의 후원자님, 언제나 감사합니다!',
        memberVideos: [
          { id: 'mv-1', memberName: 'RG대표', memberUnit: 'excel', message: '시즌 4 최고 후원자님께 감사의 말씀 드립니다!' },
          { id: 'mv-2', memberName: '엑셀부장', memberUnit: 'excel', message: '항상 응원해주셔서 감사해요!' },
          { id: 'mv-3', memberName: '크루부장', memberUnit: 'crew', message: '다음 시즌에도 함께해요!' },
        ],
        exclusiveSignatures: [
          { id: 'sig-1', memberName: 'RG대표' },
          { id: 'sig-2', memberName: '엑셀부장' },
          { id: 'sig-3', memberName: '크루부장' },
          { id: 'sig-4', memberName: '멤버A' },
        ],
        createdAt: '2024-12-31T23:59:59Z',
      },
      {
        id: 'hof-s4-2',
        donorId: 'user-2',
        donorName: '미드굿♣️가애',
        donorAvatar: getPlaceholderAvatar('미드굿♣️가애'),
        honorType: 'season_top3',
        rank: 2,
        seasonId: 4,
        seasonName: '시즌 4',
        amount: 0, // 하트 개수 미정
        unit: 'excel',
        tributeVideoUrl: 'https://example.com/tribute-s4-2.mp4',
        tributeImageUrl: getGradientPlaceholder('SILVER', ['c0c0c0', '2a2a2a']),
        tributeImages: [
          getGradientPlaceholder('SILVER', ['c0c0c0', '2a2a2a']),
          getPicsumThumbnail(103),
        ],
        tributeMessage: '항상 응원해주셔서 감사합니다!',
        memberVideos: [
          { id: 'mv-4', memberName: 'RG대표', memberUnit: 'excel', message: '늘 함께해주셔서 감사합니다!' },
          { id: 'mv-5', memberName: '크루부장', memberUnit: 'crew', message: '크루부 최고 서포터!' },
        ],
        exclusiveSignatures: [
          { id: 'sig-5', memberName: 'RG대표' },
          { id: 'sig-6', memberName: '크루부장' },
        ],
        createdAt: '2024-12-31T23:59:59Z',
      },
      {
        id: 'hof-s4-3',
        donorId: 'user-3',
        donorName: '농심육개장라면',
        donorAvatar: getPlaceholderAvatar('농심육개장라면'),
        honorType: 'season_top3',
        rank: 3,
        seasonId: 4,
        seasonName: '시즌 4',
        amount: 0, // 하트 개수 미정
        unit: 'excel',
        tributeVideoUrl: 'https://example.com/tribute-s4-3.mp4',
        tributeImageUrl: getGradientPlaceholder('BRONZE', ['cd7f32', '3a1a0a']),
        tributeMessage: '멋진 후원자님께 감사드립니다!',
        createdAt: '2024-12-31T23:59:59Z',
      },
    ],
  },
  {
    id: 3,
    name: '시즌 3',
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    top3: [
      {
        id: 'hof-s3-1',
        donorId: 'user-4',
        donorName: '[RG]✨린아의발굴™',
        donorAvatar: getPlaceholderAvatar('[RG]✨린아의발굴™'),
        honorType: 'season_top3',
        rank: 1,
        seasonId: 3,
        seasonName: '시즌 3',
        amount: 0,
        unit: 'excel',
        tributeImageUrl: getGradientPlaceholder('GOLD', ['ffd700', '4a0418']),
        tributeMessage: '시즌 3의 전설, 감사합니다!',
        createdAt: '2024-06-30T23:59:59Z',
      },
      {
        id: 'hof-s3-2',
        donorId: 'user-5',
        donorName: '❥CaNnOt',
        donorAvatar: getPlaceholderAvatar('❥CaNnOt'),
        honorType: 'season_top3',
        rank: 2,
        seasonId: 3,
        seasonName: '시즌 3',
        amount: 0,
        unit: 'crew',
        tributeImageUrl: getGradientPlaceholder('SILVER', ['c0c0c0', '2a2a2a']),
        tributeMessage: '언제나 함께해주셔서 감사해요!',
        createdAt: '2024-06-30T23:59:59Z',
      },
      {
        id: 'hof-s3-3',
        donorId: 'user-6',
        donorName: '태린공주❤️줄여보자',
        donorAvatar: getPlaceholderAvatar('태린공주❤️줄여보자'),
        honorType: 'season_top3',
        rank: 3,
        seasonId: 3,
        seasonName: '시즌 3',
        amount: 0,
        unit: 'excel',
        tributeImageUrl: getGradientPlaceholder('BRONZE', ['cd7f32', '3a1a0a']),
        tributeMessage: '늘 응원 감사드립니다!',
        createdAt: '2024-06-30T23:59:59Z',
      },
    ],
  },
]

// 회차별 고액 후원자 (5만개 이상) - profiles.ts의 ID/이름과 일치
export const mockHallOfFameEpisodes: HallOfFameEpisode[] = [
  {
    id: 'ep-2024-12-25',
    name: '크리스마스 특집 방송',
    date: '2024-12-25',
    highDonors: [
      {
        id: 'hof-ep1-1',
        donorId: 'user-7',
        donorName: '⭐건빵이미래쥐',
        donorAvatar: getPlaceholderAvatar('⭐건빵이미래쥐'),
        honorType: 'episode_high_donor',
        episodeId: 'ep-2024-12-25',
        episodeName: '크리스마스 특집 방송',
        amount: 0,
        unit: 'crew',
        tributeImageUrl: getPicsumThumbnail(7),
        tributeMessage: '메리 크리스마스! 최고의 선물이에요!',
        createdAt: '2024-12-25T22:00:00Z',
      },
      {
        id: 'hof-ep1-2',
        donorId: 'user-8',
        donorName: '[RG]린아✨여행™',
        donorAvatar: getPlaceholderAvatar('[RG]린아✨여행™'),
        honorType: 'episode_high_donor',
        episodeId: 'ep-2024-12-25',
        episodeName: '크리스마스 특집 방송',
        amount: 0,
        unit: 'excel',
        tributeImageUrl: getPicsumThumbnail(8),
        createdAt: '2024-12-25T21:30:00Z',
      },
    ],
  },
  {
    id: 'ep-2024-12-31',
    name: '연말 카운트다운 방송',
    date: '2024-12-31',
    highDonors: [
      {
        id: 'hof-ep2-1',
        donorId: 'user-9',
        donorName: '가윤이꼬❤️털이',
        donorAvatar: getPlaceholderAvatar('가윤이꼬❤️털이'),
        honorType: 'episode_high_donor',
        episodeId: 'ep-2024-12-31',
        episodeName: '연말 카운트다운 방송',
        amount: 0,
        unit: 'excel',
        tributeImageUrl: getPicsumThumbnail(9),
        tributeMessage: '2025년에도 함께해요!',
        createdAt: '2024-12-31T23:59:00Z',
      },
      {
        id: 'hof-ep2-2',
        donorId: 'user-10',
        donorName: '언제나♬',
        donorAvatar: getPlaceholderAvatar('언제나♬'),
        honorType: 'episode_high_donor',
        episodeId: 'ep-2024-12-31',
        episodeName: '연말 카운트다운 방송',
        amount: 0,
        unit: 'crew',
        createdAt: '2024-12-31T23:30:00Z',
      },
      {
        id: 'hof-ep2-3',
        donorId: 'user-11',
        donorName: 'gul***',
        donorAvatar: getPlaceholderAvatar('gul***'),
        honorType: 'episode_high_donor',
        episodeId: 'ep-2024-12-31',
        episodeName: '연말 카운트다운 방송',
        amount: 0,
        unit: 'excel',
        createdAt: '2024-12-31T22:00:00Z',
      },
    ],
  },
  {
    id: 'ep-2024-11-11',
    name: '빼빼로데이 특집',
    date: '2024-11-11',
    highDonors: [
      {
        id: 'hof-ep3-1',
        donorId: 'user-12',
        donorName: '핑크하트',
        donorAvatar: getPlaceholderAvatar('핑크하트'),
        honorType: 'episode_high_donor',
        episodeId: 'ep-2024-11-11',
        episodeName: '빼빼로데이 특집',
        amount: 0,
        unit: 'excel',
        tributeMessage: '11월 11일, 달콤한 후원 감사해요!',
        createdAt: '2024-11-11T20:00:00Z',
      },
    ],
  },
]

// 모든 명예의 전당 목록 (정렬)
export const getAllHallOfFameHonors = (): HallOfFameHonor[] => {
  const seasonHonors = mockHallOfFameSeasons.flatMap(s => s.top3)
  const episodeHonors = mockHallOfFameEpisodes.flatMap(e => e.highDonors)
  return [...seasonHonors, ...episodeHonors].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

// 특정 유저의 명예의 전당 조회
export const getHallOfFameByUserId = (userId: string): HallOfFameHonor[] => {
  return getAllHallOfFameHonors().filter(h => h.donorId === userId)
}

// 최소 후원 금액 기준 (5만 하트)
export const EPISODE_HIGH_DONOR_THRESHOLD = 50000

// 헌정 페이지 자격 확인 (시즌 TOP 3 또는 회차별 고액 후원자)
export const hasHonorPageQualification = (donorId: string): boolean => {
  // 시즌 TOP 3 확인
  const isSeasonTop3 = mockHallOfFameSeasons.some(season =>
    season.top3.some(honor => honor.donorId === donorId)
  )
  if (isSeasonTop3) return true

  // 회차별 고액 후원자 확인
  const isEpisodeHighDonor = mockHallOfFameEpisodes.some(episode =>
    episode.highDonors.some(honor => honor.donorId === donorId)
  )
  return isEpisodeHighDonor
}

// 헌정 페이지 자격이 있는 모든 donorId 목록
export const getHonorPageQualifiedDonorIds = (): string[] => {
  const seasonDonorIds = mockHallOfFameSeasons.flatMap(s =>
    s.top3.map(h => h.donorId)
  )
  const episodeDonorIds = mockHallOfFameEpisodes.flatMap(e =>
    e.highDonors.map(h => h.donorId)
  )
  return [...new Set([...seasonDonorIds, ...episodeDonorIds])]
}
