/**
 * BJ 후원 현황 검증 스크립트
 */

import { getServiceClient } from './lib/supabase'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = getServiceClient()

async function main() {
  console.log('=== target_bj 고유 값 확인 ===')

  const { data } = await supabase
    .from('donations')
    .select('target_bj, amount')
    .not('target_bj', 'is', null)

  const bjStats: Record<string, { hearts: number, count: number }> = {}
  for (const d of data || []) {
    const bj = d.target_bj
    if (!bjStats[bj]) bjStats[bj] = { hearts: 0, count: 0 }
    bjStats[bj].hearts += d.amount
    bjStats[bj].count += 1
  }

  const sorted = Object.entries(bjStats)
    .sort((a, b) => b[1].hearts - a[1].hearts)

  console.log('\nBJ별 후원 현황 (전체 에피소드):')
  sorted.forEach(([bj, stats], i) => {
    console.log(`${i+1}. ${bj}: ${stats.hearts.toLocaleString()} 하트 (${stats.count}건)`)
  })

  console.log(`\n총 고유 BJ 수: ${sorted.length}개`)

  // 정규화 필요한 패턴 확인
  const suffixPattern = /[\(（][^\)）]+[\)）]/
  const prefixPattern = /^\[[^\]]+\]\s*/

  const needsNormalization = sorted.filter(([name]) =>
    name !== 'RG_family(대표BJ)' &&
    (suffixPattern.test(name) || prefixPattern.test(name))
  )

  if (needsNormalization.length > 0) {
    console.log('\n⚠️ 정규화 필요한 BJ 이름 발견:')
    needsNormalization.forEach(([name]) => console.log(`  - ${name}`))
  } else {
    console.log('\n✅ 정규화 필요한 케이스 없음!')
  }
}

main().catch(console.error)
