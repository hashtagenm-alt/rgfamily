import { getServiceClient } from './lib/supabase'
/**
 * VIP 사용자 프로필 상태 확인 스크립트
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = getServiceClient()

async function main() {
  const donorNames = ['채은❤️여신', '[RG]미드굿♣️가애', '[RG]✨린아의발굴™✨', '농심육개장라면']

  console.log('=== VIP 사용자 프로필 상태 ===\n')

  for (const name of donorNames) {
    // total_donation_rankings에서 정보 가져오기
    const { data: ranking } = await supabase
      .from('total_donation_rankings')
      .select('rank, donor_name, donor_id, avatar_url')
      .eq('donor_name', name)
      .single()

    if (!ranking) {
      console.log(`${name}: 랭킹 데이터 없음`)
      continue
    }

    // profiles 테이블 확인
    let profile = null
    if (ranking.donor_id) {
      const { data } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url')
        .eq('id', ranking.donor_id)
        .single()
      profile = data
    }

    console.log(`${ranking.rank}위 ${name}:`)
    console.log(`  donor_id: ${ranking.donor_id || 'NULL'}`)
    console.log(`  rankings.avatar_url: ${ranking.avatar_url ? '있음' : 'NULL'}`)
    console.log(`  profiles.nickname: ${profile?.nickname || 'NULL'}`)
    console.log(`  profiles.avatar_url: ${profile?.avatar_url ? '있음' : 'NULL'}`)
    console.log(`  닉네임 일치: ${profile?.nickname === name}`)
    console.log('')
  }
}

main().catch(console.error)
