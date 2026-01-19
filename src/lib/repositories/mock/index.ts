/**
 * Mock Repository Implementations
 * 개발/테스트용 Mock 데이터 저장소 (Full CRUD Support)
 */

import {
  IRankingRepository,
  ISeasonRepository,
  IProfileRepository,
  IOrganizationRepository,
  INoticeRepository,
  IDataProvider,
  IDonationRepository,
  IPostRepository,
  ICommentRepository,
  ITimelineRepository,
  IScheduleRepository,
  ISignatureRepository,
  IVipRewardRepository,
  IVipImageRepository,
  IMediaRepository,
  IBannerRepository,
  ILiveStatusRepository,
  IGuestbookRepository,
} from '../types'
import {
  mockProfiles,
  mockSeasons,
  mockOrganization,
  mockNotices,
  mockPosts,
  mockDonations,
  mockTimelineEvents,
  mockSchedules,
  mockComments,
  mockSignatures,
  mockVipRewardsDB,
  mockVipImages,
  mockMediaContent,
  mockBanners,
  mockLiveStatus,
  mockTributeGuestbook,
  type MockBanner,
} from '@/lib/mock'
import type { RankingItem, UnitFilter, TimelineItem } from '@/types/common'
import type {
  Season, Profile, Organization, Notice, Donation, Post, Comment,
  Schedule, Signature, VipReward, VipImage, MediaContent, Banner,
  LiveStatus, TributeGuestbook, InsertTables, UpdateTables
} from '@/types/database'

// ============================================
// Mock ID Generator
// ============================================
let mockIdCounter = 10000

function generateMockId(): number {
  return ++mockIdCounter
}

