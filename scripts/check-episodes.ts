import { getServiceClient } from './lib/supabase'
/**
 * 에피소드 및 직급전 기록 확인 스크립트
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = getServiceClient()

async function main() {
  // 에피소드 목록 확인
  const { data: episodes } = await supabase
    .from('episodes')
    .select('id, episode_number, title, is_rank_battle, is_finalized, season_id')
    .order('episode_number')

  console.log('=== 에피소드 목록 ===\n')
  episodes?.forEach(e => {
    const rb = e.is_rank_battle ? '[직급전]' : ''
    const fin = e.is_finalized ? '✅' : '⬜'
    console.log(`${e.episode_number}회: ${e.title} ${rb} ${fin}`)
  })

  // 직급전 기록 확인
  console.log('\n=== 직급전 기록 (rank_battle_records) ===\n')
  const { data: battles, count } = await supabase
    .from('rank_battle_records')
    .select('season_id, battle_number, rank', { count: 'exact' })
    .order('battle_number')
    .order('rank')

  if (battles && battles.length > 0) {
    const grouped: Record<string, number> = {}
    battles.forEach(b => {
      const key = `S${b.season_id} ${b.battle_number}회 직급전`
      if (!grouped[key]) grouped[key] = 0
      grouped[key]++
    })
    Object.entries(grouped).forEach(([k, v]) => console.log(`${k}: ${v}명`))
  } else {
    console.log('직급전 기록 없음')
  }

  console.log(`\n총 직급전 기록: ${count || 0}개`)
}

main().catch(console.error)
