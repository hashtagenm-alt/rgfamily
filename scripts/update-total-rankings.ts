/**
 * 종합 후원 랭킹 업데이트 스크립트
 *
 * 시즌1 이전 누적 + 시즌1 포함 종합 랭킹 데이터를 업데이트합니다.
 * RPC 함수를 사용하여 트랜잭션 안전성을 보장합니다.
 *
 * 사용법:
 *   npx tsx scripts/update-total-rankings.ts [--dry-run]
 */

import { getServiceClient } from './lib/supabase'
import { withRetry } from './lib/utils'

const supabase = getServiceClient()

// 종합 랭킹 데이터 (시즌1 이전 누적 + 시즌1 2회차까지)
const totalRankingData = [
  { rank: 1, donor_name: '미키™', total_amount: 777571, is_permanent_vip: false },
  { rank: 2, donor_name: '손밍매니아', total_amount: 274769, is_permanent_vip: false },
  { rank: 3, donor_name: '❥CaNnOt', total_amount: 236386, is_permanent_vip: false },
  { rank: 4, donor_name: '쩔어서짜다', total_amount: 185465, is_permanent_vip: false },
  { rank: 5, donor_name: '[RG]미드굿♣️가애', total_amount: 175856, is_permanent_vip: false },
  { rank: 6, donor_name: '[RG]✨린아의발굴™', total_amount: 135436, is_permanent_vip: false },
  { rank: 7, donor_name: '한세아내꺼♡호랭이', total_amount: 133124, is_permanent_vip: false },
  { rank: 8, donor_name: '린아사단✨탱커', total_amount: 100834, is_permanent_vip: false },
  { rank: 9, donor_name: '까부는넌내꺼야119', total_amount: 90847, is_permanent_vip: false },
  { rank: 10, donor_name: '농심육개장라면', total_amount: 84177, is_permanent_vip: false },
  { rank: 11, donor_name: '☀칰힌사주면천사☀', total_amount: 70600, is_permanent_vip: false },
  { rank: 12, donor_name: 'Rearcar', total_amount: 67619, is_permanent_vip: false },
  { rank: 13, donor_name: '❥교미', total_amount: 66166, is_permanent_vip: false },
  { rank: 14, donor_name: '사랑해씌발™', total_amount: 60838, is_permanent_vip: false },
  { rank: 15, donor_name: '[A]젖문가', total_amount: 60566, is_permanent_vip: false },
  { rank: 16, donor_name: '청아❤️머리크기빵빵이', total_amount: 57286, is_permanent_vip: false },
  { rank: 17, donor_name: '조패러갈꽈', total_amount: 57154, is_permanent_vip: false },
  { rank: 18, donor_name: '[RG]린아✨여행™', total_amount: 56157, is_permanent_vip: false },
  { rank: 19, donor_name: '한세아♡백작♡하얀만두피', total_amount: 50023, is_permanent_vip: false },
  { rank: 20, donor_name: '희영네개유오', total_amount: 50000, is_permanent_vip: false },
  { rank: 21, donor_name: '시라☆구구단☆시우', total_amount: 48720, is_permanent_vip: false },
  { rank: 22, donor_name: '태린공주❤️줄여보자', total_amount: 46926, is_permanent_vip: false },
  { rank: 23, donor_name: '김스껄', total_amount: 44585, is_permanent_vip: false },
  { rank: 24, donor_name: '⭐건빵이미래쥐', total_amount: 42395, is_permanent_vip: false },
  { rank: 25, donor_name: '가윤이꼬❤️함주라', total_amount: 41379, is_permanent_vip: false },
  { rank: 26, donor_name: '가윤이꼬❤️털이', total_amount: 36971, is_permanent_vip: false },
  { rank: 27, donor_name: '❤️지수ෆ해린❤️치토스㉦', total_amount: 36488, is_permanent_vip: false },
  { rank: 28, donor_name: '내마지막은키르❤️머네로', total_amount: 36312, is_permanent_vip: false },
  { rank: 29, donor_name: '내가바로원픽', total_amount: 34270, is_permanent_vip: false },
  { rank: 30, donor_name: '✨바위늪✨', total_amount: 32492, is_permanent_vip: false },
  { rank: 31, donor_name: 'FA진스', total_amount: 30533, is_permanent_vip: false },
  { rank: 32, donor_name: '홍서하네홍금보', total_amount: 29150, is_permanent_vip: false },
  { rank: 33, donor_name: 'qldh라유', total_amount: 28844, is_permanent_vip: false },
  { rank: 34, donor_name: '이쁘면하트100개', total_amount: 25189, is_permanent_vip: false },
  { rank: 35, donor_name: '고다혜보다ღ국물', total_amount: 21311, is_permanent_vip: false },
  { rank: 36, donor_name: '언제나♬', total_amount: 20873, is_permanent_vip: false },
  { rank: 37, donor_name: '한은비ღ안줘ღ', total_amount: 20727, is_permanent_vip: false },
  { rank: 38, donor_name: '☾코코에르메스', total_amount: 20070, is_permanent_vip: false },
  { rank: 39, donor_name: '양재동ღ젖문가⁀➷', total_amount: 20009, is_permanent_vip: false },
  { rank: 40, donor_name: '[RG]린아네☀둥그레', total_amount: 18433, is_permanent_vip: false },
  { rank: 41, donor_name: '미쯔✨', total_amount: 18279, is_permanent_vip: false },
  { rank: 42, donor_name: '갈색말티푸', total_amount: 18083, is_permanent_vip: false },
  { rank: 43, donor_name: '개호구⭐즈하⭐광대', total_amount: 18015, is_permanent_vip: false },
  { rank: 44, donor_name: '퉁퉁퉁퉁퉁퉁사우르', total_amount: 17266, is_permanent_vip: false },
  { rank: 45, donor_name: '57774', total_amount: 16533, is_permanent_vip: false },
  { rank: 46, donor_name: '홍서하네❥페르소나™', total_amount: 15950, is_permanent_vip: false },
  { rank: 47, donor_name: '앵겨라잉', total_amount: 15588, is_permanent_vip: false },
  { rank: 48, donor_name: '태린공주❤️마비™', total_amount: 15240, is_permanent_vip: false },
  { rank: 49, donor_name: '[로진]앙보름_엔터대표', total_amount: 15209, is_permanent_vip: false },
  { rank: 50, donor_name: '[SD]티모', total_amount: 14709, is_permanent_vip: false },
]

