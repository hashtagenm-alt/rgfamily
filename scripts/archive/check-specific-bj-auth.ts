/**
 * 특정 BJ 이메일로 Auth 계정 확인
 */

import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = getServiceClient()

const BJ_EMAILS = [
  'qwerdf1101@rgfamily.kr',
  'xxchosun@rgfamily.kr',
  'acron5@rgfamily.kr',
]

async function main() {
  console.log('Auth 사용자 총 수 확인...')

  // 페이지별로 모든 사용자 조회
  let allUsers: any[] = []
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    })

    if (error) {
      console.error('Error:', error.message)
      break
    }

    allUsers = allUsers.concat(data.users)

    if (data.users.length < perPage) break
    page++
  }

  console.log(`총 Auth 사용자 수: ${allUsers.length}`)

  // rgfamily.kr 도메인 사용자 찾기
  const rgfamilyUsers = allUsers.filter(u => u.email?.includes('rgfamily.kr'))
  console.log(`\nrgfamily.kr 도메인 사용자: ${rgfamilyUsers.length}명`)

  for (const user of rgfamilyUsers) {
    console.log(`  ${user.email} (ID: ${user.id})`)
  }

  // 특정 이메일 확인
  console.log('\n특정 이메일 확인:')
  for (const email of BJ_EMAILS) {
    const found = allUsers.find(u => u.email === email)
    console.log(`  ${email}: ${found ? '✅ 있음 (ID: ' + found.id + ')' : '❌ 없음'}`)
  }
}

main().catch(console.error)
