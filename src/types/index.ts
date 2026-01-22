/**
 * 타입 정의 통합 내보내기
 *
 * 도메인별 분류:
 * - common: 공용 타입 (RankingItem, ScheduleEvent 등)
 * - database: Supabase 스키마 타입
 * - organization: 조직도 관련 타입
 */

// Organization types first (소스 of truth)
export * from './organization'

// Common types (UnitFilter는 organization에서 re-export)
export {
  type JoinedProfile,
  type JoinedSeason,
  type JoinedComments,
  type ApiResponse,
  type PaginatedResponse,
  type RankingItem,
  type CalendarDay,
  type ScheduleEvent,
  type VipPageData,
  type SignatureItem,
  type TimelineItem,
  type NoticeItem,
  type PostItem,
  type NoticeCategory,
  type SortOrder,
  type TributeTheme,
  type TributeRank,
  type TributeProfile,
  type TributeVideo,
  type TributeGalleryImage,
  type TributeDonation,
  type VipTributeData,
} from './common'

// Database types
export * from './database'

// Ranking types (HallOfFameEntry, HallOfFameSeasonData, HallOfFameData)
export * from './ranking'
