/**
 * 시그니처 로직 검증 - 르큐리 상세 분석
 */

import { getServiceClient } from './lib/supabase'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = getServiceClient()

async function main() {
  console.log('=== 시그니처 로직 검증 ===\n')
  console.log('규칙:')
  console.log('  1번째 시그: 어느 회차든 당일 10만+ 하트')
  console.log('  2번째 시그: 다른 회차에서 당일 15만+ 하트')
  console.log('  3번째 시그: 또 다른 회차에서 당일 20만+ 하트')
  console.log('  ※ 각 시그니처는 서로 다른 회차에서 달성해야 함\n')

  // 에피소드 정보 조회
  const { data: episodes } = await supabase
    .from('episodes')
    .select('id, title')
    .eq('season_id', 1)
    .order('id')

  console.log('에피소드 목록:')
  episodes?.forEach(e => console.log(`  episode_id ${e.id}: ${e.title}`))

  // 르큐리 전체 후원 데이터 조회
  const { data: donations } = await supabase
    .from('donations')
    .select('episode_id, amount, donated_at')
    .eq('donor_name', '르큐리')
    .eq('season_id', 1)
    .order('donated_at')

  console.log(`\n\n=== 르큐리 후원 상세 ===`)
  console.log(`총 ${donations?.length}건\n`)

  // 회차별, 날짜별 집계
  const episodeDailyTotals: Map<number, Map<string, number>> = new Map()

  for (const d of donations || []) {
    if (!d.donated_at) continue

    let date = d.donated_at
    if (date.includes('T')) date = date.split('T')[0]
    else if (date.includes(' ')) date = date.split(' ')[0]

    const ep = d.episode_id
    if (!episodeDailyTotals.has(ep)) {
      episodeDailyTotals.set(ep, new Map())
    }
    const dateMap = episodeDailyTotals.get(ep)!
    dateMap.set(date, (dateMap.get(date) || 0) + d.amount)
  }

  // 회차별 출력
  console.log('회차별 날짜별 당일 누적:')
  console.log('-'.repeat(60))

  const episodeMaxes: { ep: number; epTitle: string; date: string; total: number }[] = []

  for (const [ep, dateMap] of episodeDailyTotals) {
    const epInfo = episodes?.find(e => e.id === ep)
    console.log(`\n[${epInfo?.title || `episode ${ep}`}]`)

    let maxTotal = 0
    let maxDate = ''

    for (const [date, total] of Array.from(dateMap.entries()).sort()) {
      const marker = total >= 200000 ? '🔥🔥🔥' : total >= 150000 ? '🔥🔥' : total >= 100000 ? '🔥' : ''
      console.log(`  ${date}: ${total.toLocaleString()} 하트 ${marker}`)
      if (total > maxTotal) {
        maxTotal = total
        maxDate = date
      }
    }

    episodeMaxes.push({
      ep,
      epTitle: epInfo?.title || `episode ${ep}`,
      date: maxDate,
      total: maxTotal
    })
  }

  // 회차별 최고 당일 누적 정렬 (회차 순)
  episodeMaxes.sort((a, b) => a.ep - b.ep)

  console.log('\n\n=== 회차별 최고 당일 누적 ===')
  console.log('-'.repeat(60))
  for (const em of episodeMaxes) {
    const marker = em.total >= 200000 ? '(20만+)' : em.total >= 150000 ? '(15만+)' : em.total >= 100000 ? '(10만+)' : ''
    console.log(`${em.epTitle}: ${em.total.toLocaleString()} 하트 ${marker}`)
  }

  // 시그니처 계산
  console.log('\n\n=== 시그니처 자격 계산 ===')
  console.log('-'.repeat(60))

  const usedEpisodes = new Set<number>()
  let sigCount = 0

  // 1번째 시그 (10만+)
  const first = episodeMaxes.find(e => e.total >= 100000 && !usedEpisodes.has(e.ep))
  if (first) {
    sigCount = 1
    usedEpisodes.add(first.ep)
    console.log(`✅ 1번째 시그: ${first.epTitle}에서 ${first.total.toLocaleString()} 하트 (${first.date})`)
  }

  // 2번째 시그 (15만+, 다른 회차)
  if (sigCount >= 1) {
    const second = episodeMaxes.find(e => e.total >= 150000 && !usedEpisodes.has(e.ep))
    if (second) {
      sigCount = 2
      usedEpisodes.add(second.ep)
      console.log(`✅ 2번째 시그: ${second.epTitle}에서 ${second.total.toLocaleString()} 하트 (${second.date})`)
    } else {
      console.log(`❌ 2번째 시그: 다른 회차에서 15만+ 달성 기록 없음`)
    }
  }

  // 3번째 시그 (20만+, 또 다른 회차)
  if (sigCount >= 2) {
    const third = episodeMaxes.find(e => e.total >= 200000 && !usedEpisodes.has(e.ep))
    if (third) {
      sigCount = 3
      usedEpisodes.add(third.ep)
      console.log(`✅ 3번째 시그: ${third.epTitle}에서 ${third.total.toLocaleString()} 하트 (${third.date})`)
    } else {
      console.log(`❌ 3번째 시그: 또 다른 회차에서 20만+ 달성 기록 없음`)
    }
  }

  console.log(`\n결과: 르큐리 → ${sigCount}개 시그니처 자격`)
}

main().catch(console.error)
