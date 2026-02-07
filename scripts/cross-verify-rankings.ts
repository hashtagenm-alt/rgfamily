/**
 * 실제 PandaTV 랭킹 vs DB 교차검증
 * 실제 데이터: 레거시 + 시즌1 8회차 포함
 */
import { getServiceClient } from './lib/supabase'
const supabase = getServiceClient()

// 실제 PandaTV 랭킹 (사용자 제공, 2026-02-06 기준)
const realRanking = [
  { rank: 1, name: '르큐리', amount: 1798059 },
  { rank: 2, name: '미키™', amount: 1124474 },
  { rank: 3, name: '에이맨♣️', amount: 779973 },
  { rank: 4, name: '채은❤️여신', amount: 716532 },
  { rank: 5, name: '손밍매니아', amount: 559434 },
  { rank: 6, name: '청아젖⁀문가', amount: 436764 },
  { rank: 7, name: '한세아내꺼♡호랭이', amount: 342900 },
  { rank: 8, name: '[RG]미드굿♣️가애', amount: 330142 },
  { rank: 9, name: '❥CaNnOt', amount: 296395 },
  { rank: 10, name: '사랑해씌발™', amount: 279904 },
  { rank: 11, name: '시아에오ღ까부는넌내꺼야', amount: 252401 },
  { rank: 12, name: '[RG]✨린아의발굴™✨', amount: 248290 },
  { rank: 13, name: '바겐시우', amount: 220035 },
  { rank: 14, name: '쩔어서짜다', amount: 185465 },
  { rank: 15, name: '박하은❤️린아❤️사탕', amount: 152416 },
  { rank: 16, name: '린아사단✨탱커', amount: 151537 },
  { rank: 17, name: '[RG]가애ෆ57774', amount: 147172 },
  { rank: 18, name: '김스껄', amount: 116328 },
  { rank: 19, name: '교미ෆ', amount: 112938 },
  { rank: 20, name: 'qldh라유', amount: 99880 },
  { rank: 21, name: '신세련❤️영원한니꺼✦쿨', amount: 97525 },
  { rank: 22, name: '농심육개장라면', amount: 94197 },
  { rank: 23, name: '가윤이꼬❤️너만의마음⭐', amount: 92775 },
  { rank: 24, name: '칰힌사주면천사❥', amount: 84856 },
  { rank: 25, name: '까부는김회장', amount: 83461 },
  { rank: 26, name: '청아❤️머리크기빵빵이', amount: 83281 },
  { rank: 27, name: '푸바오✨', amount: 75582 },
  { rank: 28, name: '한세아♡백작♡하얀만두피', amount: 75407 },
  { rank: 29, name: '조패러갈꽈', amount: 71554 },
  { rank: 30, name: '⭐건빵이미래쥐', amount: 68207 },
  { rank: 31, name: 'Rearcar', amount: 67619 },
  { rank: 32, name: '풀묶™', amount: 65688 },
  { rank: 33, name: '우리다해❤️냥꿀', amount: 62792 },
  { rank: 34, name: '[RG]여행™', amount: 60495 },
  { rank: 35, name: '❤️지수ෆ해린❤️치토스㉦', amount: 56870 },
  { rank: 36, name: 'edhadha3', amount: 55845 },
  { rank: 37, name: '손밍ღ타코보이', amount: 54855 },
  { rank: 38, name: '홍서하네홍금보', amount: 53000 },
  { rank: 39, name: '이게믖나', amount: 51184 },
  { rank: 40, name: '꽉B가윤이꼬❤️함주라', amount: 50512 },
  { rank: 41, name: '희영네개유오', amount: 50000 },
  { rank: 42, name: '김채은네_갈색말티푸', amount: 48738 },
  { rank: 43, name: '✨가윤❤️바위늪✨', amount: 47192 },
  { rank: 44, name: '경리의두쫀쿠키❤️쪼다❤️', amount: 47143 },
  { rank: 45, name: '태린공주❤️줄여보자', amount: 46926 },
  { rank: 46, name: '하트받고싶음짖어', amount: 46715 },
  { rank: 47, name: '가윤이꼬❤️털이', amount: 42942 },
  { rank: 48, name: '잔망미니언즈', amount: 40422 },
  { rank: 49, name: '♬♪행복한베니와✨엔띠♬', amount: 39260 },
  { rank: 50, name: '⚡도도➷라론⚡', amount: 39003 },
]

