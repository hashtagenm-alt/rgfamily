import { getServiceClient } from './lib/supabase'
import dotenv from 'dotenv'

const supabase = getServiceClient()

async function main() {
  // 서연❤️까부는김회장의 프로필 정보
  const profileId = '09ef14ad-9cee-44a2-9440-8cbd575084f2'

  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', profileId)
    .single()

  console.log('=== 프로필 통일 작업 ===\n')
  console.log('원본 프로필 ID:', profileId)
  console.log('Avatar URL:', profile?.avatar_url ? '있음' : '없음')

  // 동일인물 닉네임 목록
  const samePersonNames = ['채은❤️여신', '까부는김회장', '서연❤️까부는김회장', '채은❤️까부는김회장']

  // 1. season_donation_rankings 업데이트
  console.log('\n1️⃣ season_donation_rankings 프로필 연결...')
  for (const name of samePersonNames) {
    const { error } = await supabase
      .from('season_donation_rankings')
      .update({ donor_id: profileId })
      .eq('donor_name', name)

    if (error === null) {
      console.log('   ✅', name)
    }
  }

  // 2. total_donation_rankings 업데이트
  console.log('\n2️⃣ total_donation_rankings 프로필 연결...')
  for (const name of samePersonNames) {
    const { error } = await supabase
      .from('total_donation_rankings')
      .update({
        donor_id: profileId,
        avatar_url: profile?.avatar_url
      })
      .eq('donor_name', name)

    if (error === null) {
      console.log('   ✅', name)
    }
  }

  // 3. 결과 확인
  console.log('\n=== 결과 확인 ===\n')

  // 시즌 랭킹
  const { data: seasonResults } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name, donor_id')
    .in('donor_name', samePersonNames)

  console.log('시즌 랭킹:')
  for (const r of seasonResults || []) {
    const status = r.donor_id ? '✅ 연결됨' : '❌'
    console.log(`  ${r.rank}위: ${r.donor_name} → ${status}`)
  }

  // 종합 랭킹
  const { data: totalResults } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, donor_id, avatar_url')
    .in('donor_name', samePersonNames)

  console.log('\n종합 랭킹:')
  for (const r of totalResults || []) {
    const idStatus = r.donor_id ? '✅ 연결됨' : '❌'
    const avatarStatus = r.avatar_url ? '✅' : '❌'
    console.log(`  ${r.rank}위: ${r.donor_name} → ${idStatus}, avatar: ${avatarStatus}`)
  }

  console.log('\n✅ 프로필 통일 완료!')
}

main().catch(console.error)
