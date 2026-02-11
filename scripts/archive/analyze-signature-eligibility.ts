/**
 * 시그니처 자격 분석 스크립트
 *
 * 기준:
 * - 1번째 시그: 당일 누적 10만+ 하트
 * - 2번째 시그: 1번째 이후 회차에서 당일 15만+ 하트
 * - 3번째 시그: 2번째 이후 회차에서 당일 20만+ 하트
 */

import { getServiceClient } from './lib/supabase'
const supabase = getServiceClient()

// 시그니처 획득 기준
const SIG_THRESHOLDS = {
  1: 100000,  // 1번째 시그: 10만 하트
  2: 150000,  // 2번째 시그: 15만 하트
  3: 200000,  // 3번째 시그: 20만 하트
}

interface EpisodeDonation {
  episode_id: number
  donor_name: string
  total: number
}

interface SignatureRecord {
  sigNumber: number
  episode_id: number
  amount: number
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🏆 시그니처 자격 분석')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('기준:')
  console.log('  - 1번째 시그: 당일 10만+ 하트')
  console.log('  - 2번째 시그: 1번째 이후 당일 15만+ 하트')
  console.log('  - 3번째 시그: 2번째 이후 당일 20만+ 하트')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 에피소드 정보 조회
  const { data: episodes } = await supabase
    .from('episodes')
    .select('id, episode_number, title')
    .order('id', { ascending: true })

  const episodeMap = new Map(episodes?.map(e => [e.id, e]) || [])

  // 전체 후원 데이터 조회 (Supabase 기본 limit 1000건 → 전체 데이터 가져오기)
  let allDonations: { episode_id: number; donor_name: string; amount: number }[] = []
  let offset = 0
  const pageSize = 1000

  while (true) {
    const { data: page } = await supabase
      .from('donations')
      .select('episode_id, donor_name, amount')
      .order('episode_id', { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (!page || page.length === 0) break
    allDonations = allDonations.concat(page)
    if (page.length < pageSize) break
    offset += pageSize
  }

  const donations = allDonations

  if (!donations || donations.length === 0) {
    console.log('후원 데이터가 없습니다.')
    return
  }

  // 에피소드별 + 후원자별 당일 누적 계산
  const episodeDonorTotals: Record<string, EpisodeDonation> = {}
  for (const d of donations) {
    const key = `${d.episode_id}|${d.donor_name}`
    if (!episodeDonorTotals[key]) {
      episodeDonorTotals[key] = { episode_id: d.episode_id, donor_name: d.donor_name, total: 0 }
    }
    episodeDonorTotals[key].total += d.amount
  }

  // 10만+ 달성자만 필터링
  const qualified = Object.values(episodeDonorTotals)
    .filter(d => d.total >= SIG_THRESHOLDS[1])
    .sort((a, b) => a.episode_id - b.episode_id || b.total - a.total)

  // 후원자별 달성 이력 정리
  const donorHistory: Record<string, EpisodeDonation[]> = {}
  for (const q of qualified) {
    if (!donorHistory[q.donor_name]) donorHistory[q.donor_name] = []
    donorHistory[q.donor_name].push(q)
  }

  // 시그니처 자격 계산
  const donorSignatures: Record<string, SignatureRecord[]> = {}

  for (const [name, history] of Object.entries(donorHistory)) {
    history.sort((a, b) => a.episode_id - b.episode_id)
    donorSignatures[name] = []

    for (const h of history) {
      const currentSigCount = donorSignatures[name].length
      const nextSigNumber = currentSigCount + 1

      if (nextSigNumber > 3) continue // 최대 3개

      const threshold = SIG_THRESHOLDS[nextSigNumber as 1 | 2 | 3]
      if (h.total >= threshold) {
        donorSignatures[name].push({
          sigNumber: nextSigNumber,
          episode_id: h.episode_id,
          amount: h.total
        })
      }
    }
  }

  // 시그니처 개수별 분류
  const sig3 = Object.entries(donorSignatures).filter(([, sigs]) => sigs.length >= 3)
  const sig2 = Object.entries(donorSignatures).filter(([, sigs]) => sigs.length === 2)
  const sig1 = Object.entries(donorSignatures).filter(([, sigs]) => sigs.length === 1)

  // 출력
  console.log(`🏆🏆🏆 3개 시그니처 (${sig3.length}명)`)
  console.log('─'.repeat(60))
  for (const [name, sigs] of sig3) {
    console.log(`\n${name}:`)
    for (const s of sigs) {
      const ep = episodeMap.get(s.episode_id)
      console.log(`  ${s.sigNumber}번째: EP${ep?.episode_number || s.episode_id} (${s.amount.toLocaleString()} 하트)`)
    }
  }

  console.log(`\n\n🏆🏆 2개 시그니처 (${sig2.length}명)`)
  console.log('─'.repeat(60))
  for (const [name, sigs] of sig2) {
    const history = donorHistory[name]
    const lastSig = sigs[sigs.length - 1]

    // 3번째 시그까지 부족한 금액 계산
    const futureEps = history.filter(h => h.episode_id > lastSig.episode_id)
    const maxAfterSig2 = futureEps.length > 0 ? Math.max(...futureEps.map(h => h.total)) : 0
    const shortfall = SIG_THRESHOLDS[3] - maxAfterSig2

    console.log(`\n${name}:`)
    for (const s of sigs) {
      const ep = episodeMap.get(s.episode_id)
      console.log(`  ${s.sigNumber}번째: EP${ep?.episode_number || s.episode_id} (${s.amount.toLocaleString()} 하트)`)
    }
    if (shortfall > 0) {
      console.log(`  → 3번째까지 ${shortfall.toLocaleString()} 부족`)
    }
  }

  console.log(`\n\n🏆 1개 시그니처 (${sig1.length}명)`)
  console.log('─'.repeat(60))
  for (const [name, sigs] of sig1) {
    const history = donorHistory[name]
    const lastSig = sigs[sigs.length - 1]

    // 2번째 시그까지 부족한 금액 계산
    const futureEps = history.filter(h => h.episode_id > lastSig.episode_id)
    const maxAfterSig1 = futureEps.length > 0 ? Math.max(...futureEps.map(h => h.total)) : 0
    const shortfall = SIG_THRESHOLDS[2] - maxAfterSig1

    const ep = episodeMap.get(sigs[0].episode_id)
    console.log(`\n${name}: EP${ep?.episode_number || sigs[0].episode_id} (${sigs[0].amount.toLocaleString()} 하트)`)
    if (shortfall > 0 && maxAfterSig1 >= SIG_THRESHOLDS[1]) {
      console.log(`  → 2번째까지 ${shortfall.toLocaleString()} 부족 (현재 최고: ${maxAfterSig1.toLocaleString()})`)
    }
  }

  // 요약
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 요약')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`3개 시그: ${sig3.length}명 - ${sig3.map(([n]) => n).join(', ') || '없음'}`)
  console.log(`2개 시그: ${sig2.length}명 - ${sig2.map(([n]) => n).join(', ') || '없음'}`)
  console.log(`1개 시그: ${sig1.length}명`)
  console.log(`총 자격자: ${sig3.length + sig2.length + sig1.length}명`)
}

main().catch(console.error)
