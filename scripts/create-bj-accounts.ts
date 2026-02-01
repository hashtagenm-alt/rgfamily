/**
 * BJ 계정 생성 스크립트
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const BJ_ACCOUNTS = [
  { nickname: '린아', email: 'qwerdf1101@rgfamily.kr', password: 'rg7163!' },
  { nickname: '설윤', email: 'xxchosun@rgfamily.kr', password: 'rg4225!' },
  { nickname: '가애', email: 'acron5@rgfamily.kr', password: 'rg7807!' },
  { nickname: '채은', email: 'hj042300@rgfamily.kr', password: 'rg4189!' },
  { nickname: '가윤', email: 'juuni9613@rgfamily.kr', password: 'rg4517!' },
  { nickname: '홍서하', email: 'lrsehwa@rgfamily.kr', password: 'rg4009!' },
  { nickname: '월아', email: 'goldmoon04@rgfamily.kr', password: 'rg4179!' },
  { nickname: '한백설', email: 'firstaplus121@rgfamily.kr', password: 'rg9358!' },
  { nickname: '퀸로니', email: 'tjdrks1771@rgfamily.kr', password: 'rg2717!' },
  { nickname: '해린', email: 'qwerty3490@rgfamily.kr', password: 'rg8155!' },
  { nickname: '한세아', email: 'kkrinaa@rgfamily.kr', password: 'rg4755!' },
  { nickname: '청아', email: 'mandoooo@rgfamily.kr', password: 'rg7578!' },
  { nickname: '키키', email: 'kiki0213@rgfamily.kr', password: 'rg3846!' },
]

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('🎭 BJ 계정 생성')
  console.log('═══════════════════════════════════════════════════════════')

  for (const account of BJ_ACCOUNTS) {
    console.log(`\n👤 ${account.nickname} 계정 생성 중...`)

    // 1. Auth 사용자 생성
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        nickname: account.nickname,
        role: 'bj'
      }
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log(`   ⚠️ 이미 존재하는 계정 - 프로필 업데이트 시도`)

        // 기존 사용자 찾기
        const { data: users } = await supabase.auth.admin.listUsers()
        const existingUser = users?.users.find(u => u.email === account.email)

        if (existingUser) {
          // 프로필 업데이트
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: existingUser.id,
              nickname: account.nickname,
              role: 'bj',
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' })

          if (profileError) {
            console.log(`   ❌ 프로필 업데이트 실패: ${profileError.message}`)
          } else {
            console.log(`   ✅ 프로필 업데이트 완료`)
          }
        }
        continue
      }
      console.log(`   ❌ Auth 생성 실패: ${authError.message}`)
      continue
    }

    // 2. Profile 생성/업데이트
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        nickname: account.nickname,
        role: 'bj',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (profileError) {
      console.log(`   ⚠️ 프로필 생성 실패: ${profileError.message}`)
    } else {
      console.log(`   ✅ 계정 생성 완료 (ID: ${authData.user.id})`)
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('✅ BJ 계정 생성 완료!')
  console.log('═══════════════════════════════════════════════════════════')
}

main().catch(console.error)
