/**
 * 린아(R대표), 가애(G대표) 활성화 및 14명 멤버 구성
 *
 * 실행: npx tsx scripts/activate-leaders.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function activateLeaders() {
  console.log('🔄 린아, 가애 대표 활성화 중...\n')

  // 1. 린아(R대표) 활성화
  const { error: error1 } = await supabase
    .from('organization')
    .update({ is_active: true, position_order: 1 })
    .eq('name', '린아')
    .eq('role', 'R대표')

  if (error1) {
    console.error('❌ 린아 활성화 실패:', error1.message)
  } else {
    console.log('✅ 린아(R대표) 활성화 완료')
  }

  // 2. 가애(G대표) 활성화
  const { error: error2 } = await supabase
    .from('organization')
    .update({ is_active: true, position_order: 2 })
    .eq('name', '가애')
    .eq('role', 'G대표')

  if (error2) {
    console.error('❌ 가애 활성화 실패:', error2.message)
  } else {
    console.log('✅ 가애(G대표) 활성화 완료')
  }

  // 3. 현재 활성 엑셀 멤버 확인
  const { data: activeMembers, error: fetchError } = await supabase
    .from('organization')
    .select('name, role, position_order')
    .eq('unit', 'excel')
    .eq('is_active', true)
    .order('position_order')

  if (fetchError) {
    console.error('❌ 멤버 조회 실패:', fetchError.message)
    return
  }

  console.log(`\n📊 활성 엑셀 멤버 (${activeMembers?.length}명):`)
  activeMembers?.forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.name} (${m.role})`)
  })

  // 4. 14명이 아니면 추가 멤버 활성화 필요
  if (activeMembers && activeMembers.length < 14) {
    console.log(`\n⚠️ 현재 ${activeMembers.length}명, 14명까지 ${14 - activeMembers.length}명 추가 필요`)

    // 비활성 멤버 확인
    const { data: inactiveMembers } = await supabase
      .from('organization')
      .select('name, role')
      .eq('unit', 'excel')
      .eq('is_active', false)
      .order('position_order')

    console.log('\n📋 비활성 엑셀 멤버:')
    inactiveMembers?.forEach(m => {
      console.log(`  - ${m.name} (${m.role})`)
    })
  }
}

activateLeaders()
