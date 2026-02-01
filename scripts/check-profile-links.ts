/**
 * 프로필 연결 상태 확인 스크립트
 *
 * 확인 사항:
 * 1. 종합 랭킹에서 donor_id가 NULL인 항목
 * 2. 시즌 랭킹에서 donor_id가 NULL인 항목
 * 3. 닉네임으로 프로필 매칭 가능 여부
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
  auth: { persistSession: false }
})

async function main() {
  console.log('🔍 프로필 연결 상태 확인 시작...\n')

  // 1. 종합 랭킹에서 donor_id가 NULL인 항목
  console.log('📊 종합 랭킹 - donor_id NULL 항목:')
  const { data: totalNulls } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name')
    .is('donor_id', null)
    .order('rank', { ascending: true })

  if (totalNulls && totalNulls.length > 0) {
    for (const item of totalNulls) {
      console.log(`  ❌ ${item.rank}위: ${item.donor_name}`)
    }
    console.log(`  총 ${totalNulls.length}개 항목`)
  } else {
    console.log('  ✅ 모든 항목에 donor_id 연결됨')
  }

  // 2. 시즌 랭킹에서 donor_id가 NULL인 항목
  console.log('\n📊 시즌 1 랭킹 - donor_id NULL 항목:')
  const { data: seasonNulls } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name')
    .eq('season_id', 1)
    .is('donor_id', null)
    .order('rank', { ascending: true })

  if (seasonNulls && seasonNulls.length > 0) {
    for (const item of seasonNulls) {
      console.log(`  ❌ ${item.rank}위: ${item.donor_name}`)
    }
    console.log(`  총 ${seasonNulls.length}개 항목`)
  } else {
    console.log('  ✅ 모든 항목에 donor_id 연결됨')
  }

  // 3. 프로필 테이블에서 닉네임으로 매칭 시도
  console.log('\n🔗 프로필 매칭 가능 여부 확인:')

  const allNulls = [
    ...(totalNulls || []).map(n => n.donor_name),
    ...(seasonNulls || []).map(n => n.donor_name)
  ]
  const uniqueNulls = [...new Set(allNulls)]

  if (uniqueNulls.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname')

    for (const donorName of uniqueNulls) {
      // 정확히 일치하는 프로필 찾기
      const exactMatch = profiles?.find(p => p.nickname === donorName)

      // 부분 일치 찾기 (특수문자 제거 후)
      const simpleName = donorName.replace(/[❤️♣️✨♡✦☀⭐ෆ™\[\]]/g, '').toLowerCase()
      const partialMatches = profiles?.filter(p => {
        const simpleProfile = p.nickname?.replace(/[❤️♣️✨♡✦☀⭐ෆ™\[\]]/g, '').toLowerCase()
        return simpleProfile?.includes(simpleName) || simpleName.includes(simpleProfile || '')
      })

      if (exactMatch) {
        console.log(`  ✅ "${donorName}" → 정확히 매칭: ${exactMatch.id}`)
      } else if (partialMatches && partialMatches.length > 0) {
        console.log(`  ⚠️ "${donorName}" → 유사 매칭 후보:`)
        for (const match of partialMatches.slice(0, 3)) {
          console.log(`     - ${match.nickname} (${match.id})`)
        }
      } else {
        console.log(`  ❌ "${donorName}" → 매칭되는 프로필 없음`)
      }
    }
  }

  // 4. 요약
  console.log('\n📊 요약:')
  console.log(`  - 종합 랭킹 NULL: ${totalNulls?.length || 0}개`)
  console.log(`  - 시즌 랭킹 NULL: ${seasonNulls?.length || 0}개`)
  console.log(`  - 고유 미연결 닉네임: ${uniqueNulls.length}개`)

  console.log('\n✅ 프로필 연결 상태 확인 완료!')
}

main().catch(console.error)
