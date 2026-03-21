'use server'

import { adminAction, type ActionResult } from '../index'
import { nicknameAliases } from '@/lib/utils/nickname-aliases'
import { fetchAllDonationsExtended } from '@/lib/utils/analytics-helpers'

import type { BjStats } from './types'

// ==================== 헬퍼: 페이지네이션으로 전체 데이터 가져오기 ====================

export async function fetchAllDonations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  seasonId?: number,
  episodeId?: number,
  _selectFields: string = 'donor_name, target_bj, amount'
): Promise<{ donor_name: string; target_bj: string | null; amount: number }[]> {
  // 캐시된 fetchAllDonationsExtended 활용 (중복 DB 조회 방지)
  const data = await fetchAllDonationsExtended(supabase, seasonId, episodeId)
  return data.map(d => ({ donor_name: d.donor_name, target_bj: d.target_bj, amount: d.amount }))
}

// ==================== BJ별 후원 현황 ====================

export async function getBjStats(
  seasonId?: number,
  episodeId?: number
): Promise<ActionResult<BjStats[]>> {
  return adminAction(async (supabase) => {
    // 페이지네이션으로 전체 데이터 가져오기
    const data = await fetchAllDonations(supabase, seasonId, episodeId)

    // target_bj가 있는 데이터만
    const filteredData = data.filter(d => d.target_bj !== null)

    if (filteredData.length === 0) return []

    // BJ별로 집계
    const bjMap = new Map<string, {
      total_hearts: number
      donation_count: number
      donors: Set<string>
    }>()

    for (const donation of filteredData) {
      const bjName = donation.target_bj?.trim()
      if (!bjName) continue

      if (!bjMap.has(bjName)) {
        bjMap.set(bjName, {
          total_hearts: 0,
          donation_count: 0,
          donors: new Set()
        })
      }

      const bj = bjMap.get(bjName)!
      bj.total_hearts += donation.amount || 0
      bj.donation_count += 1
      if (donation.donor_name) {
        bj.donors.add(nicknameAliases[donation.donor_name] || donation.donor_name)
      }
    }

    // 배열로 변환 및 정렬
    const result: BjStats[] = Array.from(bjMap.entries())
      .map(([bj_name, stats]) => ({
        bj_name,
        total_hearts: stats.total_hearts,
        donation_count: stats.donation_count,
        unique_donors: stats.donors.size,
        avg_donation: Math.round(stats.total_hearts / stats.donation_count)
      }))
      .sort((a, b) => b.total_hearts - a.total_hearts)

    return result
  })
}
