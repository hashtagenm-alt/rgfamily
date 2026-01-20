/**
 * Mock Episodes Data
 * 시즌별 에피소드(회차) 데이터 - 직급전 포함
 */

import type { Episode } from '@/types/database'

// 시즌 1 에피소드 (2024.01 ~ 2024.03)
const season1Episodes: Episode[] = [
  { id: 1, season_id: 1, episode_number: 1, title: '시즌1 1회', broadcast_date: '2024-01-07T20:00:00+09:00', is_rank_battle: false, description: null, is_finalized: false, finalized_at: null, created_at: '2024-01-01T00:00:00Z' },
  { id: 2, season_id: 1, episode_number: 2, title: '시즌1 직급전 1차', broadcast_date: '2024-01-14T20:00:00+09:00', is_rank_battle: true, description: '첫 번째 직급전', is_finalized: true, finalized_at: '2024-01-15T00:00:00Z', created_at: '2024-01-01T00:00:00Z' },
  { id: 3, season_id: 1, episode_number: 3, title: '시즌1 3회', broadcast_date: '2024-01-21T20:00:00+09:00', is_rank_battle: false, description: null, is_finalized: false, finalized_at: null, created_at: '2024-01-01T00:00:00Z' },
  { id: 4, season_id: 1, episode_number: 4, title: '시즌1 직급전 2차', broadcast_date: '2024-01-28T20:00:00+09:00', is_rank_battle: true, description: '두 번째 직급전', is_finalized: true, finalized_at: '2024-01-29T00:00:00Z', created_at: '2024-01-01T00:00:00Z' },
  { id: 5, season_id: 1, episode_number: 5, title: '시즌1 5회', broadcast_date: '2024-02-04T20:00:00+09:00', is_rank_battle: false, description: null, is_finalized: false, finalized_at: null, created_at: '2024-01-01T00:00:00Z' },
  { id: 6, season_id: 1, episode_number: 6, title: '시즌1 직급전 3차', broadcast_date: '2024-02-11T20:00:00+09:00', is_rank_battle: true, description: '세 번째 직급전', is_finalized: true, finalized_at: '2024-02-12T00:00:00Z', created_at: '2024-01-01T00:00:00Z' },
  { id: 7, season_id: 1, episode_number: 7, title: '시즌1 7회', broadcast_date: '2024-02-18T20:00:00+09:00', is_rank_battle: false, description: null, is_finalized: false, finalized_at: null, created_at: '2024-01-01T00:00:00Z' },
  { id: 8, season_id: 1, episode_number: 8, title: '시즌1 직급전 4차', broadcast_date: '2024-02-25T20:00:00+09:00', is_rank_battle: true, description: '네 번째 직급전', is_finalized: true, finalized_at: '2024-02-26T00:00:00Z', created_at: '2024-01-01T00:00:00Z' },
  { id: 9, season_id: 1, episode_number: 9, title: '시즌1 9회', broadcast_date: '2024-03-03T20:00:00+09:00', is_rank_battle: false, description: null, is_finalized: false, finalized_at: null, created_at: '2024-01-01T00:00:00Z' },
  { id: 10, season_id: 1, episode_number: 10, title: '시즌1 최종 직급전', broadcast_date: '2024-03-10T20:00:00+09:00', is_rank_battle: true, description: '시즌1 최종 직급전', is_finalized: true, finalized_at: '2024-03-11T00:00:00Z', created_at: '2024-01-01T00:00:00Z' },
]

