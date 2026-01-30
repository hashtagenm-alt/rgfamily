/**
 * 린아 프로필 업데이트 스크립트
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://titqtnobfapyjvairgqy.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpdHF0bm9iZmFweWp2YWlyZ3F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc5NDQyNSwiZXhwIjoyMDg0MzcwNDI1fQ.M6mlPiqgRruYCd4jXBcIOsYIhtqgvJmGmzg6l3KakwU'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  const { error } = await supabase
    .from('organization')
    .update({
      profile_info: {
        mbti: 'ENFP',
        blood_type: 'A',
        height: '160',
        weight: '47',
        birthday: '4/11',
        signal_price: 1000,
        photo_delivery: true,
        position_pledge: `[1등] 여왕 ▶ 별풍선 5만개+5만 하트 반환
[2등] 공주 ▶ 4만 하트 반환
[3등] 귀족 ▶ 3만 하트 반환
[4,5등] 후작 ▶ 2만 하트 반환
[6,7,8,9,10등] 영주 ▶ 1만 하트 반환`
      }
    })
    .eq('name', '린아')

  if (error) {
    console.log('❌ 린아 프로필 업데이트 실패:', error.message)
  } else {
    console.log('✅ 린아 프로필 업데이트 완료')
  }
}

main()
