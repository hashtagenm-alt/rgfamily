/**
 * 닉네임 통합 후 순위 변동 시뮬레이션 (dry-run)
 */
import { getServiceClient } from './lib/supabase'
const supabase = getServiceClient()

// 통합 대상: [구닉네임, 대표닉네임]
const merges = [
  ['가윤이꼬❤️가플단마음⭐', '가윤이꼬❤️마음⭐'],
  ['칰힌사주면천사❥', '☀칰힌사주면천사☀'],
  ['꽉B가윤이꼬❤️함주라', '가윤이꼬❤️함주라'],
  ['까부는김회장', '채은❤️여신'],
  ['[Another]젖문가', '[J]젖문가'],
]

// 레거시 데이터 (현재 refresh-total-rankings.ts 기준)
const legacyData: Record<string, number> = {
  '미키™': 411282,
  '[RG]✨린아의발굴™': 222184,
  '시아에오ღ까부는넌내꺼야': 209322,
  '[RG]미드굿♣️가애': 147864,
  '가윤이꼬❤️가플단마음⭐': 87057,
  '농심육개장라면': 84177,
  '칰힌사주면천사❥': 80426,
  '[J]젖문가': 65066,
  '까부는김회장': 60777,
  '[RG]여행™': 60495,
  '❥CaNnOt': 59632,
  '바겐시우': 57108,
  '꽉B가윤이꼬❤️함주라': 47491,
  '태린공주❤️줄여보자': 46926,
  '⭐건빵이미래쥐': 42395,
  '⚡도도➷라론⚡': 39003,
  '내마지막은키르❤️머네로': 36312,
  '도도화♔원픽♔': 34270,
  '✨가윤❤️바위늪✨': 32492,
  '가윤이꼬❤️털이': 30532,
  '선하❤️삐딱이': 25172,
  '[오골계]': 23085,
  '✨❤️라율◡ღ카사❤️✨': 22914,
  '언제나♬': 20873,
  '한은비ღ안줘ღ': 20727,
  '❥견뎌': 20568,
  '☾코코에르메스': 20070,
  '양재동ღ젖문가➷': 20009,
  '마시마로ღ': 19486,
  '린아사단✨탱커': 18492,
  '개호구⭐즈하⭐광대': 18015,
  '현생중_냐핫': 16548,
  '❤️닉푸어™❤️': 16288,
  '온리원❥금쪽이ღ조커✨': 16275,
  '앵겨라잉': 15588,
  '[로진]꽃츄잉♡엔터대표': 15286,
  '태린공주❤️마비™': 15240,
  '[RG]채은➳♥도루묵': 13448,
  '❤️재활중~방랑자❤️': 13198,
  '가윤이꼬❤️가플단니킥': 12374,
  '[가플단]가윤❤️호기': 12110,
  '[RG]가애여황': 10090,
  '김스껄': 9367,
  '[RG]가애ෆ잔바리': 8208,
  '홍서하네❥홍바스': 7918,
  '미쯔✨': 7606,
  '신세련❤️영원한니꺼✦쿨': 7503,
  '[RG]린아네☀둥그레': 7052,
  '퉁퉁퉁퉁퉁퉁사우르': 5671,
  '[RG]✨린아의단진™': 5554,
  '교미ෆ': 4499,
  '사랑해씌발™': 3349,
  'qldh라유': 3174,
  '한세아내꺼♡호랭이': 2933,
  '홍서하네❥페르소나™': 2586,
  '가윤이꼬❤️관씨': 2557,
  'ღ❥가애ღ개맛도링❥ღ': 564,
  '한세아♡백작♡하얀만두피': 500,
  '[RG]가애ෆ57774': 212,
  '갈색말티푸': 200,
  '박하은❤️린아❤️사탕': 144,
  '손밍매니아': 21,
  '❤️지수ෆ해린❤️치토스㉦': 10,
  '손밍ღ타코보이': 8,
  '글레스고키스': 6,
  '파민♣️': 4,
}

async function fetchAllDonations() {
  const allData: { donor_name: string; amount: number }[] = []
  let page = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase
      .from('donations')
      .select('donor_name, amount')
      .gt('amount', 0)
      .range(page * pageSize, (page + 1) * pageSize - 1)
    if (error) { console.error('오류:', error.message); break }
    if (!data || data.length === 0) break
    allData.push(...data)
    if (data.length < pageSize) break
    page++
  }
  return allData
}

