/**
 * 종합 후원 랭킹 업데이트 스크립트
 *
 * 프리시즌 누적 데이터 + donations 테이블의 시즌 데이터를 합산하여
 * total_donation_rankings 테이블을 업데이트합니다.
 *
 * 사용법:
 *   npx tsx scripts/update-total-rankings.ts [--dry-run]
 *
 * ⚠️ 닉네임 매핑:
 *   프리시즌 닉네임이 시즌에서 변경된 경우 nameMap에 추가해야 합니다.
 */

import { getServiceClient } from './lib/supabase'
import { withRetry } from './lib/utils'

const supabase = getServiceClient()

// 프리시즌 누적 데이터 (시즌1 ep1-2 포함)
// ⚠️ 이 데이터는 ep1-2 후원도 포함되어 있으므로, 순수 프리시즌 = total_amount - ep1-2 donations
const preSeasonWithEp12 = [
  { donor_name: '미키™', total_amount: 777571 },
  { donor_name: '손밍매니아', total_amount: 274769 },
  { donor_name: '❥CaNnOt', total_amount: 236386 },
  { donor_name: '쩔어서짜다', total_amount: 185465 },
  { donor_name: '[RG]미드굿♣️가애', total_amount: 175856 },
  { donor_name: '[RG]✨린아의발굴™', total_amount: 135436 },
  { donor_name: '한세아내꺼♡호랭이', total_amount: 133124 },
  { donor_name: '린아사단✨탱커', total_amount: 100834 },
  { donor_name: '까부는넌내꺼야119', total_amount: 90847 },
  { donor_name: '농심육개장라면', total_amount: 84177 },
  { donor_name: '☀칰힌사주면천사☀', total_amount: 70600 },
  { donor_name: 'Rearcar', total_amount: 67619 },
  { donor_name: '❥교미', total_amount: 66166 },
  { donor_name: '사랑해씌발™', total_amount: 60838 },
  { donor_name: '[A]젖문가', total_amount: 60566 },
  { donor_name: '청아❤️머리크기빵빵이', total_amount: 57286 },
  { donor_name: '조패러갈꽈', total_amount: 57154 },
  { donor_name: '[RG]린아✨여행™', total_amount: 56157 },
  { donor_name: '한세아♡백작♡하얀만두피', total_amount: 50023 },
  { donor_name: '희영네개유오', total_amount: 50000 },
  { donor_name: '시라☆구구단☆시우', total_amount: 48720 },
  { donor_name: '태린공주❤️줄여보자', total_amount: 46926 },
  { donor_name: '김스껄', total_amount: 44585 },
  { donor_name: '⭐건빵이미래쥐', total_amount: 42395 },
  { donor_name: '가윤이꼬❤️함주라', total_amount: 41379 },
  { donor_name: '가윤이꼬❤️털이', total_amount: 36971 },
  { donor_name: '❤️지수ෆ해린❤️치토스㉦', total_amount: 36488 },
  { donor_name: '내마지막은키르❤️머네로', total_amount: 36312 },
  { donor_name: '내가바로원픽', total_amount: 34270 },
  { donor_name: '✨바위늪✨', total_amount: 32492 },
  { donor_name: 'FA진스', total_amount: 30533 },
  { donor_name: '홍서하네홍금보', total_amount: 29150 },
  { donor_name: 'qldh라유', total_amount: 28844 },
  { donor_name: '이쁘면하트100개', total_amount: 25189 },
  { donor_name: '고다혜보다ღ국물', total_amount: 21311 },
  { donor_name: '언제나♬', total_amount: 20873 },
  { donor_name: '한은비ღ안줘ღ', total_amount: 20727 },
  { donor_name: '☾코코에르메스', total_amount: 20070 },
  { donor_name: '양재동ღ젖문가⁀➷', total_amount: 20009 },
  { donor_name: '[RG]린아네☀둥그레', total_amount: 18433 },
  { donor_name: '미쯔✨', total_amount: 18279 },
  { donor_name: '갈색말티푸', total_amount: 18083 },
  { donor_name: '개호구⭐즈하⭐광대', total_amount: 18015 },
  { donor_name: '퉁퉁퉁퉁퉁퉁사우르', total_amount: 17266 },
  { donor_name: '57774', total_amount: 16533 },
  { donor_name: '홍서하네❥페르소나™', total_amount: 15950 },
  { donor_name: '앵겨라잉', total_amount: 15588 },
  { donor_name: '태린공주❤️마비™', total_amount: 15240 },
  { donor_name: '[로진]앙보름_엔터대표', total_amount: 15209 },
  { donor_name: '[SD]티모', total_amount: 14709 },
]

