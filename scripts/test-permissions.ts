/**
 * 권한별 기능 테스트 스크립트
 *
 * 각 권한별로 접근 가능/불가능한 기능 테스트
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

interface TestResult {
  test: string
  expected: boolean
  actual: boolean
  passed: boolean
}

async function runTests() {
  console.log('🔐 권한별 기능 테스트 시작...\n')

  const results: TestResult[] = []

  // ==================== 1. 관리자 테스트 ====================
  console.log('👑 [1/4] 관리자 권한 테스트...')
  {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    await supabase.auth.signInWithPassword({
      email: 'admin@rgfamily.com',
      password: 'rg4583!'
    })

    // 관리자: profiles 전체 조회 가능
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, nickname, role')
      .limit(5)

    const canReadProfiles = !error && profiles && profiles.length > 0
    results.push({
      test: '관리자: 프로필 목록 조회',
      expected: true,
      actual: canReadProfiles,
      passed: canReadProfiles === true
    })
    console.log(`  ${canReadProfiles ? '✅' : '❌'} 프로필 목록 조회: ${canReadProfiles}`)

    // 관리자: organization 조회 가능
    const { data: org, error: orgError } = await supabase
      .from('organization')
      .select('*')
      .limit(5)

    const canReadOrg = !orgError && org && org.length > 0
    results.push({
      test: '관리자: 조직도 조회',
      expected: true,
      actual: canReadOrg,
      passed: canReadOrg === true
    })
    console.log(`  ${canReadOrg ? '✅' : '❌'} 조직도 조회: ${canReadOrg}`)

    await supabase.auth.signOut()
  }

  // ==================== 2. BJ 테스트 ====================
  console.log('\n🎤 [2/4] BJ 권한 테스트...')
  {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    await supabase.auth.signInWithPassword({
      email: 'qwerdf1101@rgfamily.kr',
      password: 'rg7163!'
    })

    const { data: { user } } = await supabase.auth.getUser()

    // BJ: organization에 연결되어 있어야 함
    const { data: orgLink } = await supabase
      .from('organization')
      .select('id, name')
      .eq('profile_id', user?.id)
      .single()

    const isLinkedToOrg = !!orgLink
    results.push({
      test: 'BJ: organization 연결 확인',
      expected: true,
      actual: isLinkedToOrg,
      passed: isLinkedToOrg === true
    })
    console.log(`  ${isLinkedToOrg ? '✅' : '❌'} organization 연결: ${orgLink?.name || 'N/A'}`)

    // BJ: role이 'bj'인지 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single()

    const isBjRole = profile?.role === 'bj'
    results.push({
      test: 'BJ: role이 bj인지 확인',
      expected: true,
      actual: isBjRole,
      passed: isBjRole === true
    })
    console.log(`  ${isBjRole ? '✅' : '❌'} role = bj: ${profile?.role}`)

    await supabase.auth.signOut()
  }

  // ==================== 3. VIP 테스트 ====================
  console.log('\n💎 [3/4] VIP 권한 테스트...')
  {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    await supabase.auth.signInWithPassword({
      email: 'vip2@rg-family.test',
      password: 'rg9609!'
    })

    const { data: { user } } = await supabase.auth.getUser()

    // VIP: role이 'vip'인지 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, nickname')
      .eq('id', user?.id)
      .single()

    const isVipRole = profile?.role === 'vip'
    results.push({
      test: 'VIP: role이 vip인지 확인',
      expected: true,
      actual: isVipRole,
      passed: isVipRole === true
    })
    console.log(`  ${isVipRole ? '✅' : '❌'} role = vip: ${profile?.role} (${profile?.nickname})`)

    // VIP: 자신의 메시지 조회 가능
    const { data: messages } = await supabase
      .from('bj_thank_you_messages')
      .select('id')
      .eq('vip_profile_id', user?.id)
      .limit(1)

    // 메시지가 없어도 에러 없으면 성공
    const canQueryMessages = messages !== null
    results.push({
      test: 'VIP: 자신의 메시지 조회',
      expected: true,
      actual: canQueryMessages,
      passed: canQueryMessages === true
    })
    console.log(`  ${canQueryMessages ? '✅' : '❌'} 메시지 조회 가능`)

    await supabase.auth.signOut()
  }

  // ==================== 4. 일반 회원 테스트 ====================
  console.log('\n👤 [4/4] 일반 회원 권한 테스트...')
  {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    await supabase.auth.signInWithPassword({
      email: 'member01@rg-family.test',
      password: 'rg7390!'
    })

    const { data: { user } } = await supabase.auth.getUser()

    // 일반 회원: role이 'member'인지 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, nickname')
      .eq('id', user?.id)
      .single()

    const isMemberRole = profile?.role === 'member'
    results.push({
      test: '일반 회원: role이 member인지 확인',
      expected: true,
      actual: isMemberRole,
      passed: isMemberRole === true
    })
    console.log(`  ${isMemberRole ? '✅' : '❌'} role = member: ${profile?.role} (${profile?.nickname})`)

    // 일반 회원: organization에 연결 안 되어 있어야 함
    const { data: orgLink } = await supabase
      .from('organization')
      .select('id')
      .eq('profile_id', user?.id)
      .single()

    const notLinkedToOrg = !orgLink
    results.push({
      test: '일반 회원: BJ 아님 (organization 연결 없음)',
      expected: true,
      actual: notLinkedToOrg,
      passed: notLinkedToOrg === true
    })
    console.log(`  ${notLinkedToOrg ? '✅' : '❌'} BJ 아님 (organization 연결 없음)`)

    await supabase.auth.signOut()
  }

  // ==================== 결과 요약 ====================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 테스트 결과 요약:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  for (const r of results) {
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.test}`)
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ 성공: ${passed}개`)
  if (failed > 0) {
    console.log(`❌ 실패: ${failed}개`)
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (failed === 0) {
    console.log('\n🎉 모든 권한 테스트 통과!')
  }
}

runTests().catch(console.error)
