/**
 * 종합 후원 랭킹 업데이트 스크립트
 *
 * 시즌1 이전 누적 + 시즌1 포함 종합 랭킹 데이터를 업데이트합니다.
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

// 종합 랭킹 데이터 (시즌1 이전 누적 + 시즌1 2회차까지)
const totalRankingData = [
  { rank: 1, donor_name: '미키™', total_amount: 777571, is_permanent_vip: false },
  { rank: 2, donor_name: '손밍매니아', total_amount: 274769, is_permanent_vip: false },
  { rank: 3, donor_name: '❥CaNnOt', total_amount: 236386, is_permanent_vip: false },
  { rank: 4, donor_name: '쩔어서짜다', total_amount: 185465, is_permanent_vip: false },
  { rank: 5, donor_name: '[RG]미드굿♣️가애', total_amount: 175856, is_permanent_vip: false },
  { rank: 6, donor_name: '[RG]✨린아의발굴™', total_amount: 135436, is_permanent_vip: false },
  { rank: 7, donor_name: '한세아내꺼♡호랭이', total_amount: 133124, is_permanent_vip: false },
  { rank: 8, donor_name: '린아사단✨탱커', total_amount: 100834, is_permanent_vip: false },
  { rank: 9, donor_name: '까부는넌내꺼야119', total_amount: 90847, is_permanent_vip: false },
  { rank: 10, donor_name: '농심육개장라면', total_amount: 84177, is_permanent_vip: false },
  { rank: 11, donor_name: '☀칰힌사주면천사☀', total_amount: 70600, is_permanent_vip: false },
  { rank: 12, donor_name: 'Rearcar', total_amount: 67619, is_permanent_vip: false },
  { rank: 13, donor_name: '❥교미', total_amount: 66166, is_permanent_vip: false },
  { rank: 14, donor_name: '사랑해씌발™', total_amount: 60838, is_permanent_vip: false },
  { rank: 15, donor_name: '[A]젖문가', total_amount: 60566, is_permanent_vip: false },
  { rank: 16, donor_name: '청아❤️머리크기빵빵이', total_amount: 57286, is_permanent_vip: false },
  { rank: 17, donor_name: '조패러갈꽈', total_amount: 57154, is_permanent_vip: false },
  { rank: 18, donor_name: '[RG]린아✨여행™', total_amount: 56157, is_permanent_vip: false },
  { rank: 19, donor_name: '한세아♡백작♡하얀만두피', total_amount: 50023, is_permanent_vip: false },
  { rank: 20, donor_name: '희영네개유오', total_amount: 50000, is_permanent_vip: false },
  { rank: 21, donor_name: '시라☆구구단☆시우', total_amount: 48720, is_permanent_vip: false },
  { rank: 22, donor_name: '태린공주❤️줄여보자', total_amount: 46926, is_permanent_vip: false },
  { rank: 23, donor_name: '김스껄', total_amount: 44585, is_permanent_vip: false },
  { rank: 24, donor_name: '⭐건빵이미래쥐', total_amount: 42395, is_permanent_vip: false },
  { rank: 25, donor_name: '가윤이꼬❤️함주라', total_amount: 41379, is_permanent_vip: false },
  { rank: 26, donor_name: '가윤이꼬❤️털이', total_amount: 36971, is_permanent_vip: false },
  { rank: 27, donor_name: '❤️지수ෆ해린❤️치토스㉦', total_amount: 36488, is_permanent_vip: false },
  { rank: 28, donor_name: '내마지막은키르❤️머네로', total_amount: 36312, is_permanent_vip: false },
  { rank: 29, donor_name: '내가바로원픽', total_amount: 34270, is_permanent_vip: false },
  { rank: 30, donor_name: '✨바위늪✨', total_amount: 32492, is_permanent_vip: false },
  { rank: 31, donor_name: 'FA진스', total_amount: 30533, is_permanent_vip: false },
  { rank: 32, donor_name: '홍서하네홍금보', total_amount: 29150, is_permanent_vip: false },
  { rank: 33, donor_name: 'qldh라유', total_amount: 28844, is_permanent_vip: false },
  { rank: 34, donor_name: '이쁘면하트100개', total_amount: 25189, is_permanent_vip: false },
  { rank: 35, donor_name: '고다혜보다ღ국물', total_amount: 21311, is_permanent_vip: false },
  { rank: 36, donor_name: '언제나♬', total_amount: 20873, is_permanent_vip: false },
  { rank: 37, donor_name: '한은비ღ안줘ღ', total_amount: 20727, is_permanent_vip: false },
  { rank: 38, donor_name: '☾코코에르메스', total_amount: 20070, is_permanent_vip: false },
  { rank: 39, donor_name: '양재동ღ젖문가⁀➷', total_amount: 20009, is_permanent_vip: false },
  { rank: 40, donor_name: '[RG]린아네☀둥그레', total_amount: 18433, is_permanent_vip: false },
  { rank: 41, donor_name: '미쯔✨', total_amount: 18279, is_permanent_vip: false },
  { rank: 42, donor_name: '갈색말티푸', total_amount: 18083, is_permanent_vip: false },
  { rank: 43, donor_name: '개호구⭐즈하⭐광대', total_amount: 18015, is_permanent_vip: false },
  { rank: 44, donor_name: '퉁퉁퉁퉁퉁퉁사우르', total_amount: 17266, is_permanent_vip: false },
  { rank: 45, donor_name: '57774', total_amount: 16533, is_permanent_vip: false },
  { rank: 46, donor_name: '홍서하네❥페르소나™', total_amount: 15950, is_permanent_vip: false },
  { rank: 47, donor_name: '앵겨라잉', total_amount: 15588, is_permanent_vip: false },
  { rank: 48, donor_name: '태린공주❤️마비™', total_amount: 15240, is_permanent_vip: false },
  { rank: 49, donor_name: '[로진]앙보름_엔터대표', total_amount: 15209, is_permanent_vip: false },
  { rank: 50, donor_name: '[SD]티모', total_amount: 14709, is_permanent_vip: false },
]

async function main() {
  console.log('🚀 종합 후원 랭킹 업데이트 시작\n')

  // 1. 기존 데이터 삭제
  console.log('🗑️  기존 종합 랭킹 데이터 삭제...')
  const { error: deleteError } = await supabase
    .from('total_donation_rankings')
    .delete()
    .gte('rank', 1)

  if (deleteError) {
    console.error('❌ 삭제 실패:', deleteError.message)
    process.exit(1)
  }
  console.log('   ✅ 삭제 완료')

  // 2. 새 데이터 삽입 (season_id = NULL for 종합 랭킹)
  console.log('\n📊 종합 랭킹 데이터 삽입...')

  const insertData = totalRankingData.map(item => ({
    ...item,
    season_id: null, // 종합 랭킹은 season_id NULL
    updated_at: new Date().toISOString(),
  }))

  const { error: insertError } = await supabase
    .from('total_donation_rankings')
    .insert(insertData)

  if (insertError) {
    console.error('❌ 삽입 실패:', insertError.message)
    process.exit(1)
  }

  console.log('   ✅ 50명 종합 랭킹 업데이트 완료')

  // 3. 결과 확인
  console.log('\n📋 Top 10 확인:')
  const { data: top10 } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, total_amount, is_permanent_vip')
    .order('rank', { ascending: true })
    .limit(10)

  top10?.forEach(item => {
    const vip = item.is_permanent_vip ? '👑' : ''
    console.log(`   ${item.rank}위: ${item.donor_name} - ${item.total_amount.toLocaleString()}하트 ${vip}`)
  })

  console.log('\n✅ 종합 후원 랭킹 업데이트 완료!')
}

main().catch(err => {
  console.error('❌ 오류:', err)
  process.exit(1)
})
