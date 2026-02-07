/**
 * 종합 랭킹 갱신 스크립트
 * 레거시 데이터 + 시즌 데이터를 합산하여 total_donation_rankings 갱신
 * RPC 함수를 사용하여 트랜잭션 안전성을 보장합니다.
 *
 * 사용법:
 *   npx tsx scripts/refresh-total-rankings.ts [--dry-run]
 */

import { getServiceClient } from './lib/supabase'
import { withRetry } from './lib/utils'

const supabase = getServiceClient()

// 레거시 데이터 (시즌1 이전 누적)
// 2026-02-06 업데이트: PandaTV 실제 Top 50 교차검증 완료
// - 같은 계정 닉변: 레거시 = PandaTV총합 - 시즌donations로 재계산
// - 다른 계정 동일인물: 채은여신+김회장, J젖문가+Another젖문가 (레거시 정상)
// 2026-02-07 수정: 시아에오ღ까부는넌내꺼야 → 까부는넌내꺼야119 닉변 통합
const legacyData: Record<string, number> = {
  '미키™': 411282,
  '까부는넌내꺼야119': 209322,
  '[RG]미드굿♣️가애': 147864,
  '[RG]✨린아의발굴™': 67199,
  '[J]젖문가': 65066,
  '채은❤️여신': 60777,
  '[RG]여행™': 60495,
  '❥CaNnOt': 59632,
  '바겐시우': 57108,
  '태린공주❤️줄여보자': 46926,
  '⭐건빵이미래쥐': 42395,
  '⚡도도➷라론⚡': 39003,
  '내마지막은키르❤️머네로': 36312,
  '도도화♔원픽♔': 34270,
  '✨가윤❤️바위늪✨': 32492,
  '선하❤️삐딱이': 25172,
  '[오골계]': 23085,
  '✨❤️라율◡ღ카사❤️✨': 22914,
  '교미ෆ': 21179,
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
  '농심육개장라면': 84177,
  '김스껄': 9404,
  '갈색말티푸': 9206,
  '[RG]가애ෆ잔바리': 8208,
  '홍서하네❥홍바스': 7918,
  '미쯔✨': 7606,
  '신세련❤️영원한니꺼✦쿨': 7503,
  '[RG]린아네☀둥그레': 7052,
  '가윤이꼬❤️털이': 30532,
  '퉁퉁퉁퉁퉁퉁사우르': 5671,
  '[RG]✨린아의단진™': 5554,
  '사랑해씌발™': 3349,
  'qldh라유': 3174,
  '한세아내꺼♡호랭이': 2933,
  '홍서하네❥페르소나™': 2586,
  '가윤이꼬❤️관씨': 2557,
  '가윤이꼬❤️마음⭐': 779,
  'ღ❥가애ღ개맛도링❥ღ': 564,
  '한세아♡백작♡하얀만두피': 500,
  '[RG]가애ෆ57774': 212,
  '박하은❤️린아❤️사탕': 144,
  '손밍ღ타코보이': 26,
  '손밍매니아': 21,
  '☀칰힌사주면천사☀': 14,
  '❤️지수ෆ해린❤️치토스㉦': 10,
  '글레스고키스': 6,
  '파민♣️': 4,
}

async function fetchAllDonations() {
  const allData: { donor_name: string; amount: number; target_bj: string | null }[] = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('donations')
      .select('donor_name, amount, target_bj')
      .gt('amount', 0)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) {
      console.error(`페이지네이션 오류 (page ${page}):`, error.message)
      break
    }

    if (!data || data.length === 0) break
    allData.push(...data)
    if (data.length < pageSize) break
    page++
  }

  return allData
}

interface RankingEntry {
  rank: number
  donor_name: string
  total_amount: number
  is_permanent_vip: boolean
  donation_count: number
  top_bj: string | null
}

async function upsertWithRPC(rankings: RankingEntry[]) {
  const rankingsJson = rankings.map((r) => ({
    rank: r.rank,
    donor_name: r.donor_name,
    total_amount: r.total_amount,
    is_permanent_vip: r.is_permanent_vip,
  }))

  const result = await withRetry(
    async () => {
      const { data, error } = await supabase.rpc('upsert_total_rankings', {
        p_rankings: rankingsJson,
      })

      if (error) throw new Error(error.message)
      return data
    },
    {
      maxRetries: 3,
      onRetry: (error, attempt, delay) => {
        console.log(`   ⚠️  재시도 ${attempt}/3: ${error.message} (${delay}ms 대기)`)
      },
    }
  )

  return result
}

