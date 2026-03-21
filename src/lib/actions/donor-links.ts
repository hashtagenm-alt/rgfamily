'use server'

import { adminAction, type ActionResult } from './index'

interface RankingEntryRaw {
  id: number
  rank: number
  donor_id: string | null
  donor_name: string
  total_amount: number
  season_id?: number
}

interface ProfileRaw {
  id: string
  nickname: string
  email: string | null
  avatar_url: string | null
  role: string
  total_donation: number
}

interface FetchRankingsResult {
  seasonData: (RankingEntryRaw & { season_id: number })[]
  totalData: RankingEntryRaw[]
  linkedProfiles: Record<string, ProfileRaw>
}

/**
 * 시즌 랭킹 + 총 후원 랭킹 + 연결된 프로필 일괄 조회
 */
export async function fetchDonorRankings(): Promise<ActionResult<FetchRankingsResult>> {
  return adminAction(async (supabase) => {
    // Fetch season rankings
    const { data: seasonData, error: seasonError } = await supabase
      .from('season_donation_rankings')
      .select('id, rank, donor_id, donor_name, total_amount, season_id')
      .order('rank')

    if (seasonError) throw new Error(seasonError.message)

    // Fetch total rankings
    const { data: totalData, error: totalError } = await supabase
      .from('total_donation_rankings')
      .select('id, rank, donor_id, donor_name, total_amount')
      .order('rank')

    if (totalError) throw new Error(totalError.message)

    // Get all donor_ids that are linked
    const linkedDonorIds = [
      ...(seasonData || []).filter(r => r.donor_id).map(r => r.donor_id),
      ...(totalData || []).filter(r => r.donor_id).map(r => r.donor_id),
    ].filter(Boolean) as string[]

    // Fetch linked profiles
    let linkedProfiles: Record<string, ProfileRaw> = {}
    if (linkedDonorIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url, role, total_donation, email')
        .in('id', linkedDonorIds)

      if (profilesData) {
        linkedProfiles = profilesData.reduce((acc, p) => {
          acc[p.id] = p as ProfileRaw
          return acc
        }, {} as Record<string, ProfileRaw>)
      }
    }

    return {
      seasonData: (seasonData || []) as (RankingEntryRaw & { season_id: number })[],
      totalData: (totalData || []) as RankingEntryRaw[],
      linkedProfiles,
    }
  })
}

/**
 * 연결 가능한 프로필 목록 조회
 */
export async function fetchLinkableProfiles(): Promise<ActionResult<ProfileRaw[]>> {
  return adminAction(async (supabase) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname, email, avatar_url, role, total_donation')
      .order('nickname')

    if (error) throw new Error(error.message)
    return (data || []) as ProfileRaw[]
  })
}

/**
 * 후원자-프로필 연결
 */
export async function linkDonorToProfile(
  source: 'season' | 'total',
  rankingId: number,
  profileId: string
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    const table = source === 'season'
      ? 'season_donation_rankings'
      : 'total_donation_rankings'

    const { error } = await supabase
      .from(table)
      .update({ donor_id: profileId })
      .eq('id', rankingId)

    if (error) throw new Error(error.message)
    return null
  })
}

/**
 * 후원자-프로필 연결 해제
 */
export async function unlinkDonorFromProfile(
  source: 'season' | 'total',
  rankingId: number
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    const table = source === 'season'
      ? 'season_donation_rankings'
      : 'total_donation_rankings'

    const { error } = await supabase
      .from(table)
      .update({ donor_id: null })
      .eq('id', rankingId)

    if (error) throw new Error(error.message)
    return null
  })
}

/**
 * 닉네임 자동 매칭 (일괄 처리)
 */
export async function autoMatchDonors(
  matches: Array<{
    source: 'season' | 'total'
    rankingId: number
    profileId: string
  }>
): Promise<ActionResult<number>> {
  return adminAction(async (supabase) => {
    let matchCount = 0

    for (const match of matches) {
      const table = match.source === 'season'
        ? 'season_donation_rankings'
        : 'total_donation_rankings'

      const { error } = await supabase
        .from(table)
        .update({ donor_id: match.profileId })
        .eq('id', match.rankingId)

      if (!error) matchCount++
    }

    return matchCount
  })
}

/**
 * 프로필 아바타 업데이트
 */
export async function updateProfileAvatar(
  profileId: string,
  avatarUrl: string
): Promise<ActionResult<null>> {
  return adminAction(async (supabase) => {
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', profileId)

    if (error) throw new Error(error.message)
    return null
  })
}
