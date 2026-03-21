'use server'

import { adminAction, type ActionResult } from '../index'
import {
  fetchAllDonationsExtended,
  fetchFinalizedEpisodes,
} from '@/lib/utils/analytics-helpers'
import type {
  BjAffinityData,
  BjAffinityEntry,
  BjExclusivity,
} from './types'
import { normalizeName } from './advanced-helpers'

// ==================== getBjAffinityMatrix ====================

export async function getBjAffinityMatrix(
  seasonId?: number
): Promise<ActionResult<BjAffinityData>> {
  return adminAction(async (supabase) => {
    const episodes = await fetchFinalizedEpisodes(supabase, seasonId)
    if (episodes.length === 0) {
      return { matrix: [], exclusivity: [], insights: [] }
    }

    const finalizedIdSet = new Set(episodes.map(e => e.id))
    const donations = await fetchAllDonationsExtended(supabase, seasonId)
    const filteredDonations = donations.filter(
      (d) => d.episode_id && finalizedIdSet.has(d.episode_id)
    )

    // BJ별 도너 세트 + 도너-BJ별 하트
    const bjDonorsMap = new Map<string, Set<string>>()
    const bjDonorHearts = new Map<string, Map<string, number>>()
    const donorBjs = new Map<string, Set<string>>()

    for (const d of filteredDonations) {
      if (!d.donor_name || !d.target_bj) continue
      const name = normalizeName(d.donor_name)
      const bj = d.target_bj
      const amount = d.amount || 0

      if (!bjDonorsMap.has(bj)) bjDonorsMap.set(bj, new Set())
      bjDonorsMap.get(bj)!.add(name)

      if (!bjDonorHearts.has(bj)) bjDonorHearts.set(bj, new Map())
      const donorMap = bjDonorHearts.get(bj)!
      donorMap.set(name, (donorMap.get(name) || 0) + amount)

      if (!donorBjs.has(name)) donorBjs.set(name, new Set())
      donorBjs.get(name)!.add(bj)
    }

    const bjNames = [...bjDonorsMap.keys()].sort()

    // BJ 쌍별 겹침 분석
    const matrix: BjAffinityEntry[] = []

    for (let i = 0; i < bjNames.length; i++) {
      for (let j = i + 1; j < bjNames.length; j++) {
        const bjA = bjNames[i]
        const bjB = bjNames[j]
        const donorsA = bjDonorsMap.get(bjA)!
        const donorsB = bjDonorsMap.get(bjB)!

        const sharedDonors = [...donorsA].filter((d) => donorsB.has(d))
        if (sharedDonors.length === 0) continue

        const heartsA = bjDonorHearts.get(bjA)!
        const heartsB = bjDonorHearts.get(bjB)!

        const sharedHeartsA = sharedDonors.reduce(
          (sum, d) => sum + (heartsA.get(d) || 0),
          0
        )
        const sharedHeartsB = sharedDonors.reduce(
          (sum, d) => sum + (heartsB.get(d) || 0),
          0
        )

        // 고액 순 공유 후원자 Top 5
        const topShared = sharedDonors
          .map(d => ({
            name: d,
            hearts_a: heartsA.get(d) || 0,
            hearts_b: heartsB.get(d) || 0,
          }))
          .sort((a, b) => (b.hearts_a + b.hearts_b) - (a.hearts_a + a.hearts_b))
          .slice(0, 5)

        matrix.push({
          bj_a: bjA,
          bj_b: bjB,
          shared_donors: sharedDonors.length,
          overlap_pct_a:
            donorsA.size > 0
              ? Math.round((sharedDonors.length / donorsA.size) * 1000) / 10
              : 0,
          overlap_pct_b:
            donorsB.size > 0
              ? Math.round((sharedDonors.length / donorsB.size) * 1000) / 10
              : 0,
          shared_hearts_a: sharedHeartsA,
          shared_hearts_b: sharedHeartsB,
          top_shared_donors: topShared,
        })
      }
    }

    // 정렬: 겹침 많은 순
    matrix.sort((a, b) => b.shared_donors - a.shared_donors)

    // BJ별 전용 후원자 비율
    const exclusivity: BjExclusivity[] = bjNames.map((bj) => {
      const donors = bjDonorsMap.get(bj)!
      const exclusiveDonors = [...donors].filter((d) => {
        const bjSet = donorBjs.get(d)
        return bjSet !== undefined && bjSet.size === 1
      })

      return {
        bj_name: bj,
        total_donors: donors.size,
        exclusive_donors: exclusiveDonors.length,
        exclusive_pct:
          donors.size > 0
            ? Math.round((exclusiveDonors.length / donors.size) * 1000) / 10
            : 0,
      }
    })

    exclusivity.sort((a, b) => b.exclusive_pct - a.exclusive_pct)

    // 인사이트 생성
    const insights: string[] = []

    if (matrix.length > 0) {
      const top = matrix[0]
      const avgOverlap = Math.round(
        (top.overlap_pct_a + top.overlap_pct_b) / 2
      )
      insights.push(
        `${top.bj_a}↔${top.bj_b} 후원자 겹침 ${avgOverlap}% → 콜라보 방송 추천`
      )
    }

    if (exclusivity.length > 0) {
      const topExcl = exclusivity[0]
      insights.push(
        `${topExcl.bj_name}은(는) 전용 후원자 비율 ${topExcl.exclusive_pct}%로 독자적 팬층이 강합니다`
      )
    }

    if (exclusivity.length > 1) {
      const lowest = exclusivity[exclusivity.length - 1]
      if (lowest.exclusive_pct < 30) {
        insights.push(
          `${lowest.bj_name}은(는) 전용 후원자 비율 ${lowest.exclusive_pct}%로 다른 BJ와 후원자 공유가 많습니다`
        )
      }
    }

    for (const entry of matrix.slice(0, 3)) {
      const diff = Math.abs(entry.overlap_pct_a - entry.overlap_pct_b)
      if (diff >= 20) {
        const dependent =
          entry.overlap_pct_a > entry.overlap_pct_b
            ? entry.bj_a
            : entry.bj_b
        const independent =
          entry.overlap_pct_a > entry.overlap_pct_b
            ? entry.bj_b
            : entry.bj_a
        insights.push(
          `${dependent}의 후원자가 ${independent}에도 많이 겹치지만 반대는 적습니다 → ${dependent}의 팬이 ${independent}으로 유입 가능성`
        )
      }
    }

    return { matrix, exclusivity, insights }
  })
}
