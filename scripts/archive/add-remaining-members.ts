import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing env')
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  console.log('🚀 한백설, 해린 추가...\n')

  // 한백설 추가
  const { data: d1, error: e1 } = await supabase
    .from('organization')
    .insert({
      name: '한백설',
      unit: 'excel',
      role: 'MEMBER',
      position_order: 1,
      is_active: true,
      is_live: false,
    })
    .select()

  if (e1) {
    console.log('한백설 insert 실패, upsert 시도...')
    // 시퀀스 충돌 시 다른 방법으로 시도
    const { error: e1b } = await supabase.rpc('exec_sql', {
      sql: `INSERT INTO organization (name, unit, role, position_order, is_active, is_live)
            VALUES ('한백설', 'excel', 'MEMBER', 1, true, false)`
    })
    if (e1b) {
      console.error('❌ 한백설:', e1b.message)
    }
  } else {
    console.log('✅ 한백설 추가 완료:', d1)
  }

  // 해린 추가
  const { data: d2, error: e2 } = await supabase
    .from('organization')
    .insert({
      name: '해린',
      unit: 'excel',
      role: 'MEMBER',
      position_order: 2,
      is_active: true,
      is_live: false,
    })
    .select()

  if (e2) {
    console.log('해린 insert 실패...')
    console.error('❌ 해린:', e2.message)
  } else {
    console.log('✅ 해린 추가 완료:', d2)
  }

  // 최종 확인
  const { data: final } = await supabase
    .from('organization')
    .select('id, name, role')
    .eq('unit', 'excel')
    .eq('is_active', true)
    .order('position_order')

  console.log('\n📊 최종 엑셀부 멤버:')
  final?.forEach((m, i) => console.log(`${i + 1}. ${m.name}`))
}

main()
