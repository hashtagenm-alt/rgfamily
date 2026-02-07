import { getServiceClient } from './lib/supabase'
const supabase = getServiceClient()

async function debug() {
  // 에피소드 정보
  const { data: episodes } = await supabase
    .from('episodes')
    .select('id, episode_number')
    .order('episode_number')

  console.log('Episodes:', episodes?.length)
  const episodeMap = new Map(episodes?.map(e => [e.id, e.episode_number]) || [])

  // 후원 데이터
  const { data: donations } = await supabase
    .from('donations')
    .select('episode_id, donor_name, amount')

  console.log('Donations:', donations?.length)

  // 집계
  interface Total {
    episode_id: number
    episode_number: number
    donor_name: string
    total: number
  }
  const totals: Record<string, Total> = {}
  for (const d of donations || []) {
    const key = `${d.episode_id}|${d.donor_name}`
    if (!totals[key]) {
      totals[key] = {
        episode_id: d.episode_id,
        episode_number: episodeMap.get(d.episode_id) || 0,
        donor_name: d.donor_name,
        total: 0
      }
    }
    totals[key].total += d.amount
  }

  const qualified = Object.values(totals)
    .filter(d => d.total >= 100000)
    .sort((a, b) => a.episode_number - b.episode_number || b.total - a.total)

  console.log(`\n10만+ 달성자 (${qualified.length}명):`)
  for (const q of qualified) {
    console.log(`EP${q.episode_number} - ${q.donor_name}: ${q.total.toLocaleString()}`)
  }
}

debug().catch(console.error)
