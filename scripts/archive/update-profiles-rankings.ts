import { getServiceClient } from './lib/supabase'
/**
 * Profiles 테이블 랭킹 데이터 업데이트 스크립트
 * 기존 프로필의 닉네임과 total_donation을 업데이트하여 랭킹 반영
 */

// .env.local 로드

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = getServiceClient()

// Top 10 랭킹 데이터 (닉네임 + 후원금)
const top10Rankings = [
  { nickname: '미키', total_donation: 10000000, unit: 'excel' },
  { nickname: '미드', total_donation: 9500000, unit: 'excel' },
  { nickname: '농심육개장라면', total_donation: 9000000, unit: 'excel' },
  { nickname: '[RG]✨린아의발굴™', total_donation: 8500000, unit: 'excel' },
  { nickname: '❥CaNnOt', total_donation: 8000000, unit: 'crew' },
  { nickname: '태린공주❤️줄여보자', total_donation: 7500000, unit: 'excel' },
  { nickname: '⭐건빵이미래쥐', total_donation: 7000000, unit: 'crew' },
  { nickname: '[RG]린아✨여행™', total_donation: 6500000, unit: 'excel' },
  { nickname: '가윤이꼬❤️털이', total_donation: 6000000, unit: 'excel' },
  { nickname: '언제나♬', total_donation: 5500000, unit: 'crew' },
]

async function updateProfilesRankings() {
  console.log('🚀 Profiles 랭킹 데이터 업데이트 시작...\n')

  // 1. 기존 프로필 목록 조회 (total_donation 기준 상위 10개)
  console.log('1. 기존 프로필 조회 중...')
  const { data: existingProfiles, error: fetchError } = await supabase
    .from('profiles')
    .select('id, nickname, total_donation')
    .gt('total_donation', 0)
    .order('total_donation', { ascending: false })
    .limit(10)

  if (fetchError) {
    console.error('   조회 실패:', fetchError.message)
    return
  }

  console.log(`   ✅ ${existingProfiles?.length || 0}개 프로필 조회됨`)

  if (!existingProfiles || existingProfiles.length === 0) {
    console.error('   업데이트할 프로필이 없습니다.')
    return
  }

  // 2. 기존 프로필을 새 랭킹으로 업데이트
  console.log('\n2. 프로필 업데이트 중...')

  for (let i = 0; i < Math.min(existingProfiles.length, top10Rankings.length); i++) {
    const existingProfile = existingProfiles[i]
    const newRanking = top10Rankings[i]
    const rank = i + 1

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        nickname: newRanking.nickname,
        total_donation: newRanking.total_donation,
        unit: newRanking.unit,
        role: rank <= 3 ? 'vip' : 'member',
      })
      .eq('id', existingProfile.id)

    if (updateError) {
      console.error(`   ${rank}위 업데이트 실패:`, updateError.message)
    } else {
      console.log(`   ✅ ${rank}위: ${existingProfile.nickname} → ${newRanking.nickname} (${newRanking.total_donation.toLocaleString()} 하트)`)
    }
  }

  // 3. 결과 확인
  console.log('\n3. 결과 확인...')
  const { data: rankings, error: selectError } = await supabase
    .from('profiles')
    .select('nickname, total_donation, unit')
    .gt('total_donation', 0)
    .order('total_donation', { ascending: false })
    .limit(10)

  if (selectError) {
    console.error('   조회 실패:', selectError.message)
  } else {
    console.log('\n📊 현재 Top 10 랭킹 (profiles):')
    console.log('─'.repeat(50))
    rankings?.forEach((r, i) => {
      console.log(`   ${i + 1}위: ${r.nickname} (${r.total_donation.toLocaleString()} 하트) [${r.unit}]`)
    })
    console.log('─'.repeat(50))
  }

  console.log('\n✅ 완료!')
}

updateProfilesRankings().catch(console.error)
