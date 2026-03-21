import { getServiceClient } from '../lib/supabase'
const supabase = getServiceClient()

async function main() {
  const { data: episodes } = await supabase
    .from('episodes')
    .select('id, episode_number, representative_bj_total')
    .eq('season_id', 1)
    .order('episode_number', { ascending: true })

  let s1Dons: any[] = []
  let from = 0
  while (true) {
    const { data } = await supabase
      .from('donations')
      .select('episode_id, amount, target_bj')
      .eq('season_id', 1)
      .range(from, from + 999)
    if (!data || data.length === 0) break
    s1Dons = s1Dons.concat(data)
    if (data.length < 1000) break
    from += 1000
  }

  console.log('EP별 representative_bj_total 검증:')
  console.log('─'.repeat(80))
  
  for (const ep of episodes || []) {
    const epDons = s1Dons.filter((d: any) => d.episode_id === ep.id)
    const rgDons = epDons.filter((d: any) => d.target_bj === 'RG_family')
    const rgTotal = rgDons.reduce((s: number, d: any) => s + d.amount, 0)
    const rgCount = rgDons.length
    const repTotal = ep.representative_bj_total as any
    
    const hasData = repTotal !== null && repTotal !== undefined
    console.log(`  EP${String(ep.episode_number).padStart(2)}:`)
    console.log(`    stored: ${hasData ? JSON.stringify(repTotal) : 'NULL'}`)
    console.log(`    actual RG_family: hearts=${rgTotal.toLocaleString()}, count=${rgCount}`)
    if (hasData && repTotal.hearts !== undefined) {
      const match = repTotal.hearts === rgTotal
      console.log(`    hearts 일치: ${match ? 'OK' : `DIFF (저장=${repTotal.hearts}, 실제=${rgTotal})`}`)
    }
    console.log()
  }
}
main().catch(console.error)
