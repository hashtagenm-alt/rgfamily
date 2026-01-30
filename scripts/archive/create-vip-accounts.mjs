#!/usr/bin/env node
/**
 * VIP 계정 자동 생성 스크립트
 *
 * 회원가입하지 않은 시즌 랭커들의 계정을 미리 생성합니다.
 * - auth.users 생성 (가상 이메일)
 * - profiles 생성 (닉네임 = donor_name)
 * - donations.donor_id 연결
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Service Role 클라이언트 (Admin API 사용 가능)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
})

/**
 * 닉네임을 이메일-safe 문자열로 변환
 * 이메일은 ASCII만 허용되므로 한글은 해시로 변환
 */
function nicknameToEmail(nickname) {
  // 한글과 특수문자를 제거하고 영문/숫자만 추출
  const asciiOnly = nickname.replace(/[^a-zA-Z0-9]/g, '')

  // 영문/숫자가 없으면 해시 사용
  let safe = asciiOnly.toLowerCase() || 'vip'

  // 최소 3글자 보장
  if (safe.length < 3) {
    safe = 'vip' + safe
  }

  // 랜덤 suffix 추가 (중복 방지)
  const suffix = Math.random().toString(36).substring(2, 8)
  const timestamp = Date.now().toString(36)

  return `${safe}.${suffix}.${timestamp}@rgfamily.local`
}

/**
 * 랜덤 임시 비밀번호 생성
 */
function generateTempPassword() {
  return `VIP_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`
}

async function main() {
  console.log('🚀 VIP 계정 자동 생성 시작...\n')

  // 1. 상위 10위권 랭커 조회 (amount 기준)
  const TOP_LIMIT = 10

  const { data: topDonors, error: fetchError } = await supabase
    .from('donations')
    .select('donor_name, amount, donor_id')
    .order('amount', { ascending: false })
    .limit(TOP_LIMIT)

  if (fetchError) {
    console.error('❌ donations 조회 실패:', fetchError.message)
    process.exit(1)
  }

  // 미연결된 상위 10위권만 필터
  const unconnectedDonors = topDonors.filter(d => d.donor_id === null)

  console.log(`📋 상위 ${TOP_LIMIT}위 중 미연결 VIP: ${unconnectedDonors.length}명\n`)
  console.log('상위 10위 현황:')
  topDonors.forEach((d, i) => {
    const status = d.donor_id ? '✅' : '❌'
    console.log(`  ${i + 1}위: ${d.donor_name} (${d.amount}) ${status}`)
  })
  console.log('')

  if (unconnectedDonors.length === 0) {
    console.log('✅ 모든 VIP가 이미 연결되어 있습니다.')
    return
  }

  // 결과 추적
  const results = {
    success: [],
    failed: [],
    skipped: []
  }

  // 2. 각 VIP에 대해 계정 생성
  for (const donor of unconnectedDonors) {
    const { donor_name, amount } = donor
    console.log(`\n👤 처리 중: ${donor_name} (amount: ${amount})`)

    try {
      // 2-1. 이미 같은 닉네임의 프로필이 있는지 확인
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, nickname')
        .eq('nickname', donor_name)
        .single()

      if (existingProfile) {
        console.log(`   ⏭️  이미 프로필 존재 (id: ${existingProfile.id})`)

        // donations 연결만 업데이트
        await supabase
          .from('donations')
          .update({ donor_id: existingProfile.id })
          .eq('donor_name', donor_name)
          .is('donor_id', null)

        results.skipped.push({ donor_name, reason: 'profile exists', profileId: existingProfile.id })
        continue
      }

      // 2-2. auth.users 생성 (이메일로 기존 사용자 확인)
      const email = nicknameToEmail(donor_name)
      const password = generateTempPassword()

      // 먼저 이메일로 기존 사용자 확인 시도 (실패해도 계속 진행)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,  // 이메일 확인 스킵
        user_metadata: {
          nickname: donor_name,
          is_vip_placeholder: true,  // 나중에 실제 사용자가 인계받을 때 식별용
          created_by: 'vip-auto-create-script'
        }
      })

      if (authError) {
        console.error(`   ❌ auth.users 생성 실패: ${authError.message}`)
        results.failed.push({ donor_name, error: authError.message })
        continue
      }

      const userId = authData.user.id
      console.log(`   ✅ auth.users 생성 (id: ${userId})`)

      // 2-3. profiles 생성
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          nickname: donor_name,
          role: 'vip',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        console.error(`   ❌ profiles 생성 실패: ${profileError.message}`)
        results.failed.push({ donor_name, error: profileError.message })
        continue
      }

      console.log(`   ✅ profiles 생성 (nickname: ${donor_name})`)

      // 2-4. donations 연결
      const { error: updateError } = await supabase
        .from('donations')
        .update({ donor_id: userId })
        .eq('donor_name', donor_name)
        .is('donor_id', null)

      if (updateError) {
        console.error(`   ⚠️  donations 연결 실패: ${updateError.message}`)
      } else {
        console.log(`   ✅ donations 연결 완료`)
      }

      results.success.push({
        donor_name,
        userId,
        email,
        password  // 나중에 전달용으로 저장
      })

    } catch (err) {
      console.error(`   ❌ 예외 발생: ${err.message}`)
      results.failed.push({ donor_name, error: err.message })
    }
  }

  // 3. 결과 요약
  console.log('\n' + '='.repeat(60))
  console.log('📊 결과 요약')
  console.log('='.repeat(60))
  console.log(`✅ 성공: ${results.success.length}명`)
  console.log(`⏭️  스킵 (기존 프로필 존재): ${results.skipped.length}명`)
  console.log(`❌ 실패: ${results.failed.length}명`)

  // 성공한 계정 정보 출력 (비밀번호 포함)
  if (results.success.length > 0) {
    console.log('\n📝 생성된 VIP 계정 목록:')
    console.log('-'.repeat(60))
    for (const acc of results.success) {
      console.log(`닉네임: ${acc.donor_name}`)
      console.log(`이메일: ${acc.email}`)
      console.log(`임시 비밀번호: ${acc.password}`)
      console.log('-'.repeat(60))
    }
  }

  // 실패 목록
  if (results.failed.length > 0) {
    console.log('\n❌ 실패 목록:')
    for (const fail of results.failed) {
      console.log(`  - ${fail.donor_name}: ${fail.error}`)
    }
  }

  // 최종 연결 상태 확인
  console.log('\n📈 최종 donations 연결 상태:')
  const { data: finalStats } = await supabase.rpc('get_donations_stats')

  // RPC가 없으면 직접 카운트
  const { data: connected } = await supabase
    .from('donations')
    .select('id', { count: 'exact' })
    .not('donor_id', 'is', null)

  const { data: unconnected } = await supabase
    .from('donations')
    .select('id', { count: 'exact' })
    .is('donor_id', null)

  console.log(`  연결됨: ${connected?.length || 0}명`)
  console.log(`  미연결: ${unconnected?.length || 0}명`)
}

main().catch(console.error)
