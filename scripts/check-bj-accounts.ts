/**
 * BJ 계정 상태 확인 스크립트
 */

import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = getServiceClient()

const EXPECTED_BJ_EMAILS = [
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
  console.log('🔍 BJ 계정 상태 확인')
  console.log('═══════════════════════════════════════════════════════════\n')

  // Auth 사용자 목록 조회
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
  if (authError) {
    console.error('Auth 조회 실패:', authError.message)
    return
  }

  const authUsers = authData.users

  // Organization 조회
  const { data: orgData } = await supabase
    .from('organization')
    .select('id, name, profile_id, is_active')
    .eq('is_active', true)

  // Profile 조회
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, nickname, role')
    .eq('role', 'bj')

  console.log('닉네임\t\t이메일\t\t\t\t\tAuth\tProfile\tOrg연결')
  console.log('─'.repeat(80))

  for (const expected of EXPECTED_BJ_EMAILS) {
    const authUser = authUsers.find(u => u.email === expected.email)
    const profile = profileData?.find(p => p.nickname === expected.nickname)
    const org = orgData?.find(o => o.name === expected.nickname)

    const authOk = authUser ? '✅' : '❌'
    const profileOk = profile ? '✅' : '❌'
    const orgOk = org && org.profile_id === authUser?.id ? '✅' : '❌'

    const nickname = expected.nickname.padEnd(6, ' ')
    console.log(`${nickname}\t${expected.email.padEnd(30, ' ')}\t${authOk}\t${profileOk}\t${orgOk}`)

    if (authUser && org && org.profile_id !== authUser.id) {
      console.log(`  ⚠️ Organization profile_id 불일치: ${org.profile_id} vs ${authUser.id}`)
    }
  }

  // 중복 이메일 확인
  console.log('\n\n=== 중복 계정 확인 ===')
  const emailCounts: Record<string, number> = {}
  for (const user of authUsers) {
    if (user.email) {
      emailCounts[user.email] = (emailCounts[user.email] || 0) + 1
    }
  }
  const duplicates = Object.entries(emailCounts).filter(([, count]) => count > 1)
  if (duplicates.length > 0) {
    console.log('중복 이메일 발견:')
    for (const [email, count] of duplicates) {
      console.log(`  ${email}: ${count}개`)
    }
  } else {
    console.log('중복 이메일 없음 ✅')
  }

  console.log('\n═══════════════════════════════════════════════════════════')
}

main().catch(console.error)
