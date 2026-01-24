/**
 * 테스트 계정 생성
 *
 * - 일반 회원 5명
 * - 종합 VIP 중 미생성 계정
 *
 * 사용법: npx tsx scripts/create-test-accounts.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// 간단한 비밀번호 생성
function generatePassword(): string {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `rg${num}!`
}

interface AccountResult {
  nickname: string
  email: string
  password: string
  role: string
  status: 'created' | 'exists' | 'failed'
}

async function main() {
  console.log('🔧 테스트 계정 생성 시작...\n')

  const results: AccountResult[] = []

  // ==================== 1. 일반 회원 테스트 계정 ====================
  console.log('👤 일반 회원 테스트 계정 생성...')
  const testMembers = [
    { nickname: '테스트회원1', email: 'member01@rg-family.test' },
    { nickname: '테스트회원2', email: 'member02@rg-family.test' },
    { nickname: '테스트회원3', email: 'member03@rg-family.test' },
    { nickname: '테스트회원4', email: 'member04@rg-family.test' },
    { nickname: '테스트회원5', email: 'member05@rg-family.test' },
  ]

  for (const member of testMembers) {
    const password = generatePassword()

    // 기존 계정 확인
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', member.email)
      .single()

    if (existing) {
      console.log(`  ⏭️  ${member.nickname}: 이미 존재`)
      results.push({ ...member, password: '(기존)', role: 'member', status: 'exists' })
      continue
    }

    // 계정 생성
    const { data: user, error } = await supabase.auth.admin.createUser({
      email: member.email,
      password: password,
      email_confirm: true,
      user_metadata: { nickname: member.nickname }
    })

    if (error) {
      console.log(`  ❌ ${member.nickname}: ${error.message}`)
      results.push({ ...member, password: '-', role: 'member', status: 'failed' })
      continue
    }

    // 프로필 업데이트
    await supabase
      .from('profiles')
      .update({
        nickname: member.nickname,
        email: member.email,
        role: 'member'
      })
      .eq('id', user.user.id)

    console.log(`  ✅ ${member.nickname}: ${password}`)
    results.push({ ...member, password, role: 'member', status: 'created' })
  }

  // ==================== 2. 종합 VIP 미생성 계정 ====================
  console.log('\n🏆 종합 VIP 미생성 계정 확인...')

  // 종합 랭킹 Top 10 조회
  const { data: totalRankers } = await supabase
    .from('total_rankings_public')
    .select('rank, donor_name')
    .order('rank')
    .limit(10)

  // 시즌 랭킹 조회 (중복 제외용)
  const { data: seasonRankers } = await supabase
    .from('season_rankings_public')
    .select('donor_name')
    .limit(10)

  const seasonNames = new Set((seasonRankers || []).map(r => r.donor_name))

  for (const ranker of totalRankers || []) {
    if (seasonNames.has(ranker.donor_name)) continue

    // 기존 프로필 확인
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('nickname', ranker.donor_name)
      .single()

    if (existing) {
      console.log(`  ⏭️  ${ranker.donor_name}: 이미 존재`)
      results.push({
        nickname: ranker.donor_name,
        email: existing.email || '(등록됨)',
        password: '(기존)',
        role: 'vip',
        status: 'exists'
      })
      continue
    }

    // 이메일 생성 (영문+숫자만, 없으면 vip + rank)
    let sanitized = ranker.donor_name
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 8)
      .toLowerCase()
    if (!sanitized) {
      sanitized = `vip${ranker.rank}`
    }
    const timestamp = Date.now().toString(36).slice(-6)
    const email = `${sanitized}.${timestamp}@rgfamily.local`
    const password = generatePassword()

    // 계정 생성
    const { data: user, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { nickname: ranker.donor_name }
    })

    if (error) {
      console.log(`  ❌ ${ranker.donor_name}: ${error.message}`)
      results.push({ nickname: ranker.donor_name, email, password: '-', role: 'vip', status: 'failed' })
      continue
    }

    // 프로필 업데이트
    await supabase
      .from('profiles')
      .update({
        nickname: ranker.donor_name,
        email: email,
        role: 'vip'
      })
      .eq('id', user.user.id)

    console.log(`  ✅ ${ranker.donor_name}: ${email} / ${password}`)
    results.push({ nickname: ranker.donor_name, email, password, role: 'vip', status: 'created' })
  }

  // ==================== 결과 출력 ====================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋 생성 결과:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const created = results.filter(r => r.status === 'created')
  const exists = results.filter(r => r.status === 'exists')
  const failed = results.filter(r => r.status === 'failed')

  console.log(`  ✅ 새로 생성: ${created.length}개`)
  console.log(`  ⏭️  기존 존재: ${exists.length}개`)
  console.log(`  ❌ 실패: ${failed.length}개`)

  if (created.length > 0) {
    console.log('\n📝 새로 생성된 계정:')
    console.log('닉네임,이메일,비밀번호,권한')
    for (const r of created) {
      console.log(`${r.nickname},${r.email},${r.password},${r.role}`)
    }
  }
}

main().catch(console.error)