// 시즌 2 에피소드 (2024.04 ~ 2024.06)
const season2Episodes: Episode[] = [
  { id: 11, season_id: 2, episode_number: 1, title: '시즌2 1회', broadcast_date: '2024-04-07T20:00:00+09:00', is_rank_battle: false, description: null, is_finalized: false, finalized_at: null, created_at: '2024-04-01T00:00:00Z' },
  { id: 12, season_id: 2, episode_number: 2, title: '시즌2 직급전 1차', broadcast_date: '2024-04-14T20:00:00+09:00', is_rank_battle: true, description: '첫 번째 직급전', is_finalized: true, finalized_at: '2024-04-15T00:00:00Z', created_at: '2024-04-01T00:00:00Z' },
  { id: 13, season_id: 2, episode_number: 3, title: '시즌2 3회', broadcast_date: '2024-04-21T20:00:00+09:00', is_rank_battle: false, description: null, is_finalized: false, finalized_at: null, created_at: '2024-04-01T00:00:00Z' },
  { id: 14, season_id: 2, episode_number: 4, title: '시즌2 직급전 2차', broadcast_date: '2024-04-28T20:00:00+09:00', is_rank_battle: true, description: '두 번째 직급전', is_finalized: true, finalized_at: '2024-04-29T00:00:00Z', created_at: '2024-04-01T00:00:00Z' },
  { id: 15, season_id: 2, episode_number: 5, title: '시즌2 5회', broadcast_date: '2024-05-05T20:00:00+09:00', is_rank_battle: false, description: null, is_finalized: false, finalized_at: null, created_at: '2024-04-01T00:00:00Z' },
  { id: 16, season_id: 2, episode_number: 6, title: '시즌2 직급전 3차', broadcast_date: '2024-05-12T20:00:00+09:00', is_rank_battle: true, description: '세 번째 직급전', is_finalized: true, finalized_at: '2024-05-13T00:00:00Z', created_at: '2024-04-01T00:00:00Z' },
  { id: 17, season_id: 2, episode_number: 7, title: '시즌2 7회', broadcast_date: '2024-05-19T20:00:00+09:00', is_rank_battle: false, description: null, is_finalized: false, finalized_at: null, created_at: '2024-04-01T00:00:00Z' },
  { id: 18, season_id: 2, episode_number: 8, title: '시즌2 직급전 4차', broadcast_date: '2024-05-26T20:00:00+09:00', is_rank_battle: true, description: '네 번째 직급전', is_finalized: true, finalized_at: '2024-05-27T00:00:00Z', created_at: '2024-04-01T00:00:00Z' },
  { id: 19, season_id: 2, episode_number: 9, title: '시즌2 9회', broadcast_date: '2024-06-02T20:00:00+09:00', is_rank_battle: false, description: null, is_finalized: false, finalized_at: null, created_at: '2024-04-01T00:00:00Z' },
  { id: 20, season_id: 2, episode_number: 10, title: '시즌2 최종 직급전', broadcast_date: '2024-06-09T20:00:00+09:00', is_rank_battle: true, description: '시즌2 최종 직급전', is_finalized: true, finalized_at: '2024-06-10T00:00:00Z', created_at: '2024-04-01T00:00:00Z' },
]

// 시즌 3 에피소드 (2024.07 ~ 2024.09)
const season3Episodes: Episode[] = [
  { id: 21, season_id: 3, episode_number: 1, title: '시즌3 1회', broadcast_date: '2024-07-07T20:00:00+09:00', is_rank_battle: false, description: null, is_finalized: false, finalized_at: null, created_at: '2024-07-01T00:00:00Z' },
  { id: 22, season_id: 3, episode_number: 2, title: '시즌3 직급전 1차', broadcast_date: '2024-07-14T20:00:00+09:00', is_rank_battle: true, description: '첫 번째 직급전', is_finalized: true, finalized_at: '2024-07-15T00:00:00Z', created_at: '2024-07-01T00:00:00Z' },
  { id: 23, season_id: 3, episode_number: 3, title: '시즌3 3회', broadcast_date: '2024-07-21T20:00:00+09:00', is_rank_battle: false, description: null, is_finalized: false, finalized_at: null, created_at: '2024-07-01T00:00:00Z' },
  { id: 24, season_id: 3, episode_number: 4, title: '시즌3 직급전 2차', broadcast_date: '2024-07-28T20:00:00+09:00', is_rank_battle: true, description: '두 번째 직급전', is_finalized: true, finalized_at: '2024-07-29T00:00:00Z', created_at: '2024-07-01T00:00:00Z' },
  { id: 25, season_id: 3, episode_number: 5, title: '시즌3 5회', broadcast_date: '2024-08-04T20:00:00+09:00', is_rank_battle: false, description: null, is_finalized: false, finalized_at: null, created_at: '2024-07-01T00:00:00Z' },
  { id: 26, season_id: 3, episode_number: 6, title: '시즌3 직급전 3차', broadcast_date: '2024-08-11T20:00:00+09:00', is_rank_battle: true, description: '세 번째 직급전', is_finalized: true, finalized_at: '2024-08-12T00:00:00Z', created_at: '2024-07-01T00:00:00Z' },
  { id: 27, season_id: 3, episode_number: 7, title: '시즌3 7회', broadcast_date: '2024-08-18T20:00:00+09:00', is_rank_battle: false, description: null, is_finalized: false, finalized_at: null, created_at: '2024-07-01T00:00:00Z' },
  { id: 28, season_id: 3, episode_number: 8, title: '시즌3 직급전 4차', broadcast_date: '2024-08-25T20:00:00+09:00', is_rank_battle: true, description: '네 번째 직급전', is_finalized: true, finalized_at: '2024-08-26T00:00:00Z', created_at: '2024-07-01T00:00:00Z' },
  { id: 29, season_id: 3, episode_number: 9, title: '시즌3 9회', broadcast_date: '2024-09-01T20:00:00+09:00', is_rank_battle: false, description: null, is_finalized: false, finalized_at: null, created_at: '2024-07-01T00:00:00Z' },
  { id: 30, season_id: 3, episode_number: 10, title: '시즌3 최종 직급전', broadcast_date: '2024-09-08T20:00:00+09:00', is_rank_battle: true, description: '시즌3 최종 직급전', is_finalized: true, finalized_at: '2024-09-09T00:00:00Z', created_at: '2024-07-01T00:00:00Z' },
]

