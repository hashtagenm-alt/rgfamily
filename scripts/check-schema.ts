/**
 * 랭킹 관련 테이블/뷰 스키마 확인
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('환경변수 설정 필요')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

async function main() {
  // 랭킹 관련 테이블/뷰 존재 확인
  const targets = [
    'total_donation_rankings',
    'season_donation_rankings',
    'v_total_rankings',
    'v_season_rankings',
    'v_episode_rankings',
    'total_donation_rankings_backup_20260125',
    'total_rankings_public',
    'season_rankings_public'
  ]

  console.log('=== 랭킹 관련 테이블/뷰 상태 ===\n')

  for (const t of targets) {
    const { data, error, count } = await supabase
      .from(t)
      .select('*', { count: 'exact' })
      .limit(1)

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log(`❌ ${t}: 존재하지 않음`)
      } else {
        console.log(`⚠️  ${t}: ${error.message}`)
      }
    } else {
      console.log(`✅ ${t}: ${count}개 레코드`)
    }
  }

  // v_total_rankings 샘플 데이터
  console.log('\n=== v_total_rankings 샘플 (상위 5명) ===\n')
  const { data: viewData } = await supabase
    .from('v_total_rankings')
    .select('*')
    .limit(5)

  for (const r of viewData || []) {
    console.log(`${r.rank}. ${r.donor_name}: ${r.total_amount?.toLocaleString()}`)
  }

  // total_rankings_public 샘플 데이터
  console.log('\n=== total_rankings_public 샘플 (상위 5명) ===\n')
  const { data: publicData, error: pubErr } = await supabase
    .from('total_rankings_public')
    .select('*')
    .limit(5)

  if (pubErr) {
    console.log('조회 실패:', pubErr.message)
  } else {
    for (const r of publicData || []) {
      console.log(`${r.rank}. ${r.donor_name}: ${r.total_amount?.toLocaleString()}`)
    }
  }
}

main().catch(console.error)
