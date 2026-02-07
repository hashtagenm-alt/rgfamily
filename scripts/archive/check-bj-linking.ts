import { getServiceClient } from './lib/supabase'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = getServiceClient()

async function check() {
  // 1. BJ 멤버 organization 테이블 확인 (profile_id 연결 상태)
  console.log('=== organization 테이블 (BJ 멤버) ===')
  const { data: org } = await supabase
    .from('organization')
    .select('id, name, profile_id, is_active')
    .eq('is_active', true)
    .order('name')

  console.log('멤버       | profile_id 연결')
  console.log('-'.repeat(60))
  org?.forEach(m => {
    const linked = m.profile_id ? `✅ ${m.profile_id.slice(0, 8)}...` : '❌ 없음'
    console.log(`${m.name.padEnd(10)} | ${linked}`)
  })

  // 2. BJ 역할 프로필 확인
  console.log('\n=== BJ 역할 프로필 ===')
  const { data: bjProfiles } = await supabase
    .from('profiles')
    .select('id, nickname, email, role')
    .eq('role', 'bj')

  console.log('닉네임     | 이메일                     | profile ID')
  console.log('-'.repeat(80))
  bjProfiles?.forEach(p => {
    console.log(`${(p.nickname || '').padEnd(10)} | ${(p.email || '').padEnd(25)} | ${p.id.slice(0, 8)}...`)
  })

  // 3. 연결 안 된 BJ 멤버 찾기
  console.log('\n=== profile_id 연결 안 된 BJ 멤버 ===')
  const unlinked = org?.filter(m => !m.profile_id)
  if (unlinked?.length === 0) {
    console.log('✅ 모두 연결됨')
  } else {
    unlinked?.forEach(m => console.log(`❌ ${m.name}`))
  }

  // 4. BJ 프로필은 있지만 organization에 연결 안 된 경우
  console.log('\n=== BJ 프로필 ↔ organization 매칭 검증 ===')
  for (const profile of bjProfiles || []) {
    const match = org?.find(o => o.profile_id === profile.id)
    if (match) {
      console.log(`✅ ${profile.nickname} → ${match.name}`)
    } else {
      console.log(`❌ ${profile.nickname} (${profile.email}) - organization 연결 없음`)
    }
  }
}

check().catch(console.error)
