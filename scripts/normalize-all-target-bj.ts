/**
 * 전체 에피소드 target_bj 정규화
 * 괄호가 붙은 BJ 이름을 기본 이름으로 통일
 * 예: "청아(시녀장)" → "청아", "가윤(귀족)" → "가윤"
 * 예외: "RG_family(대표BJ)"는 그대로 유지 (원래 이름)
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, serviceRoleKey)

// BJ 이름 정규화 함수
function normalizeBjName(name: string): string {
  // RG_family(대표BJ)는 예외 - 원래 이름이므로 그대로 유지
  if (name === 'RG_family(대표BJ)') {
    return name
  }

  let normalized = name.trim()

  // 1. [직급] 제거: "[공주] 손밍" → "손밍"
  normalized = normalized.replace(/^\[[^\]]+\]\s*/, '')

  // 2. (역할/상태) 제거: "청아(시녀장)" → "청아"
  normalized = normalized.replace(/\s*[\(（][^\)）]+[\)）]$/, '')

  return normalized.trim()
}

// 페이지네이션으로 전체 데이터 가져오기
async function fetchAllDonationsWithPagination(): Promise<{ id: number; target_bj: string; amount: number }[]> {
  const allData: { id: number; target_bj: string; amount: number }[] = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('donations')
      .select('id, target_bj, amount')
      .not('target_bj', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break

    allData.push(...data)
    console.log(`  페이지 ${page + 1}: ${data.length}건 조회 (누적: ${allData.length}건)`)

    if (data.length < pageSize) break
    page++
  }

  return allData
}

async function main() {
  console.log('=== 전체 에피소드 target_bj 정규화 ===\n')

  // 1. 정규화 필요한 데이터 분석
  console.log('1. 정규화 필요한 target_bj 분석...')

  const allDonations = await fetchAllDonationsWithPagination()

  console.log(`총 후원 건수: ${allDonations.length}건`)

  // 정규화가 필요한 항목 찾기
  const needsUpdate: { id: number; original: string; normalized: string; amount: number }[] = []

  for (const d of allDonations || []) {
    const original = d.target_bj
    const normalized = normalizeBjName(original)

    if (original !== normalized) {
      needsUpdate.push({
        id: d.id,
        original,
        normalized,
        amount: d.amount
      })
    }
  }

  console.log(`정규화 필요한 건수: ${needsUpdate.length}건\n`)

  // 변경 내역 요약
  const changesByName: Record<string, { normalized: string; count: number; hearts: number }> = {}
  for (const item of needsUpdate) {
    if (!changesByName[item.original]) {
      changesByName[item.original] = { normalized: item.normalized, count: 0, hearts: 0 }
    }
    changesByName[item.original].count += 1
    changesByName[item.original].hearts += item.amount
  }

  console.log('2. 변경 내역 요약:')
  console.log('─'.repeat(60))

  const sortedChanges = Object.entries(changesByName)
    .sort((a, b) => b[1].hearts - a[1].hearts)

  for (const [original, stats] of sortedChanges) {
    console.log(`  "${original}" → "${stats.normalized}"`)
    console.log(`     (${stats.count}건, ${stats.hearts.toLocaleString()} 하트)`)
  }
  console.log('')

  // 3. 업데이트 실행
  console.log('3. 데이터 업데이트 중...')

  let successCount = 0
  let errorCount = 0

  // 배치로 업데이트 (같은 원본 이름끼리 묶어서)
  for (const [original, stats] of sortedChanges) {
    const { error: updateError, count } = await supabase
      .from('donations')
      .update({ target_bj: stats.normalized })
      .eq('target_bj', original)

    if (updateError) {
      console.error(`  ❌ "${original}" 업데이트 실패:`, updateError.message)
      errorCount += stats.count
    } else {
      console.log(`  ✅ "${original}" → "${stats.normalized}" (${count || stats.count}건)`)
      successCount += stats.count
    }
  }

  console.log('')
  console.log(`업데이트 완료: 성공 ${successCount}건, 실패 ${errorCount}건`)

  // 4. 검증 (페이지네이션 사용)
  console.log('\n4. 정규화 후 BJ 목록 검증...')

  const verifyData = await fetchAllDonationsWithPagination()

  const bjStats: Record<string, { hearts: number; count: number }> = {}
  for (const d of verifyData || []) {
    const bj = d.target_bj
    if (!bjStats[bj]) bjStats[bj] = { hearts: 0, count: 0 }
    bjStats[bj].hearts += d.amount
    bjStats[bj].count += 1
  }

  const sortedBjs = Object.entries(bjStats)
    .sort((a, b) => b[1].hearts - a[1].hearts)

  console.log('\nBJ별 후원 현황 (정규화 후):')
  sortedBjs.forEach(([bj, stats], i) => {
    console.log(`${i + 1}. ${bj}: ${stats.hearts.toLocaleString()} 하트 (${stats.count}건)`)
  })

  console.log(`\n총 고유 BJ 수: ${sortedBjs.length}개`)

  // 남은 괄호 패턴 체크
  const stillHasParens = sortedBjs.filter(([name]) =>
    name !== 'RG_family(대표BJ)' && /[\(（]/.test(name)
  )

  if (stillHasParens.length > 0) {
    console.log('\n⚠️ 아직 괄호가 남은 BJ 이름:')
    stillHasParens.forEach(([name]) => console.log(`  - ${name}`))
  } else {
    console.log('\n✅ 모든 BJ 이름 정규화 완료!')
  }
}

main().catch(console.error)
