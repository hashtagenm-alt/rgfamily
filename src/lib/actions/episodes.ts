'use server'

import { adminAction, publicAction, type ActionResult } from './index'
import type { InsertTables, UpdateTables, Episode, VipReward } from '@/types/database'

type EpisodeInsert = InsertTables<'episodes'>
type EpisodeUpdate = UpdateTables<'episodes'>

// ==================== Episode CRUD ====================

/**
 * 시즌별 에피소드 목록 조회
 */
export async function getEpisodes(
  seasonId?: number
): Promise<ActionResult<Episode[]>> {
  return publicAction(async (supabase) => {
    let query = supabase
      .from('episodes')
      .select('*')
      .order('episode_number', { ascending: true })

    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    return data || []
  })
}

/**
 * 직급전 에피소드만 조회
 */
export async function getRankBattleEpisodes(
  seasonId?: number
): Promise<ActionResult<Episode[]>> {
  return publicAction(async (supabase) => {
    let query = supabase
      .from('episodes')
      .select('*')
      .eq('is_rank_battle', true)
      .order('episode_number', { ascending: true })

    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    return data || []
  })
}

/**
 * 에피소드 단일 조회
 */
export async function getEpisode(
  id: number
): Promise<ActionResult<Episode | null>> {
  return publicAction(async (supabase) => {
    const { data, error } = await supabase
      .from('episodes')
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message)
    }
    return data
  })
}

/**
 * 에피소드 생성 (Admin)
 */
export async function createEpisode(
  data: EpisodeInsert
): Promise<ActionResult<Episode>> {
  return adminAction(async (supabase) => {
    const { data: episode, error } = await supabase
      .from('episodes')
      .insert(data)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return episode
  }, ['/admin/episodes'])
}

/**
 * 에피소드 수정 (Admin)
 */
export async function updateEpisode(
  id: number,
  data: EpisodeUpdate
): Promise<ActionResult<Episode>> {
  return adminAction(async (supabase) => {
    const { data: episode, error } = await supabase
      .from('episodes')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return episode
  }, ['/admin/episodes'])
}

/**
 * 에피소드 삭제 (Admin)
 */
export async function deleteEpisode(
  id: number
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    // 확정된 에피소드는 삭제 불가
    const { data: episode } = await supabase
      .from('episodes')
      .select('is_finalized')
      .eq('id', id)
      .single()

    if (episode?.is_finalized) {
      throw new Error('확정된 직급전은 삭제할 수 없습니다.')
    }

    const { error } = await supabase
      .from('episodes')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return null
  }, ['/admin/episodes'])
}

// ==================== 직급전 확정 핵심 기능 ====================

interface EpisodeRanking {
  rank: number
  donor_id: string | null
  donor_name: string
  total_amount: number
}

interface FinalizeResult {
  created: number
  skipped: number
  rewards: VipReward[]
}

/**
 * 직급전 확정 + Top 3 VIP 자동 생성
 *
 * 핵심 로직:
 * 1. 직급전 여부 및 중복 확정 체크
 * 2. get_episode_rankings RPC로 Top 3 조회
 * 3. 각 Top 3에 대해:
 *    - 기존 보상 있으면 스킵 (중복 방지)
 *    - 없으면 vip_rewards INSERT
 * 4. is_finalized = true 업데이트
 * 5. 결과 반환 (생성/스킵 카운트)
 */
export async function finalizeRankBattle(
  episodeId: number
): Promise<ActionResult<FinalizeResult>> {
  return adminAction(async (supabase) => {
    // 1. 에피소드 조회 및 유효성 검사
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('id, season_id, is_rank_battle, is_finalized, title')
      .eq('id', episodeId)
      .single()

    if (episodeError || !episode) {
      throw new Error('에피소드를 찾을 수 없습니다.')
    }

    if (!episode.is_rank_battle) {
      throw new Error('직급전이 아닌 에피소드는 확정할 수 없습니다.')
    }

    if (episode.is_finalized) {
      throw new Error('이미 확정된 직급전입니다.')
    }

    // 2. Top 3 랭킹 조회 (RPC 함수 사용)
    const { data: rankings, error: rankingError } = await supabase
      .rpc('get_episode_rankings', {
        p_episode_id: episodeId,
        p_limit: 3
      }) as { data: EpisodeRanking[] | null; error: unknown }

    if (rankingError) {
      throw new Error('랭킹 조회 중 오류가 발생했습니다.')
    }

    if (!rankings || rankings.length === 0) {
      throw new Error('후원 데이터가 없어 확정할 수 없습니다.')
    }

    // 3. 각 Top 3에 대해 VIP 보상 생성
    const createdRewards: VipReward[] = []
    let skipped = 0

    for (const ranking of rankings) {
      // donor_id가 없으면 (비로그인 후원) 스킵
      if (!ranking.donor_id) {
        skipped++
        continue
      }

      // 기존 보상 체크 (같은 에피소드, 같은 사용자)
      const { data: existingReward } = await supabase
        .from('vip_rewards')
        .select('id')
        .eq('profile_id', ranking.donor_id)
        .eq('episode_id', episodeId)
        .single()

      if (existingReward) {
        skipped++
        continue
      }

      // VIP 보상 생성
      const { data: newReward, error: insertError } = await supabase
        .from('vip_rewards')
        .insert({
          profile_id: ranking.donor_id,
          season_id: episode.season_id,
          episode_id: episodeId,
          rank: ranking.rank,
        })
        .select()
        .single()

      if (insertError) {
        console.error(`VIP 보상 생성 실패 (${ranking.donor_name}):`, insertError)
        continue
      }

      createdRewards.push(newReward)
    }

    // 4. 에피소드 확정 상태 업데이트
    const { error: updateError } = await supabase
      .from('episodes')
      .update({
        is_finalized: true,
        finalized_at: new Date().toISOString()
      })
      .eq('id', episodeId)

    if (updateError) {
      throw new Error('에피소드 확정 상태 업데이트 실패: ' + updateError.message)
    }

    // 5. 결과 반환
    return {
      created: createdRewards.length,
      skipped,
      rewards: createdRewards
    }
  }, ['/admin/episodes', '/admin/vip-rewards', '/ranking/vip'])
}

// ==================== 에피소드 랭킹 조회 ====================

/**
 * 에피소드별 후원 랭킹 조회 (공개)
 */
export async function getEpisodeRankings(
  episodeId: number,
  limit: number = 50
): Promise<ActionResult<EpisodeRanking[]>> {
  return publicAction(async (supabase) => {
    const { data, error } = await supabase
      .rpc('get_episode_rankings', {
        p_episode_id: episodeId,
        p_limit: limit
      })

    if (error) throw new Error(error.message)
    return data || []
  })
}
