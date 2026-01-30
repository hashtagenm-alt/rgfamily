/**
 * 랭킹 데이터 상태 확인 스크립트
 * 사용법: npx tsx scripts/check-ranking-status.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function check() {
  // 에피소드별 후원 건수 확인
  const { data: episodes } = await supabase
    .from('episodes')
    .select('id, episode_number, title')
    .eq('season_id', 1)
    .order('episode_number')

  console.log('📊 에피소드별 후원 데이터 현황 (시즌 1)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  for (const ep of episodes || []) {
    const { count } = await supabase
      .from('donations')
      .select('*', { count: 'exact', head: true })
      .eq('episode_id', ep.id)

    const status = count && count > 0 ? '✅' : '❌'
    console.log(`${status} ${ep.episode_number}화 (id:${ep.id}): ${count || 0}건 - ${ep.title || '제목없음'}`)
  }

  // 시즌 랭킹 최종 업데이트 시간
  const { data: rankingUpdate } = await supabase
    .from('season_donation_rankings')
    .select('updated_at')
    .eq('season_id', 1)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  console.log('\n📅 시즌 랭킹 마지막 업데이트:', rankingUpdate?.updated_at || 'N/A')

  // donations 테이블에서 실제 집계 (현재 상태)
  const { data: actualRanking } = await supabase
    .from('donations')
    .select('donor_name, amount')
    .eq('season_id', 1)

  // 닉네임별 합계 계산
  const totals: Record<string, number> = {}
  for (const d of actualRanking || []) {
    totals[d.donor_name] = (totals[d.donor_name] || 0) + d.amount
  }

  const sorted = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  console.log('\n📈 donations 테이블 기준 실제 Top 10 (현재):')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  sorted.forEach(([name, amount], i) => {
    console.log(`${i+1}위: ${name} - ${amount.toLocaleString()} 하트`)
  })

  // 시즌 랭킹 테이블과 비교
  const { data: storedRanking } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name, total_amount')
    .eq('season_id', 1)
    .order('rank')
    .limit(10)

  console.log('\n📊 season_donation_rankings 테이블 Top 10 (저장된 값):')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  for (const r of storedRanking || []) {
    console.log(`${r.rank}위: ${r.donor_name} - ${r.total_amount.toLocaleString()} 하트`)
  }

  // 차이점 분석
  console.log('\n⚠️  차이점 분석:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const actualTop1 = sorted[0]
  const storedTop1 = storedRanking?.[0]

  if (actualTop1 && storedTop1) {
    const diff = actualTop1[1] - storedTop1.total_amount
    if (diff > 0) {
      console.log(`1위 ${actualTop1[0]}: 실제 ${actualTop1[1].toLocaleString()} vs 저장 ${storedTop1.total_amount.toLocaleString()} (차이: +${diff.toLocaleString()})`)
      console.log('\n🔴 시즌 랭킹 업데이트가 필요합니다!')
      console.log('   실행: npx tsx scripts/update-season-rankings.ts')
    } else if (diff === 0) {
      console.log('✅ 시즌 랭킹이 최신 상태입니다.')
    }
  }
}

check().catch(console.error)
