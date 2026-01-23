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

    // 시즌 ID가 있으면 season_rankings_public View에서 조회 (보안: total_amount 미노출)
    if (seasonId) {
      // unit 필터가 있으면 DB 레벨에서 필터링
      const { data, error } = await withRetry(async () => {
        let query = this.supabase
          .from('season_rankings_public')
          .select('rank, donor_name, gauge_percent, donation_count, unit')
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
        totalAmount: item.gauge_percent || 0, // gauge_percent를 totalAmount로 사용 (게이지 표시용)
        rank: index + 1, // 필터된 결과에서 새로운 순위
        seasonId,
      }))
    }

    // 시즌 ID가 없으면 total_rankings_public View에서 조회 (보안: total_amount 미노출)
    const { data, error } = await withRetry(async () => {
      return this.supabase
        .from('total_rankings_public')
        .select('rank, donor_name, gauge_percent')
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
      totalAmount: item.gauge_percent || 0, // gauge_percent를 totalAmount로 사용 (게이지 표시용)
      rank: item.rank,
      seasonId: undefined,
    }))
  }

  async getTopRankers(limit: number): Promise<RankingItem[]> {
    const rankings = await this.getRankings({})
    return rankings.slice(0, limit)
  }
}
