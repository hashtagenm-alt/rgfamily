'use server'

import { adminAction, type ActionResult } from './index'

// ==================== 타입 정의 ====================

export interface BjStats {
  bj_name: string
  total_hearts: number
  donation_count: number
  unique_donors: number
  avg_donation: number
}

export interface TimePatternData {
  hour: number
  total_hearts: number
  donation_count: number
}

export interface DonorBjRelation {
  donor_name: string
  bj_name: string
  total_hearts: number
  donation_count: number
}

export interface DonorPattern {
  donor_name: string
  total_hearts: number
  donation_count: number
  unique_bjs: number
  max_bj_ratio: number
  avg_donation: number
  pattern_type: '올인형' | '분산형' | '소액다건' | '고액소건' | '일반'
  favorite_bj: string
}

export interface EpisodeComparison {
  episode1: {
    id: number
    title: string
    total_hearts: number
    donation_count: number
    unique_donors: number
  }
  episode2: {
    id: number
    title: string
    total_hearts: number
    donation_count: number
    unique_donors: number
  }
  donor_changes: {
    continued: number
    new_donors: number
    left_donors: number
  }
  bj_changes: {
    bj_name: string
    ep1_hearts: number
    ep2_hearts: number
    change: number
    change_percent: number
  }[]
}

export interface DonorSearch {
  donor_name: string
  total_hearts: number
  donation_count: number
  episodes: {
    episode_id: number
    episode_title: string
    hearts: number
    count: number
  }[]
  bj_distribution: {
    bj_name: string
    hearts: number
    percent: number
  }[]
  pattern_type: string
}

export interface AnalyticsSummary {
  total_hearts: number
  total_donations: number
  unique_donors: number
  unique_bjs: number
  avg_donation: number
  top_donor: string
  top_bj: string
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
        bj.donors.add(donation.donor_name)
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

// ==================== 시간대별 패턴 ====================

export async function getTimePattern(
  seasonId?: number,
  episodeId?: number
): Promise<ActionResult<TimePatternData[]>> {
  return adminAction(async (supabase) => {
    let query = supabase
      .from('donations')
      .select('donated_at, amount')
      .not('donated_at', 'is', null)

    if (episodeId) {
      query = query.eq('episode_id', episodeId)
    } else if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) return []

    // 시간대별 집계
    const hourMap = new Map<number, { total_hearts: number; donation_count: number }>()

    for (let i = 0; i < 24; i++) {
      hourMap.set(i, { total_hearts: 0, donation_count: 0 })
    }

    for (const donation of data) {
      if (!donation.donated_at) continue
      const hour = new Date(donation.donated_at).getHours()
      const hourData = hourMap.get(hour)!
      hourData.total_hearts += donation.amount || 0
      hourData.donation_count += 1
    }

    return Array.from(hourMap.entries())
      .map(([hour, stats]) => ({
        hour,
        total_hearts: stats.total_hearts,
        donation_count: stats.donation_count
      }))
      .sort((a, b) => a.hour - b.hour)
  })
}

// ==================== 후원자→BJ 관계 ====================

export async function getDonorBjRelations(
  seasonId?: number,
  episodeId?: number,
  limit: number = 100
): Promise<ActionResult<DonorBjRelation[]>> {
  return adminAction(async (supabase) => {
    // 페이지네이션으로 전체 데이터 가져오기
    const allData = await fetchAllDonations(supabase, seasonId, episodeId)

    // target_bj가 있는 데이터만 필터링
    const data = allData.filter(d => d.target_bj !== null)

    if (data.length === 0) return []

    // 후원자-BJ 쌍별 집계
    const relationMap = new Map<string, { total_hearts: number; donation_count: number }>()

    for (const donation of data) {
      const key = `${donation.donor_name}|${donation.target_bj}`
      if (!relationMap.has(key)) {
        relationMap.set(key, { total_hearts: 0, donation_count: 0 })
      }
      const rel = relationMap.get(key)!
      rel.total_hearts += donation.amount || 0
      rel.donation_count += 1
    }

    return Array.from(relationMap.entries())
      .map(([key, stats]) => {
        const [donor_name, bj_name] = key.split('|')
        return {
          donor_name,
          bj_name,
          total_hearts: stats.total_hearts,
          donation_count: stats.donation_count
        }
      })
      .sort((a, b) => b.total_hearts - a.total_hearts)
      .slice(0, limit)
  })
}

