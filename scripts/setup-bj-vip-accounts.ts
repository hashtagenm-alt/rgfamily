/**
 * BJ 및 VIP 계정 설정 스크립트
 *
 * 기능:
 * 1. BJ 계정 생성 (조직도 이미지 연동, 닉네임 = BJ명)
 * 2. VIP Top 3 계정 role=vip 설정
 * 3. organization.profile_id 연동
 *
 * 사용법: npx tsx scripts/setup-bj-vip-accounts.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수 누락')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 임시 비밀번호 생성
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pwd = ''
  for (let i = 0; i < 10; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pwd
}

interface CreatedAccount {
  type: 'BJ' | 'VIP'
  nickname: string
  email: string
  password: string
  role: string
  avatarUrl: string | null
  orgId?: number
}

async function main() {
  console.log('🚀 BJ 및 VIP 계정 설정 시작...\n')

  const createdAccounts: CreatedAccount[] = []

  // ==================== 1. BJ 계정 설정 ====================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('👤 BJ 계정 설정')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 조직도에서 BJ 목록 조회
  const { data: bjMembers, error: bjError } = await supabase
    .from('organization')
    .select('id, name, role, image_url, social_links, unit, profile_id')
    .eq('is_active', true)
    .order('position_order')

  if (bjError) {
    console.error('❌ BJ 조회 실패:', bjError.message)
    return
  }

  console.log(`📋 활성 BJ ${bjMembers?.length || 0}명 확인\n`)

  for (const bj of bjMembers || []) {
    const pandatvId = (bj.social_links as { pandatv?: string })?.pandatv || ''
    const isRep = bj.role === '대표'
    const role = isRep ? 'admin' : 'member'

    // 이미 profile_id가 연결되어 있는지 확인
    if (bj.profile_id) {
      console.log(`  ⏭️  ${bj.name}: 이미 프로필 연결됨 (${bj.profile_id.slice(0, 8)}...)`)

      // 프로필 업데이트 (닉네임, 아바타, 역할)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          nickname: bj.name,
          avatar_url: bj.image_url,
          role: role,
          unit: bj.unit,
          pandatv_id: pandatvId || null,
        })
        .eq('id', bj.profile_id)

      if (updateError) {
        console.log(`     ⚠️  프로필 업데이트 실패: ${updateError.message}`)
      } else {
        console.log(`     ✅ 프로필 업데이트 완료 (닉네임: ${bj.name}, 역할: ${role})`)
      }
      continue
    }

    // 새 계정 생성
    const email = pandatvId
      ? `${pandatvId}@pandatv.kr`
      : `bj.${bj.name.replace(/[^a-zA-Z0-9가-힣]/g, '')}@rgfamily.kr`
    const password = generatePassword()

    console.log(`  📝 ${bj.name} 계정 생성 중...`)

    // Supabase Auth 계정 생성
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // 이메일 확인 건너뛰기
      user_metadata: {
        nickname: bj.name,
        role: role,
      }
    })

    if (authError) {
      console.log(`     ⚠️  Auth 생성 실패: ${authError.message}`)
      continue
    }

    const userId = authData.user.id

    // 프로필 생성/업데이트
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        nickname: bj.name,
        email: email,
        avatar_url: bj.image_url,
        role: role,
        unit: bj.unit,
        pandatv_id: pandatvId || null,
        account_type: 'real',
      })

    if (profileError) {
      console.log(`     ⚠️  프로필 생성 실패: ${profileError.message}`)
      continue
    }

    // organization에 profile_id 연동
    const { error: orgUpdateError } = await supabase
      .from('organization')
      .update({ profile_id: userId })
      .eq('id', bj.id)

    if (orgUpdateError) {
      console.log(`     ⚠️  조직도 연동 실패: ${orgUpdateError.message}`)
    }

    createdAccounts.push({
      type: 'BJ',
      nickname: bj.name,
      email: email,
      password: password,
      role: role,
      avatarUrl: bj.image_url,
      orgId: bj.id,
    })

    console.log(`     ✅ 생성 완료`)
    console.log(`        이메일: ${email}`)
    console.log(`        역할: ${role}`)
    console.log(`        아바타: ${bj.image_url ? '✓' : '✗'}`)
  }

  // ==================== 2. VIP Top 3 계정 설정 ====================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('👑 VIP Top 3 권한 설정')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 시즌 랭킹 Top 3 조회
  const { data: top3, error: rankError } = await supabase
    .from('season_rankings_public')
    .select('rank, donor_name')
    .order('rank')
    .limit(3)

  if (rankError) {
    console.error('❌ 랭킹 조회 실패:', rankError.message)
  } else {
    console.log('📋 시즌 Top 3:')
    for (const ranker of top3 || []) {
      console.log(`   ${ranker.rank}위: ${ranker.donor_name}`)
    }
    console.log('')

    // 각 Top 3 후원자의 프로필을 vip로 업데이트
    for (const ranker of top3 || []) {
      // 닉네임으로 프로필 찾기
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, nickname, role')
        .eq('nickname', ranker.donor_name)
        .single()

      if (profileError || !profile) {
        console.log(`  ⚠️  ${ranker.donor_name}: 프로필 없음 (계정 생성 필요)`)
        continue
      }

      if (profile.role === 'vip') {
        console.log(`  ✅ ${ranker.donor_name}: 이미 VIP`)
        continue
      }

      // VIP로 업데이트
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'vip' })
        .eq('id', profile.id)

      if (updateError) {
        console.log(`  ⚠️  ${ranker.donor_name}: VIP 업데이트 실패 - ${updateError.message}`)
      } else {
        console.log(`  ✅ ${ranker.donor_name}: VIP 권한 부여 완료`)
      }
    }
  }

  // ==================== 3. 결과 출력 ====================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 결과 요약')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (createdAccounts.length === 0) {
    console.log('ℹ️  새로 생성된 계정이 없습니다.')
    console.log('   (이미 연결된 계정들은 업데이트되었습니다)')
  } else {
    console.log(`✅ 새로 생성된 계정: ${createdAccounts.length}개\n`)

    // CSV 형식으로 출력
    console.log('구분,닉네임,이메일,비밀번호,역할')
    for (const acc of createdAccounts) {
      console.log(`${acc.type},${acc.nickname},${acc.email},${acc.password},${acc.role}`)
    }
  }

  console.log('\n⚠️  주의사항:')
  console.log('   1. 비밀번호는 첫 로그인 후 변경 권장')
  console.log('   2. BJ 아바타는 조직도 이미지와 동기화됨')
  console.log('   3. VIP Top 3는 자동으로 role=vip 설정됨')
}

main().catch(console.error)
