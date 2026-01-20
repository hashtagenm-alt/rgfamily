// Supabase Join Helper Types
// Use these when accessing joined relations in Supabase queries

/** Profile data from Supabase join */
export interface JoinedProfile {
  nickname?: string
  avatar_url?: string | null
  email?: string | null
}

/** Season data from Supabase join */
export interface JoinedSeason {
  name?: string
  start_date?: string
  end_date?: string
}

/** Comment count from Supabase join */
export interface JoinedComments {
  length?: number
}

/** Helper to safely extract joined profile data */
export function getJoinedProfile(data: unknown): JoinedProfile | null {
  if (data && typeof data === 'object') {
    return data as JoinedProfile
  }
  return null
}

/** Helper to safely extract joined season data */
export function getJoinedSeason(data: unknown): JoinedSeason | null {
  if (data && typeof data === 'object') {
    return data as JoinedSeason
  }
  return null
}

// API Response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Ranking types
export interface RankingItem {
  rank: number
  donorId: string | null
  donorName: string
  avatarUrl: string | null
  totalAmount: number
  donationCount?: number      // 후원 횟수
  messageCount?: number       // 메시지 수
  lastDonationDate?: string   // 마지막 후원 날짜
  seasonId?: number
  seasonName?: string
}

// Calendar types
export interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  isHoliday: boolean
  holidayName: string | null
  events: ScheduleEvent[]
}

export interface ScheduleEvent {
  id: number
  title: string
  description: string | null
  unit: 'excel' | 'crew' | null
  eventType: 'broadcast' | 'collab' | 'event' | 'notice' | '休'
  startDatetime: string
  endDatetime: string | null
  color: string | null
  isAllDay: boolean
}

// Organization tree types - 이동됨: @/types/organization
// OrgMember, OrgTreeData → organization.ts 참조

// VIP page types
export interface VipPageData {
  profile: {
    id: string
    nickname: string
    avatarUrl: string | null
    totalDonation: number
  }
  reward: {
    seasonId: number
    seasonName: string
    rank: number
    personalMessage: string | null
    dedicationVideoUrl: string | null
  }
  images: {
    id: number
    imageUrl: string
    title: string | null
  }[]
  donationHistory: {
    id: number
    amount: number
    message: string | null
    createdAt: string
  }[]
}

// Signature types
export interface SignatureItem {
  id: number
  title: string
  description: string | null
  unit: 'excel' | 'crew'
  memberName: string
  mediaType: 'video' | 'image' | 'gif'
  mediaUrl: string
  thumbnailUrl: string | null
  tags: string[]
  viewCount: number
  isFeatured: boolean
}

// Timeline types
export interface TimelineItem {
  id: number
  eventDate: string
  title: string
  description: string | null
  imageUrl: string | null
  category: string | null
  seasonId: number | null
  seasonName?: string
}

// Notice types
export interface NoticeItem {
  id: number
  title: string
  content: string
  category: 'official' | 'excel' | 'crew'
  thumbnailUrl: string | null
  isPinned: boolean
  viewCount: number
  authorName: string | null
  createdAt: string
}

// Post types
export interface PostItem {
  id: number
  boardType: 'free' | 'vip'
  title: string
  content: string
  authorId: string
  authorName: string
  authorAvatar: string | null
  viewCount: number
  likeCount: number
  commentCount: number
  isAnonymous: boolean
  createdAt: string
}

// Filter types
export type { UnitFilter } from './organization'
export type NoticeCategory = 'all' | 'official' | 'excel' | 'crew'
export type SortOrder = 'latest' | 'popular' | 'oldest'

// Top 1-3 Tribute Page types
export type TributeTheme = 'gold' | 'silver' | 'bronze'
export type TributeRank = 1 | 2 | 3

export interface TributeProfile {
  id: string
  nickname: string
  avatarUrl: string | null
  totalDonation: number
  joinedAt: string
}

export interface TributeVideo {
  id: number
  url: string
  thumbnailUrl: string | null
  title: string
  duration: number | null
}

export interface TributeGalleryImage {
  id: number
  url: string
  title: string
  description: string | null
}

export interface TributeDonation {
  id: number
  amount: number
  message: string | null
  createdAt: string
  seasonName: string
}

export interface VipTributeData {
  rank: TributeRank
  theme: TributeTheme
  seasonId: number
  seasonName: string
  profile: TributeProfile
  personalMessage: string
  streamerSignature: string | null
  dedicationVideo: TributeVideo | null
  exclusiveGallery: TributeGalleryImage[]
  donationTimeline: TributeDonation[]
  specialBadges: string[]
}
