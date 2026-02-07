/**
 * Supabase Ranking Repository
 * 랭킹 데이터 조회
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import { IRankingRepository } from '../types'
import type { RankingItem, UnitFilter } from '@/types/common'

export class SupabaseRankingRepository implements IRankingRepository {
  constructor(private supabase: SupabaseClient) {}

  async getRankings(options: {
    seasonId?: number | null
    unitFilter?: UnitFilter
  }): Promise<RankingItem[]> {
    const { seasonId, unitFilter } = options

    // 시즌 ID가 있으면 season_rankings_public View에서 조회
    // View에 profile_id, avatar_url, is_vip_clickable 포함 (추가 쿼리 불필요)
    if (seasonId) {
      // unit 필터가 있으면 DB 레벨에서 필터링
      const { data, error } = await withRetry(async () => {
        let query = this.supabase
          .from('season_rankings_public')
          .select('rank, donor_name, viewer_score, donation_count, top_bj, unit, profile_id, avatar_url, is_vip_clickable')
          .eq('season_id', seasonId)

        // unit 필터 적용 (DB 레벨)
        if (unitFilter && unitFilter !== 'all' && unitFilter !== 'vip') {
          query = query.eq('unit', unitFilter)
        }

        return query.order('rank', { ascending: true }).limit(50)
      })

      if (error) throw error

      // 종합 랭킹도 가져오기 (듀얼 랭킹 표시용)
      const { data: totalRankingsData } = await this.supabase
        .from('total_rankings_public')
        .select('rank, donor_name')
        .order('rank', { ascending: true })
        .limit(50)

      const totalRankingsMap: Record<string, number> = {}
      ;(totalRankingsData || []).forEach(item => {
        totalRankingsMap[item.donor_name.trim()] = item.rank
      })

      // DB에서 가져온 rank 값 그대로 사용 (중복 제거: 같은 donor_name이 여러 번 나오면 첫 번째만 유지)
      const seenDonors = new Set<string>()
      const uniqueData = (data || []).filter((item) => {
        const name = item.donor_name.trim()
        if (seenDonors.has(name)) {
          return false
        }
        seenDonors.add(name)
        return true
      })

      return uniqueData.map((item) => ({
        donorId: item.profile_id || null,
        donorName: item.donor_name,
        avatarUrl: item.avatar_url || null,
        viewerScore: item.viewer_score || 0,
        donationCount: item.donation_count || 0,
        topBj: item.top_bj || null,
        rank: item.rank, // DB에서 가져온 rank 사용 (필터 시에도 원래 순위 유지)
        seasonId,
        seasonRank: item.rank, // 시즌 랭킹 페이지이므로 rank = seasonRank
        totalRank: totalRankingsMap[item.donor_name.trim()] || undefined, // 종합 랭킹
        hasVipRewards: item.is_vip_clickable || false, // View에서 직접 가져온 VIP 클릭 가능 여부
      }))
    }

    // 시즌 ID가 없으면 total_rankings_public View에서 조회
    // View에 profile_id, avatar_url, is_vip_clickable 포함 (추가 쿼리 불필요)
    const { data, error } = await withRetry(async () => {
      return this.supabase
        .from('total_rankings_public')
        .select('rank, donor_name, viewer_score, donation_count, top_bj, profile_id, avatar_url, is_vip_clickable')
        .order('rank', { ascending: true })
        .limit(60)  // 불완전 데이터 필터 후 50명 채우기 위해 여유 확보
    })

    if (error) throw error

    // 중복 제거 + donation_count가 0이고 top_bj도 없는 불완전 데이터 제외
    const seenDonors = new Set<string>()
    const uniqueData = (data || []).filter((item) => {
      const name = item.donor_name.trim()
      if (seenDonors.has(name)) return false
      seenDonors.add(name)
      // 후원 횟수/최애BJ 모두 없는 불완전 데이터 스킵
      if ((item.donation_count || 0) === 0 && !item.top_bj) return false
      return true
    })

    // 순위 재정렬 (1부터, 최대 50명)
    return uniqueData.slice(0, 50).map((item, idx) => ({
      donorId: item.profile_id || null,
      donorName: item.donor_name,
      avatarUrl: item.avatar_url || null,
      viewerScore: item.viewer_score || 0,
      donationCount: item.donation_count || 0,
      topBj: item.top_bj || null,
      rank: idx + 1,
      seasonId: undefined,
      hasVipRewards: item.is_vip_clickable || false,
    }))
  }

  async getTopRankers(limit: number): Promise<RankingItem[]> {
    const rankings = await this.getRankings({})
    return rankings.slice(0, limit)
  }
}
