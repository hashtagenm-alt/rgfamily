/**
 * 최신 후원 데이터 날짜 확인
 */

import { getServiceClient } from './lib/supabase'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = getServiceClient()

async function main() {
  console.log('=== 최신 후원 데이터 확인 ===\n')
  console.log('오늘 날짜:', new Date().toISOString().split('T')[0])

  // 최신 후원 날짜 확인
  const { data } = await supabase
    .from('donations')
    .select('donated_at, donor_name, amount, episode_id')
    .eq('season_id', 1)
    .order('donated_at', { ascending: false })
    .limit(10)

  console.log('\n최근 후원 내역 (최신 10건):')
  data?.forEach(d => {
    console.log(`  ${d.donated_at} - ${d.donor_name}: ${d.amount.toLocaleString()} 하트`)
  })

  // 날짜별 건수
  const { data: allDonations } = await supabase
    .from('donations')
    .select('donated_at')
    .eq('season_id', 1)
    .not('donated_at', 'is', null)

  const dateCounts: Record<string, number> = {}
  allDonations?.forEach(d => {
    const date = d.donated_at.split('T')[0].split(' ')[0]
    dateCounts[date] = (dateCounts[date] || 0) + 1
  })

  console.log('\n날짜별 후원 건수:')
  Object.entries(dateCounts).sort().forEach(([date, count]) => {
    console.log(`  ${date}: ${count}건`)
  })

  // 마지막 import 날짜
  const sortedDates = Object.keys(dateCounts).sort()
  console.log(`\n마지막 데이터 날짜: ${sortedDates[sortedDates.length - 1]}`)
}

main().catch(console.error)
