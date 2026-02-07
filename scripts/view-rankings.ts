/**
 * 후원 랭킹 조회 스크립트
 *
 * 새로운 뷰 기반 랭킹 시스템에서 랭킹 조회
 *
 * 사용법:
 *   npx tsx scripts/view-rankings.ts --type=total --limit=50
 *   npx tsx scripts/view-rankings.ts --type=season --season=1 --limit=30
 *   npx tsx scripts/view-rankings.ts --type=episode --episode=3 --limit=20
 */

import { getServiceClient } from './lib/supabase'

const supabase = getServiceClient()

type RankingType = 'total' | 'season' | 'episode'

function parseArgs(): {
  type: RankingType
  seasonId?: number
  episodeId?: number
  limit: number
} {
  const args = process.argv.slice(2)
  let type: RankingType = 'total'
  let seasonId: number | undefined
  let episodeId: number | undefined
  let limit = 50

  for (const arg of args) {
    if (arg.startsWith('--type=')) {
      const t = arg.split('=')[1]
      if (t === 'total' || t === 'season' || t === 'episode') {
        type = t
      }
    } else if (arg.startsWith('--season=')) {
      seasonId = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--episode=')) {
      episodeId = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10)
    }
  }

  return { type, seasonId, episodeId, limit }
}

async function viewTotalRankings(limit: number) {
  console.log('🏆 전체 랭킹 (역대 누적)\n')
  console.log('─'.repeat(60))

  const { data, error } = await supabase
    .from('v_total_rankings')
    .select('*')
    .limit(limit)

  if (error) {
    console.error('❌ 조회 실패:', error.message)
    return
  }

  if (!data || data.length === 0) {
    console.log('데이터가 없습니다.')
    return
  }

  console.log(`${'순위'.padEnd(6)}${'닉네임'.padEnd(30)}${'총 하트'.padStart(15)}${'후원 횟수'.padStart(10)}`)
  console.log('─'.repeat(60))

  for (const row of data) {
    const rank = String(row.rank).padEnd(6)
    const name = row.donor_name.slice(0, 25).padEnd(30)
    const amount = row.total_amount.toLocaleString().padStart(15)
    const count = String(row.donation_count).padStart(10)
    console.log(`${rank}${name}${amount}${count}`)
  }

  console.log('─'.repeat(60))
  console.log(`총 ${data.length}명`)
}

async function viewSeasonRankings(seasonId: number, limit: number) {
  console.log(`🏆 시즌 ${seasonId} 랭킹\n`)
  console.log('─'.repeat(60))

  const { data, error } = await supabase
    .from('v_season_rankings')
    .select('*')
    .eq('season_id', seasonId)
    .limit(limit)

  if (error) {
    console.error('❌ 조회 실패:', error.message)
    return
  }

  if (!data || data.length === 0) {
    console.log('데이터가 없습니다.')
    return
  }

  console.log(`${'순위'.padEnd(6)}${'닉네임'.padEnd(30)}${'총 하트'.padStart(15)}${'후원 횟수'.padStart(10)}`)
  console.log('─'.repeat(60))

  for (const row of data) {
    const rank = String(row.rank).padEnd(6)
    const name = row.donor_name.slice(0, 25).padEnd(30)
    const amount = row.total_amount.toLocaleString().padStart(15)
    const count = String(row.donation_count).padStart(10)
    console.log(`${rank}${name}${amount}${count}`)
  }

  console.log('─'.repeat(60))
  console.log(`총 ${data.length}명`)
}

