/**
 * Supabase Repository Implementations (Full CRUD)
 * 실제 데이터베이스 저장소
 *
 * 연결 안정성 개선:
 * - 모든 쿼리에 타임아웃 적용 (10초)
 * - 네트워크 에러 시 자동 재시도 (3회, 지수 백오프)
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import {
  IRankingRepository,
  ISeasonRepository,
  IProfileRepository,
  IOrganizationRepository,
  INoticeRepository,
  IDataProvider,
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
  IBjMessageRepository,
} from '../types'
import type { RankingItem, UnitFilter, TimelineItem, JoinedSeason } from '@/types/common'
import type {
  Season, Profile, Organization, Notice, Post, Schedule,
  Comment, Signature, VipReward, VipImage, MediaContent, LiveStatus, Banner, TributeGuestbook,
  BjThankYouMessage, InsertTables, UpdateTables
} from '@/types/database'

// ============================================
// Supabase Ranking Repository
// ============================================
class SupabaseRankingRepository implements IRankingRepository {
  constructor(private supabase: SupabaseClient) {}

  async getRankings(options: {
    seasonId?: number | null
    unitFilter?: UnitFilter
  }): Promise<RankingItem[]> {
    const { seasonId, unitFilter } = options

    // 시즌 ID가 있으면 season_donation_rankings 테이블에서 조회
    if (seasonId) {
      // unit 필터가 있으면 DB 레벨에서 필터링
      const { data, error } = await withRetry(async () => {
        let query = this.supabase
          .from('season_donation_rankings')
          .select('rank, donor_name, total_amount, donation_count, unit')
          .eq('season_id', seasonId)

        // unit 필터 적용 (DB 레벨)
        if (unitFilter && unitFilter !== 'all' && unitFilter !== 'vip') {
          query = query.eq('unit', unitFilter)
        }

        return query.order('rank', { ascending: true }).limit(50)
      })

      if (error) throw error

      // 닉네임으로 프로필 정보 조회 (아바타용)
      const donorNames = (data || []).map(d => d.donor_name)
      const { data: profilesData } = await this.supabase
        .from('profiles')
        .select('id, nickname, avatar_url')
        .in('nickname', donorNames)

      const nicknameToProfile: Record<string, { id: string; avatar_url: string | null }> = {}
      ;(profilesData || []).forEach(p => {
        if (p.nickname) {
          nicknameToProfile[p.nickname] = { id: p.id, avatar_url: p.avatar_url }
        }
      })

      // 필터 후 순위 재계산
      return (data || []).map((item, index) => ({
        donorId: nicknameToProfile[item.donor_name]?.id || null,
        donorName: item.donor_name,
        avatarUrl: nicknameToProfile[item.donor_name]?.avatar_url || null,
        totalAmount: item.total_amount,
        rank: index + 1, // 필터된 결과에서 새로운 순위
        seasonId,
      }))
    }

    // 시즌 ID가 없으면 total_donation_rankings 테이블에서 조회
    const { data, error } = await withRetry(async () => {
      return this.supabase
        .from('total_donation_rankings')
        .select('rank, donor_name, total_amount')
        .order('rank', { ascending: true })
        .limit(50)
    })

    if (error) throw error

    // 닉네임으로 프로필 정보 조회 (아바타용)
    const donorNames = (data || []).map(d => d.donor_name)
    const { data: profilesData } = await this.supabase
      .from('profiles')
      .select('id, nickname, avatar_url')
      .in('nickname', donorNames)

    const nicknameToProfile: Record<string, { id: string; avatar_url: string | null }> = {}
    ;(profilesData || []).forEach(p => {
      if (p.nickname) {
        nicknameToProfile[p.nickname] = { id: p.id, avatar_url: p.avatar_url }
      }
    })

    return (data || []).map((item) => ({
      donorId: nicknameToProfile[item.donor_name]?.id || null,
      donorName: item.donor_name,
      avatarUrl: nicknameToProfile[item.donor_name]?.avatar_url || null,
      totalAmount: item.total_amount,
      rank: item.rank,
      seasonId: undefined,
    }))
  }

  async getTopRankers(limit: number): Promise<RankingItem[]> {
    const rankings = await this.getRankings({})
    return rankings.slice(0, limit)
  }
}

// ============================================
// Supabase Season Repository
// ============================================
class SupabaseSeasonRepository implements ISeasonRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<Season | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('seasons').select('*').eq('id', id).single()
    )
    return data
  }

  async findActive(): Promise<Season | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('seasons').select('*').eq('is_active', true).single()
    )
    return data
  }

  async findAll(): Promise<Season[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('seasons').select('*').order('start_date', { ascending: false })
    )
    return data || []
  }

  async create(data: InsertTables<'seasons'>): Promise<Season> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('seasons').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'seasons'>): Promise<Season> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('seasons').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('seasons').delete().eq('id', id)
    )
    if (error) throw error
  }
}

// ============================================
// Supabase Profile Repository
// ============================================
class SupabaseProfileRepository implements IProfileRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string): Promise<Profile | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('profiles').select('*').eq('id', id).single()
    )
    return data
  }

  async findByNickname(nickname: string): Promise<Profile | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('profiles').select('*').eq('nickname', nickname).single()
    )
    return data
  }

  async findVipMembers(): Promise<Profile[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('profiles').select('*').eq('role', 'vip')
    )
    return data || []
  }

  async findAll(): Promise<Profile[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('profiles').select('*')
    )
    return data || []
  }

  async create(data: InsertTables<'profiles'>): Promise<Profile> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('profiles').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: string, data: UpdateTables<'profiles'>): Promise<Profile> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('profiles').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: string): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('profiles').delete().eq('id', id)
    )
    if (error) throw error
  }
}

// ============================================
// Supabase Organization Repository
// ============================================
class SupabaseOrganizationRepository implements IOrganizationRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<Organization | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('organization').select('*').eq('id', id).single()
    )
    return data
  }

  async findByUnit(unit: 'excel' | 'crew'): Promise<Organization[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('organization').select('*').eq('unit', unit).eq('is_active', true).order('position_order')
    )
    return data || []
  }

  async findLiveMembers(): Promise<Organization[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('organization').select('*').eq('is_live', true)
    )
    return data || []
  }

  async findAll(): Promise<Organization[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('organization').select('*').eq('is_active', true).order('position_order')
    )
    return data || []
  }

  async create(data: InsertTables<'organization'>): Promise<Organization> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('organization').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'organization'>): Promise<Organization> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('organization').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('organization').delete().eq('id', id)
    )
    if (error) throw error
  }
}

// ============================================
// Supabase Notice Repository
// ============================================
class SupabaseNoticeRepository implements INoticeRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<Notice | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('notices').select('*').eq('id', id).single()
    )
    return data
  }

  async findRecent(limit: number): Promise<Notice[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(limit)
    )
    return data || []
  }

  async findPublished(): Promise<Notice[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('notices').select('*').order('created_at', { ascending: false })
    )
    return data || []
  }

  async findAll(): Promise<Notice[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('notices').select('*').order('created_at', { ascending: false })
    )
    return data || []
  }

  async create(data: InsertTables<'notices'>): Promise<Notice> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('notices').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'notices'>): Promise<Notice> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('notices').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('notices').delete().eq('id', id)
    )
    if (error) throw error
  }
}

// ============================================
// Supabase Post Repository
// ============================================
class SupabasePostRepository implements IPostRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<Post | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('posts').select('*').eq('id', id).eq('is_deleted', false).single()
    )
    return data
  }

  async findByCategory(category: string): Promise<Post[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('posts').select('*').eq('board_type', category).eq('is_deleted', false).order('created_at', { ascending: false })
    )
    return data || []
  }

  async findRecent(limit: number): Promise<Post[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('posts').select('*').eq('is_deleted', false).order('created_at', { ascending: false }).limit(limit)
    )
    return data || []
  }

  async findAll(): Promise<Post[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('posts').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
    )
    return data || []
  }

  async create(data: InsertTables<'posts'>): Promise<Post> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('posts').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'posts'>): Promise<Post> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('posts').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    // Soft delete
    const { error } = await withRetry(async () =>
      await this.supabase.from('posts').update({ is_deleted: true }).eq('id', id)
    )
    if (error) throw error
  }

  async incrementViewCount(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.rpc('increment_view_count', { post_id: id })
    )
    // RPC가 없으면 직접 업데이트
    if (error) {
      const post = await this.findById(id)
      if (post) {
        await this.supabase.from('posts').update({ view_count: post.view_count + 1 }).eq('id', id)
      }
    }
  }
}

// ============================================
// Supabase Comment Repository
// ============================================
class SupabaseCommentRepository implements ICommentRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<Comment | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('comments').select('*').eq('id', id).eq('is_deleted', false).single()
    )
    return data
  }

  async findByPostId(postId: number): Promise<Comment[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('comments').select('*, profiles:author_id(nickname, avatar_url)').eq('post_id', postId).eq('is_deleted', false).order('created_at', { ascending: true })
    )
    return data || []
  }

  async findAll(): Promise<Comment[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('comments').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
    )
    return data || []
  }

  async create(data: InsertTables<'comments'>): Promise<Comment> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('comments').insert(data).select().single()
    )
    if (error) throw error

    // 게시글의 댓글 수 증가 (RPC 없으면 무시)
    try {
      await this.supabase.rpc('increment_comment_count', { p_post_id: data.post_id })
    } catch {
      // RPC function not available, ignore
    }

    return created!
  }

  async update(id: number, data: UpdateTables<'comments'>): Promise<Comment> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('comments').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    // Soft delete
    const { error } = await withRetry(async () =>
      await this.supabase.from('comments').update({ is_deleted: true }).eq('id', id)
    )
    if (error) throw error
  }
}

// ============================================
// Supabase Timeline Repository
// ============================================
class SupabaseTimelineRepository implements ITimelineRepository {
  constructor(private supabase: SupabaseClient) {}

  private formatEvent(event: Record<string, unknown>): TimelineItem {
    const season = event.seasons as JoinedSeason | null
    return {
      id: event.id as number,
      eventDate: event.event_date as string,
      title: event.title as string,
      description: event.description as string | null,
      imageUrl: event.image_url as string | null,
      category: event.category as string | null,
      seasonId: event.season_id as number | null,
      seasonName: season?.name,
    }
  }

  async findById(id: number): Promise<TimelineItem | null> {
    const { data, error } = await withRetry(async () =>
      await this.supabase.from('timeline_events').select('*, seasons(name)').eq('id', id).single()
    )
    if (error || !data) return null
    return this.formatEvent(data)
  }

  async findAll(): Promise<TimelineItem[]> {
    const { data, error } = await withRetry(async () =>
      await this.supabase.from('timeline_events').select('*, seasons(name)').order('event_date', { ascending: true })
    )
    if (error) throw error
    return (data || []).map(e => this.formatEvent(e))
  }

  async findByFilter(options: {
    seasonId?: number | null
    category?: string | null
  }): Promise<TimelineItem[]> {
    const { seasonId, category } = options

    const { data, error } = await withRetry(async () => {
      let query = this.supabase
        .from('timeline_events')
        .select('*, seasons(name)')
        .order('event_date', { ascending: true })

      if (seasonId) {
        query = query.eq('season_id', seasonId)
      }

      if (category) {
        query = query.eq('category', category)
      }

      return await query
    })

    if (error) throw error
    return (data || []).map(e => this.formatEvent(e))
  }

  async getCategories(): Promise<string[]> {
    const { data, error } = await withRetry(async () =>
      await this.supabase.from('timeline_events').select('category')
    )

    if (error) throw error

    const cats = new Set<string>()
    ;(data || []).forEach(e => {
      if (e.category) cats.add(e.category)
    })
    return Array.from(cats)
  }

  async create(data: InsertTables<'timeline_events'>): Promise<TimelineItem> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('timeline_events').insert(data).select('*, seasons(name)').single()
    )
    if (error) throw error
    return this.formatEvent(created!)
  }

  async update(id: number, data: UpdateTables<'timeline_events'>): Promise<TimelineItem> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('timeline_events').update(data).eq('id', id).select('*, seasons(name)').single()
    )
    if (error) throw error
    return this.formatEvent(updated!)
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('timeline_events').delete().eq('id', id)
    )
    if (error) throw error
  }
}

// ============================================
// Supabase Schedule Repository
// ============================================
class SupabaseScheduleRepository implements IScheduleRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<Schedule | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('schedules').select('*').eq('id', id).single()
    )
    return data
  }

  async findByMonth(year: number, month: number): Promise<Schedule[]> {
    // UTC 기준으로 월의 시작과 끝을 계산
    const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0))
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999))

    const { data, error } = await withRetry(async () =>
      await this.supabase
        .from('schedules')
        .select('*')
        .gte('start_datetime', startOfMonth.toISOString())
        .lte('start_datetime', endOfMonth.toISOString())
        .order('start_datetime', { ascending: true })
    )

    if (error) throw error
    return data || []
  }

  async findByMonthAndUnit(year: number, month: number, unit: string | null): Promise<Schedule[]> {
    // UTC 기준으로 월의 시작과 끝을 계산
    const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0))
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999))

    const { data, error } = await withRetry(async () => {
      let query = this.supabase
        .from('schedules')
        .select('*')
        .gte('start_datetime', startOfMonth.toISOString())
        .lte('start_datetime', endOfMonth.toISOString())
        .order('start_datetime', { ascending: true })

      if (unit && unit !== 'all') {
        query = query.or(`unit.eq.${unit},unit.is.null`)
      }

      return await query
    })

    if (error) throw error
    return data || []
  }

  async findAll(): Promise<Schedule[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('schedules').select('*').order('start_datetime', { ascending: false })
    )
    return data || []
  }

  async create(data: InsertTables<'schedules'>): Promise<Schedule> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('schedules').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'schedules'>): Promise<Schedule> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('schedules').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('schedules').delete().eq('id', id)
    )
    if (error) throw error
  }
}

// ============================================
// Supabase Signature Repository
// ============================================
class SupabaseSignatureRepository implements ISignatureRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<Signature | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('signatures').select('*').eq('id', id).single()
    )
    return data
  }

  async findByUnit(unit: 'excel' | 'crew'): Promise<Signature[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('signatures').select('*').eq('unit', unit).order('sig_number', { ascending: true })
    )
    return data || []
  }

  async findAll(): Promise<Signature[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('signatures').select('*').order('sig_number', { ascending: true })
    )
    return data || []
  }

  async create(data: InsertTables<'signatures'>): Promise<Signature> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('signatures').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'signatures'>): Promise<Signature> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('signatures').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('signatures').delete().eq('id', id)
    )
    if (error) throw error
  }
}

// ============================================
// Supabase VipReward Repository
// ============================================
class SupabaseVipRewardRepository implements IVipRewardRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<VipReward | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('vip_rewards').select('*').eq('id', id).single()
    )
    return data
  }

  async findByProfile(profileId: string): Promise<VipReward[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('vip_rewards').select('*').eq('profile_id', profileId).order('created_at', { ascending: false })
    )
    return data || []
  }

  async findBySeason(seasonId: number): Promise<VipReward[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('vip_rewards').select('*').eq('season_id', seasonId).order('rank', { ascending: true })
    )
    return data || []
  }

  async findAll(): Promise<VipReward[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('vip_rewards').select('*').order('created_at', { ascending: false })
    )
    return data || []
  }

  async create(data: InsertTables<'vip_rewards'>): Promise<VipReward> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('vip_rewards').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'vip_rewards'>): Promise<VipReward> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('vip_rewards').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('vip_rewards').delete().eq('id', id)
    )
    if (error) throw error
  }
}

// ============================================
// Supabase VipImage Repository
// ============================================
class SupabaseVipImageRepository implements IVipImageRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<VipImage | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('vip_images').select('*').eq('id', id).single()
    )
    return data
  }

  async findByReward(rewardId: number): Promise<VipImage[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('vip_images').select('*').eq('reward_id', rewardId).order('order_index', { ascending: true })
    )
    return data || []
  }

  async findAll(): Promise<VipImage[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('vip_images').select('*').order('created_at', { ascending: false })
    )
    return data || []
  }

  async create(data: InsertTables<'vip_images'>): Promise<VipImage> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('vip_images').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'vip_images'>): Promise<VipImage> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('vip_images').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('vip_images').delete().eq('id', id)
    )
    if (error) throw error
  }
}

// ============================================
// Supabase Media Repository
// ============================================
class SupabaseMediaRepository implements IMediaRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<MediaContent | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('media_content').select('*').eq('id', id).single()
    )
    return data
  }

  async findByType(type: 'shorts' | 'vod'): Promise<MediaContent[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('media_content').select('*').eq('content_type', type).order('created_at', { ascending: false })
    )
    return data || []
  }

  async findFeatured(): Promise<MediaContent[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('media_content').select('*').eq('is_featured', true).order('created_at', { ascending: false })
    )
    return data || []
  }

  async findAll(): Promise<MediaContent[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('media_content').select('*').order('created_at', { ascending: false })
    )
    return data || []
  }

  async create(data: InsertTables<'media_content'>): Promise<MediaContent> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('media_content').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'media_content'>): Promise<MediaContent> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('media_content').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('media_content').delete().eq('id', id)
    )
    if (error) throw error
  }
}

// ============================================
// Supabase Banner Repository
// ============================================
class SupabaseBannerRepository implements IBannerRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<Banner | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('banners').select('*').eq('id', id).single()
    )
    return data
  }

  async findActive(): Promise<Banner[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('banners').select('*').eq('is_active', true).order('display_order', { ascending: true })
    )
    return data || []
  }

  async findAll(): Promise<Banner[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('banners').select('*').order('display_order', { ascending: true })
    )
    return data || []
  }

  async create(data: InsertTables<'banners'>): Promise<Banner> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('banners').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'banners'>): Promise<Banner> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('banners').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('banners').delete().eq('id', id)
    )
    if (error) throw error
  }
}

// ============================================
// Supabase LiveStatus Repository
// ============================================
class SupabaseLiveStatusRepository implements ILiveStatusRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<LiveStatus | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('live_status').select('*').eq('id', id).single()
    )
    return data
  }

  async findByMember(memberId: number): Promise<LiveStatus[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('live_status').select('*').eq('member_id', memberId)
    )
    return data || []
  }

  async findLive(): Promise<LiveStatus[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('live_status').select('*').eq('is_live', true)
    )
    return data || []
  }

  async findAll(): Promise<LiveStatus[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('live_status').select('*')
    )
    return data || []
  }

  async create(data: InsertTables<'live_status'>): Promise<LiveStatus> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('live_status').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'live_status'>): Promise<LiveStatus> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('live_status').update(data).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('live_status').delete().eq('id', id)
    )
    if (error) throw error
  }

  async upsertByMemberAndPlatform(data: InsertTables<'live_status'>): Promise<LiveStatus> {
    const { data: upserted, error } = await withRetry(async () =>
      await this.supabase.from('live_status').upsert(data, { onConflict: 'member_id,platform' }).select().single()
    )
    if (error) throw error
    return upserted!
  }
}

// ============================================
// Supabase Guestbook Repository
// ============================================
class SupabaseGuestbookRepository implements IGuestbookRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<TributeGuestbook | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('tribute_guestbook').select('*').eq('id', id).eq('is_deleted', false).single()
    )
    return data
  }

  async findByTributeUser(tributeUserId: string): Promise<TributeGuestbook[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('tribute_guestbook').select('*').eq('tribute_user_id', tributeUserId).eq('is_deleted', false).order('created_at', { ascending: false })
    )
    return data || []
  }

  async findApproved(tributeUserId: string): Promise<TributeGuestbook[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('tribute_guestbook').select('*').eq('tribute_user_id', tributeUserId).eq('is_approved', true).eq('is_deleted', false).order('created_at', { ascending: false })
    )
    return data || []
  }

  async findAll(): Promise<TributeGuestbook[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('tribute_guestbook').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
    )
    return data || []
  }

  async create(data: InsertTables<'tribute_guestbook'>): Promise<TributeGuestbook> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('tribute_guestbook').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'tribute_guestbook'>): Promise<TributeGuestbook> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('tribute_guestbook').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    // Soft delete
    const { error } = await withRetry(async () =>
      await this.supabase.from('tribute_guestbook').update({ is_deleted: true }).eq('id', id)
    )
    if (error) throw error
  }
}

// ============================================
// Supabase BJ Message Repository
// ============================================
class SupabaseBjMessageRepository implements IBjMessageRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: number): Promise<BjThankYouMessage | null> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('bj_thank_you_messages').select('*').eq('id', id).eq('is_deleted', false).single()
    )
    return data
  }

  async findByVipProfile(vipProfileId: string): Promise<BjThankYouMessage[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('bj_thank_you_messages').select('*').eq('vip_profile_id', vipProfileId).eq('is_deleted', false).order('created_at', { ascending: false })
    )
    return data || []
  }

  async findByBjMember(bjMemberId: number): Promise<BjThankYouMessage[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('bj_thank_you_messages').select('*').eq('bj_member_id', bjMemberId).eq('is_deleted', false).order('created_at', { ascending: false })
    )
    return data || []
  }

  async findPublicByVipProfile(vipProfileId: string): Promise<BjThankYouMessage[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('bj_thank_you_messages').select('*').eq('vip_profile_id', vipProfileId).eq('is_public', true).eq('is_deleted', false).order('created_at', { ascending: false })
    )
    return data || []
  }

  async findAll(): Promise<BjThankYouMessage[]> {
    const { data } = await withRetry(async () =>
      await this.supabase.from('bj_thank_you_messages').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
    )
    return data || []
  }

  async create(data: InsertTables<'bj_thank_you_messages'>): Promise<BjThankYouMessage> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('bj_thank_you_messages').insert(data).select().single()
    )
    if (error) throw error
    return created!
  }

  async update(id: number, data: UpdateTables<'bj_thank_you_messages'>): Promise<BjThankYouMessage> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('bj_thank_you_messages').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    )
    if (error) throw error
    return updated!
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('bj_thank_you_messages').delete().eq('id', id)
    )
    if (error) throw error
  }

  async softDelete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('bj_thank_you_messages').update({ is_deleted: true }).eq('id', id)
    )
    if (error) throw error
  }
}

// ============================================
// Supabase Data Provider (Factory Pattern)
// ============================================
export class SupabaseDataProvider implements IDataProvider {
  readonly rankings: IRankingRepository
  readonly seasons: ISeasonRepository
  readonly profiles: IProfileRepository
  readonly organization: IOrganizationRepository
  readonly notices: INoticeRepository
  readonly posts: IPostRepository
  readonly comments: ICommentRepository
  readonly timeline: ITimelineRepository
  readonly schedules: IScheduleRepository
  readonly signatures: ISignatureRepository
  readonly vipRewards: IVipRewardRepository
  readonly vipImages: IVipImageRepository
  readonly media: IMediaRepository
  readonly banners: IBannerRepository
  readonly liveStatus: ILiveStatusRepository
  readonly guestbook: IGuestbookRepository
  readonly bjMessages: IBjMessageRepository

  constructor(supabase: SupabaseClient) {
    this.rankings = new SupabaseRankingRepository(supabase)
    this.seasons = new SupabaseSeasonRepository(supabase)
    this.profiles = new SupabaseProfileRepository(supabase)
    this.organization = new SupabaseOrganizationRepository(supabase)
    this.notices = new SupabaseNoticeRepository(supabase)
    this.posts = new SupabasePostRepository(supabase)
    this.comments = new SupabaseCommentRepository(supabase)
    this.timeline = new SupabaseTimelineRepository(supabase)
    this.schedules = new SupabaseScheduleRepository(supabase)
    this.signatures = new SupabaseSignatureRepository(supabase)
    this.vipRewards = new SupabaseVipRewardRepository(supabase)
    this.vipImages = new SupabaseVipImageRepository(supabase)
    this.media = new SupabaseMediaRepository(supabase)
    this.banners = new SupabaseBannerRepository(supabase)
    this.liveStatus = new SupabaseLiveStatusRepository(supabase)
    this.guestbook = new SupabaseGuestbookRepository(supabase)
    this.bjMessages = new SupabaseBjMessageRepository(supabase)
  }
}