function generateMockUuid(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

// ============================================
// Convert MockBanner to DB Banner type
// ============================================
function convertMockBannerToDBBanner(mockBanner: MockBanner): Banner {
  const now = getCurrentTimestamp()
  return {
    id: mockBanner.id,
    title: mockBanner.title,
    image_url: mockBanner.imageUrl || mockBanner.memberImageUrl || '',
    link_url: mockBanner.linkUrl || null,
    display_order: mockBanner.displayOrder,
    is_active: mockBanner.isActive,
    created_at: now,
    updated_at: now,
  }
}

// ============================================
// In-Memory Data Store (Mutable copies)
// ============================================
const store = {
  profiles: [...mockProfiles] as Profile[],
  seasons: [...mockSeasons] as Season[],
  organization: [...mockOrganization] as Organization[],
  notices: [...mockNotices] as Notice[],
  posts: [...mockPosts] as Post[],
  donations: [...mockDonations] as Donation[],
  comments: [...mockComments] as Comment[],
  timelineEvents: [...mockTimelineEvents],
  schedules: [...mockSchedules] as Schedule[],
  signatures: [...mockSignatures] as Signature[],
  vipRewards: [...mockVipRewardsDB] as VipReward[],
  vipImages: [...mockVipImages] as VipImage[],
  media: [...mockMediaContent] as MediaContent[],
  banners: mockBanners.map(convertMockBannerToDBBanner),
  liveStatus: [...mockLiveStatus] as LiveStatus[],
  guestbook: [...mockTributeGuestbook] as TributeGuestbook[],
}

// ============================================
// Mock Ranking Repository
// ============================================
class MockRankingRepository implements IRankingRepository {
  async getRankings(options: {
    seasonId?: number | null
    unitFilter?: UnitFilter
  }): Promise<RankingItem[]> {
    const { seasonId, unitFilter } = options

    if (seasonId) {
      let seasonDonations = store.donations.filter(d => d.season_id === seasonId)

      if (unitFilter && unitFilter !== 'all' && unitFilter !== 'vip') {
        seasonDonations = seasonDonations.filter(d => d.unit === unitFilter)
      }

      const donorMap = new Map<string, {
        donorId: string | null
        donorName: string
        avatarUrl: string | null
        totalAmount: number
      }>()

      seasonDonations.forEach(donation => {
        const key = donation.donor_id || donation.donor_name
        const existing = donorMap.get(key)
        if (existing) {
          existing.totalAmount += donation.amount
        } else {
          const profile = store.profiles.find(p => p.id === donation.donor_id)
          donorMap.set(key, {
            donorId: donation.donor_id,
            donorName: profile?.nickname || donation.donor_name,
            avatarUrl: profile?.avatar_url || null,
            totalAmount: donation.amount,
          })
        }
      })

      let sorted = Array.from(donorMap.values())
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .map((item, index) => ({
          ...item,
          seasonId,
          rank: index + 1,
        }))

      if (unitFilter === 'vip') {
        sorted = sorted.slice(0, 50)
      }

      return sorted
    }

    let profiles = [...store.profiles]

    if (unitFilter && unitFilter !== 'all' && unitFilter !== 'vip') {
      profiles = profiles.filter(p => p.unit === unitFilter)
    }

    let sorted = profiles
      .filter(p => (p.total_donation || 0) > 0)
      .sort((a, b) => (b.total_donation || 0) - (a.total_donation || 0))
      .map((profile, index) => ({
        donorId: profile.id,
        donorName: profile.nickname,
        avatarUrl: profile.avatar_url,
        totalAmount: profile.total_donation || 0,
        seasonId: undefined,
        rank: index + 1,
      }))

    if (unitFilter === 'vip') {
      sorted = sorted.slice(0, 50)
    }

    return sorted
  }

  async getTopRankers(limit: number): Promise<RankingItem[]> {
    const rankings = await this.getRankings({})
    return rankings.slice(0, limit)
  }
}

// ============================================
// Mock Season Repository (Full CRUD)
// ============================================
class MockSeasonRepository implements ISeasonRepository {
  async findById(id: number): Promise<Season | null> {
    return store.seasons.find(s => s.id === id) || null
  }

  async findActive(): Promise<Season | null> {
    return store.seasons.find(s => s.is_active) || null
  }

  async findAll(): Promise<Season[]> {
    return store.seasons
  }

  async create(data: InsertTables<'seasons'>): Promise<Season> {
    const newSeason: Season = {
      id: generateMockId(),
      name: data.name,
      start_date: data.start_date,
      end_date: data.end_date || null,
      is_active: data.is_active ?? false,
      created_at: getCurrentTimestamp(),
    }
    store.seasons.push(newSeason)
    return newSeason
  }

  async update(id: number, data: UpdateTables<'seasons'>): Promise<Season> {
    const index = store.seasons.findIndex(s => s.id === id)
    if (index === -1) throw new Error(`Season ${id} not found`)

    store.seasons[index] = { ...store.seasons[index], ...data }
    return store.seasons[index]
  }

  async delete(id: number): Promise<void> {
    const index = store.seasons.findIndex(s => s.id === id)
    if (index === -1) throw new Error(`Season ${id} not found`)
    store.seasons.splice(index, 1)
  }
}

// ============================================
// Mock Profile Repository (Full CRUD)
// ============================================
class MockProfileRepository implements IProfileRepository {
  async findById(id: string): Promise<Profile | null> {
    return store.profiles.find(p => p.id === id) || null
  }

  async findByNickname(nickname: string): Promise<Profile | null> {
    return store.profiles.find(p => p.nickname === nickname) || null
  }

  async findVipMembers(): Promise<Profile[]> {
    return store.profiles.filter(p => p.role === 'vip')
  }

  async findAll(): Promise<Profile[]> {
    return store.profiles
  }

  async create(data: InsertTables<'profiles'>): Promise<Profile> {
    const newProfile: Profile = {
      id: data.id || generateMockUuid(),
      nickname: data.nickname || '',
      email: data.email || null,
      avatar_url: data.avatar_url || null,
      role: data.role || 'member',
      unit: data.unit || null,
      total_donation: data.total_donation || 0,
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
    }
    store.profiles.push(newProfile)
    return newProfile
  }

  async update(id: string, data: UpdateTables<'profiles'>): Promise<Profile> {
    const index = store.profiles.findIndex(p => p.id === id)
    if (index === -1) throw new Error(`Profile ${id} not found`)

    store.profiles[index] = {
      ...store.profiles[index],
      ...data,
      updated_at: getCurrentTimestamp(),
    }
    return store.profiles[index]
  }

  async delete(id: string): Promise<void> {
    const index = store.profiles.findIndex(p => p.id === id)
    if (index === -1) throw new Error(`Profile ${id} not found`)
    store.profiles.splice(index, 1)
  }
}

// ============================================
// Mock Donation Repository (Full CRUD)
// ============================================
class MockDonationRepository implements IDonationRepository {
  async findById(id: number): Promise<Donation | null> {
    return store.donations.find(d => d.id === id) || null
  }

  async findByDonor(donorId: string): Promise<Donation[]> {
    return store.donations.filter(d => d.donor_id === donorId)
  }

  async findBySeason(seasonId: number): Promise<Donation[]> {
    return store.donations.filter(d => d.season_id === seasonId)
  }

  async findAll(): Promise<Donation[]> {
    return store.donations
  }

  async getTotal(donorId: string): Promise<number> {
    const donations = await this.findByDonor(donorId)
    return donations.reduce((sum, d) => sum + d.amount, 0)
  }

  async create(data: InsertTables<'donations'>): Promise<Donation> {
    const newDonation: Donation = {
      id: generateMockId(),
      donor_id: data.donor_id || null,
      donor_name: data.donor_name,
      amount: data.amount,
      season_id: data.season_id,
      episode_id: data.episode_id ?? null,
      unit: data.unit || null,
      message: data.message || null,
      created_at: getCurrentTimestamp(),
    }
    store.donations.push(newDonation)
    return newDonation
  }

  async update(id: number, data: UpdateTables<'donations'>): Promise<Donation> {
    const index = store.donations.findIndex(d => d.id === id)
    if (index === -1) throw new Error(`Donation ${id} not found`)

    store.donations[index] = { ...store.donations[index], ...data }
    return store.donations[index]
  }

  async delete(id: number): Promise<void> {
    const index = store.donations.findIndex(d => d.id === id)
    if (index === -1) throw new Error(`Donation ${id} not found`)
    store.donations.splice(index, 1)
  }
}

// ============================================
// Mock Organization Repository (Full CRUD)
// ============================================
class MockOrganizationRepository implements IOrganizationRepository {
  async findById(id: number): Promise<Organization | null> {
    return store.organization.find(o => o.id === id) || null
  }

  async findByUnit(unit: 'excel' | 'crew'): Promise<Organization[]> {
    return store.organization.filter(o => o.unit === unit)
  }

  async findLiveMembers(): Promise<Organization[]> {
    return store.organization.filter(o => o.is_live)
  }

  async findAll(): Promise<Organization[]> {
    return store.organization
  }

  async create(data: InsertTables<'organization'>): Promise<Organization> {
    const newOrg: Organization = {
      id: generateMockId(),
      name: data.name,
      role: data.role,
      unit: data.unit,
      profile_id: data.profile_id || null,
      parent_id: data.parent_id || null,
      position_order: data.position_order || 0,
      image_url: data.image_url || null,
      social_links: data.social_links || null,
      profile_info: data.profile_info || null,
      is_active: data.is_active ?? true,
      is_live: data.is_live ?? false,
      created_at: getCurrentTimestamp(),
    }
    store.organization.push(newOrg)
    return newOrg
  }

  async update(id: number, data: UpdateTables<'organization'>): Promise<Organization> {
    const index = store.organization.findIndex(o => o.id === id)
    if (index === -1) throw new Error(`Organization member ${id} not found`)

    store.organization[index] = { ...store.organization[index], ...data }
    return store.organization[index]
  }

  async delete(id: number): Promise<void> {
    const index = store.organization.findIndex(o => o.id === id)
    if (index === -1) throw new Error(`Organization member ${id} not found`)
    store.organization.splice(index, 1)
  }
}

// ============================================
// Mock Notice Repository (Full CRUD)
// ============================================
class MockNoticeRepository implements INoticeRepository {
  async findById(id: number): Promise<Notice | null> {
    return store.notices.find(n => n.id === id) || null
  }

  async findRecent(limit: number): Promise<Notice[]> {
    return store.notices
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
  }

  async findPublished(): Promise<Notice[]> {
    // All notices are considered published in mock
    return store.notices
  }

  async findAll(): Promise<Notice[]> {
    return store.notices
  }

  async create(data: InsertTables<'notices'>): Promise<Notice> {
    const now = getCurrentTimestamp()
    const newNotice: Notice = {
      id: generateMockId(),
      title: data.title,
      content: data.content,
      category: data.category,
      thumbnail_url: data.thumbnail_url || null,
      is_pinned: data.is_pinned ?? false,
      view_count: data.view_count || 0,
      author_id: data.author_id || null,
      created_at: now,
      updated_at: now,
    }
    store.notices.push(newNotice)
    return newNotice
  }

  async update(id: number, data: UpdateTables<'notices'>): Promise<Notice> {
    const index = store.notices.findIndex(n => n.id === id)
    if (index === -1) throw new Error(`Notice ${id} not found`)

    store.notices[index] = {
      ...store.notices[index],
      ...data,
      updated_at: getCurrentTimestamp(),
    }
    return store.notices[index]
  }

  async delete(id: number): Promise<void> {
    const index = store.notices.findIndex(n => n.id === id)
    if (index === -1) throw new Error(`Notice ${id} not found`)
    store.notices.splice(index, 1)
  }
}

// ============================================
// Mock Post Repository (Full CRUD)
// ============================================
class MockPostRepository implements IPostRepository {
  async findById(id: number): Promise<Post | null> {
    return store.posts.find(p => p.id === id && !p.is_deleted) || null
  }

  async findByCategory(category: string): Promise<Post[]> {
    return store.posts.filter(p => p.board_type === category && !p.is_deleted)
  }

  async findRecent(limit: number): Promise<Post[]> {
    return store.posts
      .filter(p => !p.is_deleted)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
  }

  async findAll(): Promise<Post[]> {
    return store.posts.filter(p => !p.is_deleted)
  }

  async create(data: InsertTables<'posts'>): Promise<Post> {
    const now = getCurrentTimestamp()
    const newPost: Post = {
      id: generateMockId(),
      board_type: data.board_type,
      title: data.title,
      content: data.content,
      author_id: data.author_id,
      view_count: data.view_count || 0,
      like_count: data.like_count || 0,
      comment_count: data.comment_count || 0,
      is_anonymous: data.is_anonymous ?? false,
      is_deleted: false,
      created_at: now,
      updated_at: now,
    }
    store.posts.push(newPost)
    return newPost
  }

  async update(id: number, data: UpdateTables<'posts'>): Promise<Post> {
    const index = store.posts.findIndex(p => p.id === id)
    if (index === -1) throw new Error(`Post ${id} not found`)

    store.posts[index] = {
      ...store.posts[index],
      ...data,
      updated_at: getCurrentTimestamp(),
    }
    return store.posts[index]
  }

  async delete(id: number): Promise<void> {
    const index = store.posts.findIndex(p => p.id === id)
    if (index === -1) throw new Error(`Post ${id} not found`)
    // Soft delete
    store.posts[index].is_deleted = true
  }

  async incrementViewCount(id: number): Promise<void> {
    const post = store.posts.find(p => p.id === id)
    if (post) {
      post.view_count = (post.view_count || 0) + 1
    }
  }
}

// ============================================
// Mock Comment Repository (Full CRUD)
// ============================================
class MockCommentRepository implements ICommentRepository {
  async findById(id: number): Promise<Comment | null> {
    return store.comments.find(c => c.id === id && !c.is_deleted) || null
  }

  async findByPostId(postId: number): Promise<Comment[]> {
    return store.comments
      .filter(c => c.post_id === postId && !c.is_deleted)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }

  async findAll(): Promise<Comment[]> {
    return store.comments.filter(c => !c.is_deleted)
  }

  async create(data: InsertTables<'comments'>): Promise<Comment> {
    const newComment: Comment = {
      id: generateMockId(),
      post_id: data.post_id,
      author_id: data.author_id,
      parent_id: data.parent_id || null,
      content: data.content,
      is_anonymous: data.is_anonymous ?? false,
      is_deleted: false,
      created_at: getCurrentTimestamp(),
    }
    store.comments.push(newComment)
    return newComment
  }

  async update(id: number, data: UpdateTables<'comments'>): Promise<Comment> {
    const index = store.comments.findIndex(c => c.id === id)
    if (index === -1) throw new Error(`Comment ${id} not found`)

    store.comments[index] = {
      ...store.comments[index],
      ...data,
    }
    return store.comments[index]
  }

  async delete(id: number): Promise<void> {
    const index = store.comments.findIndex(c => c.id === id)
    if (index === -1) throw new Error(`Comment ${id} not found`)
    // Soft delete
    store.comments[index].is_deleted = true
  }
}

// ============================================
// Mock Timeline Repository (Full CRUD)
// ============================================
class MockTimelineRepository implements ITimelineRepository {
  private formatEvent(event: (typeof store.timelineEvents)[0]): TimelineItem {
    const season = store.seasons.find(s => s.id === event.season_id)
    return {
      id: event.id,
      eventDate: event.event_date,
      title: event.title,
      description: event.description,
      imageUrl: event.image_url,
      category: event.category,
      seasonId: event.season_id,
      seasonName: season?.name,
    }
  }

  async findById(id: number): Promise<TimelineItem | null> {
    const event = store.timelineEvents.find(e => e.id === id)
    return event ? this.formatEvent(event) : null
  }

  async findAll(): Promise<TimelineItem[]> {
    return store.timelineEvents
      .map(e => this.formatEvent(e))
      .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
  }

  async findByFilter(options: {
    seasonId?: number | null
    category?: string | null
  }): Promise<TimelineItem[]> {
    const { seasonId, category } = options
    let events = [...store.timelineEvents]

    if (seasonId) {
      events = events.filter(e => e.season_id === seasonId)
    }

    if (category) {
      events = events.filter(e => e.category === category)
    }

    return events
      .map(e => this.formatEvent(e))
      .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
  }

  async getCategories(): Promise<string[]> {
    const cats = new Set<string>()
    store.timelineEvents.forEach(e => {
      if (e.category) cats.add(e.category)
    })
    return Array.from(cats)
  }

  async create(data: InsertTables<'timeline_events'>): Promise<TimelineItem> {
    const newEvent = {
      id: generateMockId(),
      event_date: data.event_date,
      title: data.title,
      description: data.description || null,
      image_url: data.image_url || null,
      category: data.category || null,
      season_id: data.season_id || null,
      order_index: data.order_index || 0,
      created_at: getCurrentTimestamp(),
    }
    store.timelineEvents.push(newEvent)
    return this.formatEvent(newEvent)
  }

  async update(id: number, data: UpdateTables<'timeline_events'>): Promise<TimelineItem> {
    const index = store.timelineEvents.findIndex(e => e.id === id)
    if (index === -1) throw new Error(`Timeline event ${id} not found`)

    store.timelineEvents[index] = { ...store.timelineEvents[index], ...data }
    return this.formatEvent(store.timelineEvents[index])
  }

  async delete(id: number): Promise<void> {
    const index = store.timelineEvents.findIndex(e => e.id === id)
    if (index === -1) throw new Error(`Timeline event ${id} not found`)
    store.timelineEvents.splice(index, 1)
  }
}

// ============================================
// Mock Schedule Repository (Full CRUD)
// ============================================
class MockScheduleRepository implements IScheduleRepository {
  async findById(id: number): Promise<Schedule | null> {
    return store.schedules.find(s => s.id === id) || null
  }

  async findByMonth(year: number, month: number): Promise<Schedule[]> {
    return store.schedules.filter(s => {
      const date = new Date(s.start_datetime)
      return date.getFullYear() === year && date.getMonth() === month
    })
  }

  async findByMonthAndUnit(year: number, month: number, unit: string | null): Promise<Schedule[]> {
    let schedules = await this.findByMonth(year, month)

    if (unit && unit !== 'all') {
      schedules = schedules.filter(s => s.unit === unit || s.unit === null)
    }

    return schedules.sort((a, b) =>
      new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
    )
  }

  async findAll(): Promise<Schedule[]> {
    return store.schedules
  }

  async create(data: InsertTables<'schedules'>): Promise<Schedule> {
    const newSchedule: Schedule = {
      id: generateMockId(),
      title: data.title,
      description: data.description || null,
      start_datetime: data.start_datetime,
      end_datetime: data.end_datetime || null,
      unit: data.unit || null,
      event_type: data.event_type,
      location: data.location || null,
      is_all_day: data.is_all_day ?? false,
      color: data.color || null,
      created_by: data.created_by || null,
      created_at: getCurrentTimestamp(),
    }
    store.schedules.push(newSchedule)
    return newSchedule
  }

  async update(id: number, data: UpdateTables<'schedules'>): Promise<Schedule> {
    const index = store.schedules.findIndex(s => s.id === id)
    if (index === -1) throw new Error(`Schedule ${id} not found`)

    store.schedules[index] = {
      ...store.schedules[index],
      ...data,
    }
    return store.schedules[index]
  }

  async delete(id: number): Promise<void> {
    const index = store.schedules.findIndex(s => s.id === id)
    if (index === -1) throw new Error(`Schedule ${id} not found`)
    store.schedules.splice(index, 1)
  }
}

// ============================================
// Mock Signature Repository (Full CRUD)
// ============================================
class MockSignatureRepository implements ISignatureRepository {
  async findById(id: number): Promise<Signature | null> {
    return store.signatures.find(s => s.id === id) || null
  }

  async findByUnit(unit: 'excel' | 'crew'): Promise<Signature[]> {
    return store.signatures
      .filter(s => s.unit === unit)
      .sort((a, b) => a.sig_number - b.sig_number)
  }

  async findAll(): Promise<Signature[]> {
    return [...store.signatures].sort((a, b) => a.sig_number - b.sig_number)
  }

  async create(data: InsertTables<'signatures'>): Promise<Signature> {
    const newSignature: Signature = {
      id: generateMockId(),
      sig_number: data.sig_number,
      title: data.title,
      description: data.description || null,
      thumbnail_url: data.thumbnail_url || null,
      unit: data.unit,
      is_group: data.is_group ?? false,
      created_at: getCurrentTimestamp(),
    }
    store.signatures.push(newSignature)
    return newSignature
  }

  async update(id: number, data: UpdateTables<'signatures'>): Promise<Signature> {
    const index = store.signatures.findIndex(s => s.id === id)
    if (index === -1) throw new Error(`Signature ${id} not found`)

    store.signatures[index] = { ...store.signatures[index], ...data }
    return store.signatures[index]
  }

  async delete(id: number): Promise<void> {
    const index = store.signatures.findIndex(s => s.id === id)
    if (index === -1) throw new Error(`Signature ${id} not found`)
    store.signatures.splice(index, 1)
  }
}

// ============================================
// Mock VIP Reward Repository (Full CRUD)
// ============================================
class MockVipRewardRepository implements IVipRewardRepository {
  async findById(id: number): Promise<VipReward | null> {
    return store.vipRewards.find(r => r.id === id) || null
  }

  async findByProfile(profileId: string): Promise<VipReward[]> {
    return store.vipRewards.filter(r => r.profile_id === profileId)
  }

  async findBySeason(seasonId: number): Promise<VipReward[]> {
    return store.vipRewards.filter(r => r.season_id === seasonId)
  }

  async findAll(): Promise<VipReward[]> {
    return store.vipRewards
  }

  async create(data: InsertTables<'vip_rewards'>): Promise<VipReward> {
    const newReward: VipReward = {
      id: generateMockId(),
      profile_id: data.profile_id,
      season_id: data.season_id,
      rank: data.rank,
      personal_message: data.personal_message || null,
      dedication_video_url: data.dedication_video_url || null,
      created_at: getCurrentTimestamp(),
    }
    store.vipRewards.push(newReward)
    return newReward
  }

  async update(id: number, data: UpdateTables<'vip_rewards'>): Promise<VipReward> {
    const index = store.vipRewards.findIndex(r => r.id === id)
    if (index === -1) throw new Error(`VIP Reward ${id} not found`)

    store.vipRewards[index] = { ...store.vipRewards[index], ...data }
    return store.vipRewards[index]
  }

  async delete(id: number): Promise<void> {
    const index = store.vipRewards.findIndex(r => r.id === id)
    if (index === -1) throw new Error(`VIP Reward ${id} not found`)
    store.vipRewards.splice(index, 1)
  }
}

// ============================================
// Mock VIP Image Repository (Full CRUD)
// ============================================
class MockVipImageRepository implements IVipImageRepository {
  async findById(id: number): Promise<VipImage | null> {
    return store.vipImages.find(i => i.id === id) || null
  }

  async findByReward(rewardId: number): Promise<VipImage[]> {
    return store.vipImages.filter(i => i.reward_id === rewardId)
  }

  async findAll(): Promise<VipImage[]> {
    return store.vipImages
  }

  async create(data: InsertTables<'vip_images'>): Promise<VipImage> {
    const newImage: VipImage = {
      id: generateMockId(),
      reward_id: data.reward_id,
      image_url: data.image_url,
      title: data.title || null,
      order_index: data.order_index || 0,
      created_at: getCurrentTimestamp(),
    }
    store.vipImages.push(newImage)
    return newImage
  }

  async update(id: number, data: UpdateTables<'vip_images'>): Promise<VipImage> {
    const index = store.vipImages.findIndex(i => i.id === id)
    if (index === -1) throw new Error(`VIP Image ${id} not found`)

    store.vipImages[index] = { ...store.vipImages[index], ...data }
    return store.vipImages[index]
  }

  async delete(id: number): Promise<void> {
    const index = store.vipImages.findIndex(i => i.id === id)
    if (index === -1) throw new Error(`VIP Image ${id} not found`)
    store.vipImages.splice(index, 1)
  }
}

// ============================================
// Mock Media Repository (Full CRUD)
// ============================================
class MockMediaRepository implements IMediaRepository {
  async findById(id: number): Promise<MediaContent | null> {
    return store.media.find(m => m.id === id) || null
  }

  async findByType(type: 'shorts' | 'vod'): Promise<MediaContent[]> {
    return store.media.filter(m => m.content_type === type)
  }

  async findFeatured(): Promise<MediaContent[]> {
    return store.media.filter(m => m.is_featured)
  }

  async findAll(): Promise<MediaContent[]> {
    return store.media
  }

  async create(data: InsertTables<'media_content'>): Promise<MediaContent> {
    const newMedia: MediaContent = {
      id: generateMockId(),
      content_type: data.content_type,
      title: data.title,
      description: data.description || null,
      video_url: data.video_url,
      thumbnail_url: data.thumbnail_url || null,
      unit: data.unit || null,
      duration: data.duration || null,
      view_count: data.view_count || 0,
      is_featured: data.is_featured ?? false,
      created_at: getCurrentTimestamp(),
    }
    store.media.push(newMedia)
    return newMedia
  }

  async update(id: number, data: UpdateTables<'media_content'>): Promise<MediaContent> {
    const index = store.media.findIndex(m => m.id === id)
    if (index === -1) throw new Error(`Media ${id} not found`)

    store.media[index] = { ...store.media[index], ...data }
    return store.media[index]
  }

  async delete(id: number): Promise<void> {
    const index = store.media.findIndex(m => m.id === id)
    if (index === -1) throw new Error(`Media ${id} not found`)
    store.media.splice(index, 1)
  }
}

// ============================================
// Mock Banner Repository (Full CRUD)
// ============================================
class MockBannerRepository implements IBannerRepository {
  async findById(id: number): Promise<Banner | null> {
    return store.banners.find(b => b.id === id) || null
  }

  async findActive(): Promise<Banner[]> {
    return store.banners
      .filter(b => b.is_active)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
  }

  async findAll(): Promise<Banner[]> {
    return store.banners
  }

  async create(data: InsertTables<'banners'>): Promise<Banner> {
    const now = getCurrentTimestamp()
    const newBanner: Banner = {
      id: generateMockId(),
      title: data.title || null,
      image_url: data.image_url,
      link_url: data.link_url || null,
      display_order: data.display_order || 0,
      is_active: data.is_active ?? true,
      created_at: now,
      updated_at: now,
    }
    store.banners.push(newBanner)
    return newBanner
  }

  async update(id: number, data: UpdateTables<'banners'>): Promise<Banner> {
    const index = store.banners.findIndex(b => b.id === id)
    if (index === -1) throw new Error(`Banner ${id} not found`)

    store.banners[index] = { ...store.banners[index], ...data }
    return store.banners[index]
  }

  async delete(id: number): Promise<void> {
    const index = store.banners.findIndex(b => b.id === id)
    if (index === -1) throw new Error(`Banner ${id} not found`)
    store.banners.splice(index, 1)
  }
}

// ============================================
// Mock Live Status Repository (Full CRUD)
// ============================================
class MockLiveStatusRepository implements ILiveStatusRepository {
  async findById(id: number): Promise<LiveStatus | null> {
    return store.liveStatus.find(l => l.id === id) || null
  }

  async findByMember(memberId: number): Promise<LiveStatus[]> {
    return store.liveStatus.filter(l => l.member_id === memberId)
  }

  async findLive(): Promise<LiveStatus[]> {
    return store.liveStatus.filter(l => l.is_live)
  }

  async findAll(): Promise<LiveStatus[]> {
    return store.liveStatus
  }

  async create(data: InsertTables<'live_status'>): Promise<LiveStatus> {
    const newStatus: LiveStatus = {
      id: generateMockId(),
      member_id: data.member_id,
      platform: data.platform,
      stream_url: data.stream_url,
      thumbnail_url: data.thumbnail_url || null,
      is_live: data.is_live ?? false,
      viewer_count: data.viewer_count || 0,
      last_checked: data.last_checked || getCurrentTimestamp(),
    }
    store.liveStatus.push(newStatus)
    return newStatus
  }

  async update(id: number, data: UpdateTables<'live_status'>): Promise<LiveStatus> {
    const index = store.liveStatus.findIndex(l => l.id === id)
    if (index === -1) throw new Error(`Live status ${id} not found`)

    store.liveStatus[index] = {
      ...store.liveStatus[index],
      ...data,
      last_checked: getCurrentTimestamp(),
    }
    return store.liveStatus[index]
  }

  async delete(id: number): Promise<void> {
    const index = store.liveStatus.findIndex(l => l.id === id)
    if (index === -1) throw new Error(`Live status ${id} not found`)
    store.liveStatus.splice(index, 1)
  }

  async upsertByMemberAndPlatform(data: InsertTables<'live_status'>): Promise<LiveStatus> {
    const existingIndex = store.liveStatus.findIndex(
      l => l.member_id === data.member_id && l.platform === data.platform
    )

    if (existingIndex >= 0) {
      store.liveStatus[existingIndex] = {
        ...store.liveStatus[existingIndex],
        ...data,
        last_checked: getCurrentTimestamp(),
      }
      return store.liveStatus[existingIndex]
    }

    return this.create(data)
  }
}

// ============================================
// Mock Guestbook Repository (Full CRUD)
// ============================================
class MockGuestbookRepository implements IGuestbookRepository {
  async findById(id: number): Promise<TributeGuestbook | null> {
    return store.guestbook.find(g => g.id === id && !g.is_deleted) || null
  }

  async findByTributeUser(tributeUserId: string): Promise<TributeGuestbook[]> {
    return store.guestbook
      .filter(g => g.tribute_user_id === tributeUserId && !g.is_deleted)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  async findApproved(tributeUserId: string): Promise<TributeGuestbook[]> {
    return store.guestbook
      .filter(g => g.tribute_user_id === tributeUserId && g.is_approved && !g.is_deleted)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  async findAll(): Promise<TributeGuestbook[]> {
    return store.guestbook.filter(g => !g.is_deleted)
  }

  async create(data: InsertTables<'tribute_guestbook'>): Promise<TributeGuestbook> {
    const now = getCurrentTimestamp()
    const newEntry: TributeGuestbook = {
      id: generateMockId(),
      tribute_user_id: data.tribute_user_id,
      author_id: data.author_id || null,
      author_name: data.author_name,
      message: data.message,
      is_member: data.is_member ?? false,
      is_approved: data.is_approved ?? false,
      is_deleted: false,
      created_at: now,
      updated_at: now,
    }
    store.guestbook.push(newEntry)
    return newEntry
  }

  async update(id: number, data: UpdateTables<'tribute_guestbook'>): Promise<TributeGuestbook> {
    const index = store.guestbook.findIndex(g => g.id === id)
    if (index === -1) throw new Error(`Guestbook entry ${id} not found`)

    store.guestbook[index] = { ...store.guestbook[index], ...data }
    return store.guestbook[index]
  }

  async delete(id: number): Promise<void> {
    const index = store.guestbook.findIndex(g => g.id === id)
    if (index === -1) throw new Error(`Guestbook entry ${id} not found`)
    // Soft delete
    store.guestbook[index].is_deleted = true
  }
}

// ============================================
// Mock Data Provider (Facade Pattern)
// ============================================
export class MockDataProvider implements IDataProvider {
  readonly rankings = new MockRankingRepository()
  readonly seasons = new MockSeasonRepository()
  readonly profiles = new MockProfileRepository()
  readonly donations = new MockDonationRepository()
  readonly organization = new MockOrganizationRepository()
  readonly notices = new MockNoticeRepository()
  readonly posts = new MockPostRepository()
  readonly comments = new MockCommentRepository()
  readonly timeline = new MockTimelineRepository()
  readonly schedules = new MockScheduleRepository()
  readonly signatures = new MockSignatureRepository()
  readonly vipRewards = new MockVipRewardRepository()
  readonly vipImages = new MockVipImageRepository()
  readonly media = new MockMediaRepository()
  readonly banners = new MockBannerRepository()
  readonly liveStatus = new MockLiveStatusRepository()
  readonly guestbook = new MockGuestbookRepository()
}

// Singleton instance
export const mockDataProvider = new MockDataProvider()

// ============================================
// Store Reset (for testing)
// ============================================
export function resetMockStore(): void {
  store.profiles = [...mockProfiles] as Profile[]
  store.seasons = [...mockSeasons] as Season[]
  store.organization = [...mockOrganization] as Organization[]
  store.notices = [...mockNotices] as Notice[]
  store.posts = [...mockPosts] as Post[]
  store.donations = [...mockDonations] as Donation[]
  store.comments = [...mockComments] as Comment[]
  store.timelineEvents = [...mockTimelineEvents]
  store.schedules = [...mockSchedules] as Schedule[]
  store.signatures = [...mockSignatures] as Signature[]
  store.vipRewards = [...mockVipRewardsDB] as VipReward[]
  store.vipImages = [...mockVipImages] as VipImage[]
  store.media = [...mockMediaContent] as MediaContent[]
  store.banners = mockBanners.map(convertMockBannerToDBBanner)
  store.liveStatus = [...mockLiveStatus] as LiveStatus[]
  store.guestbook = [...mockTributeGuestbook] as TributeGuestbook[]
  mockIdCounter = 10000
}
