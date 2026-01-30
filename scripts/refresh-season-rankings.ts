/**
 * 시즌 랭킹 갱신 스크립트
 * donations 테이블 기준으로 season_donation_rankings 재계산
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function main() {
  const seasonId = 1

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`🔄 시즌 ${seasonId} 랭킹 갱신`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 갱신 전 상태 확인
  console.log('📊 갱신 전 Top 5:')
  const { data: before } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name, total_amount')
    .eq('season_id', seasonId)
    .order('rank')
    .limit(5)

  for (const r of before || []) {
    console.log(`   ${r.rank}위: ${r.donor_name} - ${r.total_amount.toLocaleString()} 하트`)
  }

  // RPC 함수 호출하여 랭킹 갱신
  console.log('\n🔄 refresh_season_rankings() 실행 중...')

  const { error: rpcError } = await supabase.rpc('refresh_season_rankings', {
    p_season_id: seasonId
  })

  if (rpcError) {
    console.error('❌ RPC 실행 실패:', rpcError.message)

    // RPC 함수가 없는 경우 수동으로 실행
    console.log('\n⚠️  RPC 함수가 없거나 실패. 수동으로 갱신합니다...')

    // 1. 기존 데이터 삭제
    const { error: deleteError } = await supabase
      .from('season_donation_rankings')
      .delete()
      .eq('season_id', seasonId)

    if (deleteError) {
      console.error('❌ 삭제 실패:', deleteError.message)
      return
    }

    // 2. donations에서 집계하여 새 데이터 삽입
    // 전체 donations 가져오기
    const allDonations: { donor_name: string; amount: number }[] = []
    let page = 0
    const pageSize = 1000

    while (true) {
      const { data } = await supabase
        .from('donations')
        .select('donor_name, amount')
        .eq('season_id', seasonId)
        .gt('amount', 0)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (!data || data.length === 0) break
      allDonations.push(...data)
      if (data.length < pageSize) break
      page++
    }

    // 닉네임별 집계
    const donorTotals: Record<string, { total: number; count: number }> = {}
    for (const d of allDonations) {
      if (!donorTotals[d.donor_name]) {
        donorTotals[d.donor_name] = { total: 0, count: 0 }
      }
      donorTotals[d.donor_name].total += d.amount
      donorTotals[d.donor_name].count++
    }

    // 정렬 및 상위 50명 추출
    const rankings = Object.entries(donorTotals)
      .map(([name, data]) => ({
        donor_name: name,
        total_amount: data.total,
        donation_count: data.count
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 50)

    // 최대값 (게이지 계산용)
    const maxAmount = rankings[0]?.total_amount || 1

    // 데이터 삽입
    const insertData = rankings.map((d, i) => ({
      season_id: seasonId,
      rank: i + 1,
      donor_name: d.donor_name,
      total_amount: d.total_amount,
      donation_count: d.donation_count,
      unit: 'excel' as const,
      updated_at: new Date().toISOString()
    }))

    const { error: insertError } = await supabase
      .from('season_donation_rankings')
      .insert(insertData)

    if (insertError) {
      console.error('❌ 삽입 실패:', insertError.message)
      return
    }

    console.log(`   ✅ 수동 갱신 완료: ${insertData.length}명`)
  } else {
    console.log('   ✅ RPC 실행 성공!')
  }

  // 갱신 후 상태 확인
  console.log('\n📊 갱신 후 Top 10:')
  const { data: after } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name, total_amount, donation_count')
    .eq('season_id', seasonId)
    .order('rank')
    .limit(10)

  for (const r of after || []) {
    console.log(`   ${r.rank}위: ${r.donor_name} - ${r.total_amount.toLocaleString()} 하트 (${r.donation_count}건)`)
  }

  // 총합 확인
  const { data: allRankings } = await supabase
    .from('season_donation_rankings')
    .select('total_amount')
    .eq('season_id', seasonId)

  const total = (allRankings || []).reduce((sum, r) => sum + r.total_amount, 0)
  console.log(`\n📊 총합: ${total.toLocaleString()} 하트`)

  console.log('\n✅ 시즌 랭킹 갱신 완료!')
}

main().catch(console.error)
