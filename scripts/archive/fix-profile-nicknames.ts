import { getServiceClient } from './lib/supabase'
/**
 * 프로필 닉네임 업데이트 스크립트
 * profiles.nickname과 total_donation_rankings.donor_name 일치시키기
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = getServiceClient()

// 업데이트할 프로필 목록 (profile_id → 새 닉네임)
const updates = [
  { id: '09ef14ad-9cee-44a2-9440-8cbd575084f2', nickname: '채은❤️여신' },
  { id: '3e413632-32a6-486a-86e8-f5cedf3030b3', nickname: '[RG]✨린아의발굴™✨' },
]

async function main() {
  console.log('🔧 프로필 닉네임 업데이트 시작...\n')

  for (const update of updates) {
    const { data: before } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', update.id)
      .single()

    console.log(`프로필 ${update.id}:`)
    console.log(`  변경 전: ${before?.nickname}`)
    console.log(`  변경 후: ${update.nickname}`)

    const { error } = await supabase
      .from('profiles')
      .update({ nickname: update.nickname })
      .eq('id', update.id)

    if (error) {
      console.log(`  ❌ 실패: ${error.message}`)
    } else {
      console.log(`  ✅ 완료`)
    }
    console.log('')
  }

  console.log('✅ 프로필 닉네임 업데이트 완료!')
}

main().catch(console.error)