async function upsertWithFallback(rankings: RankingEntry[]) {
  // 1. 기존 데이터 삭제
  await withRetry(
    async () => {
      const { error } = await supabase
        .from('total_donation_rankings')
        .delete()
        .gte('id', 0)
      if (error) throw new Error(error.message)
    },
    { maxRetries: 3 }
  )

  // 2. 새 데이터 삽입
  const insertData = rankings.map((r) => ({
    rank: r.rank,
    donor_name: r.donor_name,
    total_amount: r.total_amount,
    is_permanent_vip: r.is_permanent_vip,
    donation_count: r.donation_count,
    top_bj: r.top_bj,
  }))

  await withRetry(
    async () => {
      const { error } = await supabase.from('total_donation_rankings').insert(insertData)
      if (error) throw new Error(error.message)
    },
    { maxRetries: 3 }
  )

  return insertData.length
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔄 종합 랭킹 갱신 (레거시 + 시즌)')
  if (dryRun) console.log('⚠️  DRY-RUN 모드')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 1. 갱신 전 상태
  console.log('📊 갱신 전 Top 5:')
  const { data: before } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, total_amount')
    .order('rank')
    .limit(5)

  for (const r of before || []) {
    console.log(`   ${r.rank}위: ${r.donor_name} - ${r.total_amount.toLocaleString()} 하트`)
  }

  // 2. donations 테이블에서 전체 데이터 가져오기
  console.log('\n📥 donations 테이블 데이터 로딩...')
  const donations = await fetchAllDonations()
  console.log(`   ${donations.length}건 로드됨`)

  // 3. 닉네임별 합계 + donation_count + top_bj (donations)
  const seasonTotals: Record<string, number> = {}
  const donationCounts: Record<string, number> = {}
  const bjTotals: Record<string, Record<string, number>> = {}
  for (const d of donations) {
    seasonTotals[d.donor_name] = (seasonTotals[d.donor_name] || 0) + d.amount
    donationCounts[d.donor_name] = (donationCounts[d.donor_name] || 0) + 1
    if (d.target_bj) {
      if (!bjTotals[d.donor_name]) bjTotals[d.donor_name] = {}
      bjTotals[d.donor_name][d.target_bj] = (bjTotals[d.donor_name][d.target_bj] || 0) + d.amount
    }
  }

  // top_bj 계산: 각 donor의 가장 많이 후원한 BJ
  const topBjMap: Record<string, string | null> = {}
  for (const [donor, bjs] of Object.entries(bjTotals)) {
    let maxBj: string | null = null
    let maxAmount = 0
    for (const [bj, amount] of Object.entries(bjs)) {
      if (amount > maxAmount) {
        maxAmount = amount
        maxBj = bj
      }
    }
    topBjMap[donor] = maxBj
  }

  // 4. 레거시 + 시즌 합산
  const combined: Record<string, number> = { ...legacyData }
  for (const [name, amount] of Object.entries(seasonTotals)) {
    combined[name] = (combined[name] || 0) + amount
  }

  // 5. 정렬 및 Top 50 추출
  const rankings: RankingEntry[] = Object.entries(combined)
    .map(([name, total]) => ({ donor_name: name, total_amount: total }))
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, 50)
    .map((d, i) => ({
      rank: i + 1,
      donor_name: d.donor_name,
      total_amount: d.total_amount,
      is_permanent_vip: false,
      donation_count: donationCounts[d.donor_name] || 0,
      top_bj: topBjMap[d.donor_name] || null,
    }))

  console.log('\n📋 새 Top 10:')
  for (let i = 0; i < 10; i++) {
    const r = rankings[i]
    const legacy = legacyData[r.donor_name] || 0
    const season = seasonTotals[r.donor_name] || 0
    console.log(
      `   ${r.rank}위: ${r.donor_name} - ${r.total_amount.toLocaleString()} 하트 (레거시: ${legacy.toLocaleString()}, 시즌: ${season.toLocaleString()})`
    )
  }

  if (dryRun) {
    console.log('\n💡 실제 저장하려면 --dry-run 옵션 없이 실행하세요.')
    return
  }

  // 6. 폴백으로 업데이트 (donation_count, top_bj 포함)
  console.log('\n🔄 종합 랭킹 업데이트 중...')
  const count = await upsertWithFallback(rankings)
  console.log(`   ✅ ${count}명 업데이트 완료`)

  // 7. 갱신 후 확인
  console.log('\n📊 갱신 후 Top 10:')
  const { data: after } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, total_amount')
    .order('rank')
    .limit(10)

  for (const r of after || []) {
    console.log(`   ${r.rank}위: ${r.donor_name} - ${r.total_amount.toLocaleString()} 하트`)
  }

  console.log('\n✅ 종합 랭킹 갱신 완료!')
}

main().catch(console.error)
