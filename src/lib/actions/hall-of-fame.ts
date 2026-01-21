'use server'

/**
 * 명예의 전당 Server Actions
 *
 * vip_rewards 테이블에서 포디움(1~3위) 달성 기록을 조회합니다.
 * - episode_id가 있으면: 직급전별 포디움 기록
 * - episode_id가 null이면: 시즌 최종 순위
 */

import { publicAction, type ActionResult } from './index'
import type {
  HallOfFameData,
  HallOfFameEntry,
  HallOfFameSeasonData,
} from '@/types/ranking'

/**
 * 명예의 전당 전체 데이터 조회
 *
 * 시즌별로 그룹화된 포디움 달성 기록을 반환합니다.
 */
export async function getHallOfFameData(): Promise<ActionResult<HallOfFameData>> {
  return publicAction(async (supabase) => {
    // 1. 모든 포디움 달성 기록 조회 (rank 1~3)
    const { data: rewards, error: rewardsError } = await supabase
      .from('vip_rewards')
      .select(`
        id,
        profile_id,
        season_id,
        episode_id,
        rank,
        created_at,
        profiles:profile_id (
          nickname,
          avatar_url
        ),
        seasons:season_id (
          id,
          name,
          is_active,
          start_date,
          end_date
        ),
        episodes:episode_id (
          id,
          title,
          episode_number,
          is_rank_battle
        )
      `)
      .lte('rank', 3)
      .order('season_id', { ascending: false })
      .order('episode_id', { ascending: false, nullsFirst: true })
      .order('rank', { ascending: true })

    if (rewardsError) throw new Error(rewardsError.message)

    // 2. 확정된 직급전 에피소드 수 조회
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id')
      .eq('is_rank_battle', true)
      .eq('is_finalized', true)

    if (episodesError) throw new Error(episodesError.message)

    // 3. 데이터 변환 및 그룹화
    const seasonsMap = new Map<number, HallOfFameSeasonData>()
    const uniqueProfileIds = new Set<string>()

    for (const reward of rewards || []) {
      // 프로필 데이터 추출
      const profile = Array.isArray(reward.profiles)
        ? reward.profiles[0]
        : reward.profiles
      const season = Array.isArray(reward.seasons)
        ? reward.seasons[0]
        : reward.seasons
      const episode = Array.isArray(reward.episodes)
        ? reward.episodes[0]
        : reward.episodes

      if (!profile || !season) continue

      // 고유 달성자 추적
      uniqueProfileIds.add(reward.profile_id)

      // 시즌 데이터 초기화
      if (!seasonsMap.has(reward.season_id)) {
        seasonsMap.set(reward.season_id, {
          season: {
            id: season.id,
            name: season.name,
            isActive: season.is_active,
            startDate: season.start_date,
            endDate: season.end_date,
          },
          entries: [],
        })
      }

      // 엔트리 추가
      const entry: HallOfFameEntry = {
        profileId: reward.profile_id,
        nickname: profile.nickname || '알 수 없음',
        avatarUrl: profile.avatar_url,
        rank: reward.rank,
        seasonId: reward.season_id,
        seasonName: season.name,
        episodeId: reward.episode_id,
        episodeTitle: episode?.title || null,
        episodeNumber: episode?.episode_number || null,
        achievedAt: reward.created_at,
      }

      seasonsMap.get(reward.season_id)!.entries.push(entry)
    }

    // 4. 결과 반환
    return {
      totalAchievers: uniqueProfileIds.size,
      totalEpisodes: episodes?.length || 0,
      seasons: Array.from(seasonsMap.values()),
    }
  })
}

/**
 * 특정 사용자의 포디움 이력 조회
 */
export async function getUserPodiumHistory(
  profileId: string
): Promise<ActionResult<HallOfFameEntry[]>> {
  return publicAction(async (supabase) => {
    const { data: rewards, error } = await supabase
      .from('vip_rewards')
      .select(`
        id,
        profile_id,
        season_id,
        episode_id,
        rank,
        created_at,
        profiles:profile_id (
          nickname,
          avatar_url
        ),
        seasons:season_id (
          id,
          name,
          is_active,
          start_date,
          end_date
        ),
        episodes:episode_id (
          id,
          title,
          episode_number
        )
      `)
      .eq('profile_id', profileId)
      .lte('rank', 3)
      .order('season_id', { ascending: false })
      .order('episode_id', { ascending: false, nullsFirst: true })

    if (error) throw new Error(error.message)

    return (rewards || []).map((reward) => {
      const profile = Array.isArray(reward.profiles)
        ? reward.profiles[0]
        : reward.profiles
      const season = Array.isArray(reward.seasons)
        ? reward.seasons[0]
        : reward.seasons
      const episode = Array.isArray(reward.episodes)
        ? reward.episodes[0]
        : reward.episodes

      return {
        profileId: reward.profile_id,
        nickname: profile?.nickname || '알 수 없음',
        avatarUrl: profile?.avatar_url || null,
        rank: reward.rank,
        seasonId: reward.season_id,
        seasonName: season?.name || '',
        episodeId: reward.episode_id,
        episodeTitle: episode?.title || null,
        episodeNumber: episode?.episode_number || null,
        achievedAt: reward.created_at,
      }
    })
  })
}
