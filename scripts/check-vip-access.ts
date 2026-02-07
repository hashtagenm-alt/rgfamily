/**
 * VIP 접근 제어 검증 스크립트
 * vip_clickable_profiles View와 signature_eligibility 테이블 확인
 */

import { getServiceClient } from './lib/supabase'

const supabase = getServiceClient()

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 VIP 접근 제어 검증')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 1. vip_clickable_profiles View 조회
  console.log('📋 1. VIP 클릭 가능 프로필 (vip_clickable_profiles View)')
  console.log('─'.repeat(50))

  const { data: vipProfiles, error: vipError } = await supabase
    .from('vip_clickable_profiles')
    .select('*')

  if (vipError) {
    console.log('❌ Error:', vipError.message)
  } else if (!vipProfiles || vipProfiles.length === 0) {
    console.log('⚠️  View가 비어있습니다.')
  } else {
    console.log(`✅ 총 ${vipProfiles.length}명 VIP 클릭 가능\n`)
    vipProfiles.forEach((p, i) => {
      const avatar = p.avatar_url ? '🖼️' : '❌'
      console.log(`  ${i + 1}. ${p.nickname} ${avatar}`)
      console.log(`     profile_id: ${p.profile_id}`)
    })
  }

  // 2. signature_eligibility 테이블 확인
  console.log('\n📋 2. 시그니처 자격자 (signature_eligibility 테이블)')
  console.log('─'.repeat(50))

  const { data: sigData, error: sigError } = await supabase
    .from('signature_eligibility')
    .select('donor_name, sig_number, episode_number, daily_amount, profile_id')
    .order('donor_name')

  if (sigError) {
    console.log('❌ Error:', sigError.message)
  } else if (!sigData || sigData.length === 0) {
    console.log('⚠️  테이블이 비어있습니다.')
  } else {
    console.log(`✅ 총 ${sigData.length}개 시그니처 기록\n`)

    // 후원자별 그룹화
    const byDonor: Record<string, Array<{ sig: number; ep: number | null; amount: number; profileId: string | null }>> = {}
    sigData.forEach(s => {
      if (!byDonor[s.donor_name]) byDonor[s.donor_name] = []
      byDonor[s.donor_name].push({
        sig: s.sig_number,
        ep: s.episode_number,
        amount: s.daily_amount,
        profileId: s.profile_id
      })
    })

    Object.entries(byDonor).forEach(([name, sigs]) => {
      const linked = sigs[0].profileId ? '🔗' : '❌'
      const sigList = sigs.map(s => `시그${s.sig}(ep${s.ep || '?'})`).join(', ')
      console.log(`  ${linked} ${name}: ${sigList}`)
    })
  }

  // 3. 매칭 분석
  console.log('\n📋 3. View와 테이블 매칭 분석')
  console.log('─'.repeat(50))

  if (sigData && vipProfiles) {
    const viewNicknames = new Set(vipProfiles.map(p => p.nickname))
    const sigNicknames = new Set(sigData.map(s => s.donor_name))

    // signature_eligibility에는 있지만 View에 없는 경우 (아바타 없음)
    const noAvatar = [...sigNicknames].filter(n => !viewNicknames.has(n))
    if (noAvatar.length > 0) {
      console.log(`\n⚠️  시그니처 자격은 있지만 아바타가 없어 View에서 제외된 ${noAvatar.length}명:`)
      noAvatar.forEach(n => console.log(`    - ${n}`))
    }

    console.log(`\n✅ 최종 VIP 페이지 접근 가능: ${vipProfiles.length}명`)
  }

  // 4. 예상 VIP 11명과 비교
  console.log('\n📋 4. 예상 VIP 11명 확인')
  console.log('─'.repeat(50))

  const expectedVips = [
    '르큐리', '미키™', '채은❤️여신', '에이맨♣️', '손밍매니아',
    '한세아내꺼♡호랭이', '사랑해씌발™', '[RG]미드굿♣️가애', '[J]젖문가',
    '[RG]✨린아의발굴™', '농심육개장라면'
  ]

  if (vipProfiles) {
    const viewNicknames = new Set(vipProfiles.map(p => p.nickname))

    expectedVips.forEach(name => {
      const found = viewNicknames.has(name)
      const status = found ? '✅' : '❌'
      console.log(`  ${status} ${name}`)
    })

    // View에는 있지만 예상 목록에 없는 경우
    const unexpected = vipProfiles.filter(p => !expectedVips.includes(p.nickname))
    if (unexpected.length > 0) {
      console.log(`\n⚠️  예상 목록에 없지만 View에 있는 ${unexpected.length}명:`)
      unexpected.forEach(p => console.log(`    - ${p.nickname}`))
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