async function upsertWithRPC(
  rankings: { rank: number; donor_name: string; total_amount: number; is_permanent_vip: boolean }[]
) {
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

async function upsertWithFallback(
  rankings: { rank: number; donor_name: string; total_amount: number; is_permanent_vip: boolean }[]
) {
  // 1. 기존 데이터 삭제
  console.log('🗑️  기존 종합 랭킹 데이터 삭제...')
  await withRetry(
    async () => {
      const { error } = await supabase
        .from('total_donation_rankings')
        .delete()
        .gte('rank', 1)
      if (error) throw new Error(error.message)
    },
    { maxRetries: 3 }
  )
  console.log('   ✅ 삭제 완료')

  // 2. 새 데이터 삽입
  console.log('\n📊 종합 랭킹 데이터 삽입...')
  const insertData = rankings.map((item) => ({
    ...item,
    updated_at: new Date().toISOString(),
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

  console.log('🚀 종합 후원 랭킹 업데이트 시작\n')
  if (dryRun) {
    console.log('⚠️  DRY-RUN 모드\n')
  }

  console.log('📋 업데이트할 Top 10:')
  for (const item of totalRankingData.slice(0, 10)) {
    const vip = item.is_permanent_vip ? '👑' : ''
    console.log(`   ${item.rank}위: ${item.donor_name} - ${item.total_amount.toLocaleString()}하트 ${vip}`)
  }

  if (dryRun) {
    console.log('\n💡 실제 저장하려면 --dry-run 옵션 없이 실행하세요.')
    return
  }

  // RPC로 업데이트 시도
  console.log('\n🔄 종합 랭킹 업데이트 중...')
  try {
    const result = await upsertWithRPC(totalRankingData)
    console.log('   ✅ RPC 실행 성공!')
    if (result && result[0]) {
      console.log(`   📊 삭제: ${result[0].deleted_count}건, 삽입: ${result[0].inserted_count}건`)
    }
  } catch (rpcError) {
    console.log(`   ⚠️  RPC 실패, 폴백 실행: ${rpcError instanceof Error ? rpcError.message : rpcError}`)
    const count = await upsertWithFallback(totalRankingData)
    console.log(`   ✅ ${count}명 종합 랭킹 업데이트 완료`)
  }

  // 4. donation_count, top_bj 백필 (donations 테이블에서)
  console.log('\n🔄 donation_count, top_bj 백필 중...')
  const allDonations: { donor_name: string; amount: number; target_bj: string | null }[] = []
  let page = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase
      .from('donations')
      .select('donor_name, amount, target_bj')
      .gt('amount', 0)
      .range(page * pageSize, (page + 1) * pageSize - 1)
    if (error || !data || data.length === 0) break
    allDonations.push(...data)
    if (data.length < pageSize) break
    page++
  }

  const donorStats: Record<string, { count: number; bjTotals: Record<string, number> }> = {}
  for (const d of allDonations) {
    if (!donorStats[d.donor_name]) donorStats[d.donor_name] = { count: 0, bjTotals: {} }
    donorStats[d.donor_name].count++
    if (d.target_bj) {
      donorStats[d.donor_name].bjTotals[d.target_bj] =
        (donorStats[d.donor_name].bjTotals[d.target_bj] || 0) + d.amount
    }
  }

  let backfillCount = 0
  for (const item of totalRankingData) {
    const stats = donorStats[item.donor_name]
    const donationCount = stats?.count || 0
    let topBj: string | null = null
    if (stats) {
      let maxAmt = 0
      for (const [bj, amt] of Object.entries(stats.bjTotals)) {
        if (amt > maxAmt) { maxAmt = amt; topBj = bj }
      }
    }
    const { error } = await supabase
      .from('total_donation_rankings')
      .update({ donation_count: donationCount, top_bj: topBj })
      .eq('donor_name', item.donor_name)
    if (!error) backfillCount++
  }
  console.log(`   ✅ ${backfillCount}명 donation_count/top_bj 백필 완료`)

  // 결과 확인
  console.log('\n📋 업데이트 결과 Top 10:')
  const { data: top10 } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, total_amount, is_permanent_vip, donation_count, top_bj')
    .order('rank', { ascending: true })
    .limit(10)

  top10?.forEach((item) => {
    const vip = item.is_permanent_vip ? '👑' : ''
    console.log(`   ${item.rank}위: ${item.donor_name} - ${item.total_amount.toLocaleString()}하트 ${vip} (${item.donation_count}회, 최애: ${item.top_bj || '-'})`)
  })

  console.log('\n✅ 종합 후원 랭킹 업데이트 완료!')
}

main().catch((err) => {
  console.error('❌ 오류:', err)
  process.exit(1)
})
