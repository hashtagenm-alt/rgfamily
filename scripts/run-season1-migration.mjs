import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('=== RG Family 시즌1 에피소드 마이그레이션 시작 ===\n')

  try {
    // 1. 기존 데이터 정리
    console.log('1. 기존 데이터 정리 중...')

    await supabase.from('schedules').delete().like('title', '[RG FAMILY] 시즌1%')
    await supabase.from('timeline_events').delete().like('title', '[RG FAMILY] 시즌1%')
    await supabase.from('episodes').delete().eq('season_id', 10)
    console.log('   ✅ 기존 데이터 정리 완료\n')

    // 2. schedules 테이블에 추가
    console.log('2. schedules 테이블에 에피소드 일정 추가 중...')
    const scheduleData = [
      { title: '[RG FAMILY] 시즌1 / 01화!', description: '대망의 첫 회! 직급전!', event_type: 'broadcast', start_datetime: '2026-01-20T14:00:00+09:00', is_all_day: false, color: '#fd68ba' },
      { title: '[RG FAMILY] 시즌1 / 02화!', description: '황금or벌금데이', event_type: 'broadcast', start_datetime: '2026-01-22T14:00:00+09:00', is_all_day: false, color: '#fd68ba' },
      { title: '[RG FAMILY] 시즌1 / 03화!', description: '퇴근전쟁', event_type: 'broadcast', start_datetime: '2026-01-24T14:00:00+09:00', is_all_day: false, color: '#fd68ba' },
      { title: '[RG FAMILY] 시즌1 / 04화!', description: '난사데이', event_type: 'broadcast', start_datetime: '2026-01-27T14:00:00+09:00', is_all_day: false, color: '#fd68ba' },
      { title: '[RG FAMILY] 시즌1 / 05화!', description: '명품데이 - 메이져 5명, 마이너 7명 경쟁', event_type: 'broadcast', start_datetime: '2026-01-29T14:00:00+09:00', is_all_day: false, color: '#fd68ba' },
      { title: '[RG FAMILY] 시즌1 / 06화!', description: '1vs1 데스매치', event_type: 'broadcast', start_datetime: '2026-01-31T14:00:00+09:00', is_all_day: false, color: '#fd68ba' },
      { title: '[RG FAMILY] 시즌1 / 07화!', description: '뉴시그데이 & 중간직급전', event_type: 'broadcast', start_datetime: '2026-02-03T14:00:00+09:00', is_all_day: false, color: '#fd68ba' },
      { title: '[RG FAMILY] 시즌1 / 08화!', description: '대표를 이겨라', event_type: 'broadcast', start_datetime: '2026-02-05T14:00:00+09:00', is_all_day: false, color: '#fd68ba' },
      { title: '[RG FAMILY] 시즌1 / 09화!', description: '주차방지데이', event_type: 'broadcast', start_datetime: '2026-02-07T14:00:00+09:00', is_all_day: false, color: '#fd68ba' },
      { title: '[RG FAMILY] 시즌1 / 10화!', description: '용병 데이_1', event_type: 'broadcast', start_datetime: '2026-02-10T14:00:00+09:00', is_all_day: false, color: '#fd68ba' },
      { title: '[RG FAMILY] 시즌1 / 15화!', description: '최종 직급전', event_type: 'broadcast', start_datetime: '2026-02-24T14:00:00+09:00', is_all_day: false, color: '#ffd700' },
    ]

    const { error: scheduleError } = await supabase.from('schedules').insert(scheduleData)
    if (scheduleError) throw scheduleError
    console.log(`   ✅ ${scheduleData.length}개 일정 추가 완료\n`)

    // 3. timeline_events 테이블에 추가
    console.log('3. timeline_events 테이블에 에피소드 추가 중...')
    const timelineData = [
      { event_date: '2026-01-20', title: '[RG FAMILY] 시즌1 / 01화!', description: '대망의 첫 회! 직급전!', category: 'broadcast', season_id: 10, order_index: 1 },
      { event_date: '2026-01-22', title: '[RG FAMILY] 시즌1 / 02화!', description: '황금or벌금데이', category: 'broadcast', season_id: 10, order_index: 2 },
      { event_date: '2026-01-24', title: '[RG FAMILY] 시즌1 / 03화!', description: '퇴근전쟁', category: 'broadcast', season_id: 10, order_index: 3 },
      { event_date: '2026-01-27', title: '[RG FAMILY] 시즌1 / 04화!', description: '난사데이', category: 'broadcast', season_id: 10, order_index: 4 },
      { event_date: '2026-01-29', title: '[RG FAMILY] 시즌1 / 05화!', description: '명품데이 - 메이져 5명, 마이너 7명 경쟁', category: 'broadcast', season_id: 10, order_index: 5 },
      { event_date: '2026-01-31', title: '[RG FAMILY] 시즌1 / 06화!', description: '1vs1 데스매치', category: 'broadcast', season_id: 10, order_index: 6 },
      { event_date: '2026-02-03', title: '[RG FAMILY] 시즌1 / 07화!', description: '뉴시그데이 & 중간직급전', category: 'broadcast', season_id: 10, order_index: 7 },
      { event_date: '2026-02-05', title: '[RG FAMILY] 시즌1 / 08화!', description: '대표를 이겨라', category: 'broadcast', season_id: 10, order_index: 8 },
      { event_date: '2026-02-07', title: '[RG FAMILY] 시즌1 / 09화!', description: '주차방지데이', category: 'broadcast', season_id: 10, order_index: 9 },
      { event_date: '2026-02-10', title: '[RG FAMILY] 시즌1 / 10화!', description: '용병 데이_1', category: 'broadcast', season_id: 10, order_index: 10 },
      { event_date: '2026-02-24', title: '[RG FAMILY] 시즌1 / 15화!', description: '최종 직급전', category: 'broadcast', season_id: 10, order_index: 15 },
    ]

    const { error: timelineError } = await supabase.from('timeline_events').insert(timelineData)
    if (timelineError) throw timelineError
    console.log(`   ✅ ${timelineData.length}개 타임라인 이벤트 추가 완료\n`)

    // 4. episodes 테이블에 추가
    console.log('4. episodes 테이블에 에피소드 추가 중...')
    const episodeData = [
      { season_id: 10, episode_number: 1, title: '대망의 첫 회! 직급전!', description: 'RG Family 시즌1 첫 번째 에피소드', broadcast_date: '2026-01-20T14:00:00+09:00', is_rank_battle: true },
      { season_id: 10, episode_number: 2, title: '황금or벌금데이', description: 'RG Family 시즌1 두 번째 에피소드', broadcast_date: '2026-01-22T14:00:00+09:00', is_rank_battle: false },
      { season_id: 10, episode_number: 3, title: '퇴근전쟁', description: 'RG Family 시즌1 세 번째 에피소드', broadcast_date: '2026-01-24T14:00:00+09:00', is_rank_battle: false },
      { season_id: 10, episode_number: 4, title: '난사데이', description: 'RG Family 시즌1 네 번째 에피소드', broadcast_date: '2026-01-27T14:00:00+09:00', is_rank_battle: false },
      { season_id: 10, episode_number: 5, title: '명품데이', description: '메이져 5명, 마이너 7명 경쟁', broadcast_date: '2026-01-29T14:00:00+09:00', is_rank_battle: false },
      { season_id: 10, episode_number: 6, title: '1vs1 데스매치', description: 'RG Family 시즌1 여섯 번째 에피소드', broadcast_date: '2026-01-31T14:00:00+09:00', is_rank_battle: false },
      { season_id: 10, episode_number: 7, title: '뉴시그데이 & 중간직급전', description: 'RG Family 시즌1 일곱 번째 에피소드 - 중간직급전', broadcast_date: '2026-02-03T14:00:00+09:00', is_rank_battle: true },
      { season_id: 10, episode_number: 8, title: '대표를 이겨라', description: 'RG Family 시즌1 여덟 번째 에피소드', broadcast_date: '2026-02-05T14:00:00+09:00', is_rank_battle: false },
      { season_id: 10, episode_number: 9, title: '주차방지데이', description: 'RG Family 시즌1 아홉 번째 에피소드', broadcast_date: '2026-02-07T14:00:00+09:00', is_rank_battle: false },
      { season_id: 10, episode_number: 10, title: '용병 데이_1', description: 'RG Family 시즌1 열 번째 에피소드', broadcast_date: '2026-02-10T14:00:00+09:00', is_rank_battle: false },
      { season_id: 10, episode_number: 15, title: '최종 직급전', description: 'RG Family 시즌1 최종 에피소드 - 최종 직급전', broadcast_date: '2026-02-24T14:00:00+09:00', is_rank_battle: true },
    ]

    const { error: episodeError } = await supabase.from('episodes').insert(episodeData)
    if (episodeError) throw episodeError
    console.log(`   ✅ ${episodeData.length}개 에피소드 추가 완료\n`)

    console.log('=== 마이그레이션 완료 ===')

    // 검증
    console.log('\n=== 데이터 검증 ===')
    const { data: schedules } = await supabase.from('schedules').select('title').like('title', '[RG FAMILY]%')
    const { data: timelines } = await supabase.from('timeline_events').select('title').eq('season_id', 10)
    const { data: episodes } = await supabase.from('episodes').select('title').eq('season_id', 10)

    console.log(`schedules: ${schedules?.length || 0}개`)
    console.log(`timeline_events: ${timelines?.length || 0}개`)
    console.log(`episodes: ${episodes?.length || 0}개`)

  } catch (error) {
    console.error('마이그레이션 실패:', error)
    process.exit(1)
  }
}

runMigration()
