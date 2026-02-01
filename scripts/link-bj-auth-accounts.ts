/**
 * BJ Auth 계정 생성 및 기존 Profile/Organization 연결
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
  console.log('🔗 BJ Auth 계정 생성 및 연결')
  console.log('═══════════════════════════════════════════════════════════\n')

  for (const bj of BJ_ACCOUNTS) {
    console.log(`\n👤 ${bj.nickname} 처리 중...`)

    // 1. 기존 Profile 찾기 (닉네임으로)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, nickname, role')
      .eq('nickname', bj.nickname)
      .eq('role', 'bj')
      .single()

    if (!existingProfile) {
      console.log(`   ⚠️ Profile 없음 - 스킵`)
      continue
    }

    const oldProfileId = existingProfile.id
    console.log(`   기존 Profile ID: ${oldProfileId}`)

    // 2. 기존 Organization 찾기
    const { data: existingOrg } = await supabase
      .from('organization')
      .select('id, name, profile_id')
      .eq('name', bj.nickname)
      .eq('is_active', true)
      .single()

    if (!existingOrg) {
      console.log(`   ⚠️ Organization 없음 - 스킵`)
      continue
    }

    console.log(`   기존 Organization ID: ${existingOrg.id}`)

    // 3. 새 Auth 계정 생성 (이메일로)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: bj.email,
      password: bj.password,
      email_confirm: true,
      user_metadata: {
        nickname: bj.nickname,
        role: 'bj'
      }
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log(`   ⚠️ Auth 계정 이미 존재 - 기존 계정 사용`)

        // 기존 Auth 계정 찾기
        const { data: authUsers } = await supabase.auth.admin.listUsers()
        const existingAuth = authUsers?.users.find(u => u.email === bj.email)

        if (existingAuth) {
          const newAuthId = existingAuth.id

          // Profile 업데이트 (새 Auth ID로)
          if (oldProfileId !== newAuthId) {
            // 기존 Profile 삭제 후 새 ID로 생성
            await supabase.from('profiles').delete().eq('id', oldProfileId)

            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: newAuthId,
                nickname: bj.nickname,
                role: 'bj',
                updated_at: new Date().toISOString()
              }, { onConflict: 'id' })

            if (profileError) {
              console.log(`   ❌ Profile 업데이트 실패: ${profileError.message}`)
            } else {
              console.log(`   ✅ Profile 업데이트 완료`)
            }
          }

          // Organization profile_id 업데이트
          const { error: orgError } = await supabase
            .from('organization')
            .update({ profile_id: newAuthId })
            .eq('id', existingOrg.id)

          if (orgError) {
            console.log(`   ❌ Organization 연결 실패: ${orgError.message}`)
          } else {
            console.log(`   ✅ Organization 연결 완료`)
          }
        }
      } else {
        console.log(`   ❌ Auth 생성 실패: ${authError.message}`)
      }
      continue
    }

    const newAuthId = authData.user.id
    console.log(`   새 Auth ID: ${newAuthId}`)

    // 4. 기존 Profile 삭제
    await supabase.from('profiles').delete().eq('id', oldProfileId)

    // 5. 새 Profile 생성 (Auth ID와 동일)
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newAuthId,
        nickname: bj.nickname,
        role: 'bj',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.log(`   ❌ Profile 생성 실패: ${profileError.message}`)
    } else {
      console.log(`   ✅ Profile 생성 완료`)
    }

    // 6. Organization profile_id 업데이트
    const { error: orgError } = await supabase
      .from('organization')
      .update({ profile_id: newAuthId })
      .eq('id', existingOrg.id)

    if (orgError) {
      console.log(`   ❌ Organization 연결 실패: ${orgError.message}`)
    } else {
      console.log(`   ✅ Organization 연결 완료`)
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('✅ BJ 계정 연결 완료!')
  console.log('═══════════════════════════════════════════════════════════')
}

main().catch(console.error)