// 프리시즌 닉네임 → 시즌 닉네임 매핑 (닉 변경 시 여기에 추가)
const nameMap: Record<string, string> = {
  '[A]젖문가': '[J]젖문가',
  'FA진스': 'FA진수',
  '[RG]린아✨여행™': '[RG]린아사단✨여행ᴮᴹ',
  '양재동ღ젖문가⁀➷': '[J]젖문가', // 젖문가 통합
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  console.log('🚀 종합 후원 랭킹 업데이트 시작\n')
  if (dryRun) console.log('⚠️  DRY-RUN 모드\n')

  // 1. ep1-2 donations 가져오기 (프리시즌 분리용)
  const ep1Id = 12, ep2Id = 13
  const ep12Donations: { donor_name: string; amount: number }[] = []
  let page = 0

  while (true) {
    const { data } = await supabase
      .from('donations')
      .select('donor_name, amount')
      .in('episode_id', [ep1Id, ep2Id])
      .gt('amount', 0)
      .range(page * 1000, (page + 1) * 1000 - 1)
    if (!data || data.length === 0) break
    ep12Donations.push(...data)
    if (data.length < 1000) break
    page++
  }

  const ep12Map = new Map<string, number>()
  for (const d of ep12Donations) {
    ep12Map.set(d.donor_name, (ep12Map.get(d.donor_name) || 0) + d.amount)
  }
  console.log(`📊 ep1-2 donations: ${ep12Donations.length}건`)

  // 2. 순수 프리시즌 금액 계산 (하드코딩 - ep1-2)
  const preSeasonMap = new Map<string, number>()
  for (const item of preSeasonWithEp12) {
    const seasonName = nameMap[item.donor_name] || item.donor_name
    const ep12Amount = ep12Map.get(seasonName) || ep12Map.get(item.donor_name) || 0
    const preSeason = Math.max(0, item.total_amount - ep12Amount)

    if (preSeason > 0) {
      const existing = preSeasonMap.get(seasonName) || 0
      preSeasonMap.set(seasonName, existing + preSeason)
    }
    if (ep12Amount === 0 && item.total_amount > 0) {
      preSeasonMap.set(item.donor_name, item.total_amount)
    }
  }
  console.log(`📊 프리시즌 후원자: ${preSeasonMap.size}명`)

  // 3. 전체 시즌 donations 가져오기
  const { data: episodes } = await supabase
    .from('episodes')
    .select('id')
    .eq('season_id', 1)

  const epIds = episodes?.map((e) => e.id) || []

  const allDonations: { donor_name: string; amount: number; target_bj: string | null }[] = []
  page = 0
  while (true) {
    const { data } = await supabase
      .from('donations')
      .select('donor_name, amount, target_bj')
      .in('episode_id', epIds)
      .gt('amount', 0)
      .range(page * 1000, (page + 1) * 1000 - 1)
    if (!data || data.length === 0) break
    allDonations.push(...data)
    if (data.length < 1000) break
    page++
  }
  console.log(`📊 시즌 donations: ${allDonations.length}건`)

  // 시즌 후원자별 합계 + top_bj
  const seasonMap = new Map<string, { amount: number; count: number }>()
  const bjTotals: Record<string, Record<string, number>> = {}

  for (const d of allDonations) {
    const existing = seasonMap.get(d.donor_name)
    if (existing) { existing.amount += d.amount; existing.count += 1 }
    else { seasonMap.set(d.donor_name, { amount: d.amount, count: 1 }) }

    if (d.target_bj) {
      if (!bjTotals[d.donor_name]) bjTotals[d.donor_name] = {}
      bjTotals[d.donor_name][d.target_bj] = (bjTotals[d.donor_name][d.target_bj] || 0) + d.amount
    }
  }

  // 4. 종합 = 프리시즌 + 시즌
  const totalMap = new Map<string, { amount: number; count: number }>()

  for (const [name, amount] of preSeasonMap) {
    totalMap.set(name, { amount, count: 0 })
  }

  for (const [name, data] of seasonMap) {
    const existing = totalMap.get(name)
    if (existing) {
      existing.amount += data.amount
      existing.count += data.count
    } else {
      totalMap.set(name, { amount: data.amount, count: data.count })
    }
  }

  const sorted = [...totalMap.entries()]
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.amount - a.amount)

  const top50 = sorted.slice(0, 50)

  console.log('\n📋 Top 15:')
  top50.slice(0, 15).forEach((d, i) => {
    const pre = preSeasonMap.get(d.name) || 0
    const season = seasonMap.get(d.name)?.amount || 0
    console.log(`   ${i + 1}위. ${d.name}: ${d.amount.toLocaleString()} (프리:${pre.toLocaleString()} + 시즌:${season.toLocaleString()})`)
  })

  if (dryRun) {
    console.log('\n💡 실제 저장하려면 --dry-run 옵션 없이 실행하세요.')
    return
  }

  // 5. DB 업데이트
  console.log('\n📊 종합 랭킹 업데이트 중...')

  await withRetry(async () => {
    const { error } = await supabase.from('total_donation_rankings').delete().gte('rank', 1)
    if (error) throw new Error(error.message)
  }, { maxRetries: 3 })

  const insertData = top50.map((d, idx) => {
    let topBj: string | null = null
    if (bjTotals[d.name]) {
      let maxAmt = 0
      for (const [bj, amt] of Object.entries(bjTotals[d.name])) {
        if (amt > maxAmt) { maxAmt = amt; topBj = bj }
      }
    }
    return {
      rank: idx + 1,
      donor_name: d.name,
      total_amount: d.amount,
      donation_count: d.count,
      top_bj: topBj,
      is_permanent_vip: false,
    }
  })

  await withRetry(async () => {
    const { error } = await supabase.from('total_donation_rankings').insert(insertData)
    if (error) throw new Error(error.message)
  }, { maxRetries: 3 })

  console.log(`✅ 종합 랭킹 Top ${top50.length} 업데이트 완료!`)

  // 결과 확인
  const { data: result } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, total_amount, donation_count, top_bj')
    .order('rank')
    .limit(10)

  console.log('\n📊 저장 결과 Top 10:')
  result?.forEach((r) => {
    console.log(`   ${r.rank}위. ${r.donor_name}: ${r.total_amount.toLocaleString()}하트 (${r.donation_count}회, 최애: ${r.top_bj || '-'})`)
  })
}

main().catch((err) => {
  console.error('❌ 오류:', err)
  process.exit(1)
})
