/**
 * 시즌별 후원 랭킹 업데이트 스크립트
 *
 * donations 테이블에서 시즌 전체 후원 데이터를 집계하여
 * season_donation_rankings 테이블을 업데이트합니다.
 *
 * ⚠️ 이 스크립트는 CSV에서 직접 읽지 않습니다!
 *    CSV → donations 임포트는 import-episode-donations.ts 를 사용하세요.
 *
 * 사용법:
 *   npx tsx scripts/update-season-rankings.ts --season=1 --unit=excel
 *
 * 옵션:
 *   --season=<ID>        시즌 ID (필수)
 *   --unit=<excel|crew>  팬클럽 소속 (선택, 기본값: null → 전체)
 *   --dry-run            실제 저장하지 않고 미리보기만
 *   --force              안전 검사 무시하고 강제 실행
 */

import { getServiceClient } from './lib/supabase'
import { withRetry } from './lib/utils'

const supabase = getServiceClient()

type Unit = 'excel' | 'crew' | null

function parseArgs(): { seasonId: number; unit: Unit; dryRun: boolean; force: boolean } {
  const args = process.argv.slice(2)
  let seasonId = 0
  let unit: Unit = null
  let dryRun = false
  let force = false

  for (const arg of args) {
    if (arg.startsWith('--season=')) {
      seasonId = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--unit=')) {
      const unitValue = arg.split('=')[1].toLowerCase()
      if (unitValue === 'excel' || unitValue === 'crew') {
        unit = unitValue
      } else {
        console.error('❌ --unit은 excel 또는 crew만 가능합니다.')
        process.exit(1)
      }
    } else if (arg === '--dry-run') {
      dryRun = true
    } else if (arg === '--force') {
      force = true
    }
  }

  if (!seasonId) {
    console.error('사용법: npx tsx scripts/update-season-rankings.ts --season=<ID> --unit=<excel|crew>')
    console.error('')
    console.error('워크플로우:')
    console.error('  1. CSV 임포트: npx tsx scripts/import-episode-donations.ts --season=1 --episode=10 --file=...')
    console.error('  2. 랭킹 갱신: npx tsx scripts/update-season-rankings.ts --season=1 --unit=excel')
    process.exit(1)
  }

  return { seasonId, unit, dryRun, force }
}

