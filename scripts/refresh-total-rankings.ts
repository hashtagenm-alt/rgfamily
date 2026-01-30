/**
 * 종합 랭킹 갱신 스크립트
 * 레거시 데이터 + 시즌1 데이터를 합산하여 total_donation_rankings 갱신
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// 레거시 데이터 (시즌1 이전 누적) - update-total-rankings.ts에서 가져옴
const legacyData: Record<string, number> = {
  '미키™': 322030,
  '손밍매니아': 0,
  '❥CaNnOt': 59632,
  '쩔어서짜다': 0,
  '[RG]미드굿♣️가애': 73532,
  '[RG]✨린아의발굴™': 23711,
  '한세아내꺼♡호랭이': 0,
  '린아사단✨탱커': 18068,
  '까부는넌내꺼야119': 0,
  '농심육개장라면': 84177,
  'Rearcar': 0,
  '❥교미': 4499,
  '사랑해씌발™': 0,
  '[A]젖문가': 0,
  '청아❤️머리크기빵빵이': 0,
  '한세아♡백작♡하얀만두피': 50023,
  '희영네개유오': 50000,
  '시라☆구구단☆시우': 48720,
  '태린공주❤️줄여보자': 46926,
  '⭐건빵이미래쥐': 42395,
  '가윤이꼬❤️털이': 36971,
  '❤️지수ෆ해린❤️치토스㉦': 36488,
  '내마지막은키르❤️머네로': 36312,
  '내가바로원픽': 34270,
  '✨바위늪✨': 32492,
  'FA진스': 30533,
  '홍서하네홍금보': 29150,
  'qldh라유': 28844,
  '이쁘면하트100개': 25189,
  '고다혜보다ღ국물': 21311,
  '언제나♬': 20873,
  '한은비ღ안줘ღ': 20727,
  '☾코코에르메스': 20070,
  '양재동ღ젖문가⁀➷': 20009,
  '[RG]린아네☀둥그레': 18433,
  '미쯔✨': 18279,
  '개호구⭐즈하⭐광대': 18015,
  '퉁퉁퉁퉁퉁퉁사우르': 17266,
  '홍서하네❥페르소나™': 15950,
  '앵겨라잉': 15588,
  '태린공주❤️마비™': 15240,
  '[로진]앙보름_엔터대표': 15209,
  '[SD]티모': 14709,
}

async function fetchAllDonations() {
  const allData: { donor_name: string; amount: number }[] = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data } = await supabase
      .from('donations')
      .select('donor_name, amount')
      .gt('amount', 0)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (!data || data.length === 0) break
    allData.push(...data)
    if (data.length < pageSize) break
    page++
  }

  return allData
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔄 종합 랭킹 갱신 (레거시 + 시즌1)')
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

  // 3. 닉네임별 합계 (donations)
  const seasonTotals: Record<string, number> = {}
  for (const d of donations) {
    seasonTotals[d.donor_name] = (seasonTotals[d.donor_name] || 0) + d.amount
  }

  // 4. 레거시 + 시즌 합산
  const combined: Record<string, number> = { ...legacyData }
  for (const [name, amount] of Object.entries(seasonTotals)) {
    combined[name] = (combined[name] || 0) + amount
  }

  // 5. 정렬 및 Top 50 추출
  const rankings = Object.entries(combined)
    .map(([name, total]) => ({ donor_name: name, total_amount: total }))
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, 50)
    .map((d, i) => ({ ...d, rank: i + 1 }))

  console.log('\n📋 새 Top 10:')
  for (let i = 0; i < 10; i++) {
    const r = rankings[i]
    const legacy = legacyData[r.donor_name] || 0
    const season = seasonTotals[r.donor_name] || 0
    console.log(`   ${r.rank}위: ${r.donor_name} - ${r.total_amount.toLocaleString()} 하트 (레거시: ${legacy.toLocaleString()}, 시즌: ${season.toLocaleString()})`)
  }

  // 6. 기존 데이터 삭제
  console.log('\n🗑️  기존 종합 랭킹 삭제...')
  const { error: deleteError } = await supabase
    .from('total_donation_rankings')
    .delete()
    .gte('id', 0)

  if (deleteError) {
    console.error('❌ 삭제 실패:', deleteError.message)
    return
  }

  // 7. 새 데이터 삽입
  console.log('📊 새 종합 랭킹 삽입...')
  const insertData = rankings.map(r => ({
    rank: r.rank,
    donor_name: r.donor_name,
    total_amount: r.total_amount,
    is_permanent_vip: false
  }))

  const { error: insertError } = await supabase
    .from('total_donation_rankings')
    .insert(insertData)

  if (insertError) {
    console.error('❌ 삽입 실패:', insertError.message)
    return
  }

  console.log(`   ✅ ${insertData.length}명 삽입 완료`)

  // 8. 갱신 후 확인
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
