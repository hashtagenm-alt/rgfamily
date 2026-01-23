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
  return adminAction(async (supabase) => {
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
  }, ['/admin/donation-rankings', '/ranking'])
}

/**
 * 시즌 랭킹 삭제
 */
export async function deleteSeasonRanking(
  id: number
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    const { error } = await supabase
      .from('season_donation_rankings')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  }, ['/admin/donation-rankings', '/ranking'])
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
  return adminAction(async (supabase) => {
    // 1. 기존 시즌 랭킹 삭제
    const { error: deleteError } = await supabase
      .from('season_donation_rankings')
      .delete()
      .eq('season_id', seasonId)

    if (deleteError) throw new Error(`삭제 실패: ${deleteError.message}`)

    // 2. 새 랭킹 삽입
    const dataToInsert = rankings.map((r) => ({
      season_id: seasonId,
      rank: r.rank,
      donor_name: r.donor_name,
      total_amount: r.total_amount,
      donation_count: r.donation_count || 0,
    }))

    const { error: insertError } = await supabase
      .from('season_donation_rankings')
      .insert(dataToInsert)

    if (insertError) throw new Error(`삽입 실패: ${insertError.message}`)

    return { insertedCount: rankings.length }
  }, ['/admin/donation-rankings', '/ranking'])
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
  return adminAction(async (supabase) => {
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
  }, ['/admin/donation-rankings', '/ranking'])
}

/**
 * 종합 랭킹 삭제
 */
export async function deleteTotalRanking(
  id: number
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    const { error } = await supabase
      .from('total_donation_rankings')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  }, ['/admin/donation-rankings', '/ranking'])
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
  return adminAction(async (supabase) => {
    // 1. 기존 종합 랭킹 전체 삭제
    const { error: deleteError } = await supabase
      .from('total_donation_rankings')
      .delete()
      .neq('id', 0) // 모든 행 삭제

    if (deleteError) throw new Error(`삭제 실패: ${deleteError.message}`)

    // 2. 새 랭킹 삽입
    const dataToInsert = rankings.map((r) => ({
      rank: r.rank,
      donor_name: r.donor_name,
      total_amount: r.total_amount,
      is_permanent_vip: r.is_permanent_vip || false,
    }))

    const { error: insertError } = await supabase
      .from('total_donation_rankings')
      .insert(dataToInsert)

    if (insertError) throw new Error(`삽입 실패: ${insertError.message}`)

    return { insertedCount: rankings.length }
  }, ['/admin/donation-rankings', '/ranking'])
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
