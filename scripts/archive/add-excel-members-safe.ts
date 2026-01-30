/**
 * 엑셀부 멤버 안전 추가 스크립트
 * 기존 멤버를 비활성화하고 새 멤버를 추가
 * 실행: npx tsx scripts/add-excel-members-safe.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface MemberData {
  name: string
  unit: 'excel' | 'crew'
  role: string
  position_order: number
}

// 사용자가 제공한 실제 엑셀부 멤버
const excelMembers: MemberData[] = [
  { name: '한백설', unit: 'excel', role: 'MEMBER', position_order: 1 },
  { name: '해린', unit: 'excel', role: 'MEMBER', position_order: 2 },
  { name: '월아', unit: 'excel', role: 'MEMBER', position_order: 3 },
  { name: '채은', unit: 'excel', role: 'MEMBER', position_order: 4 },
  { name: '가윤', unit: 'excel', role: 'MEMBER', position_order: 5 },
  { name: '설윤', unit: 'excel', role: 'MEMBER', position_order: 6 },
  { name: '한세아', unit: 'excel', role: 'MEMBER', position_order: 7 },
  { name: '청아', unit: 'excel', role: 'MEMBER', position_order: 8 },
  { name: '손밍', unit: 'excel', role: 'MEMBER', position_order: 9 },
  { name: '키키', unit: 'excel', role: 'MEMBER', position_order: 10 },
  { name: '홍서하', unit: 'excel', role: 'MEMBER', position_order: 11 },
  { name: '퀸로니', unit: 'excel', role: 'MEMBER', position_order: 12 },
]

async function main() {
  console.log('🚀 엑셀부 멤버 안전 추가 시작...\n')

  // 1. 기존 엑셀부 멤버 확인
  console.log('📋 기존 엑셀부 멤버 확인...')
  const { data: existingData, error: checkError } = await supabase
    .from('organization')
    .select('id, name, role, is_active')
    .eq('unit', 'excel')

  if (checkError) {
    console.error('❌ 확인 실패:', checkError.message)
    process.exit(1)
  }

  console.log(`   기존 멤버 ${existingData?.length || 0}명`)

  // 2. 기존 엑셀부 멤버 비활성화
  console.log('\n🔒 기존 엑셀부 멤버 비활성화...')
  const { error: updateError } = await supabase
    .from('organization')
    .update({ is_active: false })
    .eq('unit', 'excel')

  if (updateError) {
    console.error('❌ 비활성화 실패:', updateError.message)
    process.exit(1)
  }
  console.log('   ✅ 기존 멤버 비활성화 완료')

  // 3. 새 멤버 추가 (한 명씩)
  console.log('\n➕ 새 엑셀부 멤버 추가...')
  let addedCount = 0

  for (const member of excelMembers) {
    // 같은 이름이 있는지 확인 (비활성화된 것도 포함)
    const { data: existing } = await supabase
      .from('organization')
      .select('id')
      .eq('name', member.name)
      .eq('unit', 'excel')
      .single()

    if (existing) {
      // 기존 레코드 재활성화 및 업데이트
      const { error } = await supabase
        .from('organization')
        .update({
          role: member.role,
          position_order: member.position_order,
          is_active: true,
        })
        .eq('id', existing.id)

      if (error) {
        console.error(`❌ ${member.name} 업데이트 실패:`, error.message)
      } else {
        console.log(`🔄 ${member.name} 재활성화`)
        addedCount++
      }
    } else {
      // 새 레코드 추가
      const { error } = await supabase.from('organization').insert({
        name: member.name,
        unit: member.unit,
        role: member.role,
        position_order: member.position_order,
        is_active: true,
        is_live: false,
      })

      if (error) {
        console.error(`❌ ${member.name} 추가 실패:`, error.message)
      } else {
        console.log(`✅ ${member.name} 추가 완료`)
        addedCount++
      }
    }
  }

  // 4. 최종 결과 확인
  console.log('\n📊 최종 활성 엑셀부 멤버 목록:')
  const { data: finalData } = await supabase
    .from('organization')
    .select('id, name, role, position_order')
    .eq('unit', 'excel')
    .eq('is_active', true)
    .order('position_order')

  finalData?.forEach((m, i) => {
    console.log(`   ${i + 1}. [ID:${m.id}] ${m.name} (${m.role})`)
  })

  console.log(`\n📈 결과: ${addedCount}명 처리됨`)
  console.log('✨ 멤버 추가 완료!')
}

main().catch(console.error)
