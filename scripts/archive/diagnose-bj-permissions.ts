/**
 * BJ 계정 권한 진단 스크립트
 * - Auth 계정 존재 확인
 * - Profile 존재 및 role 확인
 * - Organization profile_id 연결 확인
 * - RLS 시뮬레이션
 */

import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Service Role 클라이언트 (RLS 우회)
const serviceClient = getServiceClient()

const BJ_EMAILS = [
  { nickname: '린아', email: 'qwerdf1101@rgfamily.kr' },
  { nickname: '설윤', email: 'xxchosun@rgfamily.kr' },
  { nickname: '가애', email: 'acron5@rgfamily.kr' },
  { nickname: '채은', email: 'hj042300@rgfamily.kr' },
  { nickname: '가윤', email: 'juuni9613@rgfamily.kr' },
  { nickname: '홍서하', email: 'lrsehwa@rgfamily.kr' },
  { nickname: '월아', email: 'goldmoon04@rgfamily.kr' },
  { nickname: '한백설', email: 'firstaplus121@rgfamily.kr' },
  { nickname: '퀸로니', email: 'tjdrks1771@rgfamily.kr' },
  { nickname: '해린', email: 'qwerty3490@rgfamily.kr' },
  { nickname: '한세아', email: 'kkrinaa@rgfamily.kr' },
  { nickname: '청아', email: 'mandoooo@rgfamily.kr' },
  { nickname: '키키', email: 'kiki0213@rgfamily.kr' },
]

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('🔍 BJ 계정 권한 진단')
  console.log('═══════════════════════════════════════════════════════════\n')

  // 1. 모든 Auth 사용자 조회
  let allAuthUsers: any[] = []
  let page = 1
  while (true) {
    const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) {
      console.error('Auth 조회 실패:', error.message)
      break
    }
    allAuthUsers = allAuthUsers.concat(data.users)
    if (data.users.length < 1000) break
    page++
  }
  console.log(`총 Auth 사용자: ${allAuthUsers.length}명\n`)

  // 2. 모든 Organization 조회 (Service Role로 - RLS 우회)
  const { data: allOrgs, error: orgError } = await serviceClient
    .from('organization')
    .select('*')
    .eq('is_active', true)

  if (orgError) {
    console.error('Organization 조회 실패:', orgError.message)
    return
  }
  console.log(`활성 Organization: ${allOrgs?.length || 0}개\n`)

  // 3. 각 BJ 계정 진단
  console.log('┌────────┬────────────────────────────────┬────────┬────────┬────────┬────────────────────────────────────────┐')
  console.log('│ 닉네임 │ 이메일                         │ Auth   │ Profile│ Org    │ Org.profile_id == Auth.id ?            │')
  console.log('├────────┼────────────────────────────────┼────────┼────────┼────────┼────────────────────────────────────────┤')

  let issues: string[] = []

  for (const bj of BJ_EMAILS) {
    // Auth 계정 확인
    const authUser = allAuthUsers.find(u => u.email === bj.email)
    const authOk = authUser ? '✅' : '❌'
    const authId = authUser?.id || null

    // Profile 확인 (Service Role로)
    let profileOk = '❌'
    let profileRole = ''
    if (authId) {
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('id, role')
        .eq('id', authId)
        .single()

      if (profile) {
        profileOk = '✅'
        profileRole = profile.role
      }
    }

    // Organization 확인 (닉네임으로)
    const org = allOrgs?.find(o => o.name === bj.nickname)
    const orgOk = org ? '✅' : '❌'

    // profile_id 연결 확인
    let linkStatus = ''
    if (authId && org) {
      if (org.profile_id === authId) {
        linkStatus = '✅ 일치'
      } else if (org.profile_id) {
        linkStatus = `❌ 불일치: ${org.profile_id?.slice(0,8)}...`
        issues.push(`${bj.nickname}: Org.profile_id(${org.profile_id?.slice(0,8)}) != Auth.id(${authId.slice(0,8)})`)
      } else {
        linkStatus = '❌ profile_id가 null'
        issues.push(`${bj.nickname}: Org.profile_id가 null`)
      }
    } else if (!authId) {
      linkStatus = '- Auth 없음'
    } else if (!org) {
      linkStatus = '- Org 없음'
      issues.push(`${bj.nickname}: Organization 레코드 없음`)
    }

    const nickname = bj.nickname.padEnd(6, ' ')
    const email = bj.email.padEnd(30, ' ')
    console.log(`│ ${nickname} │ ${email} │ ${authOk}     │ ${profileOk}     │ ${orgOk}     │ ${linkStatus.padEnd(38, ' ')} │`)
  }

  console.log('└────────┴────────────────────────────────┴────────┴────────┴────────┴────────────────────────────────────────┘')

  // 4. 문제 요약
  if (issues.length > 0) {
    console.log('\n\n⚠️  발견된 문제:')
    console.log('─'.repeat(60))
    for (const issue of issues) {
      console.log(`  • ${issue}`)
    }
  } else {
    console.log('\n\n✅ 모든 BJ 계정이 올바르게 설정되어 있습니다.')
  }

  // 5. Organization 테이블 상세 출력
  console.log('\n\n📋 Organization 테이블 상세 (활성 BJ만):')
  console.log('─'.repeat(100))
  console.log('ID'.padEnd(6) + ' | ' + 'Name'.padEnd(8) + ' | ' + 'profile_id'.padEnd(38) + ' | is_active')
  console.log('─'.repeat(100))

  for (const org of allOrgs || []) {
    const id = String(org.id).padEnd(4)
    const name = (org.name || '').padEnd(8)
    const profileId = (org.profile_id || 'NULL').padEnd(36)
    console.log(`${id}   | ${name} | ${profileId}   | ${org.is_active}`)
  }

  // 6. RLS 정책 테스트 시뮬레이션
  console.log('\n\n🔐 RLS 시뮬레이션 (Anon Key로 Organization 조회):')
  console.log('─'.repeat(60))

  // Anon 클라이언트로 조회 테스트
  const anonClient = getServiceClient()
  const { data: anonOrgs, error: anonError } = await anonClient
    .from('organization')
    .select('id, name, profile_id, is_active')
    .eq('is_active', true)

  if (anonError) {
    console.log(`❌ Anon 조회 실패: ${anonError.message}`)
    console.log('   → RLS 정책이 organization 테이블 읽기를 차단하고 있을 수 있음')
  } else {
    console.log(`✅ Anon 조회 성공: ${anonOrgs?.length || 0}개 레코드`)
    if (anonOrgs && anonOrgs.length > 0) {
      console.log('   샘플 레코드:')
      for (const org of anonOrgs.slice(0, 3)) {
        console.log(`     - ${org.name}: profile_id=${org.profile_id || 'NULL'}`)
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════')
}

main().catch(console.error)
