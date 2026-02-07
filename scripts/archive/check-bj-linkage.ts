import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv'

const supabase = getServiceClient()

async function check() {
  const { data } = await supabase
    .from('organization')
    .select('name, profile_id, is_active')
    .order('position_order')

  console.log('\n📋 BJ 계정 연동 상태:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  let linked = 0
  let unlinked = 0

  for (const bj of data || []) {
    const status = bj.profile_id ? '✅ 연동됨' : '❌ 미연동'
    const active = bj.is_active ? '' : ' (비활성)'
    console.log(`  ${bj.name}: ${status}${active}`)
    if (bj.profile_id) linked++
    else unlinked++
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ 연동: ${linked}명 / ❌ 미연동: ${unlinked}명\n`)
}

check()
