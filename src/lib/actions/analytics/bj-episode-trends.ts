'use server'

import { adminAction, type ActionResult } from '../index'
import { nicknameAliases } from '@/lib/utils/nickname-aliases'
import { fetchAllDonationsExtended, fetchFinalizedEpisodes } from '@/lib/utils/analytics-helpers'

import type { BjEpisodeTrendData } from './types'

// ==================== BJ 에피소드별 추이 ====================

export async function getBjEpisodeTrend(
  seasonId?: number
): Promise<ActionResult<BjEpisodeTrendData[]>> {
  return adminAction(async (supabase) => {
    // 에피소드 목록 (확정된 회차만) — 공용 헬퍼 사용
    const episodes = await fetchFinalizedEpisodes(supabase, seasonId)
    if (episodes.length === 0) return []

    const episodeIdToNumber = new Map(episodes.map((e) => [e.id, e.episode_number]))

    // bj_episode_performances 테이블 조회
    const { data: perfData, error: perfError } = await supabase
      .from('bj_episode_performances')
      .select('episode_id, bj_member_id, donation_hearts, donation_count')
      .in(
        'episode_id',
        episodes.map((e: { id: number }) => e.id)
      )

    if (!perfError && perfData && perfData.length > 0) {
      // BJ 멤버 이름 조회
      const bjMemberIds = [
        ...new Set(
          (perfData as Array<Record<string, unknown>>).map((p) => p.bj_member_id as number)
        ),
      ]
      const { data: members } = await supabase
        .from('organization')
        .select('id, name')
        .in('id', bjMemberIds)

      const memberNameMap = new Map((members || []).map((m) => [m.id, m.name]))

      // BJ별 에피소드 집계
      const bjMap = new Map<string, Map<number, { hearts: number; donor_count: number }>>()

      for (const _p of perfData as Array<Record<string, unknown>>) {
        const p = _p as {
          bj_member_id: number
          episode_id: number
          donation_hearts: number
          donation_count: number
        }
        const bjName = memberNameMap.get(p.bj_member_id) || `BJ#${p.bj_member_id}`
        const epNum = episodeIdToNumber.get(p.episode_id) ?? 0

        if (!bjMap.has(bjName)) bjMap.set(bjName, new Map())
        bjMap.get(bjName)!.set(epNum, {
          hearts: p.donation_hearts,
          donor_count: p.donation_count,
        })
      }

      return buildBjTrendResult(
        bjMap,
        episodes.map((e) => e.episode_number)
      )
    }

    // Fallback: 캐시된 fetchAllDonationsExtended 활용 (중복 DB 조회 방지)
    const episodeIdSet = new Set(episodes.map((e) => e.id))
    const rawDonations = await fetchAllDonationsExtended(supabase, seasonId)
    const allDonations = rawDonations
      .filter((d) => d.target_bj && d.episode_id && episodeIdSet.has(d.episode_id))
      .map((d) => ({
        episode_id: d.episode_id!,
        target_bj: d.target_bj,
        amount: d.amount,
        donor_name: d.donor_name,
      }))

    const bjMap = new Map<string, Map<number, { hearts: number; donors: Set<string> }>>()

    for (const d of allDonations) {
      const bjName = d.target_bj?.trim()
      if (!bjName) continue
      const epNum = episodeIdToNumber.get(d.episode_id) ?? 0

      if (!bjMap.has(bjName)) bjMap.set(bjName, new Map())
      const epMap = bjMap.get(bjName)!
      if (!epMap.has(epNum)) epMap.set(epNum, { hearts: 0, donors: new Set() })
      const stat = epMap.get(epNum)!
      stat.hearts += d.amount || 0
      if (d.donor_name) stat.donors.add(nicknameAliases[d.donor_name] || d.donor_name)
    }

    // Set을 count로 변환
    const bjMapConverted = new Map<string, Map<number, { hearts: number; donor_count: number }>>()
    for (const [bj, epMap] of bjMap) {
      const converted = new Map<number, { hearts: number; donor_count: number }>()
      for (const [epNum, stat] of epMap) {
        converted.set(epNum, { hearts: stat.hearts, donor_count: stat.donors.size })
      }
      bjMapConverted.set(bj, converted)
    }

    return buildBjTrendResult(
      bjMapConverted,
      episodes.map((e) => e.episode_number)
    )
  })
}

function buildBjTrendResult(
  bjMap: Map<string, Map<number, { hearts: number; donor_count: number }>>,
  episodeNumbers: number[]
): BjEpisodeTrendData[] {
  const result: BjEpisodeTrendData[] = []

  for (const [bj_name, epMap] of bjMap) {
    const episodes = episodeNumbers.map((epNum) => {
      const stat = epMap.get(epNum)
      return {
        episode_number: epNum,
        hearts: stat?.hearts ?? 0,
        donor_count: stat?.donor_count ?? 0,
      }
    })
    const totalHearts = episodes.reduce((s, e) => s + e.hearts, 0)
    result.push({ bj_name, episodes, _totalHearts: totalHearts } as BjEpisodeTrendData & {
      _totalHearts: number
    })
  }

  // 총 하트 기준 정렬
  return result
    .sort((a, b) => {
      const aTotal = (a as BjEpisodeTrendData & { _totalHearts: number })._totalHearts
      const bTotal = (b as BjEpisodeTrendData & { _totalHearts: number })._totalHearts
      return bTotal - aTotal
    })
    .map(({ bj_name, episodes }) => ({ bj_name, episodes }))
}
