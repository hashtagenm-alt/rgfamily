// ==================== 분석 공용 유틸리티 ====================
// 'use server' 파일에서 export하면 Server Action으로 인식되므로
// 순수 함수/타입은 이 파일에서 관리

import type { SupabaseClient } from '@supabase/supabase-js'
import { nicknameAliases } from '@/lib/utils/nickname-aliases'

// ==================== 서버 사이드 TTL 캐시 ====================
// 여러 서버 액션이 동시에 호출될 때 DB 중복 조회 방지
// (예: BJ 탭에서 5개 액션이 1-2초 내 동시 실행)

interface CacheEntry<T> {
  data: T
  timestamp: number
  promise?: Promise<T> // 진행 중인 요청 재사용 (request dedup)
}

const CACHE_TTL_MS = 15_000 // 15초 TTL
const donationCache = new Map<string, CacheEntry<ExtendedDonation[]>>()
const episodeIdCache = new Map<string, CacheEntry<number[]>>()

function getCacheKey(seasonId?: number, episodeId?: number): string {
  return `s:${seasonId ?? 'all'}_e:${episodeId ?? 'all'}`
}

function isValid<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  return !!entry && Date.now() - entry.timestamp < CACHE_TTL_MS
}

/** 캐시 수동 무효화 (시즌/에피소드 변경 시 호출) */
export function invalidateDonationCache(): void {
  donationCache.clear()
  episodeIdCache.clear()
}

/** 최소 제곱법 선형 회귀: y = slope * x + intercept */
export function linearRegression(points: { x: number; y: number }[]): {
  slope: number
  intercept: number
  r_squared: number // 결정 계수 (0~1)
} {
  const n = points.length
  if (n < 2) return { slope: 0, intercept: 0, r_squared: 0 }

  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0
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
  let ssTot = 0,
    ssRes = 0
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
  seasonId?: number,
  unitFilter: 'excel' | 'crew' = 'excel'
): Promise<number[]> {
  const key = `epIds:${seasonId ?? 'all'}:${unitFilter}`
  const cached = episodeIdCache.get(key)
  if (isValid(cached)) return cached.data

  let query = supabase.from('episodes').select('id').eq('is_finalized', true).eq('unit', unitFilter)

  if (seasonId) {
    query = query.eq('season_id', seasonId)
  }

  const { data, error } = await query
  if (error || !data) return []
  const ids = (data as { id: number }[]).map((e) => e.id)
  episodeIdCache.set(key, { data: ids, timestamp: Date.now() })
  return ids
}

export async function fetchAllDonationsExtended(
  supabase: SupabaseClient,
  seasonId?: number,
  episodeId?: number
): Promise<ExtendedDonation[]> {
  const key = getCacheKey(seasonId, episodeId)
  const entry = donationCache.get(key)

  if (entry) {
    // 1) 캐시 히트 (TTL 이내) → 즉시 반환
    if (Date.now() - entry.timestamp < CACHE_TTL_MS) return entry.data
    // 2) 동일 요청 진행 중 → promise 재사용 (request dedup)
    if (entry.promise) return entry.promise
  }

  // 3) 실제 DB 조회
  const fetchPromise = (async () => {
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

    // 캐시 저장 (promise 제거)
    donationCache.set(key, { data: allData, timestamp: Date.now() })
    return allData
  })()

  // 진행 중 표시 (다른 동시 호출이 이 promise를 재사용)
  donationCache.set(key, { data: [], timestamp: 0, promise: fetchPromise })

  return fetchPromise
}

/** 확정 에피소드 메타데이터 (id, episode_number, is_rank_battle, description) */
export async function fetchFinalizedEpisodes(
  supabase: SupabaseClient,
  seasonId?: number,
  unitFilter: 'excel' | 'crew' = 'excel'
): Promise<
  { id: number; episode_number: number; is_rank_battle: boolean; description: string | null }[]
> {
  let query = supabase
    .from('episodes')
    .select('id, episode_number, is_rank_battle, description')
    .eq('is_finalized', true)
    .eq('unit', unitFilter)
    .order('episode_number', { ascending: true })

  if (seasonId) {
    query = query.eq('season_id', seasonId)
  }

  const { data, error } = await query
  if (error || !data) return []
  return data as {
    id: number
    episode_number: number
    is_rank_battle: boolean
    description: string | null
  }[]
}

/** 닉네임 정규화 */
export function normalizeDonorName(name: string): string {
  return nicknameAliases[name] || name
}
