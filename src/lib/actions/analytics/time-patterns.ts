'use server'

import { adminAction, type ActionResult } from '../index'
import { nicknameAliases } from '@/lib/utils/nickname-aliases'
import { fetchAllDonationsExtended } from '@/lib/utils/analytics-helpers'

import type {
  TimePatternData,
  TimePatternEnhanced,
} from './types'

// ==================== 시간대별 패턴 ====================

export async function getTimePattern(
  seasonId?: number,
  episodeId?: number
): Promise<ActionResult<TimePatternData[]>> {
  return adminAction(async (supabase) => {
    // 캐시된 fetchAllDonationsExtended 활용 (중복 DB 조회 방지)
    const rawDonations = await fetchAllDonationsExtended(supabase, seasonId, episodeId)
    const allData = rawDonations
      .filter(d => d.donated_at)
      .map(d => ({ donated_at: d.donated_at!, amount: d.amount }))

    if (allData.length === 0) return []

    // 시간대별 집계
    const hourMap = new Map<number, { total_hearts: number; donation_count: number }>()

    for (let i = 0; i < 24; i++) {
      hourMap.set(i, { total_hearts: 0, donation_count: 0 })
    }

    for (const donation of allData) {
      if (!donation.donated_at) continue
      const hour = new Date(donation.donated_at).getUTCHours()
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

// ==================== 시간대 패턴 강화 ====================

export async function getTimePatternEnhanced(
  seasonId?: number,
  episodeId?: number
): Promise<ActionResult<TimePatternEnhanced>> {
  return adminAction(async (supabase) => {
    // 캐시된 fetchAllDonationsExtended 활용 (중복 DB 조회 방지)
    const rawDonations = await fetchAllDonationsExtended(supabase, seasonId, episodeId)
    const allData = rawDonations
      .filter(d => d.donated_at)
      .map(d => ({ donated_at: d.donated_at!, amount: d.amount, target_bj: d.target_bj, donor_name: d.donor_name }))

    if (allData.length === 0) {
      return { overall: [], perBj: [], topDonorTimes: [], heatmap: [] }
    }

    // 전체 24시간 집계
    const hourMap = new Map<number, { total_hearts: number; donation_count: number }>()
    for (let i = 0; i < 24; i++) hourMap.set(i, { total_hearts: 0, donation_count: 0 })

    // BJ별 24시간 집계
    const bjHourMap = new Map<string, Map<number, { hearts: number; count: number }>>()

    // 후원자별 집계
    const donorTotalMap = new Map<string, number>()
    const donorHourMap = new Map<string, Map<number, number>>()

    for (const d of allData) {
      const hour = new Date(d.donated_at).getUTCHours()
      const amount = d.amount || 0

      // overall
      const h = hourMap.get(hour)!
      h.total_hearts += amount
      h.donation_count += 1

      // perBj
      const bj = d.target_bj?.trim()
      if (bj) {
        if (!bjHourMap.has(bj)) {
          bjHourMap.set(bj, new Map())
          for (let i = 0; i < 24; i++) bjHourMap.get(bj)!.set(i, { hearts: 0, count: 0 })
        }
        const bh = bjHourMap.get(bj)!.get(hour)!
        bh.hearts += amount
        bh.count += 1
      }

      // donor
      if (d.donor_name) {
        const donorName = nicknameAliases[d.donor_name] || d.donor_name
        donorTotalMap.set(donorName, (donorTotalMap.get(donorName) || 0) + amount)
        if (!donorHourMap.has(donorName)) donorHourMap.set(donorName, new Map())
        const dm = donorHourMap.get(donorName)!
        dm.set(hour, (dm.get(hour) || 0) + amount)
      }
    }

    const overall: TimePatternData[] = Array.from(hourMap.entries())
      .map(([hour, stats]) => ({ hour, total_hearts: stats.total_hearts, donation_count: stats.donation_count }))
      .sort((a, b) => a.hour - b.hour)

    // perBj
    const perBj = [...bjHourMap.entries()].map(([bj_name, hMap]) => {
      const hours = Array.from(hMap.entries())
        .map(([hour, s]) => ({ hour, hearts: s.hearts, count: s.count }))
        .sort((a, b) => a.hour - b.hour)
      const peak_hour = hours.reduce((max, h) => h.hearts > max.hearts ? h : max, hours[0]).hour
      return { bj_name, hours, peak_hour }
    }).sort((a, b) => {
      const aTotal = a.hours.reduce((s, h) => s + h.hearts, 0)
      const bTotal = b.hours.reduce((s, h) => s + h.hearts, 0)
      return bTotal - aTotal
    })

    // topDonorTimes (Top 15)
    const top15Donors = [...donorTotalMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)
    const topDonorTimes = top15Donors.map(([donor_name, total_hearts]) => {
      const hMap = donorHourMap.get(donor_name) || new Map()
      const hours: { hour: number; hearts: number }[] = []
      for (let i = 0; i < 24; i++) hours.push({ hour: i, hearts: hMap.get(i) || 0 })
      const peak_hour = hours.reduce((max, h) => h.hearts > max.hearts ? h : max, hours[0]).hour
      return { donor_name, total_hearts, peak_hour, hours }
    })

    // heatmap
    let maxHearts = 0
    const heatmapRaw: { bj_name: string; hour: number; hearts: number }[] = []
    for (const bj of perBj) {
      for (const h of bj.hours) {
        heatmapRaw.push({ bj_name: bj.bj_name, hour: h.hour, hearts: h.hearts })
        if (h.hearts > maxHearts) maxHearts = h.hearts
      }
    }
    const heatmap = heatmapRaw.map(h => ({ ...h, intensity: maxHearts > 0 ? h.hearts / maxHearts : 0 }))

    return { overall, perBj, topDonorTimes, heatmap }
  })
}