// ==================== 후원자 패턴 분류 ====================

export async function getDonorPatterns(
  seasonId?: number,
  episodeId?: number
): Promise<ActionResult<DonorPattern[]>> {
  return adminAction(async (supabase) => {
    // 페이지네이션으로 전체 데이터 가져오기
    const allData = await fetchAllDonations(supabase, seasonId, episodeId)

    // target_bj가 있는 데이터만 필터링
    const data = allData.filter(d => d.target_bj !== null)

    if (data.length === 0) return []

    // 후원자별 데이터 집계
    const donorMap = new Map<string, {
      total_hearts: number
      donation_count: number
      bj_hearts: Map<string, number>
    }>()

    for (const donation of data) {
      const donor = donation.donor_name
      if (!donor) continue

      if (!donorMap.has(donor)) {
        donorMap.set(donor, {
          total_hearts: 0,
          donation_count: 0,
          bj_hearts: new Map()
        })
      }

      const donorData = donorMap.get(donor)!
      donorData.total_hearts += donation.amount || 0
      donorData.donation_count += 1

      const bjName = donation.target_bj || 'unknown'
      donorData.bj_hearts.set(
        bjName,
        (donorData.bj_hearts.get(bjName) || 0) + (donation.amount || 0)
      )
    }

    // 패턴 분류
    const result: DonorPattern[] = []

    for (const [donor_name, stats] of donorMap.entries()) {
      const unique_bjs = stats.bj_hearts.size
      const avg_donation = Math.round(stats.total_hearts / stats.donation_count)

      // 가장 많이 후원한 BJ 찾기
      let maxBj = ''
      let maxBjHearts = 0
      for (const [bj, hearts] of stats.bj_hearts.entries()) {
        if (hearts > maxBjHearts) {
          maxBjHearts = hearts
          maxBj = bj
        }
      }

      const max_bj_ratio = stats.total_hearts > 0
        ? Math.round((maxBjHearts / stats.total_hearts) * 100)
        : 0

      // 패턴 분류
      let pattern_type: DonorPattern['pattern_type'] = '일반'

      if (max_bj_ratio >= 80) {
        pattern_type = '올인형'
      } else if (unique_bjs >= 3 && max_bj_ratio < 50) {
        pattern_type = '분산형'
      } else if (avg_donation < 5000 && stats.donation_count >= 5) {
        pattern_type = '소액다건'
      } else if (avg_donation >= 10000 && stats.donation_count <= 3) {
        pattern_type = '고액소건'
      }

      result.push({
        donor_name,
        total_hearts: stats.total_hearts,
        donation_count: stats.donation_count,
        unique_bjs,
        max_bj_ratio,
        avg_donation,
        pattern_type,
        favorite_bj: maxBj
      })
    }

    return result.sort((a, b) => b.total_hearts - a.total_hearts)
  })
}

// ==================== 에피소드 비교 ====================

