export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
          rank: number
          personal_message: string | null
          dedication_video_url: string | null
          created_at: string
        }
        Insert: {
          id?: number
          profile_id: string
          season_id: number
          rank: number
          personal_message?: string | null
          dedication_video_url?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          profile_id?: string
          season_id?: number
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

// Unit type
export type Unit = 'excel' | 'crew'

// Role type
export type Role = 'member' | 'vip' | 'moderator' | 'admin' | 'superadmin'
