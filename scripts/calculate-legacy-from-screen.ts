/**
 * 화면 종합랭킹 데이터를 기준으로 레거시 데이터 역산
 * 레거시 = 화면 총합 - 시즌1 donations
 */

import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv'

const supabase = getServiceClient()

// 화면 데이터 (레거시 + 시즌 1 전체) - Top 50
const screenData = [
  { rank: 1, name: '르큐리', total: 1798059 },
  { rank: 2, name: '미키™', total: 981100 },
  { rank: 3, name: '채은❤️여신', total: 716532 },
  { rank: 4, name: '에이맨♣️', total: 665664 },
  { rank: 5, name: '손밍매니아', total: 559434 },
  { rank: 6, name: '[J]젖문가', total: 416691 },
  { rank: 7, name: '한세아내꺼♡호랭이', total: 337117 },
  { rank: 8, name: '❥CaNnOt', total: 296395 },
  { rank: 9, name: '[RG]미드굿♣️가애', total: 286662 },
  { rank: 10, name: '사랑해씌발™', total: 260217 },
  { rank: 11, name: '[RG]✨린아의발굴™✨', total: 240333 },
  { rank: 12, name: '시아에오ღ까부는넌내꺼야', total: 209322 },
  { rank: 13, name: '쩔어서짜다', total: 185465 },
  { rank: 14, name: '바겐시우', total: 160436 },
  { rank: 15, name: '린아사단✨탱커', total: 148415 },
  { rank: 16, name: '[RG]가애ෆ57774', total: 147072 },
  { rank: 17, name: '박하은❤️린아❤️사탕', total: 142253 },
  { rank: 18, name: 'qldh라유', total: 99880 },
  { rank: 19, name: '신세련❤️영원한니꺼✦쿨', total: 97525 },
  { rank: 20, name: '김스껄', total: 95115 },
  { rank: 21, name: '교미ෆ', total: 94914 },
  { rank: 22, name: '농심육개장라면', total: 94197 },
  { rank: 23, name: '가윤이꼬❤️가플단마음⭐', total: 92775 },
  { rank: 24, name: '칰힌사주면천사❥', total: 83375 },
  { rank: 25, name: '청아❤️머리크기빵빵이', total: 81947 },
  { rank: 26, name: '까부는김회장', total: 80777 },
  { rank: 27, name: '푸바오✨', total: 75582 },
  { rank: 28, name: '한세아♡백작♡하얀만두피', total: 73042 },
  { rank: 29, name: '조패러갈꽈', total: 70213 },
  { rank: 30, name: '⭐건빵이미래쥐', total: 68207 },
  { rank: 31, name: 'Rearcar', total: 67619 },
  { rank: 32, name: '풀묶™', total: 65688 },
  { rank: 33, name: '[RG]여행™', total: 60495 },
  { rank: 34, name: '❤️지수ෆ해린❤️치토스㉦', total: 56870 },
  { rank: 35, name: 'edhadha3', total: 55845 },
  { rank: 36, name: '홍서하네홍금보', total: 53000 },
  { rank: 37, name: '우리다해❤️냥꿀', total: 52994 },
  { rank: 38, name: '손밍ღ타코보이', total: 52158 },
  { rank: 39, name: '희영네개유오', total: 50000 },
  { rank: 40, name: '꽉B가윤이꼬❤️함주라', total: 49505 },
  { rank: 41, name: '태린공주❤️줄여보자', total: 46926 },
  { rank: 42, name: '가윤이꼬❤️털이', total: 42942 },
  { rank: 43, name: '이게믖나', total: 40626 },
  { rank: 44, name: '⚡도도➷라론⚡', total: 39003 },
  { rank: 45, name: '☾코코에르메스', total: 38443 },
  { rank: 46, name: '갈색말티푸', total: 37062 },
  { rank: 47, name: '[RG]가애여황', total: 36849 },
  { rank: 48, name: '내마지막은키르❤️머네로', total: 36312 },
  { rank: 49, name: '꽃부기ღ', total: 35271 },
  { rank: 50, name: '도도화♔원픽♔', total: 34270 },
  { rank: 51, name: '✨가윤❤️바위늪✨', total: 32492 },
  { rank: 52, name: '하트받고싶음짖어', total: 32178 },
  { rank: 53, name: '[오골계]', total: 31052 },
  { rank: 54, name: '☾⁀◡⁀☽구름을☽달가듯', total: 30600 },
  { rank: 55, name: '[SD]티모', total: 30584 },
  { rank: 56, name: 'ღ❥가애ღ개맛도링❥ღ', total: 30295 },
  { rank: 57, name: '잔망미니언즈', total: 30228 },
  { rank: 58, name: '홍서하네❥페르소나™', total: 29297 },
  { rank: 59, name: '♬♪행복한베니와✨엔띠♬', total: 28521 },
  { rank: 60, name: '글레스고키스', total: 26256 },
  { rank: 61, name: '*⁀➷ღ이럴슈가', total: 25809 },
  { rank: 62, name: '이쁘면하트100개', total: 25189 },
  { rank: 63, name: '선하❤️삐딱이', total: 25172 },
  { rank: 64, name: '백설기에건포도', total: 24853 },
  { rank: 65, name: '가윤이꼬❤️관씨', total: 24309 },
  { rank: 66, name: '✨❤️라율◡ღ카사❤️✨', total: 22914 },
  { rank: 67, name: '나랑비밀친구할래', total: 21890 },
  { rank: 68, name: '파민♣️', total: 21779 },
  { rank: 69, name: '고다혜보다ღ국물', total: 21311 },
  { rank: 70, name: '언제나♬', total: 20873 },
  { rank: 71, name: '한은비ღ안줘ღ', total: 20727 },
  { rank: 72, name: '❥견뎌', total: 20568 },
  { rank: 73, name: '[RG]가애ෆ잔바리', total: 20444 },
  { rank: 74, name: '쾅맨이', total: 20106 },
  { rank: 75, name: '양재동ღ젖문가➷', total: 20009 },
  { rank: 76, name: '마시마로ღ', total: 19486 },
  { rank: 77, name: '가윤이꼬❤️가플단니킥', total: 19190 },
  { rank: 78, name: '홍서하네❥홍락봉', total: 18613 },
  { rank: 79, name: '[RG]린아네☀둥그레', total: 18433 },
  { rank: 80, name: '[가플단]가윤❤️호기', total: 18327 },
  { rank: 81, name: '미쯔✨', total: 18279 },
  { rank: 82, name: '개호구⭐즈하⭐광대', total: 18015 },
  { rank: 83, name: '퉁퉁퉁퉁퉁퉁사우르', total: 17266 },
  { rank: 84, name: '박순복', total: 17233 },
  { rank: 85, name: '유하린ღ첫째언노운', total: 16884 },
  { rank: 86, name: '현생중_냐핫', total: 16548 },
  { rank: 87, name: '[RG]채은➳♥도루묵', total: 16466 },
  { rank: 88, name: '홍서하네❥홍바스', total: 16379 },
  { rank: 89, name: '[RG]✨린아의단진™', total: 16305 },
  { rank: 90, name: '❤️닉푸어™❤️', total: 16288 },
  { rank: 91, name: '온리원❥금쪽이ღ조커✨', total: 16275 },
  { rank: 92, name: '앵겨라잉', total: 15588 },
  { rank: 93, name: '[로진]꽃츄잉♡엔터대표', total: 15286 },
  { rank: 94, name: '태린공주❤️마비™', total: 15240 },
  { rank: 95, name: '❤️루찌™❤️', total: 14605 },
  { rank: 96, name: '❤️재활중~방랑자❤️', total: 14275 },
  { rank: 97, name: '이태린ෆ', total: 14205 },
  { rank: 98, name: '[RG]린아ෆ', total: 14010 },
  { rank: 99, name: 'ෆ유은', total: 13797 },
  { rank: 100, name: '[RG]손밍이오', total: 13322 },
]

