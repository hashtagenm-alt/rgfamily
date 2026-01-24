/**
 * profiles 테이블에 is_bj 컬럼 추가
 *
 * BJ 계정과 일반 회원을 명확히 구분하기 위함
 *
 * 사용법: npx tsx scripts/add-is-bj-column.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function main() {
  console.log('🔧 profiles 테이블에 is_bj 컬럼 추가...\n')

  // 1. is_bj 컬럼 추가 (SQL로 직접 실행 필요)
  console.log('⚠️  다음 SQL을 Supabase Dashboard에서 실행해주세요:\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_bj BOOLEAN DEFAULT FALSE;
  `)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 2. 기존 BJ 계정에 is_bj = true 설정
  console.log('📋 기존 BJ 계정 조회...')
  const { data: bjMembers, error } = await supabase
    .from('organization')
    .select('name, profile_id')
    .eq('is_active', true)
    .not('profile_id', 'is', null)

  if (error) {
    console.error('❌ 조회 실패:', error.message)
    return
  }

  console.log(`  ✅ BJ ${bjMembers?.length || 0}명 발견\n`)

  // 3. 각 BJ 프로필에 is_bj = true 설정
  console.log('🔄 is_bj 컬럼 업데이트...')
  for (const bj of bjMembers || []) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_bj: true })
      .eq('id', bj.profile_id)

    if (updateError) {
      console.log(`  ❌ ${bj.name}: ${updateError.message}`)
    } else {
      console.log(`  ✅ ${bj.name}: is_bj = true`)
    }
  }

  // 4. 결과 확인
  console.log('\n📋 BJ 계정 확인:')
  const { data: bjProfiles } = await supabase
    .from('profiles')
    .select('nickname, role, is_bj')
    .eq('is_bj', true)

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('닉네임 | 권한 | is_bj')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  for (const p of bjProfiles || []) {
    console.log(`${p.nickname} | ${p.role} | ${p.is_bj}`)
  }

  console.log('\n✅ 완료!')
  console.log('\n📌 권한 체계 정리:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  • role = "admin"    → 관리자')
  console.log('  • role = "vip"      → VIP 후원자')
  console.log('  • role = "member" + is_bj = true  → BJ')
  console.log('  • role = "member" + is_bj = false → 일반 시청자')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
