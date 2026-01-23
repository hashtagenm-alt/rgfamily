/**
 * Mock Episodes Data
 * 시즌별 에피소드(회차) 데이터 - 직급전 포함
 *
 * 실제 시즌1 일정 (2026년 1월~2월)
 */

import type { Episode } from '@/types/database'

// 시즌 1 에피소드 (2026.01.20 ~ 2026.02.24) - 실제 일정
const season1Episodes: Episode[] = [
  {
    id: 1,
    season_id: 1,
    episode_number: 1,
    title: '[RG FAMILY] 시즌1 / 01화!',
    broadcast_date: '2026-01-20T20:00:00+09:00',
    is_rank_battle: true,
    description: '대망의 첫 회! 직급전!',
    is_finalized: false,
    finalized_at: null,
    representative_bj_total: null,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 2,
    season_id: 1,
    episode_number: 2,
    title: '[RG FAMILY] 시즌1 / 02화!',
    broadcast_date: '2026-01-22T20:00:00+09:00',
    is_rank_battle: false,
    description: '황금or벌금데이',
    is_finalized: false,
    finalized_at: null,
    representative_bj_total: null,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 3,
    season_id: 1,
    episode_number: 3,
    title: '[RG FAMILY] 시즌1 / 03화!',
    broadcast_date: '2026-01-24T20:00:00+09:00',
    is_rank_battle: false,
    description: '퇴근전쟁',
    is_finalized: false,
    finalized_at: null,
    representative_bj_total: null,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 4,
    season_id: 1,
    episode_number: 4,
    title: '[RG FAMILY] 시즌1 / 04화!',
    broadcast_date: '2026-01-27T20:00:00+09:00',
    is_rank_battle: false,
    description: '난사데이',
    is_finalized: false,
    finalized_at: null,
    representative_bj_total: null,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 5,
    season_id: 1,
    episode_number: 5,
    title: '[RG FAMILY] 시즌1 / 05화!',
    broadcast_date: '2026-01-29T20:00:00+09:00',
    is_rank_battle: false,
    description: '명품데이 - 메이져 5명, 마이너 7명 경쟁',
    is_finalized: false,
    finalized_at: null,
    representative_bj_total: null,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 6,
    season_id: 1,
    episode_number: 6,
    title: '[RG FAMILY] 시즌1 / 06화!',
    broadcast_date: '2026-01-31T20:00:00+09:00',
    is_rank_battle: false,
    description: '1vs1 데스매치',
    is_finalized: false,
    finalized_at: null,
    representative_bj_total: null,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 7,
    season_id: 1,
    episode_number: 7,
    title: '[RG FAMILY] 시즌1 / 07화!',
    broadcast_date: '2026-02-03T20:00:00+09:00',
    is_rank_battle: true,
    description: '뉴시그데이 & 중간직급전',
    is_finalized: false,
    finalized_at: null,
    representative_bj_total: null,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 8,
    season_id: 1,
    episode_number: 8,
    title: '[RG FAMILY] 시즌1 / 08화!',
    broadcast_date: '2026-02-05T20:00:00+09:00',
    is_rank_battle: false,
    description: '대표를 이겨라',
    is_finalized: false,
    finalized_at: null,
    representative_bj_total: null,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 9,
    season_id: 1,
    episode_number: 9,
    title: '[RG FAMILY] 시즌1 / 09화!',
    broadcast_date: '2026-02-07T20:00:00+09:00',
    is_rank_battle: false,
    description: '주차방지데이',
    is_finalized: false,
    finalized_at: null,
    representative_bj_total: null,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 10,
    season_id: 1,
    episode_number: 10,
    title: '[RG FAMILY] 시즌1 / 10화!',
    broadcast_date: '2026-02-10T20:00:00+09:00',
    is_rank_battle: false,
    description: '용병 데이_1',
    is_finalized: false,
    finalized_at: null,
    representative_bj_total: null,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 11,
    season_id: 1,
    episode_number: 11,
    title: '[RG FAMILY] 시즌1 / 11화!',
    broadcast_date: '2026-02-12T20:00:00+09:00',
    is_rank_battle: false,
    description: null,
    is_finalized: false,
    finalized_at: null,
    representative_bj_total: null,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 12,
    season_id: 1,
    episode_number: 12,
    title: '[RG FAMILY] 시즌1 / 12화!',
    broadcast_date: '2026-02-14T20:00:00+09:00',
    is_rank_battle: false,
    description: null,
    is_finalized: false,
    finalized_at: null,
    representative_bj_total: null,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 13,
    season_id: 1,
    episode_number: 13,
    title: '[RG FAMILY] 시즌1 / 13화!',
    broadcast_date: '2026-02-17T20:00:00+09:00',
    is_rank_battle: false,
    description: null,
    is_finalized: false,
    finalized_at: null,
    representative_bj_total: null,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 14,
    season_id: 1,
    episode_number: 14,
    title: '[RG FAMILY] 시즌1 / 14화!',
    broadcast_date: '2026-02-19T20:00:00+09:00',
    is_rank_battle: false,
    description: null,
    is_finalized: false,
    finalized_at: null,
    representative_bj_total: null,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 15,
    season_id: 1,
    episode_number: 15,
    title: '[RG FAMILY] 시즌1 / 15화!',
    broadcast_date: '2026-02-24T20:00:00+09:00',
    is_rank_battle: true,
    description: '최종 직급전',
    is_finalized: false,
    finalized_at: null,
    representative_bj_total: null,
    created_at: '2026-01-01T00:00:00Z'
  },
]

export const mockEpisodes: Episode[] = [
  ...season1Episodes,
]

// Helper functions
export function getEpisodesBySeason(seasonId: number): Episode[] {
  return mockEpisodes.filter(ep => ep.season_id === seasonId)
}

export function getRankBattlesBySeason(seasonId: number): Episode[] {
  return mockEpisodes.filter(ep => ep.season_id === seasonId && ep.is_rank_battle)
}

export function getEpisodeById(id: number): Episode | undefined {
  return mockEpisodes.find(ep => ep.id === id)
}

export function getFinalizedRankBattles(seasonId?: number): Episode[] {
  return mockEpisodes.filter(ep =>
    ep.is_rank_battle &&
    ep.is_finalized &&
    (seasonId === undefined || ep.season_id === seasonId)
  )
}

/**
 * 에피소드 날짜로 찾기
 * @param date 방송 날짜 (YYYY-MM-DD 형식)
 */
export function getEpisodeByDate(date: string): Episode | undefined {
  return mockEpisodes.find(ep => ep.broadcast_date.startsWith(date))
}

/**
 * 직급전 에피소드만 조회
 */
export function getRankBattleEpisodes(): Episode[] {
  return mockEpisodes.filter(ep => ep.is_rank_battle)
}