async function viewEpisodeRankings(episodeId: number, limit: number) {
  // 에피소드 정보 조회
  const { data: epData } = await supabase
    .from('episodes')
    .select('episode_number, title, season_id')
    .eq('id', episodeId)
    .single()

  const epTitle = epData ? `${epData.episode_number}화 ${epData.title || ''}` : `에피소드 ${episodeId}`

  console.log(`🏆 ${epTitle} 랭킹\n`)
  console.log('─'.repeat(60))

  const { data, error } = await supabase
    .from('v_episode_rankings')
    .select('*')
    .eq('episode_id', episodeId)
    .limit(limit)

  if (error) {
    console.error('❌ 조회 실패:', error.message)
    return
  }

  if (!data || data.length === 0) {
    console.log('데이터가 없습니다.')
    return
  }

  console.log(`${'순위'.padEnd(6)}${'닉네임'.padEnd(30)}${'총 하트'.padStart(15)}${'후원 횟수'.padStart(10)}`)
  console.log('─'.repeat(60))

  for (const row of data) {
    const rank = String(row.rank).padEnd(6)
    const name = row.donor_name.slice(0, 25).padEnd(30)
    const amount = row.total_amount.toLocaleString().padStart(15)
    const count = String(row.donation_count).padStart(10)
    console.log(`${rank}${name}${amount}${count}`)
  }

  console.log('─'.repeat(60))
  console.log(`총 ${data.length}명`)
}

async function listEpisodes() {
  console.log('📋 에피소드 목록\n')

  const { data, error } = await supabase
    .from('episodes')
    .select('id, season_id, episode_number, title, broadcast_date, total_hearts, donor_count')
    .gt('season_id', 0)  // 레거시 제외
    .order('season_id')
    .order('episode_number')

  if (error) {
    console.error('❌ 조회 실패:', error.message)
    return
  }

  if (!data || data.length === 0) {
    console.log('에피소드가 없습니다.')
    return
  }

  console.log('─'.repeat(80))
  console.log(`${'ID'.padEnd(6)}${'시즌'.padEnd(8)}${'회차'.padEnd(8)}${'제목'.padEnd(25)}${'방송일'.padEnd(12)}${'총 하트'.padStart(12)}${'후원자'.padStart(8)}`)
  console.log('─'.repeat(80))

  for (const ep of data) {
    const id = String(ep.id).padEnd(6)
    const season = `S${ep.season_id}`.padEnd(8)
    const num = `${ep.episode_number}화`.padEnd(8)
    const title = (ep.title || '').slice(0, 22).padEnd(25)
    const date = (ep.broadcast_date || '').padEnd(12)
    const hearts = (ep.total_hearts || 0).toLocaleString().padStart(12)
    const donors = String(ep.donor_count || 0).padStart(8)
    console.log(`${id}${season}${num}${title}${date}${hearts}${donors}`)
  }

  console.log('─'.repeat(80))
}

async function main() {
  const { type, seasonId, episodeId, limit } = parseArgs()

  // 인자 없으면 도움말
  if (process.argv.length <= 2) {
    console.log('🏆 후원 랭킹 조회\n')
    console.log('사용법:')
    console.log('  npx tsx scripts/view-rankings.ts --type=total --limit=50')
    console.log('  npx tsx scripts/view-rankings.ts --type=season --season=1 --limit=30')
    console.log('  npx tsx scripts/view-rankings.ts --type=episode --episode=3 --limit=20')
    console.log('')
    console.log('옵션:')
    console.log('  --type=<TYPE>     : total, season, episode')
    console.log('  --season=<ID>     : 시즌 ID (type=season 일 때)')
    console.log('  --episode=<ID>    : 에피소드 ID (type=episode 일 때)')
    console.log('  --limit=<NUM>     : 표시할 개수 (기본: 50)')
    console.log('')

    // 에피소드 목록 표시
    await listEpisodes()
    return
  }

  switch (type) {
    case 'total':
      await viewTotalRankings(limit)
      break
    case 'season':
      if (!seasonId) {
        console.error('❌ --season 옵션이 필요합니다.')
        process.exit(1)
      }
      await viewSeasonRankings(seasonId, limit)
      break
    case 'episode':
      if (!episodeId) {
        console.error('❌ --episode 옵션이 필요합니다.')
        process.exit(1)
      }
      await viewEpisodeRankings(episodeId, limit)
      break
  }
}

main().catch((err) => {
  console.error('❌ 오류 발생:', err)
  process.exit(1)
})
