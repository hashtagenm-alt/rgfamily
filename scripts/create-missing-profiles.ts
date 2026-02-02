/**
 * 랭킹에 있지만 프로필이 없는 사용자들의 프로필 생성 스크립트
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
  { nickname: '신세련❤️영원한니꺼✦쿨' },
  { nickname: '박하은❤️린아❤️사탕' },
]

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  console.log('🔧 누락된 프로필 생성 시작...')
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
      continue
    }

    // 2. 새 프로필 생성
    const newId = randomUUID()
    console.log(`   📝 새 ID 생성: ${newId}`)

    if (!dryRun) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: newId,
          nickname: profile.nickname,
          role: 'member',
        })

      if (insertError) {
        console.log(`   ❌ 프로필 생성 실패: ${insertError.message}`)
        continue
      }

      console.log(`   ✅ 프로필 생성 완료`)

      // 3. 종합 랭킹에 donor_id 연결
      const { error: totalError } = await supabase
        .from('total_donation_rankings')
        .update({ donor_id: newId })
        .eq('donor_name', profile.nickname)

      if (totalError) {
        console.log(`   ⚠️ 종합 랭킹 연결 실패: ${totalError.message}`)
      } else {
        console.log(`   ✅ 종합 랭킹 donor_id 연결 완료`)
      }

      // 4. 시즌 랭킹에 donor_id 연결
      const { error: seasonError } = await supabase
        .from('season_donation_rankings')
        .update({ donor_id: newId })
        .eq('donor_name', profile.nickname)

      if (seasonError) {
        console.log(`   ⚠️ 시즌 랭킹 연결 실패: ${seasonError.message}`)
      } else {
        console.log(`   ✅ 시즌 랭킹 donor_id 연결 완료`)
      }
    } else {
      console.log(`   🔍 프로필 생성 예정`)
      console.log(`   🔍 종합/시즌 랭킹 연결 예정`)
    }
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
    console.log('   npx tsx scripts/create-missing-profiles.ts')
  }

  console.log('\n✅ 누락된 프로필 생성 작업 완료!')
}

main().catch(console.error)
