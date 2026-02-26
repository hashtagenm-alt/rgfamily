// ==================== 분석 공용 유틸리티 ====================
// 'use server' 파일에서 export하면 Server Action으로 인식되므로
// 순수 함수/타입은 이 파일에서 관리

import type { SupabaseClient } from '@supabase/supabase-js'
import { nicknameAliases } from '@/lib/utils/nickname-aliases'

/** 최소 제곱법 선형 회귀: y = slope * x + intercept */
export function linearRegression(points: { x: number; y: number }[]): {
  slope: number
  intercept: number
  r_squared: number // 결정 계수 (0~1)
} {
  const n = points.length
  if (n < 2) return { slope: 0, intercept: 0, r_squared: 0 }

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  for (const p of points) {
    sumX += p.x
    sumY += p.y
    sumXY += p.x * p.y
    sumX2 += p.x * p.x
  }

  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return { slope: 0, intercept: sumY / n, r_squared: 0 }

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  // R² 계산
  const meanY = sumY / n
  let ssTot = 0, ssRes = 0
  for (const p of points) {
    ssTot += (p.y - meanY) ** 2
    const predicted = slope * p.x + intercept
    ssRes += (p.y - predicted) ** 2
  }
  const r_squared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0

  return { slope, intercept, r_squared }
}

// ==================== 공용 타입 ====================

export interface ExtendedDonation {
  donor_name: string
  target_bj: string | null
  amount: number
  episode_id: number | null
  donated_at: string | null
}

// ==================== 공용 헬퍼 (supabase 인스턴스를 받아서 사용) ====================

export async function fetchFinalizedEpisodeIds(
  supabase: SupabaseClient,
  seasonId?: number
): Promise<number[]> {
  let query = supabase
    .from('episodes')
    .select('id')
    .eq('is_finalized', true)

  if (seasonId) {
    query = query.eq('season_id', seasonId)
  }

  const { data, error } = await query
  if (error || !data) return []
  return (data as { id: number }[]).map(e => e.id)
}

export async function fetchAllDonationsExtended(
  supabase: SupabaseClient,
  seasonId?: number,
  episodeId?: number,
): Promise<ExtendedDonation[]> {
  // 특정 회차 미지정 시 확정된 회차의 donation만 조회
  let finalizedIds: number[] | null = null
  if (!episodeId) {
    finalizedIds = await fetchFinalizedEpisodeIds(supabase, seasonId)
    if (finalizedIds.length === 0) return []
  }

  const allData: ExtendedDonation[] = []
  let page = 0
  const pageSize = 1000

  while (true) {
    let query = supabase
      .from('donations')
      .select('donor_name, target_bj, amount, episode_id, donated_at')
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (episodeId) {
      query = query.eq('episode_id', episodeId)
    } else {
      query = query.in('episode_id', finalizedIds!)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    allData.push(...(data as ExtendedDonation[]))
    if (data.length < pageSize) break
    page++
  }

  return allData
}

/** 확정 에피소드 메타데이터 (id, episode_number, is_rank_battle, description) */
export async function fetchFinalizedEpisodes(
  supabase: SupabaseClient,
  seasonId?: number
): Promise<{ id: number; episode_number: number; is_rank_battle: boolean; description: string | null }[]> {
  let query = supabase
    .from('episodes')
    .select('id, episode_number, is_rank_battle, description')
    .eq('is_finalized', true)
    .order('episode_number', { ascending: true })

  if (seasonId) {
    query = query.eq('season_id', seasonId)
  }

  const { data, error } = await query
  if (error || !data) return []
  return data as { id: number; episode_number: number; is_rank_battle: boolean; description: string | null }[]
}

/** 닉네임 정규화 */
export function normalizeDonorName(name: string): string {
  return nicknameAliases[name] || name
}
