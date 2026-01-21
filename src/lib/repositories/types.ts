/**
 * Repository Interfaces - Clean Architecture
 * 데이터 접근 추상화 레이어 (Full CRUD Support)
 */

import type {
  Profile, Season, Donation, Organization, Notice, Post, Schedule,
  Comment, Signature, VipReward, VipImage, MediaContent, LiveStatus, Banner, TributeGuestbook,
  BjThankYouMessage,
  InsertTables, UpdateTables
} from '@/types/database'
import type { RankingItem, UnitFilter, TimelineItem } from '@/types/common'

// ============================================
// Base Repository Interface (Generic CRUD)
// ============================================
export interface IRepository<T, TInsert, TUpdate> {
  findById(id: string | number): Promise<T | null>
  findAll(): Promise<T[]>
  create(data: TInsert): Promise<T>
  update(id: string | number, data: TUpdate): Promise<T>
  delete(id: string | number): Promise<void>
}

// ============================================
// Domain-Specific Repositories (with CRUD)
// ============================================

export interface IRankingRepository {
  getRankings(options: {
    seasonId?: number | null
    unitFilter?: UnitFilter
  }): Promise<RankingItem[]>
  getTopRankers(limit: number): Promise<RankingItem[]>
}

export interface ISeasonRepository {
  findById(id: number): Promise<Season | null>
  findActive(): Promise<Season | null>
  findAll(): Promise<Season[]>
  create(data: InsertTables<'seasons'>): Promise<Season>
  update(id: number, data: UpdateTables<'seasons'>): Promise<Season>
  delete(id: number): Promise<void>
}

export interface IProfileRepository {
  findById(id: string): Promise<Profile | null>
  findByNickname(nickname: string): Promise<Profile | null>
  findVipMembers(): Promise<Profile[]>
  findAll(): Promise<Profile[]>
  create(data: InsertTables<'profiles'>): Promise<Profile>
  update(id: string, data: UpdateTables<'profiles'>): Promise<Profile>
  delete(id: string): Promise<void>
}

export interface IDonationRepository {
  findById(id: number): Promise<Donation | null>
  findByDonor(donorId: string): Promise<Donation[]>
  findBySeason(seasonId: number): Promise<Donation[]>
  findAll(): Promise<Donation[]>
  getTotal(donorId: string): Promise<number>
  create(data: InsertTables<'donations'>): Promise<Donation>
  update(id: number, data: UpdateTables<'donations'>): Promise<Donation>
  delete(id: number): Promise<void>
}

export interface IOrganizationRepository {
  findById(id: number): Promise<Organization | null>
  findByUnit(unit: 'excel' | 'crew'): Promise<Organization[]>
  findLiveMembers(): Promise<Organization[]>
  findAll(): Promise<Organization[]>
  create(data: InsertTables<'organization'>): Promise<Organization>
  update(id: number, data: UpdateTables<'organization'>): Promise<Organization>
  delete(id: number): Promise<void>
}

export interface INoticeRepository {
  findById(id: number): Promise<Notice | null>
  findRecent(limit: number): Promise<Notice[]>
  findPublished(): Promise<Notice[]>
  findAll(): Promise<Notice[]>
  create(data: InsertTables<'notices'>): Promise<Notice>
  update(id: number, data: UpdateTables<'notices'>): Promise<Notice>
  delete(id: number): Promise<void>
}

export interface IPostRepository {
  findById(id: number): Promise<Post | null>
  findByCategory(category: string): Promise<Post[]>
  findRecent(limit: number): Promise<Post[]>
  findAll(): Promise<Post[]>
  create(data: InsertTables<'posts'>): Promise<Post>
  update(id: number, data: UpdateTables<'posts'>): Promise<Post>
  delete(id: number): Promise<void>
  incrementViewCount(id: number): Promise<void>
}

export interface ICommentRepository {
  findById(id: number): Promise<Comment | null>
  findByPostId(postId: number): Promise<Comment[]>
  findAll(): Promise<Comment[]>
  create(data: InsertTables<'comments'>): Promise<Comment>
  update(id: number, data: UpdateTables<'comments'>): Promise<Comment>
  delete(id: number): Promise<void>
}

export interface ITimelineRepository {
  findById(id: number): Promise<TimelineItem | null>
  findAll(): Promise<TimelineItem[]>
  findByFilter(options: {
    seasonId?: number | null
    category?: string | null
  }): Promise<TimelineItem[]>
  getCategories(): Promise<string[]>
  create(data: InsertTables<'timeline_events'>): Promise<TimelineItem>
  update(id: number, data: UpdateTables<'timeline_events'>): Promise<TimelineItem>
  delete(id: number): Promise<void>
}

export interface IScheduleRepository {
  findById(id: number): Promise<Schedule | null>
  findByMonth(year: number, month: number): Promise<Schedule[]>
  findByMonthAndUnit(year: number, month: number, unit: string | null): Promise<Schedule[]>
  findAll(): Promise<Schedule[]>
  create(data: InsertTables<'schedules'>): Promise<Schedule>
  update(id: number, data: UpdateTables<'schedules'>): Promise<Schedule>
  delete(id: number): Promise<void>
}