export async function compareEpisodes(
  episode1Id: number,
  episode2Id: number
): Promise<ActionResult<EpisodeComparison>> {
  return adminAction(async (supabase) => {
    // 에피소드 정보 조회
    const { data: episodes, error: epError } = await supabase
      .from('episodes')
      .select('id, title')
      .in('id', [episode1Id, episode2Id])

    if (epError) throw new Error(epError.message)

    const ep1Info = episodes?.find(e => e.id === episode1Id)
    const ep2Info = episodes?.find(e => e.id === episode2Id)

    // 각 에피소드 후원 데이터 조회
    const [ep1Result, ep2Result] = await Promise.all([
      supabase.from('donations').select('donor_name, target_bj, amount').eq('episode_id', episode1Id),
      supabase.from('donations').select('donor_name, target_bj, amount').eq('episode_id', episode2Id)
    ])

    if (ep1Result.error) throw new Error(ep1Result.error.message)
    if (ep2Result.error) throw new Error(ep2Result.error.message)

    const ep1Data = ep1Result.data || []
    const ep2Data = ep2Result.data || []

    // 에피소드별 통계
    const ep1Donors = new Set(ep1Data.map(d => d.donor_name))
    const ep2Donors = new Set(ep2Data.map(d => d.donor_name))

    const ep1Total = ep1Data.reduce((sum, d) => sum + (d.amount || 0), 0)
    const ep2Total = ep2Data.reduce((sum, d) => sum + (d.amount || 0), 0)

    // 후원자 변화
    const continued = [...ep1Donors].filter(d => ep2Donors.has(d)).length
    const new_donors = [...ep2Donors].filter(d => !ep1Donors.has(d)).length
    const left_donors = [...ep1Donors].filter(d => !ep2Donors.has(d)).length

    // BJ별 변화
    const bjStats1 = new Map<string, number>()
    const bjStats2 = new Map<string, number>()

    for (const d of ep1Data) {
      if (d.target_bj) {
        bjStats1.set(d.target_bj, (bjStats1.get(d.target_bj) || 0) + (d.amount || 0))
      }
    }
    for (const d of ep2Data) {
      if (d.target_bj) {
        bjStats2.set(d.target_bj, (bjStats2.get(d.target_bj) || 0) + (d.amount || 0))
      }
    }

    const allBjs = new Set([...bjStats1.keys(), ...bjStats2.keys()])
    const bj_changes = [...allBjs].map(bj_name => {
      const ep1_hearts = bjStats1.get(bj_name) || 0
      const ep2_hearts = bjStats2.get(bj_name) || 0
      const change = ep2_hearts - ep1_hearts
      const change_percent = ep1_hearts > 0
        ? Math.round(((ep2_hearts - ep1_hearts) / ep1_hearts) * 100)
        : (ep2_hearts > 0 ? 100 : 0)
      return { bj_name, ep1_hearts, ep2_hearts, change, change_percent }
    }).sort((a, b) => b.change - a.change)

    return {
      episode1: {
        id: episode1Id,
        title: ep1Info?.title || `에피소드 ${episode1Id}`,
        total_hearts: ep1Total,
        donation_count: ep1Data.length,
        unique_donors: ep1Donors.size
      },
      episode2: {
        id: episode2Id,
        title: ep2Info?.title || `에피소드 ${episode2Id}`,
        total_hearts: ep2Total,
        donation_count: ep2Data.length,
        unique_donors: ep2Donors.size
      },
      donor_changes: { continued, new_donors, left_donors },
      bj_changes
    }
  })
}

// ==================== 후원자 검색 ====================

export async function searchDonor(
  donorName: string,
  seasonId?: number
): Promise<ActionResult<DonorSearch | null>> {
  return adminAction(async (supabase) => {
    let query = supabase
      .from('donations')
      .select('donor_name, target_bj, amount, episode_id')
      .ilike('donor_name', `%${donorName}%`)

    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) return null

    // 에피소드 정보 조회
    const episodeIds = [...new Set(data.map(d => d.episode_id).filter((id): id is number => id !== null))]
    const episodeMap = new Map<number, string>()

    if (episodeIds.length > 0) {
      const { data: episodes } = await supabase
        .from('episodes')
        .select('id, title')
        .in('id', episodeIds)

      if (episodes) {
        for (const ep of episodes) {
          episodeMap.set(ep.id, ep.title)
        }
      }
    }

    // 데이터 집계
    const total_hearts = data.reduce((sum, d) => sum + (d.amount || 0), 0)
    const donation_count = data.length

    // 에피소드별 집계
    const epStats = new Map<number, { hearts: number; count: number }>()
    for (const d of data) {
      if (d.episode_id) {
        if (!epStats.has(d.episode_id)) {
          epStats.set(d.episode_id, { hearts: 0, count: 0 })
        }
        const stat = epStats.get(d.episode_id)!
        stat.hearts += d.amount || 0
        stat.count += 1
      }
    }

    const episodes = [...epStats.entries()].map(([episode_id, stats]) => ({
      episode_id,
      episode_title: episodeMap.get(episode_id) || `에피소드 ${episode_id}`,
      hearts: stats.hearts,
      count: stats.count
    }))

    // BJ별 분포
    const bjStats = new Map<string, number>()
    for (const d of data) {
      if (d.target_bj) {
        bjStats.set(d.target_bj, (bjStats.get(d.target_bj) || 0) + (d.amount || 0))
      }
    }

    const bj_distribution = [...bjStats.entries()]
      .map(([bj_name, hearts]) => ({
        bj_name,
        hearts,
        percent: Math.round((hearts / total_hearts) * 100)
      }))
      .sort((a, b) => b.hearts - a.hearts)

    // 패턴 분류
    const unique_bjs = bjStats.size
    const avg_donation = Math.round(total_hearts / donation_count)
    const max_bj_ratio = bj_distribution[0]?.percent || 0

    let pattern_type = '일반'
    if (max_bj_ratio >= 80) {
      pattern_type = '올인형'
    } else if (unique_bjs >= 3 && max_bj_ratio < 50) {
      pattern_type = '분산형'
    } else if (avg_donation < 5000 && donation_count >= 5) {
      pattern_type = '소액다건'
    } else if (avg_donation >= 10000 && donation_count <= 3) {
      pattern_type = '고액소건'
    }

    return {
      donor_name: data[0].donor_name,
      total_hearts,
      donation_count,
      episodes,
      bj_distribution,
      pattern_type
    }
  })
}

