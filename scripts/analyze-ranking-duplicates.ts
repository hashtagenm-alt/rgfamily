/**
 * 랭킹 테이블 중복 분석 및 해결
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('=== 랭킹 테이블 중복 분석 ===\n')

  // 1. 시즌 랭킹 중복 확인
  console.log('1. 시즌 랭킹 (season_donation_rankings) 분석...')
  const { data: seasonRanks } = await supabase
    .from('season_donation_rankings')
    .select('*')
    .eq('season_id', 1)
    .order('rank')

  // 닉네임 중복 확인
  const seasonNicknames = new Map<string, any[]>()
  seasonRanks?.forEach(r => {
    if (!seasonNicknames.has(r.donor_name)) {
      seasonNicknames.set(r.donor_name, [])
    }
    seasonNicknames.get(r.donor_name)!.push(r)
  })

  const seasonDuplicates: { nickname: string; records: any[] }[] = []
  for (const [nickname, records] of seasonNicknames) {
    if (records.length > 1) {
      seasonDuplicates.push({ nickname, records })
    }
  }

  console.log(`  총 레코드: ${seasonRanks?.length}개`)
  console.log(`  중복 닉네임: ${seasonDuplicates.length}개`)

  if (seasonDuplicates.length > 0) {
    console.log('\n  [시즌 랭킹 중복 목록]')
    for (const dup of seasonDuplicates) {
      console.log(`\n  ${dup.nickname}:`)
      dup.records.forEach(r => {
        console.log(`    - rank ${r.rank}: ${r.total_amount?.toLocaleString()} 하트 (id: ${r.id})`)
      })
    }
  }

  // 2. 전체 랭킹 중복 확인
  console.log('\n\n2. 전체 랭킹 (total_donation_rankings) 분석...')
  const { data: totalRanks } = await supabase
    .from('total_donation_rankings')
    .select('*')
    .order('rank')

  const totalNicknames = new Map<string, any[]>()
  totalRanks?.forEach(r => {
    if (!totalNicknames.has(r.donor_name)) {
      totalNicknames.set(r.donor_name, [])
    }
    totalNicknames.get(r.donor_name)!.push(r)
  })

  const totalDuplicates: { nickname: string; records: any[] }[] = []
  for (const [nickname, records] of totalNicknames) {
    if (records.length > 1) {
      totalDuplicates.push({ nickname, records })
    }
  }

  console.log(`  총 레코드: ${totalRanks?.length}개`)
  console.log(`  중복 닉네임: ${totalDuplicates.length}개`)

  if (totalDuplicates.length > 0) {
    console.log('\n  [전체 랭킹 중복 목록]')
    for (const dup of totalDuplicates) {
      console.log(`\n  ${dup.nickname}:`)
      dup.records.forEach(r => {
        console.log(`    - rank ${r.rank}: ${r.total_amount?.toLocaleString()} 하트 (id: ${r.id})`)
      })
    }
  }

  // 3. VIP Rewards 중복 확인
  console.log('\n\n3. VIP Rewards 분석...')
  const { data: vipRewards } = await supabase
    .from('vip_rewards')
    .select('*, profiles(nickname, email)')
    .order('rank')

  const rewardProfiles = new Map<string, any[]>()
  vipRewards?.forEach(r => {
    const nickname = (r as any).profiles?.nickname || r.profile_id
    if (!rewardProfiles.has(nickname)) {
      rewardProfiles.set(nickname, [])
    }
    rewardProfiles.get(nickname)!.push(r)
  })

  const rewardDuplicates: { nickname: string; records: any[] }[] = []
  for (const [nickname, records] of rewardProfiles) {
    if (records.length > 1) {
      rewardDuplicates.push({ nickname, records })
    }
  }

  console.log(`  총 레코드: ${vipRewards?.length}개`)
  console.log(`  중복 닉네임: ${rewardDuplicates.length}개`)

  if (rewardDuplicates.length > 0) {
    console.log('\n  [VIP Rewards 중복 목록]')
    for (const dup of rewardDuplicates) {
      console.log(`\n  ${dup.nickname}:`)
      dup.records.forEach(r => {
        const profile = (r as any).profiles
        console.log(`    - id ${r.id}, rank ${r.rank}, profile: ${profile?.email || r.profile_id}`)
      })
    }
  }

  // 4. 중복 해결
  console.log('\n\n' + '='.repeat(60))
  console.log('=== 중복 해결 ===')
  console.log('='.repeat(60))

  // 시즌 랭킹 중복 해결
  if (seasonDuplicates.length > 0) {
    console.log('\n시즌 랭킹 중복 해결...')
    for (const dup of seasonDuplicates) {
      // 가장 높은 순위(낮은 rank 숫자) 레코드만 유지
      const sorted = dup.records.sort((a, b) => a.rank - b.rank)
      const keep = sorted[0]
      const remove = sorted.slice(1)

      console.log(`  ${dup.nickname}: rank ${keep.rank} 유지`)

      for (const r of remove) {
        await supabase
          .from('season_donation_rankings')
          .delete()
          .eq('id', r.id)
        console.log(`    → rank ${r.rank} (id: ${r.id}) 삭제`)
      }
    }
  }

  // 전체 랭킹 중복 해결
  if (totalDuplicates.length > 0) {
    console.log('\n전체 랭킹 중복 해결...')
    for (const dup of totalDuplicates) {
      const sorted = dup.records.sort((a, b) => a.rank - b.rank)
      const keep = sorted[0]
      const remove = sorted.slice(1)

      console.log(`  ${dup.nickname}: rank ${keep.rank} 유지`)

      for (const r of remove) {
        await supabase
          .from('total_donation_rankings')
          .delete()
          .eq('id', r.id)
        console.log(`    → rank ${r.rank} (id: ${r.id}) 삭제`)
      }
    }
  }

  // VIP Rewards 중복 해결
  if (rewardDuplicates.length > 0) {
    console.log('\nVIP Rewards 중복 해결...')
    for (const dup of rewardDuplicates) {
      // 가장 낮은 rank 유지 (더 높은 순위)
      const sorted = dup.records.sort((a, b) => a.rank - b.rank)
      const keep = sorted[0]
      const remove = sorted.slice(1)

      console.log(`  ${dup.nickname}: id ${keep.id} (rank ${keep.rank}) 유지`)

      for (const r of remove) {
        // vip_images 먼저 삭제
        await supabase
          .from('vip_images')
          .delete()
          .eq('reward_id', r.id)

        await supabase
          .from('vip_rewards')
          .delete()
          .eq('id', r.id)
        console.log(`    → id ${r.id} (rank ${r.rank}) 삭제`)
      }
    }
  }

  // 5. 최종 확인
  console.log('\n\n' + '='.repeat(60))
  console.log('=== 최종 확인 ===')
  console.log('='.repeat(60))

  const { data: finalSeasonRanks, count: seasonCount } = await supabase
    .from('season_donation_rankings')
    .select('*', { count: 'exact' })
    .eq('season_id', 1)

  const { data: finalTotalRanks, count: totalCount } = await supabase
    .from('total_donation_rankings')
    .select('*', { count: 'exact' })

  const { data: finalVipRewards, count: rewardCount } = await supabase
    .from('vip_rewards')
    .select('*', { count: 'exact' })

  console.log(`\n시즌 랭킹: ${seasonCount}개`)
  console.log(`전체 랭킹: ${totalCount}개`)
  console.log(`VIP Rewards: ${rewardCount}개`)

  // 중복 재확인
  const seasonNames = new Set<string>()
  let seasonDupCount = 0
  finalSeasonRanks?.forEach(r => {
    if (seasonNames.has(r.donor_name)) seasonDupCount++
    seasonNames.add(r.donor_name)
  })

  const totalNames = new Set<string>()
  let totalDupCount = 0
  finalTotalRanks?.forEach(r => {
    if (totalNames.has(r.donor_name)) totalDupCount++
    totalNames.add(r.donor_name)
  })

  console.log(`\n시즌 랭킹 중복: ${seasonDupCount}개`)
  console.log(`전체 랭킹 중복: ${totalDupCount}개`)
}

main().catch(console.error)
