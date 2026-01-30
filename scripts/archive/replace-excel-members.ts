/**
 * 엑셀부 멤버 데이터 교체 스크립트
 * 기존 목업 데이터를 삭제하고 실제 멤버로 교체
 * 실행: npx tsx scripts/replace-excel-members.ts
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
  console.log('🚀 엑셀부 멤버 데이터 교체 시작...\n')

  // 1. 기존 엑셀부 멤버 확인
  console.log('📋 기존 엑셀부 멤버 확인...')
  const { data: existingData, error: checkError } = await supabase
    .from('organization')
    .select('id, name, role')
    .eq('unit', 'excel')

  if (checkError) {
    console.error('❌ 확인 실패:', checkError.message)
    process.exit(1)
  }

  console.log(`   기존 멤버 ${existingData?.length || 0}명:`)
  existingData?.forEach((m) => console.log(`   - [ID:${m.id}] ${m.name}`))

  // 2. 기존 엑셀부 멤버 삭제
  console.log('\n🗑️  기존 엑셀부 멤버 삭제...')
  const { error: deleteError } = await supabase
    .from('organization')
    .delete()
    .eq('unit', 'excel')

  if (deleteError) {
    console.error('❌ 삭제 실패:', deleteError.message)
    process.exit(1)
  }
  console.log('   ✅ 기존 멤버 삭제 완료')

  // 3. 새 멤버 추가
  console.log('\n➕ 새 엑셀부 멤버 추가...')
  const insertData = excelMembers.map((m) => ({
    name: m.name,
    unit: m.unit,
    role: m.role,
    position_order: m.position_order,
    is_active: true,
    is_live: false,
  }))

  const { data: insertedData, error: insertError } = await supabase
    .from('organization')
    .insert(insertData)
    .select()

  if (insertError) {
    console.error('❌ 추가 실패:', insertError.message)
    process.exit(1)
  }

  console.log(`   ✅ ${insertedData?.length || 0}명 추가 완료`)

  // 4. 최종 결과 확인
  console.log('\n📊 최종 엑셀부 멤버 목록:')
  const { data: finalData } = await supabase
    .from('organization')
    .select('id, name, role, position_order')
    .eq('unit', 'excel')
    .eq('is_active', true)
    .order('position_order')

  finalData?.forEach((m, i) => {
    console.log(`   ${i + 1}. [ID:${m.id}] ${m.name} (${m.role})`)
  })

  console.log('\n✨ 멤버 교체 완료!')
}

main().catch(console.error)
