'use server'

import { adminAction, type ActionResult } from '../index'

import type { DonorSearch } from './types'

// ==================== 후원자 검색 ====================

export async function searchDonor(
  donorName: string,
  seasonId?: number
): Promise<ActionResult<DonorSearch | null>> {
  return adminAction(async (supabase) => {
    let query = supabase
      .from('donations')
      .select('donor_name, target_bj, amount, episode_id')
      .ilike('donor_name', `%${donorName}%`)

    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) return null

    // 에피소드 정보 조회
    const episodeIds = [...new Set(data.map(d => d.episode_id).filter((id): id is number => id !== null))]
    const episodeMap = new Map<number, string>()

    if (episodeIds.length > 0) {
      const { data: episodes } = await supabase
        .from('episodes')
        .select('id, title')
        .in('id', episodeIds)

      if (episodes) {
        for (const ep of episodes) {
          episodeMap.set(ep.id, ep.title)
        }
      }
    }

    // 데이터 집계
    const total_hearts = data.reduce((sum, d) => sum + (d.amount || 0), 0)
    const donation_count = data.length

    // 에피소드별 집계
    const epStats = new Map<number, { hearts: number; count: number }>()
    for (const d of data) {
      if (d.episode_id) {
        if (!epStats.has(d.episode_id)) {
          epStats.set(d.episode_id, { hearts: 0, count: 0 })
        }
        const stat = epStats.get(d.episode_id)!
        stat.hearts += d.amount || 0
        stat.count += 1
      }
    }

    const episodes = [...epStats.entries()].map(([episode_id, stats]) => ({
      episode_id,
      episode_title: episodeMap.get(episode_id) || `에피소드 ${episode_id}`,
      hearts: stats.hearts,
      count: stats.count
    }))

    // BJ별 분포
    const bjStats = new Map<string, number>()
    for (const d of data) {
      if (d.target_bj) {
        bjStats.set(d.target_bj, (bjStats.get(d.target_bj) || 0) + (d.amount || 0))
      }
    }

    const bj_distribution = [...bjStats.entries()]
      .map(([bj_name, hearts]) => ({
        bj_name,
        hearts,
        percent: Math.round((hearts / total_hearts) * 100)
      }))
      .sort((a, b) => b.hearts - a.hearts)

    // 패턴 분류
    const unique_bjs = bjStats.size
    const avg_donation = Math.round(total_hearts / donation_count)
    const max_bj_ratio = bj_distribution[0]?.percent || 0

    let pattern_type = '일반'
    if (max_bj_ratio >= 80) {
      pattern_type = '올인형'
    } else if (unique_bjs >= 3 && max_bj_ratio < 50) {
      pattern_type = '분산형'
    } else if (avg_donation < 5000 && donation_count >= 5) {
      pattern_type = '소액다건'
    } else if (avg_donation >= 10000 && donation_count <= 3) {
      pattern_type = '고액소건'
    }

    return {
      donor_name: data[0].donor_name,
      total_hearts,
      donation_count,
      episodes,
      bj_distribution,
      pattern_type
    }
  })
}
