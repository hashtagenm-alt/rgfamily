/**
 * 최신 후원 데이터 날짜 확인 (상세)
 */

import { getServiceClient } from './lib/supabase'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = getServiceClient()

async function main() {
  console.log('=== 최신 후원 데이터 확인 ===\n')
  console.log('현재 시간:', new Date().toISOString())

  // 6화(episode_id=17) 데이터만 확인
  const { data: ep6Data, count } = await supabase
    .from('donations')
    .select('donated_at, donor_name, amount', { count: 'exact' })
    .eq('episode_id', 17)
    .order('donated_at', { ascending: false })
    .limit(20)

  console.log(`\n6화 데이터 총 ${count}건`)
  console.log('\n6화 최근 후원 내역 (최신 20건):')
  ep6Data?.forEach(d => {
    console.log(`  ${d.donated_at} - ${d.donor_name}: ${d.amount.toLocaleString()} 하트`)
  })

  // 6화 날짜별 집계
  const { data: allEp6 } = await supabase
    .from('donations')
    .select('donated_at, amount')
    .eq('episode_id', 17)

  const dateStats: Record<string, { count: number; total: number }> = {}
  allEp6?.forEach(d => {
    if (!d.donated_at) return
    // 다양한 형식 처리
    let date = d.donated_at
    if (date.includes('T')) {
      date = date.split('T')[0]
    } else if (date.includes(' ')) {
      date = date.split(' ')[0]
    }
    if (!dateStats[date]) {
      dateStats[date] = { count: 0, total: 0 }
    }
    dateStats[date].count++
    dateStats[date].total += d.amount
  })

  console.log('\n6화 날짜별 후원 현황:')
  Object.entries(dateStats).sort().forEach(([date, stats]) => {
    console.log(`  ${date}: ${stats.count}건, ${stats.total.toLocaleString()} 하트`)
  })
}

main().catch(console.error)
