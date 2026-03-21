'use server'

import { adminAction, type ActionResult } from '../index'
import { nicknameAliases } from '@/lib/utils/nickname-aliases'

import type { SignatureEligibilityData } from './types'

const SIG_THRESHOLDS: Record<number, number> = {
  1: 100000,
  2: 150000,
  3: 200000,
}

// ==================== 시그니처 자격 분석 ====================

export async function getSignatureEligibility(
  seasonId?: number
): Promise<ActionResult<SignatureEligibilityData>> {
  return adminAction(async (supabase) => {
    // 에피소드 목록 (미확정 포함 — 실시간 모니터링 목적, 시그니처는 엑셀부 전용)
    let epQuery = supabase
      .from('episodes')
      .select('id, episode_number, title, is_finalized')
      .eq('unit', 'excel')
      .order('episode_number', { ascending: true })

    if (seasonId) {
      epQuery = epQuery.eq('season_id', seasonId)
    }

    const { data: episodes, error: epError } = await epQuery
    if (epError) throw new Error(epError.message)
    if (!episodes || episodes.length === 0) {
      return {
        episodeBreakdown: [],
        summary: { sig3: [], sig2: [], sig1: [], totalPeople: 0, totalSigs: 0 },
        unsynced: [],
      }
    }

    // 전체 후원 데이터 페이지네이션
    const episodeIds = episodes.map((e) => e.id)
    const allDonations: { episode_id: number; donor_name: string; amount: number }[] = []
    const pageSize = 1000
    let page = 0

    while (true) {
      const { data, error } = await supabase
        .from('donations')
        .select('episode_id, donor_name, amount')
        .in('episode_id', episodeIds)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) throw new Error(error.message)
      if (!data || data.length === 0) break
      allDonations.push(...(data as { episode_id: number; donor_name: string; amount: number }[]))
      if (data.length < pageSize) break
      page++
    }

    const epIdToNum = new Map(episodes.map((e) => [e.id, e.episode_number]))
    const epIdToTitle = new Map(episodes.map((e) => [e.id, e.title]))
    const epIdToFinalized = new Map(episodes.map((e) => [e.id, e.is_finalized]))

    // 에피소드별 + 후원자별 SUM(amount) 집계
    const epDonorTotals = new Map<number, Map<string, number>>()
    for (const d of allDonations) {
      if (!d.donor_name) continue
      const name = nicknameAliases[d.donor_name] || d.donor_name
      if (!epDonorTotals.has(d.episode_id)) epDonorTotals.set(d.episode_id, new Map())
      const donorMap = epDonorTotals.get(d.episode_id)!
      donorMap.set(name, (donorMap.get(name) || 0) + (d.amount || 0))
    }

    // 시그니처 자격 순차 계산 (스크립트 로직 이식)
    interface EpDonation {
      episodeId: number
      episodeNumber: number
      donorName: string
      total: number
    }
    const qualifiedDonations: EpDonation[] = []

    for (const ep of episodes) {
      const donorMap = epDonorTotals.get(ep.id)
      if (!donorMap) continue
      for (const [donorName, total] of donorMap) {
        if (total >= SIG_THRESHOLDS[1]) {
          qualifiedDonations.push({
            episodeId: ep.id,
            episodeNumber: ep.episode_number,
            donorName,
            total,
          })
        }
      }
    }

    // 후원자별 이력 → 순차 시그 판정
    const donorHistory = new Map<string, EpDonation[]>()
    for (const d of qualifiedDonations) {
      if (!donorHistory.has(d.donorName)) donorHistory.set(d.donorName, [])
      donorHistory.get(d.donorName)!.push(d)
    }

    interface SigRecord {
      sigNumber: number
      episodeId: number
      episodeNumber: number
      amount: number
    }
    const donorSigs = new Map<string, SigRecord[]>()

    for (const [name, history] of donorHistory) {
      history.sort((a, b) => a.episodeNumber - b.episodeNumber)
      const sigs: SigRecord[] = []

      for (const h of history) {
        const nextSig = sigs.length + 1
        if (nextSig > 3) continue
        if (h.total >= SIG_THRESHOLDS[nextSig]) {
          sigs.push({
            sigNumber: nextSig,
            episodeId: h.episodeId,
            episodeNumber: h.episodeNumber,
            amount: h.total,
          })
        }
      }

      if (sigs.length > 0) {
        donorSigs.set(name, sigs)
      }
    }

    // 에피소드별 시그 매핑 (어떤 후원자가 어떤 회차에서 몇 번째 시그를 얻었는지)
    const epSigMap = new Map<number, Map<string, number>>() // episodeId → donorName → sigNumber
    for (const [name, sigs] of donorSigs) {
      for (const s of sigs) {
        if (!epSigMap.has(s.episodeId)) epSigMap.set(s.episodeId, new Map())
        epSigMap.get(s.episodeId)!.set(name, s.sigNumber)
      }
    }

    // episodeBreakdown 빌드
    const episodeBreakdown: SignatureEligibilityData['episodeBreakdown'] = []

    for (const ep of episodes) {
      const donorMap = epDonorTotals.get(ep.id)
      if (!donorMap) {
        episodeBreakdown.push({
          episodeNumber: ep.episode_number,
          episodeTitle: ep.title,
          isFinalized: ep.is_finalized,
          donors: [],
        })
        continue
      }

      // 10만+ 달성자만 필터
      const donors: SignatureEligibilityData['episodeBreakdown'][0]['donors'] = []
      const epSigs = epSigMap.get(ep.id)

      for (const [donorName, totalAmount] of donorMap) {
        if (totalAmount < SIG_THRESHOLDS[1]) continue

        const sigAwarded = epSigs?.get(donorName) ?? null
        let sigLabel = ''

        if (sigAwarded) {
          sigLabel = `🆕 ${sigAwarded}번째 시그`
        } else {
          // 이미 시그를 가진 후원자인지, 아직 기준 미달인지
          const existingSigs = donorSigs.get(donorName)
          const sigCount = existingSigs?.length ?? 0
          if (sigCount >= 3) {
            sigLabel = '✅ 3개 완료'
          } else {
            const nextSig = sigCount + 1
            const needed = SIG_THRESHOLDS[nextSig]
            if (totalAmount < needed) {
              sigLabel = `(${(needed / 10000).toFixed(0)}만 필요)`
            }
          }
        }

        donors.push({ donorName, totalAmount, sigAwarded, sigLabel })
      }

      donors.sort((a, b) => b.totalAmount - a.totalAmount)

      episodeBreakdown.push({
        episodeNumber: ep.episode_number,
        episodeTitle: ep.title,
        isFinalized: ep.is_finalized,
        donors,
      })
    }

    // summary 빌드
    const sig3: SignatureEligibilityData['summary']['sig3'] = []
    const sig2: SignatureEligibilityData['summary']['sig2'] = []
    const sig1: SignatureEligibilityData['summary']['sig1'] = []
    let totalSigs = 0

    for (const [name, sigs] of donorSigs) {
      const history = sigs.map((s) => ({ ep: s.episodeNumber, amount: s.amount }))
      totalSigs += sigs.length

      if (sigs.length >= 3) sig3.push({ donorName: name, history })
      else if (sigs.length === 2) sig2.push({ donorName: name, history })
      else if (sigs.length === 1) sig1.push({ donorName: name, history })
    }

    const totalPeople = donorSigs.size

    // DB 미반영 건 비교
    const { data: dbRecords } = await supabase
      .from('signature_eligibility')
      .select('donor_name, sig_number, episode_number, daily_amount')

    const dbSet = new Set(
      ((dbRecords || []) as { donor_name: string; sig_number: number }[]).map(
        (r) => `${r.donor_name}|${r.sig_number}`
      )
    )

    const unsynced: SignatureEligibilityData['unsynced'] = []
    for (const [name, sigs] of donorSigs) {
      for (const s of sigs) {
        if (!dbSet.has(`${name}|${s.sigNumber}`)) {
          unsynced.push({
            donorName: name,
            sigNumber: s.sigNumber,
            episodeNumber: s.episodeNumber,
            amount: s.amount,
          })
        }
      }
    }

    return {
      episodeBreakdown,
      summary: { sig3, sig2, sig1, totalPeople, totalSigs },
      unsynced,
    }
  })
}
