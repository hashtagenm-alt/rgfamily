/**
 * 전체 계정 CSV 내보내기
 *
 * BJ, 관리자, VIP Top 랭커 계정을 하나의 CSV로 통합
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

interface AccountRow {
  category: string
  nickname: string
  email: string
  password: string
  role: string
  note: string
}

// VIP 이메일 생성 (특수문자 제거)
function generateVipEmail(nickname: string): string {
  const sanitized = nickname
    .replace(/[^\w가-힣]/g, '')
    .slice(0, 10)
    .toLowerCase()
  const timestamp = Date.now().toString(36).slice(-6)
  return `vip.${sanitized || 'user'}.${timestamp}@rgfamily.local`
}

async function main() {
  console.log('📊 전체 계정 CSV 내보내기...\n')

  const accounts: AccountRow[] = []

  // ==================== 1. 관리자 계정 ====================
  console.log('🔐 관리자 계정 조회...')
  const { data: admins } = await supabase
    .from('profiles')
    .select('nickname, email, role')
    .in('role', ['admin', 'superadmin'])

  for (const admin of admins || []) {
    accounts.push({
      category: '관리자',
      nickname: admin.nickname,
      email: admin.email || '',
      password: '(기존 비밀번호)',
      role: admin.role,
      note: admin.role === 'superadmin' ? '최고관리자' : '관리자'
    })
  }
  console.log(`  ✅ 관리자 ${admins?.length || 0}명\n`)

  // ==================== 2. BJ 계정 ====================
  console.log('👤 BJ 계정 조회...')
  const { data: bjMembers } = await supabase
    .from('organization')
    .select('name, profile_id, social_links')
    .eq('is_active', true)
    .not('profile_id', 'is', null)
    .order('position_order')

  // BJ 프로필 정보 조회
  const bjProfileIds = (bjMembers || []).map(b => b.profile_id).filter(Boolean)
  const { data: bjProfiles } = await supabase
    .from('profiles')
    .select('id, email, role')
    .in('id', bjProfileIds)

  const bjProfileMap = new Map((bjProfiles || []).map(p => [p.id, p]))

  for (const bj of bjMembers || []) {
    const profile = bjProfileMap.get(bj.profile_id)
    const pandatvId = (bj.social_links as { pandatv?: string })?.pandatv || ''

    accounts.push({
      category: 'BJ',
      nickname: bj.name,
      email: profile?.email || `${pandatvId}@rgfamily.kr`,
      password: '(별도 전달)',
      role: profile?.role || 'member',
      note: `PandaTV: ${pandatvId}`
    })
  }
  console.log(`  ✅ BJ ${bjMembers?.length || 0}명\n`)

  // ==================== 3. 시즌 랭커 VIP (Top 10) ====================
  console.log('👑 시즌 랭커 VIP 조회...')
  const { data: seasonRankers } = await supabase
    .from('season_rankings_public')
    .select('rank, donor_name')
    .order('rank')
    .limit(10)

  for (const ranker of seasonRankers || []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('nickname', ranker.donor_name)
      .single()

    accounts.push({
      category: '시즌 VIP',
      nickname: ranker.donor_name,
      email: profile?.email || generateVipEmail(ranker.donor_name),
      password: '(기존 비밀번호)',
      role: profile?.role || 'vip',
      note: `시즌 ${ranker.rank}위`
    })
  }
  console.log(`  ✅ 시즌 VIP ${seasonRankers?.length || 0}명\n`)

  // ==================== 4. 종합 랭커 VIP (Top 10) ====================
  console.log('🏆 종합 랭커 VIP 조회...')
  const { data: totalRankers } = await supabase
    .from('total_rankings_public')
    .select('rank, donor_name')
    .order('rank')
    .limit(10)

  // 시즌 랭커와 중복 제거
  const seasonNames = new Set((seasonRankers || []).map(r => r.donor_name))

  for (const ranker of totalRankers || []) {
    if (seasonNames.has(ranker.donor_name)) continue // 중복 스킵

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('nickname', ranker.donor_name)
      .single()

    accounts.push({
      category: '종합 VIP',
      nickname: ranker.donor_name,
      email: profile?.email || generateVipEmail(ranker.donor_name),
      password: '(기존 비밀번호)',
      role: profile?.role || 'vip',
      note: `종합 ${ranker.rank}위`
    })
  }
  console.log(`  ✅ 종합 VIP ${(totalRankers || []).filter(r => !seasonNames.has(r.donor_name)).length}명\n`)

  // ==================== 5. 일반 회원 테스트 계정 ====================
  console.log('👤 일반 회원 테스트 계정 추가...')
  const testMembers = [
    { nickname: '테스트회원1', email: 'member01@rg-family.test' },
    { nickname: '테스트회원2', email: 'member02@rg-family.test' },
    { nickname: '테스트회원3', email: 'member03@rg-family.test' },
    { nickname: '테스트회원4', email: 'member04@rg-family.test' },
    { nickname: '테스트회원5', email: 'member05@rg-family.test' },
  ]

  for (const member of testMembers) {
    accounts.push({
      category: '일반 회원',
      nickname: member.nickname,
      email: member.email,
      password: '(기존 비밀번호)',
      role: 'member',
      note: '테스트 계정'
    })
  }
  console.log(`  ✅ 일반 회원 ${testMembers.length}명\n`)

  // ==================== CSV 생성 ====================
  const csvLines = ['구분,닉네임,이메일,비밀번호,권한,비고']
  for (const acc of accounts) {
    // 특수문자 처리
    const nickname = acc.nickname.includes(',') ? `"${acc.nickname}"` : acc.nickname
    csvLines.push(`${acc.category},${nickname},${acc.email},${acc.password},${acc.role},${acc.note}`)
  }

  const outputPath = path.join(process.cwd(), 'data', 'accounts.csv')
  fs.writeFileSync(outputPath, '\ufeff' + csvLines.join('\n'), 'utf-8')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ 완료! 총 ${accounts.length}개 계정`)
  console.log(`📁 저장: ${outputPath}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 테이블 형태로 출력
  console.log('📋 계정 목록:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(csvLines.join('\n'))
}

main().catch(console.error)
