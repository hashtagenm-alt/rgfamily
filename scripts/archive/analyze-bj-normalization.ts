import { getServiceClient } from './lib/supabase'
/**
 * 전체 에피소드의 target_bj 정규화 필요 여부 분석
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = getServiceClient()

async function main() {
  console.log('=== 전체 에피소드 target_bj 분석 ===\n')

  // Get all donations with target_bj
  const { data: allDonations } = await supabase
    .from('donations')
    .select('episode_id, target_bj, amount')
    .not('target_bj', 'is', null)

  // Group by episode
  const episodeBjs: Record<string, Record<string, { hearts: number; count: number }>> = {}
  for (const d of allDonations || []) {
    const ep = String(d.episode_id || 'unknown')
    if (!episodeBjs[ep]) {
      episodeBjs[ep] = {}
    }
    const bj = d.target_bj
    if (!episodeBjs[ep][bj]) {
      episodeBjs[ep][bj] = { hearts: 0, count: 0 }
    }
    episodeBjs[ep][bj].hearts += d.amount
    episodeBjs[ep][bj].count += 1
  }

  // Check for patterns that need normalization
  const suffixPattern = /[\(（][^\)）]+[\)）]/
  const prefixPattern = /^\[[^\]]+\]\s*/

  console.log('=== 정규화 필요한 BJ 이름 ===')
  let foundIssues = false

  for (const [ep, bjs] of Object.entries(episodeBjs)) {
    const needsNormalization = Object.keys(bjs).filter(
      (name) =>
        // RG_family(대표BJ)는 제외 - 원래 이름이므로
        name !== 'RG_family(대표BJ)' &&
        (suffixPattern.test(name) || prefixPattern.test(name))
    )

    if (needsNormalization.length > 0) {
      foundIssues = true
      console.log(`\n에피소드 ${ep}:`)
      needsNormalization.forEach((name) => {
        let normalized = name
        normalized = normalized.replace(prefixPattern, '')
        normalized = normalized.replace(suffixPattern, '').trim()
        console.log(
          `  "${name}" → "${normalized}" (${bjs[name].hearts.toLocaleString()} 하트)`
        )
      })
    }
  }

  if (!foundIssues) {
    console.log('정규화 필요한 케이스 없음!')
  }

  // Show all unique BJs across all episodes
  console.log('\n=== 전체 고유 BJ 목록 ===')
  const allBjs = new Set<string>()
  for (const bjs of Object.values(episodeBjs)) {
    Object.keys(bjs).forEach((bj) => allBjs.add(bj))
  }

  const sorted = Array.from(allBjs).sort()
  sorted.forEach((bj) => console.log(`  - ${bj}`))

  // Summary
  console.log(`\n총 고유 BJ 수: ${allBjs.size}`)
}

main().catch(console.error)
