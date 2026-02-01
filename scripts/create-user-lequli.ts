/**
 * 르큐리 계정 생성
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
  const nickname = '르큐리'
  const email = 'lequli@rgfamily.kr'
  const password = 'rgfamily2026!'

  console.log('=== 르큐리 계정 생성 ===\n')

  // 1. Check if nickname already exists in profiles
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, nickname')
    .eq('nickname', nickname)
    .single()

  if (existingProfile) {
    console.log(`이미 존재하는 프로필: ${existingProfile.nickname} (id: ${existingProfile.id})`)
    return
  }

  // 2. Create auth user
  console.log('1. Auth 사용자 생성 중...')
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nickname }
  })

  if (authError) {
    console.error('Auth 사용자 생성 실패:', authError.message)
    return
  }

  const userId = authData.user.id
  console.log(`✅ Auth 사용자 생성 완료: ${userId}`)

  // 3. Create profile
  console.log('\n2. 프로필 생성 중...')
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      nickname,
      role: 'vip'
    })

  if (profileError) {
    console.error('프로필 생성 실패:', profileError.message)
    return
  }

  console.log(`✅ 프로필 생성 완료: ${nickname}`)

  // 4. Verify
  console.log('\n3. 검증...')
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  console.log('생성된 프로필:', profile)

  console.log('\n=== 계정 정보 ===')
  console.log(`이메일: ${email}`)
  console.log(`비밀번호: ${password}`)
  console.log(`닉네임: ${nickname}`)
  console.log(`역할: vip`)
}

main().catch(console.error)