async function calculateLegacy() {
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 레거시 데이터 역산 (화면 - 시즌1)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  // 시즌 1 donations 데이터 조회 (페이지네이션)
  const allDonations: { donor_name: string; amount: number }[] = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('donations')
      .select('donor_name, amount')
      .eq('season_id', 1)
      .gt('amount', 0)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) {
      console.error(`페이지 ${page} 조회 오류:`, error.message)
      break
    }

    if (!data || data.length === 0) break
    allDonations.push(...data)
    if (data.length < pageSize) break
    page++
  }

  console.log(`📥 시즌 1 donations 로드: ${allDonations.length}건`)
  console.log('')

  // 후원자별 시즌 1 합산
  const season1Map = new Map<string, number>()
  for (const d of allDonations || []) {
    season1Map.set(d.donor_name, (season1Map.get(d.donor_name) || 0) + d.amount)
  }

  console.log('📋 화면 Top 20 역산 결과:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  const legacyData: Record<string, number> = {}
  let hasLegacy = false

  for (const screen of screenData) {
    const season1Total = season1Map.get(screen.name) || 0
    const legacy = screen.total - season1Total

    const status = legacy > 0 ? '📊' : legacy === 0 ? '✅' : '⚠️'

    console.log(`${status} ${screen.rank}위. ${screen.name}`)
    console.log(`   화면 총합: ${screen.total.toLocaleString()} 하트`)
    console.log(`   시즌1: ${season1Total.toLocaleString()} 하트`)
    console.log(`   레거시: ${legacy.toLocaleString()} 하트`)

    if (legacy > 0) {
      legacyData[screen.name] = legacy
      hasLegacy = true
    } else if (legacy < 0) {
      console.log(`   ⚠️ 경고: 시즌1이 화면보다 ${Math.abs(legacy).toLocaleString()} 더 많음!`)
    }
    console.log('')
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('💾 refresh-total-rankings.ts에 적용할 legacyData:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('const legacyData: Record<string, number> = {')

  if (hasLegacy) {
    // 레거시가 있는 후원자만
    for (const [name, amount] of Object.entries(legacyData).sort((a, b) => b[1] - a[1])) {
      console.log(`  '${name}': ${amount},`)
    }
  } else {
    console.log('  // 레거시 데이터 없음 (모두 시즌 1에서 시작)')
  }

  console.log('}')
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // 통계
  const totalLegacy = Object.values(legacyData).reduce((sum, val) => sum + val, 0)
  const totalSeason1 = Array.from(season1Map.values()).reduce((sum, val) => sum + val, 0)
  const totalScreen = screenData.reduce((sum, d) => sum + d.total, 0)

  console.log('')
  console.log('📊 전체 통계:')
  console.log(`   화면 Top 20 총합: ${totalScreen.toLocaleString()} 하트`)
  console.log(`   시즌 1 전체 합계: ${totalSeason1.toLocaleString()} 하트`)
  console.log(`   역산 레거시 합계: ${totalLegacy.toLocaleString()} 하트`)
  console.log(`   레거시가 있는 후원자: ${Object.keys(legacyData).length}명`)
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

calculateLegacy().catch(console.error)