async function main() {
  console.log('🚀 시즌 랭킹 업데이트 시작\n')

  const { seasonId, unit, dryRun, force } = parseArgs()

  console.log(`📌 시즌: ${seasonId}`)
  console.log(`📌 팬클럽: ${unit || '전체(미지정)'}`)
  if (dryRun) console.log('⚠️  DRY-RUN 모드')

  // 1. 시즌 에피소드 현황 확인
  const { data: episodes } = await supabase
    .from('episodes')
    .select('id, episode_number, is_finalized, total_hearts, donor_count')
    .eq('season_id', seasonId)
    .order('episode_number')

  if (!episodes || episodes.length === 0) {
    console.error('❌ 해당 시즌의 에피소드가 없습니다.')
    process.exit(1)
  }

  console.log('\n📋 에피소드 현황:')
  let donationsEpisodeIds: number[] = []
  for (const ep of episodes) {
    const status = ep.is_finalized ? '✅' : '⬜'
    const hearts = ep.total_hearts ? `${ep.total_hearts.toLocaleString()}하트` : '-'
    console.log(`   ${status} ${ep.episode_number}화: ${hearts} (${ep.donor_count || 0}명)`)

    // donations 테이블에 데이터가 있는 에피소드만 포함
    const { count } = await supabase
      .from('donations')
      .select('*', { count: 'exact', head: true })
      .eq('episode_id', ep.id)
    if (count && count > 0) {
      donationsEpisodeIds.push(ep.id)
    }
  }

  console.log(`\n📊 donations 데이터 있는 에피소드: ${donationsEpisodeIds.length}개`)

  if (donationsEpisodeIds.length === 0) {
    console.error('❌ donations 테이블에 데이터가 없습니다. 먼저 CSV를 임포트하세요.')
    console.error('   npx tsx scripts/import-episode-donations.ts --season=1 --episode=<N> --file=<CSV>')
    process.exit(1)
  }

  // 2. donations 테이블에서 집계
  console.log('\n📊 donations 테이블에서 집계 중...')
  const allDonations: { donor_name: string; amount: number; target_bj: string | null }[] = []
  let page = 0
  const pageSize = 1000

  while (true) {
    let query = supabase
      .from('donations')
      .select('donor_name, amount, target_bj')
      .in('episode_id', donationsEpisodeIds)
      .gt('amount', 0)

    if (unit) {
      query = query.eq('unit', unit)
    }

    const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1)
    if (error || !data || data.length === 0) break
    allDonations.push(...data)
    if (data.length < pageSize) break
    page++
  }

  console.log(`   총 ${allDonations.length}건 조회`)

  // 후원자별 집계
  const donorMap = new Map<string, { totalHearts: number; donationCount: number }>()
  const bjTotals: Record<string, Record<string, number>> = {}

  for (const d of allDonations) {
    const existing = donorMap.get(d.donor_name)
    if (existing) {
      existing.totalHearts += d.amount
      existing.donationCount += 1
    } else {
      donorMap.set(d.donor_name, { totalHearts: d.amount, donationCount: 1 })
    }

    if (d.target_bj) {
      if (!bjTotals[d.donor_name]) bjTotals[d.donor_name] = {}
      bjTotals[d.donor_name][d.target_bj] = (bjTotals[d.donor_name][d.target_bj] || 0) + d.amount
    }
  }

  const donors = [...donorMap.entries()]
    .map(([name, data]) => ({ nickname: name, ...data }))
    .sort((a, b) => b.totalHearts - a.totalHearts)

  console.log(`   고유 후원자: ${donors.length}명`)

  // 3. 기존 데이터와 비교 (안전 검사)
  let existingQuery = supabase
    .from('season_donation_rankings')
    .select('rank, donor_name, total_amount')
    .eq('season_id', seasonId)
    .order('rank')

  if (unit) existingQuery = existingQuery.eq('unit', unit)

  const { data: existingRankings } = await existingQuery

  if (existingRankings && existingRankings.length > 0) {
    const existingTotal = existingRankings.reduce((s, r) => s + r.total_amount, 0)
    const newTotal = donors.slice(0, 50).reduce((s, d) => s + d.totalHearts, 0)
    const existingTop1 = existingRankings[0]
    const newTop1 = donors[0]

    console.log('\n🔍 기존 vs 신규 데이터 비교:')
    console.log(`   기존 Top50 합계: ${existingTotal.toLocaleString()}하트 (1위: ${existingTop1.donor_name} ${existingTop1.total_amount.toLocaleString()})`)
    console.log(`   신규 Top50 합계: ${newTotal.toLocaleString()}하트 (1위: ${newTop1.nickname} ${newTop1.totalHearts.toLocaleString()})`)

    // 안전 검사: 신규 데이터가 기존보다 50% 이상 작으면 경고
    if (newTotal < existingTotal * 0.5 && !force) {
      console.error('\n🚨 경고: 신규 데이터가 기존보다 50% 이상 적습니다!')
      console.error('   단일 에피소드 CSV로 전체 시즌 데이터를 덮어쓰려는 것이 아닌지 확인하세요.')
      console.error('   에피소드 CSV 임포트는: npx tsx scripts/import-episode-donations.ts 를 사용하세요.')
      console.error('   강제 실행하려면: --force 옵션을 추가하세요.')
      process.exit(1)
    }

    // 안전 검사: 신규 1위 금액이 기존 1위보다 훨씬 작으면 경고
    if (newTop1.totalHearts < existingTop1.total_amount * 0.3 && !force) {
      console.error('\n🚨 경고: 신규 1위 금액이 기존 1위의 30% 미만입니다!')
      console.error(`   기존 1위: ${existingTop1.donor_name} (${existingTop1.total_amount.toLocaleString()})`)
      console.error(`   신규 1위: ${newTop1.nickname} (${newTop1.totalHearts.toLocaleString()})`)
      console.error('   강제 실행하려면: --force 옵션을 추가하세요.')
      process.exit(1)
    }
  }

  // Top 10 표시
  const top50 = donors.slice(0, 50)

  console.log('\n📋 Top 10:')
  for (let i = 0; i < Math.min(10, top50.length); i++) {
    const d = top50[i]
    let topBj = '-'
    if (bjTotals[d.nickname]) {
      let maxAmt = 0
      for (const [bj, amt] of Object.entries(bjTotals[d.nickname])) {
        if (amt > maxAmt) { maxAmt = amt; topBj = bj }
      }
    }
    console.log(`   ${i + 1}. ${d.nickname}: ${d.totalHearts.toLocaleString()}하트 (${d.donationCount}건, 최애: ${topBj})`)
  }

  if (dryRun) {
    console.log('\n💡 실제 저장하려면 --dry-run 옵션 없이 실행하세요.')
    return
  }

  // 4. DB 업데이트
  console.log('\n📊 시즌 랭킹 업데이트 중...')

  // 기존 삭제
  let deleteQuery = supabase
    .from('season_donation_rankings')
    .delete()
    .eq('season_id', seasonId)

  if (unit) deleteQuery = deleteQuery.eq('unit', unit)

  await withRetry(
    async () => {
      const { error } = await deleteQuery
      if (error) throw new Error(error.message)
    },
    { maxRetries: 3 }
  )

  // 새 데이터 삽입
  const insertData = top50.map((d, idx) => {
    let topBj: string | null = null
    if (bjTotals[d.nickname]) {
      let maxAmt = 0
      for (const [bj, amt] of Object.entries(bjTotals[d.nickname])) {
        if (amt > maxAmt) { maxAmt = amt; topBj = bj }
      }
    }

    return {
      season_id: seasonId,
      rank: idx + 1,
      donor_name: d.nickname,
      total_amount: d.totalHearts,
      donation_count: d.donationCount,
      unit: unit,
      top_bj: topBj,
      updated_at: new Date().toISOString(),
    }
  })

  await withRetry(
    async () => {
      const { error } = await supabase.from('season_donation_rankings').insert(insertData)
      if (error) throw new Error(error.message)
    },
    { maxRetries: 3 }
  )

  console.log(`✅ 시즌 ${seasonId} ${unit || '전체'} Top ${top50.length} 랭킹 업데이트 완료!`)
}

main().catch((err) => {
  console.error('❌ 오류:', err)
  process.exit(1)
})
