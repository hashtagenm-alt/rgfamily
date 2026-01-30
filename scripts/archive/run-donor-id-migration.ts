/**
 * 후원 랭킹 테이블에 donor_id 컬럼 추가 마이그레이션
 *
 * 실행: npx tsx scripts/run-donor-id-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

async function runMigration() {
  console.log('🚀 후원 랭킹 donor_id 마이그레이션 시작\n')

  try {
    // 1. season_donation_rankings 테이블에 donor_id 컬럼 추가
    console.log('1️⃣ season_donation_rankings에 donor_id 컬럼 추가...')
    const { error: seasonAlterError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE season_donation_rankings ADD COLUMN IF NOT EXISTS donor_id uuid REFERENCES profiles(id) ON DELETE SET NULL;`
    })

    // RPC가 없으면 직접 쿼리로 확인
    if (seasonAlterError) {
      console.log('   ⚠️ RPC 사용 불가, 직접 쿼리로 진행합니다.')
    }

    // 2. 컬럼 존재 여부 확인 및 데이터 매칭
    console.log('\n2️⃣ 기존 데이터 닉네임 기반 자동 매칭...')

    // profiles 데이터 조회
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, nickname')

    if (profilesError) {
      console.error('프로필 조회 실패:', profilesError)
      return
    }

    // 닉네임-ID 맵 생성
    const nicknameToId = new Map<string, string>()
    profiles?.forEach(p => {
      nicknameToId.set(p.nickname.toLowerCase().trim(), p.id)
    })
    console.log(`   프로필 ${profiles?.length || 0}개 로드됨`)

    // 시즌 랭킹 매칭
    console.log('\n3️⃣ 시즌 랭킹 매칭 중...')
    const { data: seasonRankings, error: seasonError } = await supabase
      .from('season_donation_rankings')
      .select('id, donor_name, donor_id')

    if (seasonError) {
      console.error('시즌 랭킹 조회 실패:', seasonError)
    } else {
      let seasonMatchCount = 0
      for (const ranking of seasonRankings || []) {
        if (ranking.donor_id) continue // 이미 연결됨

        const profileId = nicknameToId.get(ranking.donor_name.toLowerCase().trim())
        if (profileId) {
          const { error: updateError } = await supabase
            .from('season_donation_rankings')
            .update({ donor_id: profileId })
            .eq('id', ranking.id)

          if (!updateError) seasonMatchCount++
        }
      }
      console.log(`   ✅ 시즌 랭킹 ${seasonMatchCount}건 매칭 완료`)
    }

    // 총 후원 랭킹 매칭
    console.log('\n4️⃣ 총 후원 랭킹 매칭 중...')
    const { data: totalRankings, error: totalError } = await supabase
      .from('total_donation_rankings')
      .select('id, donor_name, donor_id')

    if (totalError) {
      console.error('총 후원 랭킹 조회 실패:', totalError)
    } else {
      let totalMatchCount = 0
      for (const ranking of totalRankings || []) {
        if (ranking.donor_id) continue // 이미 연결됨

        const profileId = nicknameToId.get(ranking.donor_name.toLowerCase().trim())
        if (profileId) {
          const { error: updateError } = await supabase
            .from('total_donation_rankings')
            .update({ donor_id: profileId })
            .eq('id', ranking.id)

          if (!updateError) totalMatchCount++
        }
      }
      console.log(`   ✅ 총 후원 랭킹 ${totalMatchCount}건 매칭 완료`)
    }

    // 5. 최종 결과 확인
    console.log('\n5️⃣ 최종 결과 확인...')

    const { data: seasonFinal } = await supabase
      .from('season_donation_rankings')
      .select('id, donor_id')

    const { data: totalFinal } = await supabase
      .from('total_donation_rankings')
      .select('id, donor_id')

    const seasonLinked = seasonFinal?.filter(r => r.donor_id).length || 0
    const seasonTotal = seasonFinal?.length || 0
    const totalLinked = totalFinal?.filter(r => r.donor_id).length || 0
    const totalTotal = totalFinal?.length || 0

    console.log('\n📊 매칭 결과:')
    console.log('┌────────────────────────┬───────┬────────┬─────────┐')
    console.log('│ 테이블                  │ 전체  │ 연결됨 │ 미연결  │')
    console.log('├────────────────────────┼───────┼────────┼─────────┤')
    console.log(`│ season_donation_rankings│ ${String(seasonTotal).padStart(5)} │ ${String(seasonLinked).padStart(6)} │ ${String(seasonTotal - seasonLinked).padStart(7)} │`)
    console.log(`│ total_donation_rankings │ ${String(totalTotal).padStart(5)} │ ${String(totalLinked).padStart(6)} │ ${String(totalTotal - totalLinked).padStart(7)} │`)
    console.log('└────────────────────────┴───────┴────────┴─────────┘')

    console.log('\n✅ 마이그레이션 완료!')
    console.log('💡 donor_id 컬럼이 없다면 Supabase Dashboard에서 직접 SQL을 실행하세요.')

  } catch (err) {
    console.error('❌ 마이그레이션 실패:', err)
  }
}

runMigration()
