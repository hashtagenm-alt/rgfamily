'use server'

import { adminAction, publicAction, type ActionResult } from './index'
import type { SeasonDonationRanking, TotalDonationRanking, Season } from '@/types/database'

// ===========================================
// 시즌별 후원 랭킹 Actions
// ===========================================

/**
 * 시즌 랭킹 조회
 */
export async function getSeasonRankings(
  seasonId: number
): Promise<ActionResult<SeasonDonationRanking[]>> {
  return adminAction(async (supabase) => {
    const { data, error } = await supabase
      .from('season_donation_rankings')
      .select('*')
      .eq('season_id', seasonId)
      .order('rank', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
  })
}

/**
 * 시즌 랭킹 단일 수정
 */
export async function updateSeasonRanking(
  id: number,
  data: {
    rank?: number
    donor_name?: string
    total_amount?: number
    donation_count?: number
  }
): Promise<ActionResult<SeasonDonationRanking>> {
  return adminAction(
    async (supabase) => {
      const { data: ranking, error } = await supabase
        .from('season_donation_rankings')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return ranking
    },
    ['/admin/donation-rankings', '/ranking']
  )
}

/**
 * 시즌 랭킹 삭제
 */
export async function deleteSeasonRanking(id: number): Promise<ActionResult<null>> {
  return adminAction(
    async (supabase) => {
      const { error } = await supabase.from('season_donation_rankings').delete().eq('id', id)

      if (error) throw new Error(error.message)
      return null
    },
    ['/admin/donation-rankings', '/ranking']
  )
}

/**
 * 시즌 랭킹 일괄 교체 (CSV 업로드용)
 * 기존 데이터 삭제 후 새 데이터 삽입
 */
export async function bulkReplaceSeasonRankings(
  seasonId: number,
  rankings: Array<{
    rank: number
    donor_name: string
    total_amount: number
    donation_count?: number
  }>
): Promise<ActionResult<{ insertedCount: number }>> {
  return adminAction(
    async (supabase) => {
      // 원자적 DELETE + INSERT (트랜잭션 보장, 데이터 유실 방지)
      const { data: insertedCount, error } = await supabase.rpc('atomic_replace_season_rankings', {
        p_season_id: seasonId,
        p_rankings: rankings.map((r) => ({
          rank: r.rank,
          donor_name: r.donor_name,
          total_amount: r.total_amount,
          donation_count: r.donation_count || 0,
        })),
      })

      if (error) throw new Error(`랭킹 교체 실패: ${error.message}`)

      return { insertedCount: insertedCount ?? rankings.length }
    },
    ['/admin/donation-rankings', '/ranking']
  )
}

// ===========================================
// 종합 후원 랭킹 Actions
// ===========================================

/**
 * 종합 랭킹 조회
 */
export async function getTotalRankings(): Promise<ActionResult<TotalDonationRanking[]>> {
  return adminAction(async (supabase) => {
    const { data, error } = await supabase
      .from('total_donation_rankings')
      .select('*')
      .order('rank', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
  })
}

/**
 * 종합 랭킹 단일 수정
 */
export async function updateTotalRanking(
  id: number,
  data: {
    rank?: number
    donor_name?: string
    total_amount?: number
    is_permanent_vip?: boolean
  }
): Promise<ActionResult<TotalDonationRanking>> {
  return adminAction(
    async (supabase) => {
      const { data: ranking, error } = await supabase
        .from('total_donation_rankings')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return ranking
    },
    ['/admin/donation-rankings', '/ranking']
  )
}

/**
 * 종합 랭킹 삭제
 */
export async function deleteTotalRanking(id: number): Promise<ActionResult<null>> {
  return adminAction(
    async (supabase) => {
      const { error } = await supabase.from('total_donation_rankings').delete().eq('id', id)

      if (error) throw new Error(error.message)
      return null
    },
    ['/admin/donation-rankings', '/ranking']
  )
}

/**
 * 종합 랭킹 일괄 교체 (CSV 업로드용)
 */
export async function bulkReplaceTotalRankings(
  rankings: Array<{
    rank: number
    donor_name: string
    total_amount: number
    is_permanent_vip?: boolean
  }>
): Promise<ActionResult<{ insertedCount: number }>> {
  return adminAction(
    async (supabase) => {
      // 원자적 DELETE + INSERT (트랜잭션 보장, 데이터 유실 방지)
      const { data: insertedCount, error } = await supabase.rpc('atomic_replace_total_rankings', {
        p_rankings: rankings.map((r) => ({
          rank: r.rank,
          donor_name: r.donor_name,
          total_amount: r.total_amount,
          is_permanent_vip: r.is_permanent_vip || false,
        })),
      })

      if (error) throw new Error(`랭킹 교체 실패: ${error.message}`)

      return { insertedCount: insertedCount ?? rankings.length }
    },
    ['/admin/donation-rankings', '/ranking']
  )
}

// ===========================================
// 공개 랭킹 조회 Actions (인증 불필요)
// ===========================================

export interface PublicTotalRankingItem {
  rank: number
  donor_name: string
  viewer_score: number
  donation_count: number
  top_bj: string | null
  profile_id: string | null
  avatar_url: string | null
  is_vip_clickable: boolean
}

/**
 * 총 후원 랭킹 공개 조회 (total_rankings_public View)
 * 보안: total_amount 미노출, viewer_score만 제공
 */
export async function getPublicTotalRankings(
  limit: number = 60
): Promise<ActionResult<PublicTotalRankingItem[]>> {
  return publicAction(async (supabase) => {
    const { data, error } = await supabase
      .from('total_rankings_public')
      .select(
        'rank, donor_name, viewer_score, donation_count, top_bj, profile_id, avatar_url, is_vip_clickable'
      )
      .order('rank', { ascending: true })
      .limit(limit)

    if (error) throw new Error(error.message)
    return (data || []) as PublicTotalRankingItem[]
  })
}

export interface PublicSeasonRankingItem {
  rank: number
  donor_name: string
}

/**
 * 시즌 랭킹 공개 조회 (season_rankings_public View)
 * 랭킹 페이지에서 듀얼 랭킹 표시용
 */
export async function getPublicSeasonRankings(
  seasonId: number,
  limit: number = 50,
  unit?: 'excel' | 'crew'
): Promise<ActionResult<PublicSeasonRankingItem[]>> {
  return publicAction(async (supabase) => {
    let query = supabase
      .from('season_rankings_public')
      .select('rank, donor_name')
      .eq('season_id', seasonId)

    if (unit) {
      query = query.eq('unit', unit)
    }

    const { data, error } = await query.order('rank', { ascending: true }).limit(limit)

    if (error) throw new Error(error.message)
    return (data || []) as PublicSeasonRankingItem[]
  })
}

// ===========================================
// 시즌 목록 조회 (드롭다운용)
// ===========================================

/**
 * 모든 시즌 목록 조회
 */
export async function getAllSeasons(): Promise<ActionResult<Season[]>> {
  return publicAction(async (supabase) => {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .order('start_date', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
  })
}
