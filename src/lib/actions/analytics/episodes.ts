'use server'

import { adminAction, type ActionResult } from '../index'
import { nicknameAliases } from '@/lib/utils/nickname-aliases'
import { fetchAllDonationsExtended } from '@/lib/utils/analytics-helpers'

import type { EpisodeTrendData, EpisodeComparison } from './types'

// ==================== 회차별 추이 ====================

export async function getEpisodeTrend(
  seasonId?: number
): Promise<ActionResult<EpisodeTrendData[]>> {
  return adminAction(async (supabase) => {
    // 에피소드 목록 조회 (확정된 엑셀부 회차만)
    // NOTE: fetchFinalizedEpisodes 헬퍼 미사용 — title, broadcast_date 필드가 추가로 필요
    let epQuery = supabase
      .from('episodes')
      .select('id, episode_number, title, description, broadcast_date, is_rank_battle')
      .eq('is_finalized', true)
      .eq('unit', 'excel')
      .order('episode_number', { ascending: true })

    if (seasonId) {
      epQuery = epQuery.eq('season_id', seasonId)
    }

    const { data: episodes, error: epError } = await epQuery
    if (epError) throw new Error(epError.message)
    if (!episodes || episodes.length === 0) return []

    // 캐시된 fetchAllDonationsExtended 활용 (중복 DB 조회 방지)
    const episodeIdSet = new Set(episodes.map((e) => e.id))
    const rawDonations = await fetchAllDonationsExtended(supabase, seasonId)
    const allDonations = rawDonations
      .filter((d) => d.episode_id && episodeIdSet.has(d.episode_id))
      .map((d) => ({ episode_id: d.episode_id!, donor_name: d.donor_name, amount: d.amount }))

    // 에피소드별 집계 + 누적 후원자 Set으로 신규/재참여 계산
    const seenDonors = new Set<string>()
    const result: EpisodeTrendData[] = []

    for (const ep of episodes) {
      const epDonations = allDonations.filter((d) => d.episode_id === ep.id)
      const epDonors = new Set(
        epDonations
          .map((d) => (d.donor_name ? nicknameAliases[d.donor_name] || d.donor_name : ''))
          .filter(Boolean)
      )
      const totalHearts = epDonations.reduce((s, d) => s + (d.amount || 0), 0)

      let newDonors = 0
      let returningDonors = 0

      for (const donor of epDonors) {
        if (seenDonors.has(donor)) {
          returningDonors++
        } else {
          newDonors++
        }
      }

      // 누적에 추가
      for (const donor of epDonors) {
        seenDonors.add(donor)
      }

      result.push({
        episode_id: ep.id,
        episode_number: ep.episode_number,
        title: ep.title,
        description: ep.description ?? null,
        broadcast_date: ep.broadcast_date,
        is_rank_battle: ep.is_rank_battle,
        total_hearts: totalHearts,
        donor_count: epDonors.size,
        avg_donation: epDonors.size > 0 ? Math.round(totalHearts / epDonations.length) : 0,
        new_donors: newDonors,
        returning_donors: returningDonors,
      })
    }

    return result
  })
}

// ==================== 에피소드 비교 ====================

export async function compareEpisodes(
  episode1Id: number,
  episode2Id: number
): Promise<ActionResult<EpisodeComparison>> {
  return adminAction(async (supabase) => {
    // 에피소드 정보 조회
    const { data: episodes, error: epError } = await supabase
      .from('episodes')
      .select('id, title')
      .in('id', [episode1Id, episode2Id])

    if (epError) throw new Error(epError.message)

    const ep1Info = episodes?.find((e) => e.id === episode1Id)
    const ep2Info = episodes?.find((e) => e.id === episode2Id)

    // 각 에피소드 후원 데이터 조회
    const [ep1Result, ep2Result] = await Promise.all([
      supabase
        .from('donations')
        .select('donor_name, target_bj, amount')
        .eq('episode_id', episode1Id),
      supabase
        .from('donations')
        .select('donor_name, target_bj, amount')
        .eq('episode_id', episode2Id),
    ])

    if (ep1Result.error) throw new Error(ep1Result.error.message)
    if (ep2Result.error) throw new Error(ep2Result.error.message)

    const ep1Data = ep1Result.data || []
    const ep2Data = ep2Result.data || []

    // 에피소드별 통계
    const ep1Donors = new Set(
      ep1Data
        .map((d) => (d.donor_name ? nicknameAliases[d.donor_name] || d.donor_name : ''))
        .filter(Boolean)
    )
    const ep2Donors = new Set(
      ep2Data
        .map((d) => (d.donor_name ? nicknameAliases[d.donor_name] || d.donor_name : ''))
        .filter(Boolean)
    )

    const ep1Total = ep1Data.reduce((sum, d) => sum + (d.amount || 0), 0)
    const ep2Total = ep2Data.reduce((sum, d) => sum + (d.amount || 0), 0)

    // 후원자 변화
    const continued = [...ep1Donors].filter((d) => ep2Donors.has(d)).length
    const new_donors = [...ep2Donors].filter((d) => !ep1Donors.has(d)).length
    const left_donors = [...ep1Donors].filter((d) => !ep2Donors.has(d)).length

    // BJ별 변화
    const bjStats1 = new Map<string, number>()
    const bjStats2 = new Map<string, number>()

    for (const d of ep1Data) {
      if (d.target_bj) {
        bjStats1.set(d.target_bj, (bjStats1.get(d.target_bj) || 0) + (d.amount || 0))
      }
    }
    for (const d of ep2Data) {
      if (d.target_bj) {
        bjStats2.set(d.target_bj, (bjStats2.get(d.target_bj) || 0) + (d.amount || 0))
      }
    }

    const allBjs = new Set([...bjStats1.keys(), ...bjStats2.keys()])
    const bj_changes = [...allBjs]
      .map((bj_name) => {
        const ep1_hearts = bjStats1.get(bj_name) || 0
        const ep2_hearts = bjStats2.get(bj_name) || 0
        const change = ep2_hearts - ep1_hearts
        const change_percent =
          ep1_hearts > 0
            ? Math.round(((ep2_hearts - ep1_hearts) / ep1_hearts) * 100)
            : ep2_hearts > 0
              ? 100
              : 0
        return { bj_name, ep1_hearts, ep2_hearts, change, change_percent }
      })
      .sort((a, b) => b.change - a.change)

    return {
      episode1: {
        id: episode1Id,
        title: ep1Info?.title || `에피소드 ${episode1Id}`,
        total_hearts: ep1Total,
        donation_count: ep1Data.length,
        unique_donors: ep1Donors.size,
      },
      episode2: {
        id: episode2Id,
        title: ep2Info?.title || `에피소드 ${episode2Id}`,
        total_hearts: ep2Total,
        donation_count: ep2Data.length,
        unique_donors: ep2Donors.size,
      },
      donor_changes: { continued, new_donors, left_donors },
      bj_changes,
    }
  })
}
