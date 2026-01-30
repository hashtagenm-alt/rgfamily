/**
 * 린아, 가애를 공동 대표로 설정
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function updateRoles() {
  console.log('🔄 린아, 가애 → 대표 (공동대표) 변경 중...\n')

  // 린아 → 대표
  const { error: e1 } = await supabase
    .from('organization')
    .update({ role: '대표' })
    .eq('name', '린아')
    .eq('unit', 'excel')

  if (e1) console.log('❌ 린아:', e1.message)
  else console.log('✅ 린아 → 대표')

  // 가애 → 대표
  const { error: e2 } = await supabase
    .from('organization')
    .update({ role: '대표' })
    .eq('name', '가애')
    .eq('unit', 'excel')

  if (e2) console.log('❌ 가애:', e2.message)
  else console.log('✅ 가애 → 대표')

  // 확인
  const { data } = await supabase
    .from('organization')
    .select('name, role, position_order')
    .eq('unit', 'excel')
    .eq('is_active', true)
    .order('position_order')
    .limit(5)

  console.log('\n📊 상위 5명:')
  data?.forEach(m => console.log(`  ${m.position_order}. ${m.name} (${m.role})`))
}

updateRoles()
