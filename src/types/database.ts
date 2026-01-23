export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// 대표BJ(RG_family) 합산 성적 타입
export interface RepresentativeBjTotal {
  hearts: number       // 받은 하트
  count: number        // 후원 건수
  score: number        // 하트점수
  contribution: number // 기여도
  result?: string      // 순위 결과 (예: "상금 300만원")
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nickname: string
          email: string | null
          avatar_url: string | null
          role: 'member' | 'vip' | 'moderator' | 'admin' | 'superadmin'
          unit: 'excel' | 'crew' | null
          total_donation: number
          pandatv_id: string | null // PandaTV 플랫폼 아이디
          account_type: 'real' | 'virtual' | 'system' // 계정 유형: real(실제 가입), virtual(임의 생성), system(시스템)
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nickname: string
          email?: string | null
          avatar_url?: string | null
          role?: 'member' | 'vip' | 'moderator' | 'admin' | 'superadmin'
          unit?: 'excel' | 'crew' | null
          total_donation?: number
          pandatv_id?: string | null
          account_type?: 'real' | 'virtual' | 'system'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nickname?: string
          email?: string | null
          avatar_url?: string | null
          role?: 'member' | 'vip' | 'moderator' | 'admin' | 'superadmin'
          unit?: 'excel' | 'crew' | null
          total_donation?: number
          pandatv_id?: string | null
          account_type?: 'real' | 'virtual' | 'system'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          id: number
          name: string
          start_date: string
          end_date: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          start_date: string
          end_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          start_date?: string
          end_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      organization: {
        Row: {
          id: number
          unit: 'excel' | 'crew'
          profile_id: string | null
          name: string
          role: string
          position_order: number
          parent_id: number | null
          image_url: string | null
          social_links: Json | null
          profile_info: Json | null
          is_live: boolean
          is_active: boolean
          current_rank: string | null // 직급전 현재 직급 (레거시, 대표는 null)
          current_rank_id: number | null // FK to bj_ranks
          total_contribution: number // 누적 기여도
          season_contribution: number // 현재 시즌 기여도
          total_prize: number // 누적 받은 상금
          total_penalty: number // 누적 받은 벌금
          prize_balance: number // 상벌금 잔액 (상금 - 벌금)
          created_at: string
        }
        Insert: {
          id?: number
          unit: 'excel' | 'crew'
          profile_id?: string | null
          name: string
          role: string
          position_order?: number
          parent_id?: number | null
          image_url?: string | null
          social_links?: Json | null
          profile_info?: Json | null
          is_live?: boolean
          is_active?: boolean
          current_rank?: string | null
          current_rank_id?: number | null
          total_contribution?: number
          season_contribution?: number
          total_prize?: number
          total_penalty?: number
          prize_balance?: number
          created_at?: string
        }
        Update: {
          id?: number
          unit?: 'excel' | 'crew'
          profile_id?: string | null
          name?: string
          role?: string
          position_order?: number
          parent_id?: number | null
          image_url?: string | null
          social_links?: Json | null
          profile_info?: Json | null
          is_live?: boolean
          is_active?: boolean
          current_rank?: string | null
          current_rank_id?: number | null
          total_contribution?: number
          season_contribution?: number
          total_prize?: number
          total_penalty?: number
          prize_balance?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'organization_profile_id_fkey'
            columns: ['profile_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_parent_id_fkey'
            columns: ['parent_id']
            referencedRelation: 'organization'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_current_rank_id_fkey'
            columns: ['current_rank_id']
            referencedRelation: 'bj_ranks'
            referencedColumns: ['id']
          }
        ]
      }
      episodes: {
        Row: {
          id: number
          season_id: number
          episode_number: number
          title: string
          broadcast_date: string
          is_rank_battle: boolean
          description: string | null
          is_finalized: boolean
          finalized_at: string | null
          representative_bj_total: RepresentativeBjTotal | null // 대표BJ(RG_family) 합산 성적
          created_at: string
        }
        Insert: {
          id?: number
          season_id: number
          episode_number: number
          title: string
          broadcast_date: string
          is_rank_battle?: boolean
          description?: string | null
          is_finalized?: boolean
          finalized_at?: string | null
          representative_bj_total?: RepresentativeBjTotal | null
          created_at?: string
        }
        Update: {
          id?: number
          season_id?: number
          episode_number?: number
          title?: string
          broadcast_date?: string
          is_rank_battle?: boolean
          description?: string | null
          is_finalized?: boolean
          finalized_at?: string | null
          representative_bj_total?: RepresentativeBjTotal | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'episodes_season_id_fkey'
            columns: ['season_id']
            referencedRelation: 'seasons'
            referencedColumns: ['id']
          }
        ]
      }
      donations: {
        Row: {
          id: number
          donor_id: string | null
          donor_name: string
          amount: number
          season_id: number
          episode_id: number | null
          unit: 'excel' | 'crew' | null
          message: string | null
          created_at: string
        }
        Insert: {
          id?: number
          donor_id?: string | null
          donor_name: string
          amount: number
          season_id: number
          episode_id?: number | null
          unit?: 'excel' | 'crew' | null
          message?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          donor_id?: string | null
          donor_name?: string
          amount?: number
          season_id?: number
          episode_id?: number | null
          unit?: 'excel' | 'crew' | null
          message?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'donations_donor_id_fkey'
            columns: ['donor_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'donations_season_id_fkey'
            columns: ['season_id']
            referencedRelation: 'seasons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'donations_episode_id_fkey'
            columns: ['episode_id']
            referencedRelation: 'episodes'
            referencedColumns: ['id']
          }
        ]
      }
      vip_rewards: {
        Row: {
          id: number
          profile_id: string
          season_id: number
          episode_id: number | null
          rank: number
          personal_message: string | null
          dedication_video_url: string | null
          created_at: string
        }
        Insert: {
          id?: number
          profile_id: string
          season_id: number
          episode_id?: number | null
          rank: number
          personal_message?: string | null
          dedication_video_url?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          profile_id?: string
          season_id?: number
          episode_id?: number | null
          rank?: number
          personal_message?: string | null
          dedication_video_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vip_rewards_profile_id_fkey'
            columns: ['profile_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vip_rewards_season_id_fkey'
            columns: ['season_id']
            referencedRelation: 'seasons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vip_rewards_episode_id_fkey'
            columns: ['episode_id']
            referencedRelation: 'episodes'
            referencedColumns: ['id']
          }
        ]
      }
      vip_images: {
        Row: {
          id: number
          reward_id: number
          image_url: string
          title: string | null
          order_index: number
          created_at: string
        }
        Insert: {
          id?: number
          reward_id: number
          image_url: string
          title?: string | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: number
          reward_id?: number
          image_url?: string
          title?: string | null
          order_index?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vip_images_reward_id_fkey'
            columns: ['reward_id']
            referencedRelation: 'vip_rewards'
            referencedColumns: ['id']
          }
        ]
      }
      signatures: {
        Row: {
          id: number
          sig_number: number
          title: string
          description: string | null
          thumbnail_url: string | null
          unit: 'excel' | 'crew'
          is_group: boolean
          created_at: string
        }
        Insert: {
          id?: number
          sig_number: number
          title: string
          description?: string | null
          thumbnail_url?: string | null
          unit: 'excel' | 'crew'
          is_group?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          sig_number?: number
          title?: string
          description?: string | null
          thumbnail_url?: string | null
          unit?: 'excel' | 'crew'
          is_group?: boolean
          created_at?: string
        }
        Relationships: []
      }
      signature_videos: {
        Row: {
          id: number
          signature_id: number
          member_id: number
          video_url: string
          created_at: string
        }
        Insert: {
          id?: number
          signature_id: number
          member_id: number
          video_url: string
          created_at?: string
        }
        Update: {
          id?: number
          signature_id?: number
          member_id?: number
          video_url?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'signature_videos_signature_id_fkey'
            columns: ['signature_id']
            referencedRelation: 'signatures'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'signature_videos_member_id_fkey'
            columns: ['member_id']
            referencedRelation: 'organization'
            referencedColumns: ['id']
          }
        ]
      }
      schedules: {
        Row: {
          id: number
          title: string
          description: string | null
          unit: 'excel' | 'crew' | null
          event_type: 'broadcast' | 'collab' | 'event' | 'notice' | '休'
          start_datetime: string
          end_datetime: string | null
          location: string | null
          is_all_day: boolean
          color: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: number
          title: string
          description?: string | null
          unit?: 'excel' | 'crew' | null
          event_type: 'broadcast' | 'collab' | 'event' | 'notice' | '休'
          start_datetime: string
          end_datetime?: string | null
          location?: string | null
          is_all_day?: boolean
          color?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          title?: string
          description?: string | null
          unit?: 'excel' | 'crew' | null
          event_type?: 'broadcast' | 'collab' | 'event' | 'notice' | '休'
          start_datetime?: string
          end_datetime?: string | null
          location?: string | null
          is_all_day?: boolean
          color?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'schedules_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      timeline_events: {
        Row: {
          id: number
          event_date: string
          title: string
          description: string | null
          image_url: string | null
          category: string | null
          season_id: number | null
          order_index: number
          created_at: string
        }
        Insert: {
          id?: number
          event_date: string
          title: string
          description?: string | null
          image_url?: string | null
          category?: string | null
          season_id?: number | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: number
          event_date?: string
          title?: string
          description?: string | null
          image_url?: string | null
          category?: string | null
          season_id?: number | null
          order_index?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'timeline_events_season_id_fkey'
            columns: ['season_id']
            referencedRelation: 'seasons'
            referencedColumns: ['id']
          }
        ]
      }
      notices: {
        Row: {
          id: number
          title: string
          content: string
          category: 'official' | 'excel' | 'crew'
          thumbnail_url: string | null
          is_pinned: boolean
          view_count: number
          author_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          title: string
          content: string
          category: 'official' | 'excel' | 'crew'
          thumbnail_url?: string | null
          is_pinned?: boolean
          view_count?: number
          author_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          title?: string
          content?: string
          category?: 'official' | 'excel' | 'crew'
          thumbnail_url?: string | null
          is_pinned?: boolean
          view_count?: number
          author_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notices_author_id_fkey'
            columns: ['author_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      posts: {
        Row: {
          id: number
          board_type: 'free' | 'vip'
          title: string
          content: string
          author_id: string
          view_count: number
          like_count: number
          comment_count: number
          is_anonymous: boolean
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          board_type: 'free' | 'vip'
          title: string
          content: string
          author_id: string
          view_count?: number
          like_count?: number
          comment_count?: number
          is_anonymous?: boolean
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          board_type?: 'free' | 'vip'
          title?: string
          content?: string
          author_id?: string
          view_count?: number
          like_count?: number
          comment_count?: number
          is_anonymous?: boolean
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'posts_author_id_fkey'
            columns: ['author_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      comments: {
        Row: {
          id: number
          post_id: number
          author_id: string
          content: string
          parent_id: number | null
          is_anonymous: boolean
          is_deleted: boolean
          created_at: string
        }
        Insert: {
          id?: number
          post_id: number
          author_id: string
          content: string
          parent_id?: number | null
          is_anonymous?: boolean
          is_deleted?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          post_id?: number
          author_id?: string
          content?: string
          parent_id?: number | null
          is_anonymous?: boolean
          is_deleted?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comments_post_id_fkey'
            columns: ['post_id']
            referencedRelation: 'posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_author_id_fkey'
            columns: ['author_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_parent_id_fkey'
            columns: ['parent_id']
            referencedRelation: 'comments'
            referencedColumns: ['id']
          }
        ]
      }
      media_content: {
        Row: {
          id: number
          content_type: 'shorts' | 'vod'
          title: string
          description: string | null
          thumbnail_url: string | null
          video_url: string
          unit: 'excel' | 'crew' | null
          duration: number | null
          view_count: number
          is_featured: boolean
          created_at: string
        }
        Insert: {
          id?: number
          content_type: 'shorts' | 'vod'
          title: string
          description?: string | null
          thumbnail_url?: string | null
          video_url: string
          unit?: 'excel' | 'crew' | null
          duration?: number | null
          view_count?: number
          is_featured?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          content_type?: 'shorts' | 'vod'
          title?: string
          description?: string | null
          thumbnail_url?: string | null
          video_url?: string
          unit?: 'excel' | 'crew' | null
          duration?: number | null
          view_count?: number
          is_featured?: boolean
          created_at?: string
        }
        Relationships: []
      }
      live_status: {
        Row: {
          id: number
          member_id: number
          platform: 'chzzk' | 'twitch' | 'youtube' | 'pandatv'
          stream_url: string
          thumbnail_url: string | null
          is_live: boolean
          viewer_count: number
          last_checked: string
        }
        Insert: {
          id?: number
          member_id: number
          platform: 'chzzk' | 'twitch' | 'youtube' | 'pandatv'
          stream_url: string
          thumbnail_url?: string | null
          is_live?: boolean
          viewer_count?: number
          last_checked?: string
        }
        Update: {
          id?: number
          member_id?: number
          platform?: 'chzzk' | 'twitch' | 'youtube' | 'pandatv'
          stream_url?: string
          thumbnail_url?: string | null
          is_live?: boolean
          viewer_count?: number
          last_checked?: string
        }
        Relationships: [
          {
            foreignKeyName: 'live_status_member_id_fkey'
            columns: ['member_id']
            referencedRelation: 'organization'
            referencedColumns: ['id']
          }
        ]
      }
      banners: {
        Row: {
          id: number
          title: string | null
          image_url: string
          link_url: string | null
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          title?: string | null
          image_url: string
          link_url?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          title?: string | null
          image_url?: string
          link_url?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tribute_guestbook: {
        Row: {
          id: number
          tribute_user_id: string
          author_id: string | null
          author_name: string
          message: string
          is_member: boolean
          is_approved: boolean
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          tribute_user_id: string
          author_id?: string | null
          author_name: string
          message: string
          is_member?: boolean
          is_approved?: boolean
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          tribute_user_id?: string
          author_id?: string | null
          author_name?: string
          message?: string
          is_member?: boolean
          is_approved?: boolean
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tribute_guestbook_tribute_user_id_fkey'
            columns: ['tribute_user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tribute_guestbook_author_id_fkey'
            columns: ['author_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      bj_thank_you_messages: {
        Row: {
          id: number
          vip_profile_id: string
          bj_member_id: number
          message_type: 'text' | 'image' | 'video'
          content_text: string | null
          content_url: string | null
          is_public: boolean
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          vip_profile_id: string
          bj_member_id: number
          message_type: 'text' | 'image' | 'video'
          content_text?: string | null
          content_url?: string | null
          is_public?: boolean
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          vip_profile_id?: string
          bj_member_id?: number
          message_type?: 'text' | 'image' | 'video'
          content_text?: string | null
          content_url?: string | null
          is_public?: boolean
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bj_thank_you_messages_vip_profile_id_fkey'
            columns: ['vip_profile_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bj_thank_you_messages_bj_member_id_fkey'
            columns: ['bj_member_id']
            referencedRelation: 'organization'
            referencedColumns: ['id']
          }
        ]
      }
      vip_personal_messages: {
        Row: {
          id: number
          vip_profile_id: string
          author_id: string
          message_type: 'text' | 'image' | 'video'
          content_text: string | null
          content_url: string | null
          is_public: boolean
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          vip_profile_id: string
          author_id: string
          message_type?: 'text' | 'image' | 'video'
          content_text?: string | null
          content_url?: string | null
          is_public?: boolean
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          vip_profile_id?: string
          author_id?: string
          message_type?: 'text' | 'image' | 'video'
          content_text?: string | null
          content_url?: string | null
          is_public?: boolean
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vip_personal_messages_vip_profile_id_fkey'
            columns: ['vip_profile_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vip_personal_messages_author_id_fkey'
            columns: ['author_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      /**
       * VIP 개인 메시지 댓글
       * 팬들이 VIP 게시글에 댓글/대댓글 작성
       */
      vip_message_comments: {
        Row: {
          id: number
          message_id: number
          author_id: string
          content: string
          parent_id: number | null
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          message_id: number
          author_id: string
          content: string
          parent_id?: number | null
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          message_id?: number
          author_id?: string
          content?: string
          parent_id?: number | null
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vip_message_comments_message_id_fkey'
            columns: ['message_id']
            referencedRelation: 'vip_personal_messages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vip_message_comments_author_id_fkey'
            columns: ['author_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vip_message_comments_parent_id_fkey'
            columns: ['parent_id']
            referencedRelation: 'vip_message_comments'
            referencedColumns: ['id']
          }
        ]
      }
      rank_battle_records: {
        Row: {
          id: number
          season_id: number
          battle_number: number
          rank: number
          donor_id: string | null
          donor_name: string
          total_amount: number
          finalized_at: string
          created_at: string
        }
        Insert: {
          id?: number
          season_id: number
          battle_number: number
          rank: number
          donor_id?: string | null
          donor_name: string
          total_amount: number
          finalized_at?: string
          created_at?: string
        }
        Update: {
          id?: number
          season_id?: number
          battle_number?: number
          rank?: number
          donor_id?: string | null
          donor_name?: string
          total_amount?: number
          finalized_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rank_battle_records_season_id_fkey'
            columns: ['season_id']
            referencedRelation: 'seasons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rank_battle_records_donor_id_fkey'
            columns: ['donor_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      /**
       * BJ별 에피소드 성적 기록
       */
      bj_episode_performances: {
        Row: {
          id: number
          episode_id: number
          bj_member_id: number
          donation_hearts: number     // 받은 하트
          donation_count: number      // 후원 건수
          heart_score: number         // 하트점수
          contribution: number        // 기여도
          final_rank: number | null   // 최종 순위
          rank_result: string | null  // 순위 결과 (예: "상금 300만원")
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          episode_id: number
          bj_member_id: number
          donation_hearts?: number
          donation_count?: number
          heart_score?: number
          contribution?: number
          final_rank?: number | null
          rank_result?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          episode_id?: number
          bj_member_id?: number
          donation_hearts?: number
          donation_count?: number
          heart_score?: number
          contribution?: number
          final_rank?: number | null
          rank_result?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bj_episode_performances_episode_id_fkey'
            columns: ['episode_id']
            referencedRelation: 'episodes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bj_episode_performances_bj_member_id_fkey'
            columns: ['bj_member_id']
            referencedRelation: 'organization'
            referencedColumns: ['id']
          }
        ]
      }
      /**
       * 총 후원 랭킹 (역대 누적) - Top 50
       * ⚠️ total_amount는 외부 노출 절대 금지! UI에서는 게이지로만 표현
       */
      total_donation_rankings: {
        Row: {
          id: number
          rank: number
          donor_name: string
          total_amount: number // ⚠️ 외부 노출 금지!
          is_permanent_vip: boolean
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: number
          rank: number
          donor_name: string
          total_amount: number
          is_permanent_vip?: boolean
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: number
          rank?: number
          donor_name?: string
          total_amount?: number
          is_permanent_vip?: boolean
          updated_at?: string
          created_at?: string
        }
        Relationships: []
      }
      /**
       * 시즌별 후원 랭킹 - Top 50
       * ⚠️ total_amount는 외부 노출 절대 금지! UI에서는 게이지로만 표현
       */
      season_donation_rankings: {
        Row: {
          id: number
          season_id: number
          rank: number
          donor_name: string
          total_amount: number // ⚠️ 외부 노출 금지!
          donation_count: number
          unit: 'excel' | 'crew' | null // 팬클럽 소속
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: number
          season_id: number
          rank: number
          donor_name: string
          total_amount: number
          donation_count?: number
          unit?: 'excel' | 'crew' | null
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: number
          season_id?: number
          rank?: number
          donor_name?: string
          total_amount?: number
          donation_count?: number
          unit?: 'excel' | 'crew' | null
          updated_at?: string
          created_at?: string
        }
        Relationships: []
      }
      /**
       * BJ 직급 마스터 테이블
       * 12단계 직급 정의 (여왕~쌉노예)
       */
      bj_ranks: {
        Row: {
          id: number
          name: string
          level: number
          display_order: number
          color: string | null
          icon_url: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          level: number
          display_order: number
          color?: string | null
          icon_url?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          level?: number
          display_order?: number
          color?: string | null
          icon_url?: string | null
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      /**
       * BJ 직급 변동 이력
       * 직급전 결과 및 모든 직급 변동 기록
       */
      bj_rank_history: {
        Row: {
          id: number
          bj_member_id: number
          episode_id: number | null
          season_id: number | null
          rank_id: number
          previous_rank_id: number | null
          change_reason: string | null
          is_rank_battle: boolean
          battle_number: number | null
          created_at: string
        }
        Insert: {
          id?: number
          bj_member_id: number
          episode_id?: number | null
          season_id?: number | null
          rank_id: number
          previous_rank_id?: number | null
          change_reason?: string | null
          is_rank_battle?: boolean
          battle_number?: number | null
          created_at?: string
        }
        Update: {
          id?: number
          bj_member_id?: number
          episode_id?: number | null
          season_id?: number | null
          rank_id?: number
          previous_rank_id?: number | null
          change_reason?: string | null
          is_rank_battle?: boolean
          battle_number?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bj_rank_history_bj_member_id_fkey'
            columns: ['bj_member_id']
            referencedRelation: 'organization'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bj_rank_history_episode_id_fkey'
            columns: ['episode_id']
            referencedRelation: 'episodes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bj_rank_history_season_id_fkey'
            columns: ['season_id']
            referencedRelation: 'seasons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bj_rank_history_rank_id_fkey'
            columns: ['rank_id']
            referencedRelation: 'bj_ranks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bj_rank_history_previous_rank_id_fkey'
            columns: ['previous_rank_id']
            referencedRelation: 'bj_ranks'
            referencedColumns: ['id']
          }
        ]
      }
      /**
       * 기여도 변동 로그
       * ⚠️ 관리자만 조회 가능 - 외부 노출 금지
       */
      contribution_logs: {
        Row: {
          id: number
          bj_member_id: number
          episode_id: number | null
          season_id: number | null
          amount: number
          reason: string
          balance_after: number
          event_type: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: number
          bj_member_id: number
          episode_id?: number | null
          season_id?: number | null
          amount: number
          reason: string
          balance_after: number
          event_type?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          bj_member_id?: number
          episode_id?: number | null
          season_id?: number | null
          amount?: number
          reason?: string
          balance_after?: number
          event_type?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'contribution_logs_bj_member_id_fkey'
            columns: ['bj_member_id']
            referencedRelation: 'organization'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'contribution_logs_episode_id_fkey'
            columns: ['episode_id']
            referencedRelation: 'episodes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'contribution_logs_season_id_fkey'
            columns: ['season_id']
            referencedRelation: 'seasons'
            referencedColumns: ['id']
          }
        ]
      }
      /**
       * 상벌금 기록
       * ⚠️ 관리자만 조회 가능 - 실제 금액 외부 노출 금지
       */
      prize_penalties: {
        Row: {
          id: number
          bj_member_id: number
          episode_id: number | null
          season_id: number | null
          type: 'prize' | 'penalty'
          amount: number
          description: string | null
          is_paid: boolean
          paid_at: string | null
          payment_note: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          bj_member_id: number
          episode_id?: number | null
          season_id?: number | null
          type: 'prize' | 'penalty'
          amount: number
          description?: string | null
          is_paid?: boolean
          paid_at?: string | null
          payment_note?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          bj_member_id?: number
          episode_id?: number | null
          season_id?: number | null
          type?: 'prize' | 'penalty'
          amount?: number
          description?: string | null
          is_paid?: boolean
          paid_at?: string | null
          payment_note?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'prize_penalties_bj_member_id_fkey'
            columns: ['bj_member_id']
            referencedRelation: 'organization'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'prize_penalties_episode_id_fkey'
            columns: ['episode_id']
            referencedRelation: 'episodes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'prize_penalties_season_id_fkey'
            columns: ['season_id']
            referencedRelation: 'seasons'
            referencedColumns: ['id']
          }
        ]
      }
      /**
       * 에피소드별 팀 구성
       */
      episode_teams: {
        Row: {
          id: number
          episode_id: number
          team_name: string
          team_type: 'major_minor' | 'queen_princess' | 'mercenary' | 'custom'
          team_color: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: number
          episode_id: number
          team_name: string
          team_type: 'major_minor' | 'queen_princess' | 'mercenary' | 'custom'
          team_color?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          episode_id?: number
          team_name?: string
          team_type?: 'major_minor' | 'queen_princess' | 'mercenary' | 'custom'
          team_color?: string | null
          description?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'episode_teams_episode_id_fkey'
            columns: ['episode_id']
            referencedRelation: 'episodes'
            referencedColumns: ['id']
          }
        ]
      }
      /**
       * 팀 멤버 구성
       */
      episode_team_members: {
        Row: {
          id: number
          team_id: number
          bj_member_id: number
          role: 'leader' | 'member' | 'mercenary'
          partner_bj_id: number | null
          partner_name: string | null
          stats: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: number
          team_id: number
          bj_member_id: number
          role?: 'leader' | 'member' | 'mercenary'
          partner_bj_id?: number | null
          partner_name?: string | null
          stats?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: number
          team_id?: number
          bj_member_id?: number
          role?: 'leader' | 'member' | 'mercenary'
          partner_bj_id?: number | null
          partner_name?: string | null
          stats?: Record<string, unknown> | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'episode_team_members_team_id_fkey'
            columns: ['team_id']
            referencedRelation: 'episode_teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'episode_team_members_bj_member_id_fkey'
            columns: ['bj_member_id']
            referencedRelation: 'organization'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'episode_team_members_partner_bj_id_fkey'
            columns: ['partner_bj_id']
            referencedRelation: 'organization'
            referencedColumns: ['id']
          }
        ]
      }
      /**
       * 1vs1 매칭
       */
      episode_matchups: {
        Row: {
          id: number
          episode_id: number
          bj_member_1_id: number
          bj_member_2_id: number
          winner_id: number | null
          match_type: '1vs1' | 'rival' | 'team_vs_team'
          match_order: number
          prize_type: string | null
          prize_amount: number | null
          match_result: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: number
          episode_id: number
          bj_member_1_id: number
          bj_member_2_id: number
          winner_id?: number | null
          match_type: '1vs1' | 'rival' | 'team_vs_team'
          match_order?: number
          prize_type?: string | null
          prize_amount?: number | null
          match_result?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: number
          episode_id?: number
          bj_member_1_id?: number
          bj_member_2_id?: number
          winner_id?: number | null
          match_type?: '1vs1' | 'rival' | 'team_vs_team'
          match_order?: number
          prize_type?: string | null
          prize_amount?: number | null
          match_result?: Record<string, unknown> | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'episode_matchups_episode_id_fkey'
            columns: ['episode_id']
            referencedRelation: 'episodes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'episode_matchups_bj_member_1_id_fkey'
            columns: ['bj_member_1_id']
            referencedRelation: 'organization'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'episode_matchups_bj_member_2_id_fkey'
            columns: ['bj_member_2_id']
            referencedRelation: 'organization'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'episode_matchups_winner_id_fkey'
            columns: ['winner_id']
            referencedRelation: 'organization'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_donation_total: {
        Args: { p_donor_id: string; p_amount: number }
        Returns: void
      }
      increment_comment_count: {
        Args: { p_post_id: number }
        Returns: void
      }
      decrement_comment_count: {
        Args: { p_post_id: number }
        Returns: void
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_staff: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_vip_user: {
        Args: { user_id: string }
        Returns: boolean
      }
      get_active_season_id: {
        Args: Record<string, never>
        Returns: number
      }
      get_user_rank: {
        Args: { p_user_id: string; p_season_id?: number | null }
        Returns: { rank: number; total_amount: number }[]
      }
      get_user_rank_active_season: {
        Args: { p_user_id: string }
        Returns: { rank: number; total_amount: number; season_id: number }[]
      }
      get_episode_rankings: {
        Args: { p_episode_id: number; p_limit?: number }
        Returns: { rank: number; donor_id: string | null; donor_name: string; total_amount: number }[]
      }
      is_vip_for_episode: {
        Args: { p_user_id: string; p_episode_id: number }
        Returns: boolean
      }
      is_vip_for_rank_battles: {
        Args: { p_user_id: string; p_season_id?: number | null }
        Returns: boolean
      }
      is_bj_member: {
        Args: { user_id: string }
        Returns: boolean
      }
      get_bj_member_id: {
        Args: { user_id: string }
        Returns: number | null
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Commonly used types
export type Profile = Tables<'profiles'>
export type Season = Tables<'seasons'>
export type Organization = Tables<'organization'>
export type Episode = Tables<'episodes'>
export type Donation = Tables<'donations'>
export type VipReward = Tables<'vip_rewards'>
export type VipImage = Tables<'vip_images'>
export type Signature = Tables<'signatures'>
export type SignatureVideo = Tables<'signature_videos'>
export type Schedule = Tables<'schedules'>
export type TimelineEvent = Tables<'timeline_events'>
export type Notice = Tables<'notices'>
export type Post = Tables<'posts'>
export type Comment = Tables<'comments'>
export type MediaContent = Tables<'media_content'>
export type LiveStatus = Tables<'live_status'>
export type Banner = Tables<'banners'>
export type TributeGuestbook = Tables<'tribute_guestbook'>
export type BjThankYouMessage = Tables<'bj_thank_you_messages'>
export type VipPersonalMessage = Tables<'vip_personal_messages'>
export type VipMessageComment = Tables<'vip_message_comments'>
export type RankBattleRecord = Tables<'rank_battle_records'>
export type TotalDonationRanking = Tables<'total_donation_rankings'>
export type SeasonDonationRanking = Tables<'season_donation_rankings'>
export type BjEpisodePerformance = Tables<'bj_episode_performances'>

// BJ 감사 메시지 with JOIN data
export interface BjThankYouMessageWithMember extends BjThankYouMessage {
  bj_member?: {
    name: string
    image_url: string | null
  }
}

// VIP 개인 메시지 with 작성자 정보
export interface VipPersonalMessageWithAuthor extends VipPersonalMessage {
  author?: {
    nickname: string
    avatar_url: string | null
  }
}

// VIP 메시지 댓글 with 작성자 정보
export interface VipMessageCommentWithAuthor extends VipMessageComment {
  author?: {
    nickname: string
    avatar_url: string | null
    role?: 'member' | 'vip' | 'moderator' | 'admin' | 'superadmin'
  }
  replies?: VipMessageCommentWithAuthor[]
}

// BJ 에피소드 성적 with BJ 정보
export interface BjEpisodePerformanceWithMember extends BjEpisodePerformance {
  bj_member?: {
    name: string
    image_url: string | null
    unit: 'excel' | 'crew'
  }
}

// Unit type
export type Unit = 'excel' | 'crew'

// Role type
export type Role = 'member' | 'vip' | 'moderator' | 'admin' | 'superadmin'

// ============================================
// BJ 직급/기여도/상벌금 관리 타입 (Admin Only)
// ⚠️ 실제 금액/기여도는 관리자만 조회 가능
// ============================================

// 직급 마스터
export interface BjRank {
  id: number
  name: string
  level: number
  display_order: number
  color: string | null
  icon_url: string | null
  description: string | null
  created_at: string
}

// 직급 변동 이력
export interface BjRankHistory {
  id: number
  bj_member_id: number
  episode_id: number | null
  season_id: number | null
  rank_id: number
  previous_rank_id: number | null
  change_reason: string | null
  is_rank_battle: boolean
  battle_number: number | null
  created_at: string
}

// 직급 변동 이력 with JOIN 데이터
export interface BjRankHistoryWithDetails extends BjRankHistory {
  bj_member?: { name: string; image_url: string | null }
  rank?: BjRank
  previous_rank?: BjRank
  episode?: { episode_number: number; title: string }
}

// 기여도 변동 로그
export interface ContributionLog {
  id: number
  bj_member_id: number
  episode_id: number | null
  season_id: number | null
  amount: number
  reason: string
  balance_after: number
  event_type: string | null
  created_by: string | null
  created_at: string
}

// 기여도 로그 with JOIN 데이터
export interface ContributionLogWithDetails extends ContributionLog {
  bj_member?: { name: string; image_url: string | null }
  episode?: { episode_number: number; title: string }
}

// 상벌금 타입
export type PrizePenaltyType = 'prize' | 'penalty'

// 상벌금 기록
export interface PrizePenalty {
  id: number
  bj_member_id: number
  episode_id: number | null
  season_id: number | null
  type: PrizePenaltyType
  amount: number
  description: string | null
  is_paid: boolean
  paid_at: string | null
  payment_note: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// 상벌금 with JOIN 데이터
export interface PrizePenaltyWithDetails extends PrizePenalty {
  bj_member?: { name: string; image_url: string | null }
  episode?: { episode_number: number; title: string }
}

// 에피소드 팀 타입
export type EpisodeTeamType = 'major_minor' | 'queen_princess' | 'mercenary' | 'custom'

// 에피소드 팀
export interface EpisodeTeam {
  id: number
  episode_id: number
  team_name: string
  team_type: EpisodeTeamType
  team_color: string | null
  description: string | null
  created_at: string
}

// 팀 멤버 역할
export type TeamMemberRole = 'leader' | 'member' | 'mercenary'

// 팀 멤버
export interface EpisodeTeamMember {
  id: number
  team_id: number
  bj_member_id: number
  role: TeamMemberRole
  partner_bj_id: number | null
  partner_name: string | null
  stats: Record<string, unknown> | null
  created_at: string
}

// 팀 멤버 with JOIN 데이터
export interface EpisodeTeamMemberWithDetails extends EpisodeTeamMember {
  bj_member?: { name: string; image_url: string | null; unit: 'excel' | 'crew' }
  partner_bj?: { name: string; image_url: string | null } | null
}

// 팀 with 멤버 목록
export interface EpisodeTeamWithMembers extends EpisodeTeam {
  members: EpisodeTeamMemberWithDetails[]
}

// 매칭 타입
export type MatchupType = '1vs1' | 'rival' | 'team_vs_team'

// 1vs1 매칭
export interface EpisodeMatchup {
  id: number
  episode_id: number
  bj_member_1_id: number
  bj_member_2_id: number
  winner_id: number | null
  match_type: MatchupType
  match_order: number
  prize_type: string | null
  prize_amount: number | null
  match_result: Record<string, unknown> | null
  created_at: string
}

// 매칭 with JOIN 데이터
export interface EpisodeMatchupWithDetails extends EpisodeMatchup {
  bj_member_1?: { name: string; image_url: string | null }
  bj_member_2?: { name: string; image_url: string | null }
  winner?: { name: string; image_url: string | null } | null
  episode?: { episode_number: number; title: string }
}

// Organization 확장 필드 (관리자용)
export interface OrganizationExtended extends Omit<Organization, 'current_rank'> {
  current_rank_id: number | null
  total_contribution: number
  season_contribution: number
  total_prize: number
  total_penalty: number
  prize_balance: number
  // JOIN 데이터 - 기존 string 대신 BjRank 객체로 확장
  current_rank?: BjRank | null
}

// BJ 현황 요약 (대시보드용)
export interface BjStatusSummary {
  id: number
  name: string
  image_url: string | null
  unit: 'excel' | 'crew'
  current_rank: BjRank | null
  total_contribution: number
  season_contribution: number
  total_prize: number
  total_penalty: number
  prize_balance: number
}

// 시즌 요약 통계 (대시보드용)
export interface SeasonSummaryStats {
  season_id: number
  season_name: string
  total_contribution: number
  total_prize: number
  total_penalty: number
  episode_count: number
  current_episode: number
}
