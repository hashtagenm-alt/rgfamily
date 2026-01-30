/**
 * VIP 프로필 시드 스크립트
 * 10개의 VIP 계정 생성 (Supabase Auth + profiles)
 *
 * 실행: npx tsx scripts/seed-vip-profiles.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// VIP 프로필 10개
const vipProfiles = [
  { nickname: '골든하트', unit: 'excel', donation: 500000 },
  { nickname: '다이아몬드팬', unit: 'excel', donation: 450000 },
  { nickname: '플래티넘서포터', unit: 'crew', donation: 400000 },
  { nickname: '루비스타', unit: 'excel', donation: 350000 },
  { nickname: '에메랄드드림', unit: 'crew', donation: 300000 },
  { nickname: '사파이어러브', unit: 'excel', donation: 280000 },
  { nickname: '진주빛하늘', unit: 'excel', donation: 250000 },
  { nickname: '오팔별빛', unit: 'crew', donation: 220000 },
  { nickname: '크리스탈팬심', unit: 'excel', donation: 200000 },
  { nickname: '실버문라이트', unit: 'crew', donation: 180000 },
]

async function seedVipProfiles() {
  console.log('🌟 VIP 프로필 시드 시작...\n')

  const createdUsers: { id: string; nickname: string; email: string; donation: number }[] = []

  for (let i = 0; i < vipProfiles.length; i++) {
    const vip = vipProfiles[i]
    const email = `vip${i + 1}@rg-family.test`
    const password = `VipTest${i + 1}!`

    // 1. Auth 사용자 생성
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 확인 건너뛰기
    })

    if (authError) {
      console.error(`❌ ${vip.nickname} Auth 생성 실패:`, authError.message)
      continue
    }

    const userId = authData.user.id

    // 2. profiles 테이블 업데이트 (Auth 트리거가 기본 프로필 생성했을 수 있음)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        nickname: vip.nickname,
        email: email,
        avatar_url: null,
        role: 'vip',
        unit: vip.unit,
        total_donation: vip.donation,
        updated_at: new Date().toISOString(),
      })

    if (profileError) {
      console.error(`❌ ${vip.nickname} 프로필 업데이트 실패:`, profileError.message)
      continue
    }

    createdUsers.push({ id: userId, nickname: vip.nickname, email, donation: vip.donation })
    console.log(`✅ ${i + 1}. ${vip.nickname} 생성 완료`)
    console.log(`   📧 Email: ${email}`)
    console.log(`   🔑 Password: ${password}`)
    console.log(`   💰 Donation: ${vip.donation.toLocaleString()}원\n`)
  }

  console.log('━'.repeat(50))
  console.log(`🎉 총 ${createdUsers.length}개 VIP 계정 생성 완료!`)
  console.log('━'.repeat(50))
}

seedVipProfiles()
