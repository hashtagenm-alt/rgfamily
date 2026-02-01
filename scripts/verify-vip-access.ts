/**
 * VIP 페이지 접근 검증 스크립트
 *
 * 확인 사항:
 * 1. 종합 랭킹의 donor_id가 vip_rewards와 연결되는지
 * 2. 랭킹 클릭 시 VIP 페이지로 이동 가능한지
 * 3. 프로필 정보가 일치하는지
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
  console.log('🔍 VIP 페이지 접근 검증 시작...\n')

  // 1. 종합 랭킹 Top 20 조회
  console.log('📊 종합 랭킹 Top 20:')
  const { data: totalRankings, error: rankError } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, donor_id')
    .order('rank', { ascending: true })
    .limit(20)

  if (rankError) {
    console.error('❌ 종합 랭킹 조회 실패:', rankError)
    return
  }

  // 2. VIP rewards 조회
  const { data: vipRewards, error: vipError } = await supabase
    .from('vip_rewards')
    .select('profile_id, rank, season_id')

  if (vipError) {
    console.error('❌ VIP rewards 조회 실패:', vipError)
    return
  }

  // 3. 프로필 조회
  const donorIds = totalRankings
    ?.map(r => r.donor_id)
    .filter(id => id !== null) as string[]

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, role')
    .in('id', donorIds)

  // 4. 매칭 검증
  console.log('\n┌──────┬────────────────────────┬─────────────┬──────────┬──────────┐')
  console.log('│ 순위 │ 닉네임                  │ donor_id    │ VIP연결  │ 프로필   │')
  console.log('├──────┼────────────────────────┼─────────────┼──────────┼──────────┤')

  let issueCount = 0

  for (const ranking of totalRankings || []) {
    const hasVipReward = vipRewards?.some(v => v.profile_id === ranking.donor_id)
    const hasProfile = profiles?.some(p => p.id === ranking.donor_id)
    const hasDonorId = !!ranking.donor_id

    const vipStatus = hasVipReward ? '✅' : (hasDonorId ? '⚠️' : '❌')
    const profileStatus = hasProfile ? '✅' : (hasDonorId ? '⚠️' : '❌')
    const donorIdShort = ranking.donor_id ? ranking.donor_id.substring(0, 8) + '...' : 'NULL'

    // 20자로 닉네임 패딩
    const namePadded = ranking.donor_name.padEnd(20)

    console.log(`│ ${String(ranking.rank).padStart(4)} │ ${namePadded} │ ${donorIdShort.padEnd(11)} │ ${vipStatus.padEnd(8)} │ ${profileStatus.padEnd(8)} │`)

    if (!hasDonorId || !hasProfile) {
      issueCount++
    }
  }

  console.log('└──────┴────────────────────────┴─────────────┴──────────┴──────────┘')

  // 5. 문제 항목 상세
  console.log('\n📋 접근 불가능 항목 (donor_id 없음):')
  const noAccess = totalRankings?.filter(r => !r.donor_id)
  if (noAccess && noAccess.length > 0) {
    for (const item of noAccess) {
      console.log(`  ❌ ${item.rank}위: ${item.donor_name}`)
    }
  } else {
    console.log('  ✅ 모든 항목에 donor_id 있음')
  }

  // 6. VIP reward 없는 항목
  console.log('\n📋 VIP reward 미연결 (donor_id는 있음):')
  const noVipReward = totalRankings?.filter(r => {
    const hasVip = vipRewards?.some(v => v.profile_id === r.donor_id)
    return r.donor_id && !hasVip
  })
  if (noVipReward && noVipReward.length > 0) {
    for (const item of noVipReward) {
      console.log(`  ⚠️ ${item.rank}위: ${item.donor_name}`)
    }
  } else {
    console.log('  ✅ 모든 항목이 VIP reward에 연결됨')
  }

  // 7. 요약
  console.log('\n📊 요약:')
  console.log(`  - 총 항목: ${totalRankings?.length || 0}개`)
  console.log(`  - donor_id 있음: ${totalRankings?.filter(r => r.donor_id).length || 0}개`)
  console.log(`  - VIP reward 연결: ${totalRankings?.filter(r => vipRewards?.some(v => v.profile_id === r.donor_id)).length || 0}개`)
  console.log(`  - 문제 항목: ${issueCount}개`)

  console.log('\n✅ VIP 페이지 접근 검증 완료!')
}

main().catch(console.error)
