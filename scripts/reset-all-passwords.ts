/**
 * 전체 계정 비밀번호 재설정 및 CSV 내보내기
 *
 * 모든 계정(관리자, BJ, VIP, 일반회원)의 비밀번호를 재설정하고
 * 실제 비밀번호가 포함된 CSV 파일 생성
 *
 * 사용법: npx tsx scripts/reset-all-passwords.ts
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

interface AccountRow {
  category: string
  nickname: string
  email: string
  password: string
  role: string
  note: string
}

async function main() {
  console.log('🔐 전체 계정 비밀번호 재설정...\n')

  const accounts: AccountRow[] = []

  // ==================== 1. 관리자 계정 ====================
  console.log('🔐 관리자 계정 비밀번호 재설정...')
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
      accounts.push({
        category: '관리자',
        nickname: admin.nickname,
        email: admin.email || '',
        password: '(업데이트 실패)',
        role: admin.role,
        note: admin.role === 'superadmin' ? '최고관리자' : '관리자'
      })
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
  }
  console.log(`  완료: ${admins?.length || 0}명\n`)

  // ==================== 2. BJ 계정 ====================
  console.log('👤 BJ 계정 비밀번호 재설정...')
  const { data: bjMembers } = await supabase
    .from('organization')
    .select('name, profile_id, social_links')
    .eq('is_active', true)
    .not('profile_id', 'is', null)
    .order('position_order')

  for (const bj of bjMembers || []) {
    const pandatvId = (bj.social_links as { pandatv?: string })?.pandatv || ''
    const email = `${pandatvId}@rgfamily.kr`
    const password = generatePassword()

    const { error } = await supabase.auth.admin.updateUserById(bj.profile_id, {
      password: password
    })

    if (error) {
      console.log(`  ⚠️  ${bj.name}: ${error.message}`)
      accounts.push({
        category: 'BJ',
        nickname: bj.name,
        email: email,
        password: '(업데이트 실패)',
        role: 'member (BJ)',
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
      role: 'member (BJ)',
      note: `PandaTV: ${pandatvId}`
    })
  }
  console.log(`  완료: ${bjMembers?.length || 0}명\n`)

  // ==================== 3. VIP 계정 (시즌 + 종합) ====================
  console.log('👑 VIP 계정 비밀번호 재설정...')

  // 시즌 Top 10
  const { data: seasonRankers } = await supabase
    .from('season_rankings_public')
    .select('rank, donor_name')
    .order('rank')
    .limit(10)

  const processedVips = new Set<string>()

  for (const ranker of seasonRankers || []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('nickname', ranker.donor_name)
      .single()

    if (!profile) {
      console.log(`  ⏭️  ${ranker.donor_name}: 프로필 없음`)
      continue
    }

    const password = generatePassword()
    const { error } = await supabase.auth.admin.updateUserById(profile.id, {
      password: password
    })

    if (error) {
      console.log(`  ⚠️  ${ranker.donor_name}: ${error.message}`)
      continue
    }

    console.log(`  ✅ ${ranker.donor_name}: ${password}`)
    accounts.push({
      category: '시즌 VIP',
      nickname: ranker.donor_name,
      email: profile.email || '',
      password: password,
      role: profile.role || 'vip',
      note: `시즌 ${ranker.rank}위`
    })
    processedVips.add(ranker.donor_name)
  }

  // 종합 Top 10 (중복 제외)
  const { data: totalRankers } = await supabase
    .from('total_rankings_public')
    .select('rank, donor_name')
    .order('rank')
    .limit(10)

  for (const ranker of totalRankers || []) {
    if (processedVips.has(ranker.donor_name)) continue

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('nickname', ranker.donor_name)
      .single()

    if (!profile) {
      console.log(`  ⏭️  ${ranker.donor_name}: 프로필 없음`)
      continue
    }

    const password = generatePassword()
    const { error } = await supabase.auth.admin.updateUserById(profile.id, {
      password: password
    })

    if (error) {
      console.log(`  ⚠️  ${ranker.donor_name}: ${error.message}`)
      continue
    }

    console.log(`  ✅ ${ranker.donor_name}: ${password}`)
    accounts.push({
      category: '종합 VIP',
      nickname: ranker.donor_name,
      email: profile.email || '',
      password: password,
      role: profile.role || 'vip',
      note: `종합 ${ranker.rank}위`
    })
  }
  console.log(`  VIP 완료\n`)

  // ==================== 4. 일반 회원 테스트 계정 ====================
  console.log('👤 일반 회원 테스트 계정...')
  const { data: testMembers } = await supabase
    .from('profiles')
    .select('id, nickname, email, role')
    .like('email', '%@rg-family.test')
    .eq('role', 'member')

  for (const member of testMembers || []) {
    const password = generatePassword()

    const { error } = await supabase.auth.admin.updateUserById(member.id, {
      password: password
    })

    if (error) {
      console.log(`  ⚠️  ${member.nickname}: ${error.message}`)
      continue
    }

    console.log(`  ✅ ${member.nickname}: ${password}`)
    accounts.push({
      category: '일반 회원',
      nickname: member.nickname,
      email: member.email || '',
      password: password,
      role: 'member',
      note: '테스트 계정'
    })
  }
  console.log(`  완료: ${testMembers?.length || 0}명\n`)

  // ==================== CSV 생성 ====================
  const csvLines = ['구분,닉네임,이메일,비밀번호,권한,비고']
  for (const acc of accounts) {
    const nickname = acc.nickname.includes(',') ? `"${acc.nickname}"` : acc.nickname
    csvLines.push(`${acc.category},${nickname},${acc.email},${acc.password},${acc.role},${acc.note}`)
  }

  const outputPath = path.join(process.cwd(), 'data', 'accounts.csv')
  fs.writeFileSync(outputPath, '\ufeff' + csvLines.join('\n'), 'utf-8')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ 완료! 총 ${accounts.length}개 계정`)
  console.log(`📁 저장: ${outputPath}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('📋 계정 목록:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(csvLines.join('\n'))
}

main().catch(console.error)
