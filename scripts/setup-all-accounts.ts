/**
 * 전체 계정 설정 및 CSV 내보내기
 *
 * 1. BJ 계정 role을 'bj'로 변경
 * 2. 시즌 1-20위 VIP 계정 생성
 * 3. 종합 1-20위 VIP 계정 생성 (중복 제외)
 * 4. 일반 회원 테스트 계정 생성
 * 5. 모든 비밀번호 재설정 및 CSV 저장
 *
 * 사용법: npx tsx scripts/setup-all-accounts.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// 비밀번호 생성: rg + 4자리 숫자 + !
function generatePassword(): string {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `rg${num}!`
}

// 이메일 생성 (닉네임 기반)
function generateEmail(nickname: string, rank: number, prefix: string): string {
  const sanitized = nickname
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8)
    .toLowerCase()
  const timestamp = Date.now().toString(36).slice(-4)
  if (sanitized) {
    return `${prefix}.${sanitized}.${timestamp}@rgfamily.local`
  }
  return `${prefix}${rank}.${timestamp}@rgfamily.local`
}

interface AccountRow {
  category: string
  nickname: string
  email: string
  password: string
  role: string
  note: string
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🚀 전체 계정 설정 시작')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const accounts: AccountRow[] = []
  const processedNicknames = new Set<string>()

  // ==================== 1. BJ 계정 role을 'bj'로 변경 ====================
  console.log('👤 [1/5] BJ 계정 role 변경 (member → bj)...')

  const { data: bjMembers, error: bjError } = await supabase
    .from('organization')
    .select('id, name, profile_id, social_links')
    .eq('is_active', true)
    .not('profile_id', 'is', null)
    .order('position_order')

  if (bjError) {
    console.error('❌ BJ 조회 실패:', bjError.message)
    return
  }

  for (const bj of bjMembers || []) {
    const pandatvId = (bj.social_links as { pandatv?: string })?.pandatv || ''
    const email = `${pandatvId}@rgfamily.kr`
    const password = generatePassword()

    // role을 'bj'로 업데이트
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'bj' })
      .eq('id', bj.profile_id)

    if (updateError) {
      console.log(`  ⚠️  ${bj.name}: role 업데이트 실패 - ${updateError.message}`)
    }

    // 비밀번호 재설정
    const { error: pwError } = await supabase.auth.admin.updateUserById(bj.profile_id, {
      password: password
    })

    if (pwError) {
      console.log(`  ⚠️  ${bj.name}: 비밀번호 업데이트 실패 - ${pwError.message}`)
      accounts.push({
        category: 'BJ',
        nickname: bj.name,
        email: email,
        password: '(업데이트 실패)',
        role: 'bj',
        note: `PandaTV: ${pandatvId}`
      })
      continue
    }

    console.log(`  ✅ ${bj.name}: ${password}`)
    accounts.push({
      category: 'BJ',
      nickname: bj.name,
      email: email,
      password: password,
      role: 'bj',
      note: `PandaTV: ${pandatvId}`
    })
    processedNicknames.add(bj.name)
  }
  console.log(`  완료: ${bjMembers?.length || 0}명\n`)

  // ==================== 2. 관리자 계정 ====================
  console.log('🔐 [2/5] 관리자 계정 비밀번호 재설정...')

  const { data: admins } = await supabase
    .from('profiles')
    .select('id, nickname, email, role')
    .in('role', ['admin', 'superadmin'])

  for (const admin of admins || []) {
    const password = generatePassword()

    const { error } = await supabase.auth.admin.updateUserById(admin.id, {
      password: password
    })

    if (error) {
      console.log(`  ⚠️  ${admin.nickname}: ${error.message}`)
      continue
    }

    console.log(`  ✅ ${admin.nickname}: ${password}`)
    accounts.push({
      category: '관리자',
      nickname: admin.nickname,
      email: admin.email || '',
      password: password,
      role: admin.role,
      note: admin.role === 'superadmin' ? '최고관리자' : '관리자'
    })
    processedNicknames.add(admin.nickname)
  }
  console.log(`  완료: ${admins?.length || 0}명\n`)

  // ==================== 3. 시즌 VIP (1-20위) ====================
  console.log('👑 [3/5] 시즌 VIP 계정 (1-20위)...')

  const { data: seasonRankers } = await supabase
    .from('season_rankings_public')
    .select('rank, donor_name')
    .order('rank')
    .limit(20)

  for (const ranker of seasonRankers || []) {
    if (processedNicknames.has(ranker.donor_name)) {
      console.log(`  ⏭️  ${ranker.donor_name}: 이미 처리됨`)
      continue
    }

    // 기존 프로필 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('nickname', ranker.donor_name)
      .single()

    let userId: string
    let email: string
    const password = generatePassword()

    if (profile) {
      // 기존 계정 - role을 vip로 업데이트하고 비밀번호 재설정
      userId = profile.id
      email = profile.email || generateEmail(ranker.donor_name, ranker.rank, 'season')

      await supabase
        .from('profiles')
        .update({ role: 'vip' })
        .eq('id', userId)

      const { error } = await supabase.auth.admin.updateUserById(userId, { password })
      if (error) {
        console.log(`  ⚠️  ${ranker.donor_name}: 비밀번호 업데이트 실패`)
        continue
      }
    } else {
      // 신규 계정 생성
      email = generateEmail(ranker.donor_name, ranker.rank, 'season')

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { nickname: ranker.donor_name }
      })

      if (createError) {
        console.log(`  ❌ ${ranker.donor_name}: 계정 생성 실패 - ${createError.message}`)
        continue
      }

      userId = newUser.user.id

      // 프로필 업데이트
      await supabase
        .from('profiles')
        .update({
          nickname: ranker.donor_name,
          email: email,
          role: 'vip'
        })
        .eq('id', userId)
    }

    console.log(`  ✅ 시즌 ${ranker.rank}위 ${ranker.donor_name}: ${password}`)
    accounts.push({
      category: '시즌 VIP',
      nickname: ranker.donor_name,
      email: email,
      password: password,
      role: 'vip',
      note: `시즌 ${ranker.rank}위`
    })
    processedNicknames.add(ranker.donor_name)
  }
  console.log(`  완료\n`)

  // ==================== 4. 종합 VIP (1-20위, 중복 제외) ====================
  console.log('🏆 [4/5] 종합 VIP 계정 (1-20위, 중복 제외)...')

  const { data: totalRankers } = await supabase
    .from('total_rankings_public')
    .select('rank, donor_name')
    .order('rank')
    .limit(20)

  let totalVipCount = 0
  for (const ranker of totalRankers || []) {
    if (processedNicknames.has(ranker.donor_name)) {
      console.log(`  ⏭️  종합 ${ranker.rank}위 ${ranker.donor_name}: 이미 처리됨`)
      continue
    }

    // 기존 프로필 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('nickname', ranker.donor_name)
      .single()

    let userId: string
    let email: string
    const password = generatePassword()

    if (profile) {
      // 기존 계정 - role을 vip로 업데이트하고 비밀번호 재설정
      userId = profile.id
      email = profile.email || generateEmail(ranker.donor_name, ranker.rank, 'total')

      await supabase
        .from('profiles')
        .update({ role: 'vip' })
        .eq('id', userId)

      const { error } = await supabase.auth.admin.updateUserById(userId, { password })
      if (error) {
        console.log(`  ⚠️  ${ranker.donor_name}: 비밀번호 업데이트 실패`)
        continue
      }
    } else {
      // 신규 계정 생성
      email = generateEmail(ranker.donor_name, ranker.rank, 'total')

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { nickname: ranker.donor_name }
      })

      if (createError) {
        console.log(`  ❌ ${ranker.donor_name}: 계정 생성 실패 - ${createError.message}`)
        continue
      }

      userId = newUser.user.id

      // 프로필 업데이트
      await supabase
        .from('profiles')
        .update({
          nickname: ranker.donor_name,
          email: email,
          role: 'vip'
        })
        .eq('id', userId)
    }

    console.log(`  ✅ 종합 ${ranker.rank}위 ${ranker.donor_name}: ${password}`)
    accounts.push({
      category: '종합 VIP',
      nickname: ranker.donor_name,
      email: email,
      password: password,
      role: 'vip',
      note: `종합 ${ranker.rank}위`
    })
    processedNicknames.add(ranker.donor_name)
    totalVipCount++
  }
  console.log(`  완료: ${totalVipCount}명 (신규)\n`)

  // ==================== 5. 일반 회원 테스트 계정 ====================
  console.log('👤 [5/5] 일반 회원 테스트 계정...')

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
      // 비밀번호만 재설정
      const { error } = await supabase.auth.admin.updateUserById(existing.id, { password })
      if (error) {
        console.log(`  ⚠️  ${member.nickname}: 비밀번호 업데이트 실패`)
        continue
      }
    } else {
      // 신규 생성
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: member.email,
        password: password,
        email_confirm: true,
        user_metadata: { nickname: member.nickname }
      })

      if (createError) {
        console.log(`  ❌ ${member.nickname}: 계정 생성 실패 - ${createError.message}`)
        continue
      }

      await supabase
        .from('profiles')
        .update({
          nickname: member.nickname,
          email: member.email,
          role: 'member'
        })
        .eq('id', newUser.user.id)
    }

    console.log(`  ✅ ${member.nickname}: ${password}`)
    accounts.push({
      category: '일반 회원',
      nickname: member.nickname,
      email: member.email,
      password: password,
      role: 'member',
      note: '테스트 계정'
    })
  }
  console.log(`  완료\n`)

  // ==================== CSV 생성 ====================
  // 카테고리별 정렬
  const sortOrder = ['관리자', 'BJ', '시즌 VIP', '종합 VIP', '일반 회원']
  accounts.sort((a, b) => {
    const orderA = sortOrder.indexOf(a.category)
    const orderB = sortOrder.indexOf(b.category)
    return orderA - orderB
  })

  const csvLines = ['구분,닉네임,이메일,비밀번호,권한,비고']
  for (const acc of accounts) {
    const nickname = acc.nickname.includes(',') ? `"${acc.nickname}"` : acc.nickname
    csvLines.push(`${acc.category},${nickname},${acc.email},${acc.password},${acc.role},${acc.note}`)
  }

  const outputPath = path.join(process.cwd(), 'data', 'accounts.csv')
  fs.writeFileSync(outputPath, '\ufeff' + csvLines.join('\n'), 'utf-8')

  // ==================== 요약 ====================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ 완료!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const summary = {
    '관리자': accounts.filter(a => a.category === '관리자').length,
    'BJ': accounts.filter(a => a.category === 'BJ').length,
    '시즌 VIP': accounts.filter(a => a.category === '시즌 VIP').length,
    '종합 VIP': accounts.filter(a => a.category === '종합 VIP').length,
    '일반 회원': accounts.filter(a => a.category === '일반 회원').length,
  }

  console.log('\n📊 계정 요약:')
  for (const [cat, count] of Object.entries(summary)) {
    console.log(`  ${cat}: ${count}명`)
  }
  console.log(`  ─────────────`)
  console.log(`  총계: ${accounts.length}명`)

  console.log(`\n📁 CSV 저장됨: ${outputPath}`)

  console.log('\n📋 권한 체계:')
  console.log('  superadmin > admin > moderator > vip > bj > member')

  console.log('\n⚠️  Supabase SQL 실행 필요:')
  console.log('  scripts/sql/add-bj-role.sql')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('📋 계정 목록:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(csvLines.join('\n'))
}

main().catch(console.error)
