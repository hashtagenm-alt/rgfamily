import {
  normalizeDonorName,
  type ExtendedDonation,
} from '@/lib/utils/analytics-helpers'

// ==================== 내부 헬퍼 ====================

export interface EpisodeInfo {
  id: number
  episode_number: number
  is_rank_battle: boolean
  description: string | null
}

/** 닉네임 정규화 (helpers에서 import한 함수의 별칭) */
export function normalizeName(raw: string): string {
  return normalizeDonorName(raw)
}

/** 후원 데이터를 에피소드별 도너 맵으로 변환 */
export function buildDonorEpisodeMap(
  donations: ExtendedDonation[],
  episodes: EpisodeInfo[]
): {
  /** donor -> episode_id -> { hearts, bj_map } */
  donorEpMap: Map<string, Map<number, { hearts: number; bjMap: Map<string, number> }>>
  /** donor -> total hearts */
  donorTotalHearts: Map<string, number>
  /** donor -> favorite bj */
  donorFavoriteBj: Map<string, string>
  /** donor -> bj -> hearts */
  donorBjMap: Map<string, Map<string, number>>
  /** episode_id set */
  episodeIdSet: Set<number>
} {
  const episodeIdSet = new Set(episodes.map((e) => e.id))
  const donorEpMap = new Map<
    string,
    Map<number, { hearts: number; bjMap: Map<string, number> }>
  >()
  const donorTotalHearts = new Map<string, number>()
  const donorBjMap = new Map<string, Map<string, number>>()

  for (const d of donations) {
    if (!d.donor_name || !d.episode_id) continue
    if (!episodeIdSet.has(d.episode_id)) continue

    const name = normalizeName(d.donor_name)
    const amount = d.amount || 0
    const bj = d.target_bj || '(미지정)'

    // donorEpMap
    if (!donorEpMap.has(name)) donorEpMap.set(name, new Map())
    const epMap = donorEpMap.get(name)!
    if (!epMap.has(d.episode_id)) {
      epMap.set(d.episode_id, { hearts: 0, bjMap: new Map() })
    }
    const entry = epMap.get(d.episode_id)!
    entry.hearts += amount
    entry.bjMap.set(bj, (entry.bjMap.get(bj) || 0) + amount)

    // total
    donorTotalHearts.set(name, (donorTotalHearts.get(name) || 0) + amount)

    // bj map
    if (!donorBjMap.has(name)) donorBjMap.set(name, new Map())
    const bjMap = donorBjMap.get(name)!
    bjMap.set(bj, (bjMap.get(bj) || 0) + amount)
  }

  // favorite bj
  const donorFavoriteBj = new Map<string, string>()
  for (const [name, bjMap] of donorBjMap) {
    let maxBj = ''
    let maxHearts = 0
    for (const [bj, hearts] of bjMap) {
      if (hearts > maxHearts) {
        maxHearts = hearts
        maxBj = bj
      }
    }
    donorFavoriteBj.set(name, maxBj)
  }

  return { donorEpMap, donorTotalHearts, donorFavoriteBj, donorBjMap, episodeIdSet }
}

/** 리스크 레벨 판정 */
export function getRiskLevel(score: number): '위험' | '주의' | '관심' | '안전' {
  if (score >= 75) return '위험'
  if (score >= 50) return '주의'
  if (score >= 25) return '관심'
  return '안전'
}

/** 퀀타일 점수를 개별 값에 직접 매핑 */
export function assignQuintileScores(
  items: { key: string; value: number }[],
  ascending: boolean
): Map<string, number> {
  const sorted = [...items].sort((a, b) =>
    ascending ? a.value - b.value : b.value - a.value
  )
  const n = sorted.length
  const result = new Map<string, number>()

  for (let i = 0; i < n; i++) {
    const percentile = n > 1 ? i / (n - 1) : 0.5
    let score: number
    if (percentile >= 0.8) score = 5
    else if (percentile >= 0.6) score = 4
    else if (percentile >= 0.4) score = 3
    else if (percentile >= 0.2) score = 2
    else score = 1
    result.set(sorted[i].key, score)
  }

  return result
}
