/**
 * admin/admin 어드민 계정 생성
 *
 * Supabase Auth에 admin@rg-family.local / admin 계정 추가
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

async function createAdminAccount() {
  console.log('🔄 admin 계정 생성 중...\n')

  // Supabase Auth에서는 이메일 형식이 필요함
  const email = 'admin@rg-family.local'
  const password = 'admin123'  // Supabase 비밀번호 정책: 최소 6자

  // 기존 계정 확인 및 생성
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existing = existingUsers?.users.find(u => u.email === email)

  if (existing) {
    console.log('⚠️ admin 계정이 이미 존재합니다.')
    console.log(`   이메일: ${email}`)
    console.log(`   ID: ${existing.id}`)

    // 비밀번호 재설정
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existing.id,
      { password: password }
    )

    if (updateError) {
      console.log('❌ 비밀번호 재설정 실패:', updateError.message)
    } else {
      console.log('✅ 비밀번호를 admin으로 재설정했습니다.')
    }
    return
  }

  // 새 계정 생성
  const { data, error } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, // 이메일 확인 건너뛰기
    user_metadata: {
      nickname: '관리자',
      role: 'admin',
    },
  })

  if (error) {
    console.log('❌ 계정 생성 실패:', error.message)
    return
  }

  console.log('✅ admin 계정 생성 완료!')
  console.log(`   이메일: ${email}`)
  console.log(`   비밀번호: ${password}`)
  console.log(`   ID: ${data.user?.id}`)

  // profiles 테이블에도 추가
  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      nickname: '관리자',
      role: 'admin',
      unit: null,
    })

    if (profileError) {
      console.log('⚠️ 프로필 추가 실패:', profileError.message)
    } else {
      console.log('✅ 프로필 추가 완료')
    }
  }

  console.log('\n📝 로그인 정보:')
  console.log('   아이디: admin@rg-family.local (또는 admin)')
  console.log('   비밀번호: admin123')
}

createAdminAccount()
