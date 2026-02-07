import { getServiceClient } from './lib/supabase'
/**
 * 특정 VIP 사용자들의 상태 확인 스크립트
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = getServiceClient()

async function main() {
  // 해당 사용자들 조회
  const names = [
    '채은❤️여신',
    '[RG]미드굿♣️가애',
    '[RG]✨린아의발굴™✨',
    '농심육개장라면',
    '에이맨♣️',
    '쩔어서짜다',
    '❥CaNnOt'
  ]

  console.log('📊 종합 랭킹 상태:')
  console.log('─'.repeat(60))

  const { data: rankings } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, donor_id, avatar_url')
    .in('donor_name', names)
    .order('rank')

  for (const r of rankings || []) {
    console.log(`\n${r.rank}위: ${r.donor_name}`)
    console.log(`  donor_id: ${r.donor_id || 'NULL'}`)
    console.log(`  avatar_url: ${r.avatar_url ? '있음' : 'NULL'}`)

    // VIP rewards 연결 확인
    if (r.donor_id) {
      const { data: vip } = await supabase
        .from('vip_rewards')
        .select('id, rank')
        .eq('profile_id', r.donor_id)
        .single()

      if (vip) {
        console.log(`  vip_rewards: ✅ (id: ${vip.id}, rank: ${vip.rank})`)
      } else {
        console.log(`  vip_rewards: ❌ 없음`)
      }
    }
  }

  console.log('\n' + '─'.repeat(60))
  console.log('✅ 확인 완료')
}

main().catch(console.error)
