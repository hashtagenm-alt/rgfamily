/**
 * 어드민 계정 10개 일괄 생성
 *
 * 사용법: npx tsx scripts/create-admin-accounts.ts
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

// 생성할 어드민 계정 목록
const adminAccounts = [
  { email: 'admin01@rg-family.local', password: 'admin123!', nickname: '관리자1' },
  { email: 'admin02@rg-family.local', password: 'admin123!', nickname: '관리자2' },
  { email: 'admin03@rg-family.local', password: 'admin123!', nickname: '관리자3' },
  { email: 'admin04@rg-family.local', password: 'admin123!', nickname: '관리자4' },
  { email: 'admin05@rg-family.local', password: 'admin123!', nickname: '관리자5' },
  { email: 'admin06@rg-family.local', password: 'admin123!', nickname: '관리자6' },
  { email: 'admin07@rg-family.local', password: 'admin123!', nickname: '관리자7' },
  { email: 'admin08@rg-family.local', password: 'admin123!', nickname: '관리자8' },
  { email: 'admin09@rg-family.local', password: 'admin123!', nickname: '관리자9' },
  { email: 'admin10@rg-family.local', password: 'admin123!', nickname: '관리자10' },
]

async function createAdminAccounts() {
  console.log('═══════════════════════════════════════════')
  console.log('  어드민 계정 10개 일괄 생성')
  console.log('═══════════════════════════════════════════\n')

  // 기존 계정 목록 조회
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingEmails = new Set(existingUsers?.users.map(u => u.email) || [])

  let created = 0
  let skipped = 0
  let failed = 0

  for (const account of adminAccounts) {
    // 이미 존재하는 계정인지 확인
    if (existingEmails.has(account.email)) {
      console.log(`⏭️  ${account.nickname} (${account.email}) - 이미 존재`)
      skipped++
      continue
    }

    // 새 계정 생성
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        nickname: account.nickname,
        role: 'admin',
      },
    })

    if (error) {
      console.log(`❌ ${account.nickname} (${account.email}) - 실패: ${error.message}`)
      failed++
      continue
    }

    // profiles 테이블에도 추가
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        nickname: account.nickname,
        email: account.email,
        role: 'admin',
        unit: null,
        total_donation: 0,
      })

      if (profileError) {
        console.log(`⚠️  ${account.nickname} - 프로필 추가 실패: ${profileError.message}`)
      }
    }

    console.log(`✅ ${account.nickname} (${account.email}) - 생성 완료`)
    created++
  }

  console.log('\n═══════════════════════════════════════════')
  console.log(`  결과: 생성 ${created}개 / 건너뜀 ${skipped}개 / 실패 ${failed}개`)
  console.log('═══════════════════════════════════════════')

  console.log('\n📝 로그인 정보:')
  console.log('┌──────────────────────────────────────────────┐')
  console.log('│  이메일                      │  비밀번호     │')
  console.log('├──────────────────────────────────────────────┤')
  for (const account of adminAccounts) {
    console.log(`│  ${account.email.padEnd(26)}│  ${account.password.padEnd(12)}│`)
  }
  console.log('└──────────────────────────────────────────────┘')
}

createAdminAccounts().catch(console.error)
