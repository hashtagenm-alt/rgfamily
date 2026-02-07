/**
 * BJ API 쿼리 시뮬레이션 테스트
 */

import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Service Role 클라이언트
const serviceClient = getServiceClient()

// Anon Key 클라이언트 (API와 동일)
const anonClient = getServiceClient()

async function main() {
  // 모든 Auth 사용자 조회 (페이지네이션)
  let allUsers: any[] = []
  let page = 1
  while (true) {
    const { data } = await serviceClient.auth.admin.listUsers({ page, perPage: 1000 })
    allUsers = allUsers.concat(data.users)
    if (data.users.length < 1000) break
    page++
  }

  // 린아 Auth ID 찾기
  const lina = allUsers.find(u => u.email === 'qwerdf1101@rgfamily.kr')

  if (!lina) {
    console.log('린아 계정 없음')
    return
  }

  console.log('=== 린아 계정 API 쿼리 시뮬레이션 ===')
  console.log('Auth ID:', lina.id)

  // 1. Profile 쿼리 (API와 동일)
  console.log('\n1. Profile 쿼리:')
  const { data: profile, error: profileError } = await anonClient
    .from('profiles')
    .select('role')
    .eq('id', lina.id)
    .single()

  console.log('   결과:', profile)
  if (profileError) console.log('   에러:', profileError.message)

  // 2. Organization 쿼리 (API와 동일)
  console.log('\n2. Organization 쿼리:')
  const { data: bjMember, error: orgError } = await anonClient
    .from('organization')
    .select('id')
    .eq('profile_id', lina.id)
    .eq('is_active', true)
    .single()

  console.log('   결과:', bjMember)
  if (orgError) console.log('   에러:', orgError.message)

  // 3. 권한 판단
  const isAdmin = profile && ['admin', 'superadmin'].includes(profile.role)
  const isBjMember = Boolean(bjMember)

  console.log('\n3. 권한 판단:')
  console.log('   isAdmin:', isAdmin)
  console.log('   isBjMember:', isBjMember)
  console.log('   canUpload:', isAdmin || isBjMember)

  // 4. 모든 BJ 테스트
  console.log('\n\n=== 모든 BJ 계정 테스트 ===')

  const bjEmails = [
    'qwerdf1101@rgfamily.kr',
    'xxchosun@rgfamily.kr',
    'acron5@rgfamily.kr',
    'hj042300@rgfamily.kr',
    'juuni9613@rgfamily.kr',
  ]

  for (const email of bjEmails) {
    const authUser = allUsers.find(u => u.email === email)
    if (!authUser) {
      console.log(`${email}: Auth 없음`)
      continue
    }

    const { data: org, error: err } = await anonClient
      .from('organization')
      .select('id, name')
      .eq('profile_id', authUser.id)
      .eq('is_active', true)
      .single()

    if (err) {
      console.log(`${email}: Organization 조회 실패 - ${err.message}`)
    } else {
      console.log(`${email}: ${org.name} (org.id=${org.id}) ✅`)
    }
  }
}

main().catch(console.error)
