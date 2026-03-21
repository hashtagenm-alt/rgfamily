'use server'

import { adminAction, type ActionResult } from '../index'
import { nicknameAliases } from '@/lib/utils/nickname-aliases'
import { fetchAllDonationsExtended } from '@/lib/utils/analytics-helpers'

import type { AnalyticsSummary, DashboardStatsData } from './types'

// ==================== 헬퍼: 페이지네이션으로 전체 데이터 가져오기 ====================

// fetchFinalizedEpisodeIds → imported from @/lib/utils/analytics-helpers

async function fetchAllDonations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  seasonId?: number,
  episodeId?: number,
  _selectFields: string = 'donor_name, target_bj, amount'
): Promise<{ donor_name: string; target_bj: string | null; amount: number }[]> {
  // 캐시된 fetchAllDonationsExtended 활용 (중복 DB 조회 방지)
  const data = await fetchAllDonationsExtended(supabase, seasonId, episodeId)
  return data.map((d) => ({ donor_name: d.donor_name, target_bj: d.target_bj, amount: d.amount }))
}

// fetchAllDonationsExtended, ExtendedDonation → imported from @/lib/utils/analytics-helpers

// ==================== 요약 통계 ====================

export async function getAnalyticsSummary(
  seasonId?: number,
  episodeId?: number
): Promise<ActionResult<AnalyticsSummary>> {
  return adminAction(async (supabase) => {
    // 페이지네이션으로 전체 데이터 가져오기
    const data = await fetchAllDonations(supabase, seasonId, episodeId)

    // target_bj가 있는 데이터만 필터링 (BJ별 분석용)
    const dataWithBj = data.filter((d) => d.target_bj !== null)

    if (data.length === 0) {
      return {
        total_hearts: 0,
        total_donations: 0,
        unique_donors: 0,
        unique_bjs: 0,
        avg_donation: 0,
        top_donor: '-',
        top_bj: '-',
      }
    }

    // 전체 데이터 기준 통계
    const total_hearts = data.reduce((sum, d) => sum + (d.amount || 0), 0)
    const total_donations = data.length
    const donors = new Set(
      data
        .map((d) => (d.donor_name ? nicknameAliases[d.donor_name] || d.donor_name : ''))
        .filter(Boolean)
    )

    // BJ 관련은 target_bj 있는 데이터만
    const bjs = new Set(dataWithBj.map((d) => d.target_bj).filter(Boolean))

    // 상위 후원자 (전체 기준)
    const donorHearts = new Map<string, number>()
    for (const d of data) {
      if (d.donor_name) {
        const name = nicknameAliases[d.donor_name] || d.donor_name
        donorHearts.set(name, (donorHearts.get(name) || 0) + (d.amount || 0))
      }
    }
    const topDonorEntry = [...donorHearts.entries()].sort((a, b) => b[1] - a[1])[0]

    // 상위 BJ (target_bj 있는 데이터만)
    const bjHearts = new Map<string, number>()
    for (const d of dataWithBj) {
      if (d.target_bj) {
        bjHearts.set(d.target_bj, (bjHearts.get(d.target_bj) || 0) + (d.amount || 0))
      }
    }
    const topBjEntry = [...bjHearts.entries()].sort((a, b) => b[1] - a[1])[0]

    return {
      total_hearts,
      total_donations,
      unique_donors: donors.size,
      unique_bjs: bjs.size,
      avg_donation: Math.round(total_hearts / total_donations),
      top_donor: topDonorEntry?.[0] || '-',
      top_bj: topBjEntry?.[0] || '-',
    }
  })
}

// ==================== 에피소드 목록 ====================

export async function getEpisodeList(seasonId?: number): Promise<
  ActionResult<
    {
      id: number
      title: string
      description: string | null
      season_id: number
      episode_number: number
      broadcast_date: string | null
      is_finalized: boolean
      unit: string
    }[]
  >
> {
  return adminAction(async (supabase) => {
    let query = supabase
      .from('episodes')
      .select(
        'id, title, description, season_id, episode_number, broadcast_date, is_finalized, unit'
      )
      .eq('unit', 'excel')
      .order('episode_number', { ascending: true })

    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    return data || []
  })
}

// ==================== 시즌 목록 ====================

export async function getSeasonList(): Promise<
  ActionResult<
    {
      id: number
      name: string
    }[]
  >
> {
  return adminAction(async (supabase) => {
    const { data, error } = await supabase
      .from('seasons')
      .select('id, name')
      .order('id', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
  })
}

// ==================== 대시보드 통계 ====================

/**
 * 관리자 대시보드에 필요한 모든 통계를 한 번에 조회
 * - 회원 수, 시즌/전체 후원 통계, 활성 시즌, 최근 가입, 콘텐츠 수
 */
export async function getDashboardStats(): Promise<ActionResult<DashboardStatsData>> {
  return adminAction(async (supabase) => {
    // 모든 쿼리를 병렬로 실행
    const [
      memberCountResult,
      seasonRankingsResult,
      totalRankingsResult,
      activeSeasonsResult,
      recentMembersResult,
      postsCountResult,
      mediaCountResult,
      signaturesCountResult,
    ] = await Promise.all([
      // 회원 수
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      // 시즌 랭킹 통계
      supabase.from('season_donation_rankings').select('total_amount, donation_count'),
      // 전체 랭킹 통계
      supabase.from('total_donation_rankings').select('total_amount'),
      // 활성 시즌 수
      supabase.from('seasons').select('*', { count: 'exact', head: true }).eq('is_active', true),
      // 최근 가입 회원
      supabase
        .from('profiles')
        .select('id, nickname, email, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      // 콘텐츠 통계
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('media_content').select('*', { count: 'exact', head: true }),
      supabase.from('signatures').select('*', { count: 'exact', head: true }),
    ])

    const seasonRankings = seasonRankingsResult.data
    const seasonDonorCount = seasonRankings?.length || 0
    const seasonTotalAmount =
      seasonRankings?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0

    const totalRankings = totalRankingsResult.data
    const totalDonorCount = totalRankings?.length || 0
    const totalDonationAmount =
      totalRankings?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0

    const recentMembers = (recentMembersResult.data || []).map((m) => ({
      id: m.id,
      nickname: m.nickname,
      email: m.email || '',
      createdAt: m.created_at,
    }))

    return {
      totalMembers: memberCountResult.count || 0,
      seasonDonorCount,
      seasonTotalAmount,
      totalDonorCount,
      totalDonationAmount,
      activeSeasons: activeSeasonsResult.count || 0,
      recentMembers,
      totalPosts: postsCountResult.count || 0,
      totalMedia: mediaCountResult.count || 0,
      totalSignatures: signaturesCountResult.count || 0,
    }
  })
}
