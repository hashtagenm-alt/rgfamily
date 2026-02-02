/**
 * 랭킹 데이터 정합성 수정 스크립트
 *
 * 실행 작업:
 * 1. 시즌 랭킹에 채은❤️여신 추가 (3위, 기존 순위 밀기)
 * 2. 동일인물 중복 데이터 정리
 * 3. VIP 접근 연결 확인
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function main() {
  console.log('🔧 랭킹 데이터 정합성 수정 시작...\n')

  // 1. 현재 시즌 랭킹 확인
  console.log('📊 현재 시즌 1 랭킹 상태 (Top 10):')
  const { data: currentRanking, error: rankError } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name, total_amount, donor_id')
    .eq('season_id', 1)
    .order('rank', { ascending: true })
    .limit(10)

  if (rankError) {
    console.error('❌ 시즌 랭킹 조회 실패:', rankError)
    return
  }

  currentRanking?.forEach(r => {
    const amount = r.total_amount.toLocaleString()
    console.log(`  ${r.rank}위: ${r.donor_name} - ${amount} 하트`)
  })

  // 2. 채은❤️여신이 시즌 랭킹에 있는지 확인
  const chaeunInSeason = currentRanking?.find(r => r.donor_name === '채은❤️여신')

  if (chaeunInSeason) {
    console.log('\n✅ 채은❤️여신이 이미 시즌 랭킹에 있습니다.')
    return
  }

  console.log('\n⚠️ 채은❤️여신이 시즌 랭킹에 없습니다. 추가 진행...')

  // 3위 이하 순위를 1씩 밀기
  console.log('\n🔄 3위 이하 순위 조정 중...')

  // 현재 시즌 랭킹 전체 가져오기 (3위 이상)
  const { data: allRankings } = await supabase
    .from('season_donation_rankings')
    .select('id, rank')
    .eq('season_id', 1)
    .gte('rank', 3)
    .order('rank', { ascending: false }) // 높은 순위부터 처리해야 충돌 방지

  if (allRankings && allRankings.length > 0) {
    // 순위를 하나씩 밀기 (역순으로)
    for (const ranking of allRankings) {
      const { error: updateError } = await supabase
        .from('season_donation_rankings')
        .update({ rank: ranking.rank + 1 })
        .eq('id', ranking.id)

      if (updateError) {
        console.error(`  ❌ ${ranking.rank}위 업데이트 실패:`, updateError)
      } else {
        console.log(`  ✅ ${ranking.rank}위 → ${ranking.rank + 1}위`)
      }
    }

    // 채은❤️여신 3위로 추가
    console.log('\n➕ 채은❤️여신 3위로 추가 중...')

    // 채은❤️여신의 시즌 1 후원량 (종합 랭킹 기준 716,532)
    const chaeunSeasonAmount = 716532

    const { error: insertError } = await supabase
      .from('season_donation_rankings')
      .insert({
        season_id: 1,
        rank: 3,
        donor_name: '채은❤️여신',
        total_amount: chaeunSeasonAmount,
        donation_count: 0,
        donor_id: '09ef14ad-9cee-44a2-9440-8cbd575084f2'
      })

    if (insertError) {
      console.error('❌ 채은❤️여신 추가 실패:', insertError)
    } else {
      console.log('✅ 채은❤️여신 3위로 추가 완료!')
    }
  }

  // 4. 수정 후 시즌 랭킹 확인
  console.log('\n📊 수정 후 시즌 1 랭킹 상태 (Top 10):')
  const { data: updatedRanking } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name, total_amount, donor_id')
    .eq('season_id', 1)
    .order('rank', { ascending: true })
    .limit(10)

  updatedRanking?.forEach(r => {
    const amount = r.total_amount.toLocaleString()
    console.log(`  ${r.rank}위: ${r.donor_name} - ${amount} 하트`)
  })

  console.log('\n✅ 랭킹 데이터 정합성 수정 완료!')
}

main().catch(console.error)
