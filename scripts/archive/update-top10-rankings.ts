import { getServiceClient } from './lib/supabase'
/**
 * Top 10 랭킹 데이터 업데이트 스크립트
 * 기존 Top 10 데이터를 삭제하고 새 데이터로 교체
 */

// .env.local 로드

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = getServiceClient()

// Top 10 랭킹 데이터 (닉네임만, 아이디 제외)
const top10Data = [
  { donor_name: '미키', amount: 10000000, created_at: '2026-01-15T12:00:00+09:00' },
  { donor_name: '미드', amount: 9500000, created_at: '2026-01-15T11:00:00+09:00' },
  { donor_name: '농심육개장라면', amount: 9000000, created_at: '2026-01-15T10:00:00+09:00' },
  { donor_name: '[RG]✨린아의발굴™', amount: 8500000, created_at: '2026-01-14T15:00:00+09:00' },
  { donor_name: '❥CaNnOt', amount: 8000000, created_at: '2026-01-14T14:00:00+09:00' },
  { donor_name: '태린공주❤️줄여보자', amount: 7500000, created_at: '2026-01-14T13:00:00+09:00' },
  { donor_name: '⭐건빵이미래쥐', amount: 7000000, created_at: '2026-01-13T16:00:00+09:00' },
  { donor_name: '[RG]린아✨여행™', amount: 6500000, created_at: '2026-01-13T15:00:00+09:00' },
  { donor_name: '가윤이꼬❤️털이', amount: 6000000, created_at: '2026-01-12T18:00:00+09:00' },
  { donor_name: '언제나♬', amount: 5500000, created_at: '2026-01-12T17:00:00+09:00' },
]

async function updateTop10Rankings() {
  console.log('🚀 Top 10 랭킹 데이터 업데이트 시작...\n')

  // 1. 시즌 4 확인/생성
  console.log('1. 시즌 4 확인 중...')
  const { data: existingSeason } = await supabase
    .from('seasons')
    .select('id')
    .eq('id', 4)
    .single()

  if (!existingSeason) {
    console.log('   시즌 4 생성 중...')
    const { error: seasonError } = await supabase
      .from('seasons')
      .insert({ id: 4, name: '시즌 4 - 겨울의 축제', start_date: '2026-01-01', is_active: true })

    if (seasonError) {
      console.error('   시즌 생성 실패:', seasonError.message)
    } else {
      console.log('   ✅ 시즌 4 생성 완료')
    }
  } else {
    console.log('   ✅ 시즌 4 이미 존재')
  }

  // 2. 기존 Top 10 데이터 삭제 (시즌 4, amount >= 5000000)
  console.log('\n2. 기존 Top 10 데이터 삭제 중...')
  const { error: deleteError, count: deleteCount } = await supabase
    .from('donations')
    .delete({ count: 'exact' })
    .eq('season_id', 4)
    .gte('amount', 5000000)

  if (deleteError) {
    console.error('   삭제 실패:', deleteError.message)
  } else {
    console.log(`   ✅ ${deleteCount || 0}개 레코드 삭제됨`)
  }

  // 3. 새 Top 10 데이터 삽입
  console.log('\n3. 새 Top 10 데이터 삽입 중...')
  const insertData = top10Data.map(d => ({
    ...d,
    donor_id: null,
    season_id: 4,
    unit: 'excel',
  }))

  const { error: insertError, count: insertCount } = await supabase
    .from('donations')
    .insert(insertData, { count: 'exact' })

  if (insertError) {
    console.error('   삽입 실패:', insertError.message)
  } else {
    console.log(`   ✅ ${insertCount || top10Data.length}개 레코드 삽입됨`)
  }

  // 4. 결과 확인
  console.log('\n4. 결과 확인...')
  const { data: rankings, error: selectError } = await supabase
    .from('donations')
    .select('donor_name, amount')
    .eq('season_id', 4)
    .order('amount', { ascending: false })
    .limit(10)

  if (selectError) {
    console.error('   조회 실패:', selectError.message)
  } else {
    console.log('\n📊 현재 Top 10 랭킹:')
    console.log('─'.repeat(40))
    rankings?.forEach((r, i) => {
      console.log(`   ${i + 1}위: ${r.donor_name} (${r.amount.toLocaleString()} 하트)`)
    })
    console.log('─'.repeat(40))
  }

  console.log('\n✅ 완료!')
}

updateTop10Rankings().catch(console.error)