export interface ISignatureRepository {
  findById(id: number): Promise<Signature | null>
  findByUnit(unit: 'excel' | 'crew'): Promise<Signature[]>
  findAll(): Promise<Signature[]>
  create(data: InsertTables<'signatures'>): Promise<Signature>
  update(id: number, data: UpdateTables<'signatures'>): Promise<Signature>
  delete(id: number): Promise<void>
}

export interface IVipRewardRepository {
  findById(id: number): Promise<VipReward | null>
  findByProfile(profileId: string): Promise<VipReward[]>
  findBySeason(seasonId: number): Promise<VipReward[]>
  findAll(): Promise<VipReward[]>
  create(data: InsertTables<'vip_rewards'>): Promise<VipReward>
  update(id: number, data: UpdateTables<'vip_rewards'>): Promise<VipReward>
  delete(id: number): Promise<void>
}

export interface IVipImageRepository {
  findById(id: number): Promise<VipImage | null>
  findByReward(rewardId: number): Promise<VipImage[]>
  findAll(): Promise<VipImage[]>
  create(data: InsertTables<'vip_images'>): Promise<VipImage>
  update(id: number, data: UpdateTables<'vip_images'>): Promise<VipImage>
  delete(id: number): Promise<void>
}

export interface IMediaRepository {
  findById(id: number): Promise<MediaContent | null>
  findByType(type: 'shorts' | 'vod'): Promise<MediaContent[]>
  findFeatured(): Promise<MediaContent[]>
  findAll(): Promise<MediaContent[]>
  create(data: InsertTables<'media_content'>): Promise<MediaContent>
  update(id: number, data: UpdateTables<'media_content'>): Promise<MediaContent>
  delete(id: number): Promise<void>
}

export interface IBannerRepository {
  findById(id: number): Promise<Banner | null>
  findActive(): Promise<Banner[]>
  findAll(): Promise<Banner[]>
  create(data: InsertTables<'banners'>): Promise<Banner>
  update(id: number, data: UpdateTables<'banners'>): Promise<Banner>
  delete(id: number): Promise<void>
}

export interface ILiveStatusRepository {
  findById(id: number): Promise<LiveStatus | null>
  findByMember(memberId: number): Promise<LiveStatus[]>
  findLive(): Promise<LiveStatus[]>
  findAll(): Promise<LiveStatus[]>
  create(data: InsertTables<'live_status'>): Promise<LiveStatus>
  update(id: number, data: UpdateTables<'live_status'>): Promise<LiveStatus>
  delete(id: number): Promise<void>
  upsertByMemberAndPlatform(data: InsertTables<'live_status'>): Promise<LiveStatus>
}

export interface IGuestbookRepository {
  findById(id: number): Promise<TributeGuestbook | null>
  findByTributeUser(tributeUserId: string): Promise<TributeGuestbook[]>
  findApproved(tributeUserId: string): Promise<TributeGuestbook[]>
  findAll(): Promise<TributeGuestbook[]>
  create(data: InsertTables<'tribute_guestbook'>): Promise<TributeGuestbook>
  update(id: number, data: UpdateTables<'tribute_guestbook'>): Promise<TributeGuestbook>
  delete(id: number): Promise<void>
}

export interface IBjMessageRepository {
  findById(id: number): Promise<BjThankYouMessage | null>
  findByVipProfile(vipProfileId: string): Promise<BjThankYouMessage[]>
  findByBjMember(bjMemberId: number): Promise<BjThankYouMessage[]>
  findPublicByVipProfile(vipProfileId: string): Promise<BjThankYouMessage[]>
  findAll(): Promise<BjThankYouMessage[]>
  create(data: InsertTables<'bj_thank_you_messages'>): Promise<BjThankYouMessage>
  update(id: number, data: UpdateTables<'bj_thank_you_messages'>): Promise<BjThankYouMessage>
  delete(id: number): Promise<void>
  softDelete(id: number): Promise<void>
}

// ============================================
// Data Provider Interface (Strategy Pattern)
// ============================================
export interface IDataProvider {
  rankings: IRankingRepository
  seasons: ISeasonRepository
  profiles: IProfileRepository
  donations: IDonationRepository
  organization: IOrganizationRepository
  notices: INoticeRepository
  posts: IPostRepository
  comments: ICommentRepository
  timeline: ITimelineRepository
  schedules: IScheduleRepository
  signatures: ISignatureRepository
  vipRewards: IVipRewardRepository
  vipImages: IVipImageRepository
  media: IMediaRepository
  banners: IBannerRepository
  liveStatus: ILiveStatusRepository
  guestbook: IGuestbookRepository
  bjMessages: IBjMessageRepository
}

// ============================================
// Factory Pattern for Provider Creation
// ============================================
export type DataProviderType = 'mock' | 'supabase'
