/**
 * 시즌1 일정 데이터 삽입 스크립트
 * RG FAMILY 시즌1 방송 일정 및 설 연휴 일정
 *
 * 사용법: npx tsx scripts/seed-season1-schedules.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 환경변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
})

// ============================================
// 시즌1 일정 데이터
// ============================================

const season1SchedulesData = [
  // 1화 - 직급전
  {
    title: '[RG FAMILY] 시즌1 / 01화!',
    description: '대망의 첫 회! 직급전!',
    event_type: 'broadcast' as const,
    start_datetime: '2026-01-20T20:00:00+09:00',
    is_all_day: false,
    color: '#fd68ba'
  },
  // 2화 - 황금or벌금데이
  {
    title: '[RG FAMILY] 시즌1 / 02화!',
    description: '황금or벌금데이',
    event_type: 'broadcast' as const,
    start_datetime: '2026-01-22T20:00:00+09:00',
    is_all_day: false,
    color: '#fd68ba'
  },
  // 3화 - 퇴근전쟁
  {
    title: '[RG FAMILY] 시즌1 / 03화!',
    description: '퇴근전쟁',
    event_type: 'broadcast' as const,
    start_datetime: '2026-01-24T20:00:00+09:00',
    is_all_day: false,
    color: '#fd68ba'
  },
  // 4화 - 난사데이
  {
    title: '[RG FAMILY] 시즌1 / 04화!',
    description: '난사데이',
    event_type: 'broadcast' as const,
    start_datetime: '2026-01-27T20:00:00+09:00',
    is_all_day: false,
    color: '#fd68ba'
  },
  // 5화 - 명품데이
  {
    title: '[RG FAMILY] 시즌1 / 05화!',
    description: '명품데이\n· 메이져 5명, 마이너 7명 경쟁',
    event_type: 'broadcast' as const,
    start_datetime: '2026-01-29T20:00:00+09:00',
    is_all_day: false,
    color: '#fd68ba'
  },
  // 6화 - 1vs1 데스매치
  {
    title: '[RG FAMILY] 시즌1 / 06화!',
    description: '1vs1 데스매치',
    event_type: 'broadcast' as const,
    start_datetime: '2026-01-31T20:00:00+09:00',
    is_all_day: false,
    color: '#fd68ba'
  },
  // 7화 - 뉴시그데이 & 중간직급전
  {
    title: '[RG FAMILY] 시즌1 / 07화!',
    description: '뉴시그데이 & 중간직급전',
    event_type: 'broadcast' as const,
    start_datetime: '2026-02-03T20:00:00+09:00',
    is_all_day: false,
    color: '#fd68ba'
  },
  // 8화 - 대표를 이겨라
  {
    title: '[RG FAMILY] 시즌1 / 08화!',
    description: '대표를 이겨라',
    event_type: 'broadcast' as const,
    start_datetime: '2026-02-05T20:00:00+09:00',
    is_all_day: false,
    color: '#fd68ba'
  },
  // 9화 - 주차방지데이
  {
    title: '[RG FAMILY] 시즌1 / 09화!',
    description: '주차방지데이',
    event_type: 'broadcast' as const,
    start_datetime: '2026-02-07T20:00:00+09:00',
    is_all_day: false,
    color: '#fd68ba'
  },
  // 10화 - 용병 데이_1
  {
    title: '[RG FAMILY] 시즌1 / 10화!',
    description: '용병 데이_1',
    event_type: 'broadcast' as const,
    start_datetime: '2026-02-10T20:00:00+09:00',
    is_all_day: false,
    color: '#fd68ba'
  },
  // 11화 - 용병 데이_2
  {
    title: '[RG FAMILY] 시즌1 / 11화!',
    description: '용병 데이_2',
    event_type: 'broadcast' as const,
    start_datetime: '2026-02-12T20:00:00+09:00',
    is_all_day: false,
    color: '#fd68ba'
  },
  // 12화 - 설날특집 도파민데이
  {
    title: '[RG FAMILY] 시즌1 / 12화!',
    description: '설날특집 도파민데이',
    event_type: 'broadcast' as const,
    start_datetime: '2026-02-14T20:00:00+09:00',
    is_all_day: false,
    color: '#fd68ba'
  },
  // 설 연휴 (휴방)
  {
    title: '설 연휴',
    description: '휴방',
    event_type: '休' as const,
    start_datetime: '2026-02-16T00:00:00+09:00',
    is_all_day: true,
    color: '#94a3b8'
  },
  {
    title: '설 연휴',
    description: '휴방',
    event_type: '休' as const,
    start_datetime: '2026-02-17T00:00:00+09:00',
    is_all_day: true,
    color: '#94a3b8'
  },
  {
    title: '설 연휴',
    description: '휴방',
    event_type: '休' as const,
    start_datetime: '2026-02-18T00:00:00+09:00',
    is_all_day: true,
    color: '#94a3b8'
  },
  // 13화 - 팀 데스매치
  {
    title: '[RG FAMILY] 시즌1 / 13화!',
    description: '팀 데스매치',
    event_type: 'broadcast' as const,
    start_datetime: '2026-02-19T20:00:00+09:00',
    is_all_day: false,
    color: '#fd68ba'
  },
  // 14화 - 기여도 전쟁
  {
    title: '[RG FAMILY] 시즌1 / 14화!',
    description: '기여도 전쟁',
    event_type: 'broadcast' as const,
    start_datetime: '2026-02-22T20:00:00+09:00',
    is_all_day: false,
    color: '#fd68ba'
  },
  // 15화 - 최종 직급전
  {
    title: '[RG FAMILY] 시즌1 / 15화!',
    description: '최종 직급전',
    event_type: 'broadcast' as const,
    start_datetime: '2026-02-24T20:00:00+09:00',
    is_all_day: false,
    color: '#fd68ba'
  }
]

// ============================================
// Main
// ============================================

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('  RG FAMILY 시즌1 일정 데이터 삽입')
  console.log('═══════════════════════════════════════════\n')

  // 연결 확인
  console.log('🔌 Supabase 연결 확인...')
  const { error: connError } = await supabase.from('schedules').select('count').limit(1)
  if (connError) {
    console.error('  ❌ 연결 실패:', connError.message)
    process.exit(1)
  }
  console.log('  ✅ 연결 성공!\n')

  // 기존 시즌1 일정 확인 (중복 방지)
  console.log('📅 기존 시즌1 일정 확인...')
  const { data: existing } = await supabase
    .from('schedules')
    .select('id, title')
    .like('title', '%시즌1%')

  if (existing && existing.length > 0) {
    console.log(`  ⚠️  이미 ${existing.length}개의 시즌1 일정이 있습니다.`)
    console.log('  삭제 후 다시 삽입합니다...')

    // 기존 시즌1 일정 삭제
    const { error: deleteError } = await supabase
      .from('schedules')
      .delete()
      .like('title', '%시즌1%')

    if (deleteError) {
      console.error('  ❌ 삭제 실패:', deleteError.message)
      process.exit(1)
    }
    console.log('  ✅ 기존 시즌1 일정 삭제 완료\n')
  }

  // 설 연휴 일정도 확인
  const { data: existingHoliday } = await supabase
    .from('schedules')
    .select('id, title')
    .eq('title', '설 연휴')

  if (existingHoliday && existingHoliday.length > 0) {
    console.log(`  ⚠️  이미 ${existingHoliday.length}개의 설 연휴 일정이 있습니다.`)
    console.log('  삭제 후 다시 삽입합니다...')

    const { error: deleteError } = await supabase
      .from('schedules')
      .delete()
      .eq('title', '설 연휴')

    if (deleteError) {
      console.error('  ❌ 삭제 실패:', deleteError.message)
      process.exit(1)
    }
    console.log('  ✅ 기존 설 연휴 일정 삭제 완료\n')
  }

  // 새 일정 삽입
  console.log('🗓️  시즌1 일정 삽입 중...')
  const { data, error } = await supabase
    .from('schedules')
    .insert(season1SchedulesData)
    .select()

  if (error) {
    console.error('  ❌ 삽입 실패:', error.message)
    process.exit(1)
  }

  console.log(`  ✅ ${data.length}건 삽입 완료!\n`)

  // 삽입된 일정 출력
  console.log('═══════════════════════════════════════════')
  console.log('  삽입된 일정 목록')
  console.log('═══════════════════════════════════════════')

  for (const schedule of data) {
    const date = new Date(schedule.start_datetime).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short'
    })
    console.log(`  📅 ${date} - ${schedule.title}`)
    if (schedule.description) {
      console.log(`     └─ ${schedule.description.replace(/\n/g, ' / ')}`)
    }
  }

  console.log('\n═══════════════════════════════════════════')
  console.log('  ✨ 시즌1 일정 삽입 완료!')
  console.log('═══════════════════════════════════════════\n')
}

main().catch(console.error)
