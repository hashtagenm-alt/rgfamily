/**
 * vip_rewards 44개 분석
 */

import { getServiceClient } from './lib/supabase'
const supabase = getServiceClient()

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 vip_rewards 44개 분석')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // vip_rewards 전체 조회
  const { data: rewards } = await supabase
    .from('vip_rewards')
    .select(`
      id,
      profile_id,
      rank,
      profiles:profile_id(nickname, email)
    `)
    .order('rank', { ascending: true })

  console.log(`vip_rewards 총: ${rewards?.length || 0}개\n`)

  // 이메일 패턴별 분류
  const rgfamilyKr: typeof rewards = []
  const rgfamilyLocal: typeof rewards = []
  const rgfamilyInternal: typeof rewards = []
  const testEmail: typeof rewards = []
  const others: typeof rewards = []

  for (const r of rewards || []) {
    const email = (r.profiles as any)?.email || ''
    if (email.endsWith('@rgfamily.kr')) {
      rgfamilyKr.push(r)
    } else if (email.endsWith('@rgfamily.local')) {
      rgfamilyLocal.push(r)
    } else if (email.endsWith('@rgfamily.internal')) {
      rgfamilyInternal.push(r)
    } else if (email.includes('@rg-family.test')) {
      testEmail.push(r)
    } else {
      others.push(r)
    }
  }

  console.log('📊 이메일 패턴별 분류:')
  console.log(`   @rgfamily.kr: ${rgfamilyKr.length}개 (새 계정)`)
  console.log(`   @rgfamily.local: ${rgfamilyLocal.length}개 (임시)`)
  console.log(`   @rgfamily.internal: ${rgfamilyInternal.length}개 (내부)`)
  console.log(`   @rg-family.test: ${testEmail.length}개 (테스트)`)
  console.log(`   기타: ${others.length}개`)

  // 새 계정(@rgfamily.kr)에 연결된 vip_rewards
  console.log('\n✅ 새 계정(@rgfamily.kr)의 vip_rewards:')
  if (rgfamilyKr.length === 0) {
    console.log('   (없음)')
  } else {
    for (const r of rgfamilyKr) {
      const profile = r.profiles as any
      console.log(`   ${r.rank}위: ${profile?.nickname} (${profile?.email})`)
    }
  }

  // 닉네임별 중복 확인
  console.log('\n📌 닉네임별 vip_rewards 중복 확인:')
  const nicknameCount = new Map<string, number>()
  for (const r of rewards || []) {
    const nickname = (r.profiles as any)?.nickname || 'unknown'
    nicknameCount.set(nickname, (nicknameCount.get(nickname) || 0) + 1)
  }

  const duplicates = [...nicknameCount.entries()].filter(([, count]) => count > 1)
  if (duplicates.length === 0) {
    console.log('   중복 없음')
  } else {
    for (const [nickname, count] of duplicates) {
      console.log(`   ⚠️ ${nickname}: ${count}개`)
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