function buildRankings(
  seasonTotals: Record<string, number>,
  legacy: Record<string, number>,
  limit: number
) {
  // 시즌 랭킹
  const seasonRanking = Object.entries(seasonTotals)
    .map(([name, total]) => ({ donor_name: name, total_amount: total }))
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, limit)
    .map((d, i) => ({ rank: i + 1, ...d }))

  // 종합 랭킹
  const combined: Record<string, number> = { ...legacy }
  for (const [name, amount] of Object.entries(seasonTotals)) {
    combined[name] = (combined[name] || 0) + amount
  }
  const totalRanking = Object.entries(combined)
    .map(([name, total]) => ({ donor_name: name, total_amount: total }))
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, limit)
    .map((d, i) => ({ rank: i + 1, ...d }))

  return { seasonRanking, totalRanking }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔮 닉네임 통합 후 순위 변동 시뮬레이션')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const donations = await fetchAllDonations()

  // === 현재 상태 ===
  const currentSeasonTotals: Record<string, number> = {}
  for (const d of donations) {
    currentSeasonTotals[d.donor_name] = (currentSeasonTotals[d.donor_name] || 0) + d.amount
  }
  const current = buildRankings(currentSeasonTotals, legacyData, 50)

  // === 통합 후 상태 ===
  // 1. donations 닉네임 통합
  const mergedSeasonTotals: Record<string, number> = {}
  for (const d of donations) {
    let name = d.donor_name
    for (const [oldName, newName] of merges) {
      if (name === oldName) { name = newName; break }
    }
    mergedSeasonTotals[name] = (mergedSeasonTotals[name] || 0) + d.amount
  }

  // 2. 레거시 닉네임 통합
  const mergedLegacy: Record<string, number> = {}
  for (const [name, amount] of Object.entries(legacyData)) {
    let finalName = name
    for (const [oldName, newName] of merges) {
      if (name === oldName) { finalName = newName; break }
    }
    mergedLegacy[finalName] = (mergedLegacy[finalName] || 0) + amount
  }

  const merged = buildRankings(mergedSeasonTotals, mergedLegacy, 50)

  // === 시즌 랭킹 비교 ===
  console.log('═══ 시즌 랭킹 변동 (Top 50) ═══\n')

  // 현재 순위 맵
  const currentSeasonMap = new Map(current.seasonRanking.map(r => [r.donor_name, r]))
  const mergedSeasonMap = new Map(merged.seasonRanking.map(r => [r.donor_name, r]))

  // 변동 있는 것만 표시
  let seasonChanges = 0
  for (const r of merged.seasonRanking) {
    const before = currentSeasonMap.get(r.donor_name)
    const beforeRank = before ? before.rank : null
    const beforeAmount = before ? before.total_amount : null

    if (!beforeRank || beforeRank !== r.rank || beforeAmount !== r.total_amount) {
      const rankChange = beforeRank ? beforeRank - r.rank : 0
      const arrow = rankChange > 0 ? `🔺${rankChange}` : rankChange < 0 ? `🔻${Math.abs(rankChange)}` : beforeRank ? '─' : '🆕'
      console.log(`  ${String(r.rank).padStart(2)}위 ${arrow.padEnd(4)} ${r.donor_name} = ${r.total_amount.toLocaleString()} 하트${beforeRank && beforeAmount !== r.total_amount ? ` (이전: ${beforeRank}위 ${beforeAmount!.toLocaleString()})` : beforeRank ? ` (이전: ${beforeRank}위)` : ''}`)
      seasonChanges++
    }
  }

  // 삭제된 항목
  for (const r of current.seasonRanking) {
    if (!mergedSeasonMap.has(r.donor_name)) {
      console.log(`  ❌ 삭제: ${r.donor_name} (이전 ${r.rank}위, ${r.total_amount.toLocaleString()} 하트) → 통합됨`)
      seasonChanges++
    }
  }

  if (seasonChanges === 0) console.log('  변동 없음')

  // === 종합 랭킹 비교 ===
  console.log('\n═══ 종합 랭킹 변동 (Top 50) ═══\n')

  const currentTotalMap = new Map(current.totalRanking.map(r => [r.donor_name, r]))
  const mergedTotalMap = new Map(merged.totalRanking.map(r => [r.donor_name, r]))

  let totalChanges = 0
  for (const r of merged.totalRanking) {
    const before = currentTotalMap.get(r.donor_name)
    const beforeRank = before ? before.rank : null
    const beforeAmount = before ? before.total_amount : null

    if (!beforeRank || beforeRank !== r.rank || beforeAmount !== r.total_amount) {
      const rankChange = beforeRank ? beforeRank - r.rank : 0
      const arrow = rankChange > 0 ? `🔺${rankChange}` : rankChange < 0 ? `🔻${Math.abs(rankChange)}` : beforeRank ? '─' : '🆕'
      console.log(`  ${String(r.rank).padStart(2)}위 ${arrow.padEnd(4)} ${r.donor_name} = ${r.total_amount.toLocaleString()} 하트${beforeRank && beforeAmount !== r.total_amount ? ` (이전: ${beforeRank}위 ${beforeAmount!.toLocaleString()})` : beforeRank ? ` (이전: ${beforeRank}위)` : ''}`)
      totalChanges++
    }
  }

  // 삭제된 항목
  for (const r of current.totalRanking) {
    if (!mergedTotalMap.has(r.donor_name)) {
      console.log(`  ❌ 삭제: ${r.donor_name} (이전 ${r.rank}위, ${r.total_amount.toLocaleString()} 하트) → 통합됨`)
      totalChanges++
    }
  }

  if (totalChanges === 0) console.log('  변동 없음')

  // === 요약 ===
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 요약')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  시즌 랭킹: ${current.seasonRanking.length}명 → ${merged.seasonRanking.length}명`)
  console.log(`  종합 랭킹: ${current.totalRanking.length}명 → ${merged.totalRanking.length}명`)

  // Top 10 전후 비교
  console.log('\n═══ 시즌 Top 10 (변경 후) ═══')
  for (const r of merged.seasonRanking.slice(0, 10)) {
    const before = currentSeasonMap.get(r.donor_name)
    const change = before ? before.rank - r.rank : 0
    const tag = change > 0 ? ` (🔺${change})` : change < 0 ? ` (🔻${Math.abs(change)})` : ''
    console.log(`  ${String(r.rank).padStart(2)}위: ${r.donor_name} = ${r.total_amount.toLocaleString()} 하트${tag}`)
  }

  console.log('\n═══ 종합 Top 10 (변경 후) ═══')
  for (const r of merged.totalRanking.slice(0, 10)) {
    const before = currentTotalMap.get(r.donor_name)
    const change = before ? before.rank - r.rank : 0
    const tag = change > 0 ? ` (🔺${change})` : change < 0 ? ` (🔻${Math.abs(change)})` : ''
    console.log(`  ${String(r.rank).padStart(2)}위: ${r.donor_name} = ${r.total_amount.toLocaleString()} 하트${tag}`)
  }
}

main().catch(console.error)