// ==================== 헬퍼: 페이지네이션으로 전체 데이터 가져오기 ====================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllDonations(
  supabase: any,
  seasonId?: number,
  episodeId?: number,
  _selectFields: string = 'donor_name, target_bj, amount'
): Promise<{ donor_name: string; target_bj: string | null; amount: number }[]> {
  const allData: { donor_name: string; target_bj: string | null; amount: number }[] = []
  let page = 0
  const pageSize = 1000

  while (true) {
    let query = supabase
      .from('donations')
      .select('donor_name, target_bj, amount')
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (episodeId) {
      query = query.eq('episode_id', episodeId)
    } else if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break

    allData.push(...(data as { donor_name: string; target_bj: string | null; amount: number }[]))
    if (data.length < pageSize) break
    page++
  }

  return allData
}

// ==================== 요약 통계 ====================

export async function getAnalyticsSummary(
  seasonId?: number,
  episodeId?: number
): Promise<ActionResult<AnalyticsSummary>> {
  return adminAction(async (supabase) => {
    // 페이지네이션으로 전체 데이터 가져오기
    const data = await fetchAllDonations(supabase, seasonId, episodeId)

    // target_bj가 있는 데이터만 필터링 (BJ별 분석용)
    const dataWithBj = data.filter(d => d.target_bj !== null)

    if (data.length === 0) {
      return {
        total_hearts: 0,
        total_donations: 0,
        unique_donors: 0,
        unique_bjs: 0,
        avg_donation: 0,
        top_donor: '-',
        top_bj: '-'
      }
    }

    // 전체 데이터 기준 통계
    const total_hearts = data.reduce((sum, d) => sum + (d.amount || 0), 0)
    const total_donations = data.length
    const donors = new Set(data.map(d => d.donor_name))

    // BJ 관련은 target_bj 있는 데이터만
    const bjs = new Set(dataWithBj.map(d => d.target_bj).filter(Boolean))

    // 상위 후원자 (전체 기준)
    const donorHearts = new Map<string, number>()
    for (const d of data) {
      if (d.donor_name) {
        donorHearts.set(d.donor_name, (donorHearts.get(d.donor_name) || 0) + (d.amount || 0))
      }
    }
    const topDonorEntry = [...donorHearts.entries()].sort((a, b) => b[1] - a[1])[0]

    // 상위 BJ (target_bj 있는 데이터만)
    const bjHearts = new Map<string, number>()
    for (const d of dataWithBj) {
      if (d.target_bj) {
        bjHearts.set(d.target_bj, (bjHearts.get(d.target_bj) || 0) + (d.amount || 0))
      }
    }
    const topBjEntry = [...bjHearts.entries()].sort((a, b) => b[1] - a[1])[0]

    return {
      total_hearts,
      total_donations,
      unique_donors: donors.size,
      unique_bjs: bjs.size,
      avg_donation: Math.round(total_hearts / total_donations),
      top_donor: topDonorEntry?.[0] || '-',
      top_bj: topBjEntry?.[0] || '-'
    }
  })
}

// ==================== 에피소드 목록 ====================

export async function getEpisodeList(seasonId?: number): Promise<ActionResult<{
  id: number
  title: string
  season_id: number
}[]>> {
  return adminAction(async (supabase) => {
    let query = supabase
      .from('episodes')
      .select('id, title, season_id')
      .order('id', { ascending: true })

    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)
    return data || []
  })
}

// ==================== 시즌 목록 ====================

export async function getSeasonList(): Promise<ActionResult<{
  id: number
  name: string
}[]>> {
  return adminAction(async (supabase) => {
    const { data, error } = await supabase
      .from('seasons')
      .select('id, name')
      .order('id', { ascending: true })

    if (error) throw new Error(error.message)
    return data || []
  })
}
