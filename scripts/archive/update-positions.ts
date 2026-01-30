/**
 * 엑셀 멤버 position_order 정리
 * 대표 2명 → 멤버 12명 순서
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function updatePositions() {
  const updates = [
    { name: '린아', position_order: 1 },
    { name: '가애', position_order: 2 },
    { name: '한백설', position_order: 3 },
    { name: '해린', position_order: 4 },
    { name: '월아', position_order: 5 },
    { name: '채은', position_order: 6 },
    { name: '가윤', position_order: 7 },
    { name: '설윤', position_order: 8 },
    { name: '한세아', position_order: 9 },
    { name: '청아', position_order: 10 },
    { name: '손밍', position_order: 11 },
    { name: '키키', position_order: 12 },
    { name: '홍서하', position_order: 13 },
    { name: '퀸로니', position_order: 14 },
  ]

  console.log('🔄 Position order 업데이트 중...\n')

  for (const u of updates) {
    const { error } = await supabase
      .from('organization')
      .update({ position_order: u.position_order })
      .eq('name', u.name)
      .eq('unit', 'excel')
      .eq('is_active', true)

    if (error) {
      console.log(`❌ ${u.name}: ${error.message}`)
    } else {
      console.log(`✅ ${u.name} → ${u.position_order}`)
    }
  }

  // 확인
  const { data } = await supabase
    .from('organization')
    .select('name, role, position_order')
    .eq('unit', 'excel')
    .eq('is_active', true)
    .order('position_order')

  console.log('\n📊 최종 엑셀 멤버 순서:')
  data?.forEach(m => console.log(`  ${m.position_order}. ${m.name} (${m.role})`))
}

updatePositions()
