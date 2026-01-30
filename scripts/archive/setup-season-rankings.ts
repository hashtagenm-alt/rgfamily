/**
 * 시즌별 후원 랭킹 테이블 생성 및 시즌1 데이터 업로드
 *
 * 1. season_donation_rankings 테이블 생성
 * 2. 시즌1 랭킹 데이터 업로드 (1회차 + 2회차 합산)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

// 시즌1 랭킹 데이터 (1회차 + 2회차 합산, 시즌1 동안만의 후원)
// 이전에 update-donation-rankings.ts로 집계했던 데이터
const season1RankingData = [
  { rank: 1, donor_name: '미키™', total_amount: 366289, donation_count: 123 },
  { rank: 2, donor_name: '❥CaNnOt', total_amount: 162200, donation_count: 41 },
  { rank: 3, donor_name: '한세아내꺼♡호랭이', total_amount: 102570, donation_count: 37 },
  { rank: 4, donor_name: '린아사단✨탱커', total_amount: 87984, donation_count: 39 },
  { rank: 5, donor_name: '쩔어서짜다', total_amount: 81200, donation_count: 34 },
  { rank: 6, donor_name: '손밍매니아', total_amount: 72269, donation_count: 21 },
  { rank: 7, donor_name: '까부는넌내꺼야119', total_amount: 69797, donation_count: 36 },
  { rank: 8, donor_name: '☀칰힌사주면천사☀', total_amount: 59100, donation_count: 19 },
  { rank: 9, donor_name: '[RG]미드굿♣️가애', total_amount: 52556, donation_count: 18 },
  { rank: 10, donor_name: 'Rearcar', total_amount: 44619, donation_count: 7 },
  { rank: 11, donor_name: '❥교미', total_amount: 42456, donation_count: 14 },
  { rank: 12, donor_name: '농심육개장라면', total_amount: 38620, donation_count: 17 },
  { rank: 13, donor_name: '사랑해씌발™', total_amount: 37788, donation_count: 20 },
  { rank: 14, donor_name: '[A]젖문가', total_amount: 36766, donation_count: 12 },
  { rank: 15, donor_name: '청아❤️머리크기빵빵이', total_amount: 35666, donation_count: 10 },
  { rank: 16, donor_name: '한세아♡백작♡하얀만두피', total_amount: 33023, donation_count: 11 },
  { rank: 17, donor_name: '[RG]린아✨여행™', total_amount: 32857, donation_count: 11 },
  { rank: 18, donor_name: '조패러갈꽈', total_amount: 32354, donation_count: 10 },
  { rank: 19, donor_name: '[RG]✨린아의발굴™', total_amount: 31136, donation_count: 21 },
  { rank: 20, donor_name: '시라☆구구단☆시우', total_amount: 30120, donation_count: 13 },
  { rank: 21, donor_name: '태린공주❤️줄여보자', total_amount: 29476, donation_count: 16 },
  { rank: 22, donor_name: '⭐건빵이미래쥐', total_amount: 26445, donation_count: 9 },
  { rank: 23, donor_name: '김스껄', total_amount: 26285, donation_count: 11 },
  { rank: 24, donor_name: '가윤이꼬❤️함주라', total_amount: 26029, donation_count: 14 },
  { rank: 25, donor_name: '내마지막은키르❤️머네로', total_amount: 25612, donation_count: 12 },
  { rank: 26, donor_name: '희영네개유오', total_amount: 25000, donation_count: 3 },
  { rank: 27, donor_name: '가윤이꼬❤️털이', total_amount: 22421, donation_count: 13 },
  { rank: 28, donor_name: '❤️지수ෆ해린❤️치토스㉦', total_amount: 22188, donation_count: 14 },
  { rank: 29, donor_name: 'FA진스', total_amount: 21433, donation_count: 8 },
  { rank: 30, donor_name: '내가바로원픽', total_amount: 20220, donation_count: 11 },
  { rank: 31, donor_name: '홍서하네홍금보', total_amount: 19650, donation_count: 11 },
  { rank: 32, donor_name: 'qldh라유', total_amount: 19044, donation_count: 7 },
  { rank: 33, donor_name: '✨바위늪✨', total_amount: 18592, donation_count: 10 },
  { rank: 34, donor_name: '고다혜보다ღ국물', total_amount: 15611, donation_count: 9 },
  { rank: 35, donor_name: '이쁘면하트100개', total_amount: 14889, donation_count: 8 },
  { rank: 36, donor_name: '☾코코에르메스', total_amount: 13770, donation_count: 6 },
  { rank: 37, donor_name: '한은비ღ안줘ღ', total_amount: 13327, donation_count: 8 },
  { rank: 38, donor_name: '언제나♬', total_amount: 12173, donation_count: 5 },
  { rank: 39, donor_name: '양재동ღ젖문가⁀➷', total_amount: 12009, donation_count: 7 },
  { rank: 40, donor_name: '[RG]린아네☀둥그레', total_amount: 11633, donation_count: 8 },
  { rank: 41, donor_name: '미쯔✨', total_amount: 10979, donation_count: 6 },
  { rank: 42, donor_name: '갈색말티푸', total_amount: 10883, donation_count: 5 },
  { rank: 43, donor_name: '개호구⭐즈하⭐광대', total_amount: 10815, donation_count: 7 },
  { rank: 44, donor_name: '퉁퉁퉁퉁퉁퉁사우르', total_amount: 10566, donation_count: 6 },
  { rank: 45, donor_name: '57774', total_amount: 9833, donation_count: 4 },
  { rank: 46, donor_name: '홍서하네❥페르소나™', total_amount: 9650, donation_count: 5 },
  { rank: 47, donor_name: '앵겨라잉', total_amount: 9388, donation_count: 5 },
  { rank: 48, donor_name: '태린공주❤️마비™', total_amount: 9140, donation_count: 5 },
  { rank: 49, donor_name: '[로진]앙보름_엔터대표', total_amount: 8909, donation_count: 4 },
  { rank: 50, donor_name: '[SD]티모', total_amount: 8709, donation_count: 3 },
]

async function main() {
  console.log('🚀 시즌별 랭킹 테이블 설정 시작\n')

  // 1. 테이블 존재 여부 확인
  console.log('📋 season_donation_rankings 테이블 확인...')

  const { data: testData, error: testError } = await supabase
    .from('season_donation_rankings')
    .select('id')
    .limit(1)

  if (testError && testError.code === '42P01') {
    console.log('   ⚠️  테이블이 존재하지 않습니다. 생성 중...')

    // SQL로 테이블 생성 시도
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS season_donation_rankings (
        id SERIAL PRIMARY KEY,
        season_id INTEGER NOT NULL,
        rank INTEGER NOT NULL,
        donor_name TEXT NOT NULL,
        total_amount INTEGER NOT NULL DEFAULT 0,
        donation_count INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(season_id, rank)
      );
    `

    // Supabase는 직접 DDL을 실행할 수 없으므로 Dashboard에서 생성 필요
    console.log('   📌 Supabase Dashboard SQL Editor에서 다음을 실행해주세요:')
    console.log(createTableSQL)
    process.exit(1)
  } else if (testError) {
    console.log('   ⚠️  다른 오류:', testError.message)
  }

  console.log('   ✅ 테이블 존재 확인')

  // 2. 기존 시즌1 데이터 삭제
  console.log('\n🗑️  기존 시즌1 랭킹 데이터 삭제...')
  const { error: deleteError } = await supabase
    .from('season_donation_rankings')
    .delete()
    .eq('season_id', 1)

  if (deleteError) {
    console.error('❌ 삭제 실패:', deleteError.message)
    process.exit(1)
  }
  console.log('   ✅ 삭제 완료')

  // 3. 시즌1 데이터 삽입
  console.log('\n📊 시즌1 랭킹 데이터 삽입...')

  const insertData = season1RankingData.map(item => ({
    season_id: 1,
    rank: item.rank,
    donor_name: item.donor_name,
    total_amount: item.total_amount,
    donation_count: item.donation_count,
    updated_at: new Date().toISOString(),
  }))

  const { error: insertError } = await supabase
    .from('season_donation_rankings')
    .insert(insertData)

  if (insertError) {
    console.error('❌ 삽입 실패:', insertError.message)
    process.exit(1)
  }
  console.log('   ✅ 50명 시즌1 랭킹 업데이트 완료')

  // 4. 결과 확인
  console.log('\n📋 시즌1 Top 10 확인:')
  const { data: top10 } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name, total_amount, donation_count')
    .eq('season_id', 1)
    .order('rank', { ascending: true })
    .limit(10)

  top10?.forEach(item => {
    console.log(`   ${item.rank}위: ${item.donor_name} - ${item.total_amount.toLocaleString()}하트 (${item.donation_count}건)`)
  })

  console.log('\n✅ 시즌별 랭킹 설정 완료!')
  console.log('\n📌 현재 DB 구조:')
  console.log('   - total_donation_rankings: 종합 랭킹 (시즌1 이전 + 시즌1 누적)')
  console.log('   - season_donation_rankings: 시즌별 랭킹 (시즌 기간 동안만의 후원)')
}

main().catch(err => {
  console.error('❌ 오류:', err)
  process.exit(1)
})
