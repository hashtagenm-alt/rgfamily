/**
 * 로그인 테스트 스크립트
 *
 * 각 권한별 계정으로 로그인 테스트
 */

import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv'

const supabase = getServiceClient()

interface TestAccount {
  category: string
  email: string
  password: string
  expectedRole: string
}

async function testLogin(account: TestAccount): Promise<boolean> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  })

  if (error) {
    console.log(`  ❌ ${account.category}: 로그인 실패 - ${error.message}`)
    return false
  }

  // 프로필 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, role')
    .eq('id', data.user.id)
    .single()

  if (!profile) {
    console.log(`  ⚠️  ${account.category}: 프로필 없음`)
    await supabase.auth.signOut()
    return false
  }

  const roleMatch = profile.role === account.expectedRole
  if (roleMatch) {
    console.log(`  ✅ ${account.category}: ${profile.nickname} (role: ${profile.role})`)
  } else {
    console.log(`  ⚠️  ${account.category}: ${profile.nickname} - role 불일치 (기대: ${account.expectedRole}, 실제: ${profile.role})`)
  }

  await supabase.auth.signOut()
  return roleMatch
}

async function main() {
  console.log('🔐 로그인 테스트 시작...\n')

  // 최신 CSV에서 테스트 계정 추출
  const testAccounts: TestAccount[] = [
    // 관리자
    { category: '관리자', email: 'admin@rgfamily.com', password: 'rg4583!', expectedRole: 'admin' },
    // BJ
    { category: 'BJ (린아)', email: 'qwerdf1101@rgfamily.kr', password: 'rg7163!', expectedRole: 'bj' },
    { category: 'BJ (가애)', email: 'acron5@rgfamily.kr', password: 'rg7807!', expectedRole: 'bj' },
    // VIP
    { category: 'VIP (시즌 1위)', email: 'vip2@rg-family.test', password: 'rg9609!', expectedRole: 'vip' },
    { category: 'VIP (시즌 10위)', email: 'vip.rearcar.4nv0@rgfamily.local', password: 'rg8646!', expectedRole: 'vip' },
    // 일반 회원
    { category: '일반 회원', email: 'member01@rg-family.test', password: 'rg7390!', expectedRole: 'member' },
  ]

  let passed = 0
  let failed = 0

  for (const account of testAccounts) {
    const success = await testLogin(account)
    if (success) passed++
    else failed++
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📊 결과: ${passed}/${testAccounts.length} 성공`)
  if (failed > 0) {
    console.log(`❌ ${failed}개 실패`)
  } else {
    console.log('✅ 모든 로그인 테스트 통과!')
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