// 닉네임 매핑 (PandaTV 현재 닉네임 → DB 닉네임)
// 동일인물 통합 후에도 PandaTV에서는 아직 구닉네임이 남아있는 경우
const nameMapping: Record<string, string> = {
  '청아젖⁀문가': '[J]젖문가',
  '[RG]✨린아의발굴™✨': '[RG]✨린아의발굴™',
  '가윤이꼬❤️너만의마음⭐': '가윤이꼬❤️마음⭐',
  '칰힌사주면천사❥': '☀칰힌사주면천사☀',
  '까부는김회장': '채은❤️여신',
  '꽉B가윤이꼬❤️함주라': '가윤이꼬❤️함주라',
  '김채은네_갈색말티푸': '갈색말티푸',
  '경리의두쫀쿠키❤️쪼다❤️': '경리때리는❤️쪼다❤️',
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 실제 PandaTV 랭킹 vs DB 교차검증')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // DB 종합 랭킹 가져오기
  const { data: dbRankings } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, total_amount')
    .order('rank')

  const dbMap = new Map((dbRankings || []).map(r => [r.donor_name, r]))

  let matchCount = 0
  let mismatchCount = 0
  let missingCount = 0
  const mismatches: { rank: number; name: string; dbName: string; real: number; db: number; diff: number }[] = []

  console.log('순위  실제 닉네임                          실제 하트        DB 하트          차이      상태')
  console.log('─'.repeat(110))

  for (const real of realRanking) {
    const dbName = nameMapping[real.name] || real.name
    const dbEntry = dbMap.get(dbName)

    if (!dbEntry) {
      // DB에 없는 경우 - 다른 닉네임으로 있을 수 있음
      console.log(`${String(real.rank).padStart(2)}위  ${real.name.padEnd(30)} ${real.amount.toLocaleString().padStart(12)}    ${'(DB 없음)'.padStart(12)}                  ❓ 미발견`)
      missingCount++
      continue
    }

    const diff = real.amount - dbEntry.total_amount
    const status = diff === 0 ? '✅ 일치' : `❌ 차이 ${diff > 0 ? '+' : ''}${diff.toLocaleString()}`
    const dbNameDisplay = dbName !== real.name ? `(DB: ${dbName})` : ''

    if (diff === 0) {
      console.log(`${String(real.rank).padStart(2)}위  ${real.name.padEnd(30)} ${real.amount.toLocaleString().padStart(12)}    ${dbEntry.total_amount.toLocaleString().padStart(12)}    DB ${String(dbEntry.rank).padStart(2)}위    ✅ ${dbNameDisplay}`)
      matchCount++
    } else {
      console.log(`${String(real.rank).padStart(2)}위  ${real.name.padEnd(30)} ${real.amount.toLocaleString().padStart(12)}    ${dbEntry.total_amount.toLocaleString().padStart(12)}    DB ${String(dbEntry.rank).padStart(2)}위    ❌ ${diff > 0 ? '+' : ''}${diff.toLocaleString()} ${dbNameDisplay}`)
      mismatchCount++
      mismatches.push({ rank: real.rank, name: real.name, dbName, real: real.amount, db: dbEntry.total_amount, diff })
    }
  }

  console.log('─'.repeat(110))
  console.log(`\n📊 결과: ✅ 일치 ${matchCount}건 | ❌ 불일치 ${mismatchCount}건 | ❓ 미발견 ${missingCount}건`)

  if (mismatches.length > 0) {
    console.log('\n═══ 불일치 상세 분석 ═══\n')

    // donations에서 시즌 합계 가져오기
    const allDonations: { donor_name: string; amount: number }[] = []
    let page = 0
    while (true) {
      const { data } = await supabase.from('donations').select('donor_name, amount').gt('amount', 0).range(page * 1000, (page + 1) * 1000 - 1)
      if (!data || data.length === 0) break
      allDonations.push(...data)
      if (data.length < 1000) break
      page++
    }

    const seasonTotals: Record<string, number> = {}
    for (const d of allDonations) {
      seasonTotals[d.donor_name] = (seasonTotals[d.donor_name] || 0) + d.amount
    }

    // 레거시 데이터
    const legacyData: Record<string, number> = {
      '미키™': 411282, '[RG]✨린아의발굴™': 222184, '시아에오ღ까부는넌내꺼야': 209322,
      '[RG]미드굿♣️가애': 147864, '가윤이꼬❤️가플단마음⭐': 87057, '농심육개장라면': 84177,
      '칰힌사주면천사❥': 80426, '[J]젖문가': 65066, '까부는김회장': 60777,
      '[RG]여행™': 60495, '❥CaNnOt': 59632, '바겐시우': 57108,
      '꽉B가윤이꼬❤️함주라': 47491, '태린공주❤️줄여보자': 46926, '⭐건빵이미래쥐': 42395,
      '⚡도도➷라론⚡': 39003, '내마지막은키르❤️머네로': 36312, '도도화♔원픽♔': 34270,
      '✨가윤❤️바위늪✨': 32492, '가윤이꼬❤️털이': 30532, '선하❤️삐딱이': 25172,
      '[오골계]': 23085, '✨❤️라율◡ღ카사❤️✨': 22914, '언제나♬': 20873,
      '한은비ღ안줘ღ': 20727, '❥견뎌': 20568, '☾코코에르메스': 20070,
      '양재동ღ젖문가➷': 20009, '마시마로ღ': 19486, '린아사단✨탱커': 18492,
      '개호구⭐즈하⭐광대': 18015, '현생중_냐핫': 16548, '❤️닉푸어™❤️': 16288,
      '온리원❥금쪽이ღ조커✨': 16275, '앵겨라잉': 15588, '[로진]꽃츄잉♡엔터대표': 15286,
      '태린공주❤️마비™': 15240, '[RG]채은➳♥도루묵': 13448, '❤️재활중~방랑자❤️': 13198,
      '가윤이꼬❤️가플단니킥': 12374, '[가플단]가윤❤️호기': 12110, '[RG]가애여황': 10090,
      '김스껄': 9367, '[RG]가애ෆ잔바리': 8208, '홍서하네❥홍바스': 7918,
      '미쯔✨': 7606, '신세련❤️영원한니꺼✦쿨': 7503, '[RG]린아네☀둥그레': 7052,
      '퉁퉁퉁퉁퉁퉁사우르': 5671, '[RG]✨린아의단진™': 5554, '교미ෆ': 4499,
      '사랑해씌발™': 3349, 'qldh라유': 3174, '한세아내꺼♡호랭이': 2933,
      '홍서하네❥페르소나™': 2586, '가윤이꼬❤️관씨': 2557, 'ღ❥가애ღ개맛도링❥ღ': 564,
      '한세아♡백작♡하얀만두피': 500, '[RG]가애ෆ57774': 212, '갈색말티푸': 200,
      '박하은❤️린아❤️사탕': 144, '손밍매니아': 21, '❤️지수ෆ해린❤️치토스㉦': 10,
      '손밍ღ타코보이': 8, '글레스고키스': 6, '파민♣️': 4,
    }

    for (const m of mismatches) {
      const legacy = legacyData[m.dbName] || 0
      const season = seasonTotals[m.dbName] || 0
      const dbCalc = legacy + season
      const correctLegacy = m.real - season

      console.log(`  ${m.rank}위 ${m.name}${m.dbName !== m.name ? ` (DB: ${m.dbName})` : ''}`)
      console.log(`    실제 총합: ${m.real.toLocaleString()}`)
      console.log(`    DB 총합:   ${m.db.toLocaleString()} (레거시 ${legacy.toLocaleString()} + 시즌 ${season.toLocaleString()})`)
      console.log(`    차이:      ${m.diff > 0 ? '+' : ''}${m.diff.toLocaleString()}`)
      console.log(`    ✏️  올바른 레거시: ${correctLegacy.toLocaleString()} (현재 ${legacy.toLocaleString()}, 차이 ${(correctLegacy - legacy).toLocaleString()})`)
      console.log('')
    }
  }

  // 닉네임 변경 감지
  console.log('═══ 닉네임 매핑 (PandaTV → DB) ═══')
  for (const [pandaName, dbName] of Object.entries(nameMapping)) {
    console.log(`  "${pandaName}" → "${dbName}"`)
  }
}

main().catch(console.error)
