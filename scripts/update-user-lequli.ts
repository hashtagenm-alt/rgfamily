/**
 * 르큐리 계정을 실제 로그인 가능한 계정으로 변경
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  const userId = '30cf13d0-50bf-40e7-be20-6e4f50b38446'
  const newEmail = 'lequli@rgfamily.kr'
  const newPassword = 'rgfamily2026!'

  console.log('=== 르큐리 계정 변경 ===\n')

  // 1. Update auth user email and password
  console.log('1. Auth 사용자 정보 업데이트...')
  const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(
    userId,
    {
      email: newEmail,
      password: newPassword,
      email_confirm: true
    }
  )

  if (authError) {
    console.error('Auth 업데이트 실패:', authError.message)
    return
  }

  console.log('✅ Auth 업데이트 완료')

  // 2. Update profile to real account
  console.log('\n2. 프로필 업데이트...')
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      email: newEmail,
      account_type: 'real'
    })
    .eq('id', userId)

  if (profileError) {
    console.error('프로필 업데이트 실패:', profileError.message)
    return
  }

  console.log('✅ 프로필 업데이트 완료')

  // 3. Verify
  console.log('\n3. 검증...')
  const { data: authUser } = await supabase.auth.admin.getUserById(userId)
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single()

  console.log('\n=== 변경된 계정 정보 ===')
  console.log(`이메일: ${authUser?.user.email}`)
  console.log(`비밀번호: ${newPassword}`)
  console.log(`닉네임: ${profile?.nickname}`)
  console.log(`역할: ${profile?.role}`)
  console.log(`계정 유형: ${profile?.account_type}`)
  console.log('\n✅ 이제 로그인 가능합니다!')
}

main().catch(console.error)
