/**
 * Tribute / Hall of Fame 관련 타입 정의
 *
 * 왜? 기존 mock 모듈에 정의되어 있던 타입을 독립 타입 파일로 분리.
 * 프로덕션 코드에서 타입만 필요한 경우 mock 의존성 없이 사용 가능.
 */

import type { TributeGuestbook } from './database'

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
  rank?: number
  seasonId?: number
  seasonName?: string
  episodeId?: string
  episodeName?: string
  amount: number
  unit: 'excel' | 'crew' | null
  tributeVideoUrl?: string
  tributeImageUrl?: string
  tributeImages?: string[]
  tributeMessage?: string
  memberVideos?: TributeMemberVideo[]
  exclusiveSignatures?: TributeSignature[]
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

/** 방명록 엔트리 타입 (프론트엔드용 확장) */
export interface GuestbookEntry extends Omit<TributeGuestbook, 'is_deleted' | 'is_approved' | 'updated_at'> {
  author_avatar?: string | null
  author_unit?: 'excel' | 'crew' | null
}
