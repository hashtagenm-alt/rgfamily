/**
 * 엑셀부 멤버 기본 데이터 시드 스크립트 (member_profile 없이)
 * 실행: npx tsx scripts/seed-excel-members-basic.ts
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
  console.log('🚀 엑셀부 멤버 기본 데이터 시드 시작...\n')

  // 1. 기존 데이터 확인
  console.log('📋 기존 organization 데이터 확인...')
  const { data: existingData, error: checkError } = await supabase
    .from('organization')
    .select('id, name, unit, role')
    .eq('unit', 'excel')

  if (checkError) {
    console.error('❌ 테이블 확인 실패:', checkError.message)
    process.exit(1)
  }

  console.log(`   현재 엑셀부 멤버 수: ${existingData?.length || 0}명`)
  existingData?.forEach((m) => console.log(`   - ${m.name} (${m.role})`))
  console.log('')

  // 2. 각 멤버 데이터 upsert (이름 기준으로 업데이트 또는 신규 추가)
  let addedCount = 0
  let updatedCount = 0
  const _skippedCount = 0

  for (const member of excelMembers) {
    // 이미 존재하는지 확인
    const existing = existingData?.find(
      (d) => d.name === member.name && d.unit === 'excel'
    )

    if (existing) {
      // 업데이트
      const { error } = await supabase
        .from('organization')
        .update({
          role: member.role,
          position_order: member.position_order,
        })
        .eq('id', existing.id)

      if (error) {
        console.error(`❌ ${member.name} 업데이트 실패:`, error.message)
      } else {
        console.log(`🔄 ${member.name} 업데이트 완료`)
        updatedCount++
      }
    } else {
      // 신규 추가
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

  // 3. 최종 결과 확인
  console.log('\n📊 최종 엑셀부 멤버 목록:')
  const { data: finalData } = await supabase
    .from('organization')
    .select('id, name, role, position_order')
    .eq('unit', 'excel')
    .eq('is_active', true)
    .order('position_order')

  finalData?.forEach((m, i) => {
    console.log(`   ${i + 1}. ${m.name} (${m.role})`)
  })

  console.log(`\n📈 결과: 추가 ${addedCount}명, 업데이트 ${updatedCount}명`)
  console.log('✨ 시드 완료!')
  console.log('\n⚠️  member_profile 데이터는 Supabase에 컬럼 추가 후')
  console.log('   npx tsx scripts/seed-excel-members.ts 를 실행하세요.')
}

main().catch(console.error)
