/**
 * 랭킹에 있지만 프로필이 없는 사용자들의 프로필 생성 스크립트 v2
 *
 * profiles 테이블은 auth.users와 FK 관계가 있으므로
 * Supabase Auth Admin API로 사용자를 먼저 생성합니다.
 *
 * 대상:
 * - 신세련❤️영원한니꺼✦쿨 (종합 18위, 시즌 16위)
 * - 박하은❤️린아❤️사탕 (종합 24위, 시즌 22위)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { randomUUID } from 'crypto'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

// 생성할 프로필 목록
const missingProfiles = [
  {
    nickname: '신세련❤️영원한니꺼✦쿨',
    email: `donor_${Date.now()}_1@rgfamily.local`,
  },
  {
    nickname: '박하은❤️린아❤️사탕',
    email: `donor_${Date.now()}_2@rgfamily.local`,
  },
]

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  console.log('🔧 누락된 프로필 생성 시작 (Auth API 사용)...')
  if (dryRun) {
    console.log('   (DRY RUN 모드 - 실제 변경 없음)\n')
  } else {
    console.log('   (실제 변경 적용됨)\n')
  }

  for (const profile of missingProfiles) {
    console.log(`\n👤 ${profile.nickname}:`)

    // 1. 이미 존재하는지 확인
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, nickname')
      .eq('nickname', profile.nickname)
      .single()

    if (existing) {
      console.log(`   ✅ 이미 존재: ${existing.id}`)

      // 랭킹 테이블 연결 확인
      await linkToRankings(profile.nickname, existing.id)
      continue
    }

    if (dryRun) {
      console.log(`   🔍 Auth 사용자 생성 예정: ${profile.email}`)
      console.log(`   🔍 프로필 생성 예정`)
      console.log(`   🔍 종합/시즌 랭킹 연결 예정`)
      continue
    }

    // 2. Auth 사용자 생성
    console.log(`   📝 Auth 사용자 생성 중: ${profile.email}`)

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: profile.email,
      password: randomUUID(), // 임의의 비밀번호 (로그인 불가)
      email_confirm: true,
      user_metadata: {
        nickname: profile.nickname,
        is_placeholder: true, // 플레이스홀더 사용자임을 표시
      }
    })

    if (authError) {
      console.log(`   ❌ Auth 사용자 생성 실패: ${authError.message}`)
      continue
    }

    const userId = authUser.user.id
    console.log(`   ✅ Auth 사용자 생성 완료: ${userId}`)

    // 3. 프로필 생성 (트리거가 자동 생성할 수도 있음)
    // 트리거가 없다면 직접 생성
    const { data: createdProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (!createdProfile) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          nickname: profile.nickname,
          role: 'member',
        })

      if (profileError) {
        console.log(`   ❌ 프로필 생성 실패: ${profileError.message}`)
        continue
      }
      console.log(`   ✅ 프로필 생성 완료`)
    } else {
      // 트리거로 생성된 경우 닉네임 업데이트
      await supabase
        .from('profiles')
        .update({ nickname: profile.nickname })
        .eq('id', userId)
      console.log(`   ✅ 프로필 닉네임 업데이트 완료`)
    }

    // 4. 랭킹 테이블 연결
    await linkToRankings(profile.nickname, userId)
  }

  // 결과 확인
  if (!dryRun) {
    console.log('\n📊 결과 확인:')
    for (const profile of missingProfiles) {
      const { data } = await supabase
        .from('profiles')
        .select('id, nickname, role')
        .eq('nickname', profile.nickname)
        .single()

      if (data) {
        console.log(`   ✅ ${data.nickname}: ${data.id} (${data.role})`)
      } else {
        console.log(`   ❌ ${profile.nickname}: 생성 실패`)
      }
    }
  }

  if (dryRun) {
    console.log('\n💡 실제 적용하려면 --dry-run 옵션 없이 실행하세요:')
    console.log('   npx tsx scripts/create-missing-profiles-v2.ts')
  }

  console.log('\n✅ 누락된 프로필 생성 작업 완료!')
}

async function linkToRankings(nickname: string, profileId: string) {
  // 종합 랭킹에 donor_id 연결
  const { data: totalData, error: totalError } = await supabase
    .from('total_donation_rankings')
    .update({ donor_id: profileId })
    .eq('donor_name', nickname)
    .select()

  if (totalError) {
    console.log(`   ⚠️ 종합 랭킹 연결 실패: ${totalError.message}`)
  } else if (totalData && totalData.length > 0) {
    console.log(`   ✅ 종합 랭킹 donor_id 연결 완료 (${totalData.length}개)`)
  }

  // 시즌 랭킹에 donor_id 연결
  const { data: seasonData, error: seasonError } = await supabase
    .from('season_donation_rankings')
    .update({ donor_id: profileId })
    .eq('donor_name', nickname)
    .select()

  if (seasonError) {
    console.log(`   ⚠️ 시즌 랭킹 연결 실패: ${seasonError.message}`)
  } else if (seasonData && seasonData.length > 0) {
    console.log(`   ✅ 시즌 랭킹 donor_id 연결 완료 (${seasonData.length}개)`)
  }
}

main().catch(console.error)
