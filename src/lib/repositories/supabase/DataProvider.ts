/**
 * Supabase Data Provider (Factory Pattern)
 * 모든 Repository를 통합 관리
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  IDataProvider,
  IRankingRepository,
  ISeasonRepository,
  IProfileRepository,
  IOrganizationRepository,
  INoticeRepository,
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

import { SupabaseRankingRepository } from './RankingRepository'
import { SupabaseSeasonRepository } from './SeasonRepository'
import { SupabaseProfileRepository } from './ProfileRepository'
import { SupabaseOrganizationRepository } from './OrganizationRepository'
import { SupabaseNoticeRepository } from './NoticeRepository'
import { SupabasePostRepository } from './PostRepository'
import { SupabaseCommentRepository } from './CommentRepository'
import { SupabaseTimelineRepository } from './TimelineRepository'
import { SupabaseScheduleRepository } from './ScheduleRepository'
import { SupabaseSignatureRepository } from './SignatureRepository'
import { SupabaseVipRewardRepository } from './VipRewardRepository'
import { SupabaseVipImageRepository } from './VipImageRepository'
import { SupabaseMediaRepository } from './MediaRepository'
import { SupabaseBannerRepository } from './BannerRepository'
import { SupabaseLiveStatusRepository } from './LiveStatusRepository'
import { SupabaseGuestbookRepository } from './GuestbookRepository'
import { SupabaseBjMessageRepository } from './BjMessageRepository'

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