// 시즌 4 에피소드 (2024.10 ~ 현재, 진행중)
const season4Episodes: Episode[] = [
  { id: 31, season_id: 4, episode_number: 1, title: '시즌4 1회', broadcast_date: '2024-10-06T20:00:00+09:00', is_rank_battle: false, description: null, is_finalized: false, finalized_at: null, created_at: '2024-10-01T00:00:00Z' },
  { id: 32, season_id: 4, episode_number: 2, title: '시즌4 직급전 1차', broadcast_date: '2024-10-13T20:00:00+09:00', is_rank_battle: true, description: '첫 번째 직급전', is_finalized: true, finalized_at: '2024-10-14T00:00:00Z', created_at: '2024-10-01T00:00:00Z' },
  { id: 33, season_id: 4, episode_number: 3, title: '시즌4 3회', broadcast_date: '2024-10-20T20:00:00+09:00', is_rank_battle: false, description: null, is_finalized: false, finalized_at: null, created_at: '2024-10-01T00:00:00Z' },
  { id: 34, season_id: 4, episode_number: 4, title: '시즌4 직급전 2차', broadcast_date: '2024-10-27T20:00:00+09:00', is_rank_battle: true, description: '두 번째 직급전', is_finalized: true, finalized_at: '2024-10-28T00:00:00Z', created_at: '2024-10-01T00:00:00Z' },
  { id: 35, season_id: 4, episode_number: 5, title: '시즌4 5회', broadcast_date: '2024-11-03T20:00:00+09:00', is_rank_battle: false, description: null, is_finalized: false, finalized_at: null, created_at: '2024-10-01T00:00:00Z' },
  { id: 36, season_id: 4, episode_number: 6, title: '시즌4 직급전 3차', broadcast_date: '2024-11-10T20:00:00+09:00', is_rank_battle: true, description: '세 번째 직급전', is_finalized: true, finalized_at: '2024-11-11T00:00:00Z', created_at: '2024-10-01T00:00:00Z' },
  { id: 37, season_id: 4, episode_number: 7, title: '시즌4 7회', broadcast_date: '2024-11-17T20:00:00+09:00', is_rank_battle: false, description: null, is_finalized: false, finalized_at: null, created_at: '2024-10-01T00:00:00Z' },
  { id: 38, season_id: 4, episode_number: 8, title: '시즌4 직급전 4차', broadcast_date: '2024-11-24T20:00:00+09:00', is_rank_battle: true, description: '네 번째 직급전 (미확정)', is_finalized: false, finalized_at: null, created_at: '2024-10-01T00:00:00Z' },
  { id: 39, season_id: 4, episode_number: 9, title: '시즌4 9회', broadcast_date: '2024-12-01T20:00:00+09:00', is_rank_battle: false, description: null, is_finalized: false, finalized_at: null, created_at: '2024-10-01T00:00:00Z' },
  { id: 40, season_id: 4, episode_number: 10, title: '시즌4 최종 직급전', broadcast_date: '2024-12-08T20:00:00+09:00', is_rank_battle: true, description: '시즌4 최종 직급전 (미확정)', is_finalized: false, finalized_at: null, created_at: '2024-10-01T00:00:00Z' },
]

export const mockEpisodes: Episode[] = [
  ...season1Episodes,
  ...season2Episodes,
  ...season3Episodes,
  ...season4Episodes,
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
