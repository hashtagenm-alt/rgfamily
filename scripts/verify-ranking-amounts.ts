/**
 * 랭킹 후원 액수 검증 스크립트
 * donations 테이블 실제 합계 vs 랭킹 테이블 비교
 */
import { getServiceClient } from './lib/supabase'

const supabase = getServiceClient()

// 레거시 데이터 (refresh-total-rankings.ts와 동일)
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
    if (error) { console.error('페이지네이션 오류:', error.message); break }
    if (!data || data.length === 0) break
    allData.push(...data)
    if (data.length < pageSize) break
    page++
  }
  return allData
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 랭킹 후원 액수 검증')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 1. donations 테이블에서 전체 로드
  console.log('📥 donations 테이블 로딩...')
  const donations = await fetchAllDonations()
  console.log(`   총 ${donations.length}건\n`)

  // 2. 닉네임별 시즌 합계
  const seasonTotals: Record<string, number> = {}
  for (const d of donations) {
    seasonTotals[d.donor_name] = (seasonTotals[d.donor_name] || 0) + d.amount
  }

  // 3. 시즌 랭킹 검증
  console.log('═══ [1] 시즌 랭킹 검증 ═══')
  const { data: seasonRankings } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name, total_amount')
    .order('rank')

  let seasonMismatch = 0
  for (const sr of seasonRankings || []) {
    const actual = seasonTotals[sr.donor_name] || 0
    if (actual !== sr.total_amount) {
      seasonMismatch++
      console.log(`   ❌ ${sr.rank}위 ${sr.donor_name}: DB=${sr.total_amount.toLocaleString()} vs 실제=${actual.toLocaleString()} (차이: ${sr.total_amount - actual})`)
    }
  }
  if (seasonMismatch === 0) {
    console.log(`   ✅ 시즌 랭킹 ${(seasonRankings || []).length}명 모두 정확!`)
  } else {
    console.log(`   ⚠️ ${seasonMismatch}건 불일치`)
  }

  // 4. 종합 랭킹 검증
  console.log('\n═══ [2] 종합 랭킹 검증 (레거시 + 시즌) ═══')
  const { data: totalRankings } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, total_amount')
    .order('rank')

  let totalMismatch = 0
  for (const tr of totalRankings || []) {
    const legacy = legacyData[tr.donor_name] || 0
    const season = seasonTotals[tr.donor_name] || 0
    const expected = legacy + season
    if (expected !== tr.total_amount) {
      totalMismatch++
      console.log(`   ❌ ${tr.rank}위 ${tr.donor_name}: DB=${tr.total_amount.toLocaleString()} vs 기대=${expected.toLocaleString()} (레거시=${legacy.toLocaleString()} + 시즌=${season.toLocaleString()}, 차이: ${tr.total_amount - expected})`)
    }
  }
  if (totalMismatch === 0) {
    console.log(`   ✅ 종합 랭킹 ${(totalRankings || []).length}명 모두 정확!`)
  } else {
    console.log(`   ⚠️ ${totalMismatch}건 불일치`)
  }

  // 5. 순위 순서 검증
  console.log('\n═══ [3] 순위 정렬 검증 ═══')
  let seasonOrderOk = true
  for (let i = 1; i < (seasonRankings || []).length; i++) {
    if (seasonRankings![i].total_amount > seasonRankings![i - 1].total_amount) {
      console.log(`   ❌ 시즌 랭킹 정렬 오류: ${seasonRankings![i - 1].rank}위(${seasonRankings![i - 1].total_amount.toLocaleString()}) < ${seasonRankings![i].rank}위(${seasonRankings![i].total_amount.toLocaleString()})`)
      seasonOrderOk = false
    }
  }
  if (seasonOrderOk) console.log('   ✅ 시즌 랭킹 정렬 정상')

  let totalOrderOk = true
  for (let i = 1; i < (totalRankings || []).length; i++) {
    if (totalRankings![i].total_amount > totalRankings![i - 1].total_amount) {
      console.log(`   ❌ 종합 랭킹 정렬 오류: ${totalRankings![i - 1].rank}위(${totalRankings![i - 1].total_amount.toLocaleString()}) < ${totalRankings![i].rank}위(${totalRankings![i].total_amount.toLocaleString()})`)
      totalOrderOk = false
    }
  }
  if (totalOrderOk) console.log('   ✅ 종합 랭킹 정렬 정상')

  // 6. Top 10 상세 내역
  console.log('\n═══ [4] 시즌 랭킹 Top 10 ═══')
  for (let i = 0; i < Math.min(10, (seasonRankings || []).length); i++) {
    const sr = seasonRankings![i]
    console.log(`   ${sr.rank}위: ${sr.donor_name} = ${sr.total_amount.toLocaleString()} 하트`)
  }

  console.log('\n═══ [5] 종합 랭킹 Top 10 ═══')
  for (let i = 0; i < Math.min(10, (totalRankings || []).length); i++) {
    const tr = totalRankings![i]
    const legacy = legacyData[tr.donor_name] || 0
    const season = seasonTotals[tr.donor_name] || 0
    console.log(`   ${tr.rank}위: ${tr.donor_name} = ${tr.total_amount.toLocaleString()} 하트 (레거시: ${legacy.toLocaleString()} + 시즌: ${season.toLocaleString()})`)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🏁 검증 완료')
}

main().catch(console.error)
