import { getServiceClient } from './lib/supabase'
/**
 * Supabase 데이터베이스 스키마 검증 스크립트
 * - 실제 테이블 목록 확인
 * - 컬럼 누락 여부 확인
 * - database.ts와 비교
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = getServiceClient()

// database.ts에 정의된 테이블 목록
const expectedTables = [
  'profiles',
  'seasons',
  'organization',
  'episodes',
  'donations',
  'vip_rewards',
  'vip_images',
  'signatures',
  'signature_videos',
  'schedules',
  'timeline_events',
  'notices',
  'posts',
  'comments',
  'media_content',
  'live_status',
  'banners',
  'tribute_guestbook',
  'bj_thank_you_messages',
  'vip_personal_messages',
  'vip_message_comments',
  'rank_battle_records',
  'total_donation_rankings',
  'season_donation_rankings',
  'bj_ranks',
  'bj_rank_history',
  'contribution_logs',
  'prize_penalties',
  'episode_teams',
  'episode_team_members',
  'episode_matchups',
  'bj_episode_performances',
]

// organization 테이블에서 기대하는 컬럼 (db-schema-v2.sql 기준)
const expectedOrgColumns = [
  'id',
  'unit',
  'profile_id',
  'name',
  'role',
  'position_order',
  'parent_id',
  'image_url',
  'social_links',
  'profile_info',
  'is_live',
  'is_active',
  'current_rank',  // database.ts
  'current_rank_id', // db-schema-v2.sql
  'total_contribution',
  'season_contribution',
  'total_prize',
  'total_penalty',
  'prize_balance',
  'created_at',
]

async function checkTable(tableName: string): Promise<{ exists: boolean; count?: number; error?: string }> {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (error) {
      return { exists: false, error: error.message }
    }
    return { exists: true, count: count || 0 }
  } catch (err) {
    return { exists: false, error: String(err) }
  }
}

async function checkOrgColumns(): Promise<string[]> {
  const { data, error } = await supabase
    .from('organization')
    .select('*')
    .limit(1)

  if (error || !data || data.length === 0) {
    return []
  }

  return Object.keys(data[0])
}

async function main() {
  console.log('🔍 Supabase 데이터베이스 스키마 검증\n')
  console.log('=' .repeat(60))

  // 1. 테이블 존재 여부 확인
  console.log('\n📋 테이블 존재 여부:\n')

  const existingTables: string[] = []
  const missingTables: string[] = []
  const tableErrors: { table: string; error: string }[] = []

  for (const table of expectedTables) {
    const result = await checkTable(table)
    if (result.exists) {
      existingTables.push(table)
      console.log(`  ✅ ${table} (${result.count}개 레코드)`)
    } else {
      missingTables.push(table)
      tableErrors.push({ table, error: result.error || 'Unknown error' })
      console.log(`  ❌ ${table} - ${result.error}`)
    }
  }

  // 2. 요약
  console.log('\n' + '=' .repeat(60))
  console.log('\n📊 요약:\n')
  console.log(`  ✅ 존재하는 테이블: ${existingTables.length}개`)
  console.log(`  ❌ 누락된 테이블: ${missingTables.length}개`)

  if (missingTables.length > 0) {
    console.log('\n⚠️ 누락된 테이블 목록:')
    missingTables.forEach(t => console.log(`    - ${t}`))
  }

  // 3. organization 테이블 컬럼 확인
  console.log('\n' + '=' .repeat(60))
  console.log('\n🔍 organization 테이블 컬럼 확인:\n')

  const actualOrgColumns = await checkOrgColumns()
  if (actualOrgColumns.length > 0) {
    console.log('  실제 컬럼:')
    actualOrgColumns.forEach(col => console.log(`    - ${col}`))

    console.log('\n  컬럼 비교:')
    const missingCols = expectedOrgColumns.filter(col => !actualOrgColumns.includes(col))
    const extraCols = actualOrgColumns.filter(col => !expectedOrgColumns.includes(col))

    if (missingCols.length > 0) {
      console.log('  ⚠️ 누락된 컬럼:')
      missingCols.forEach(col => console.log(`    - ${col}`))
    }

    if (extraCols.length > 0) {
      console.log('  ℹ️ 추가 컬럼 (예상 외):')
      extraCols.forEach(col => console.log(`    - ${col}`))
    }

    if (missingCols.length === 0) {
      console.log('  ✅ 모든 예상 컬럼이 존재합니다.')
    }
  } else {
    console.log('  ❌ organization 테이블 확인 실패')
  }

  // 4. 중복/관련 테이블 확인
  console.log('\n' + '=' .repeat(60))
  console.log('\n🔍 중복/관련 테이블 확인:\n')

  // season_donation_rankings vs donations 비교
  const { count: rankCount } = await supabase
    .from('season_donation_rankings')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', 1)

  const { count: donationCount } = await supabase
    .from('donations')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', 1)

  console.log(`  season_donation_rankings (시즌1): ${rankCount || 0}개`)
  console.log(`  donations (시즌1): ${donationCount || 0}개`)

  if ((rankCount || 0) > 0 && (donationCount || 0) === 0) {
    console.log('  ⚠️ season_donation_rankings에는 데이터 있지만 donations에는 없음')
    console.log('     → 수동 업로드 데이터로 추정')
  }

  // 5. profiles account_type 확인
  console.log('\n' + '=' .repeat(60))
  console.log('\n🔍 profiles.account_type 확인:\n')

  const { data: profileSample } = await supabase
    .from('profiles')
    .select('id, nickname, email, account_type')
    .limit(5)

  if (profileSample) {
    profileSample.forEach(p => {
      console.log(`  - ${p.nickname}: ${p.account_type || '(null)'}`)
    })

    const hasAccountType = profileSample.some(p => 'account_type' in p)
    if (!hasAccountType) {
      console.log('\n  ⚠️ account_type 컬럼이 없거나 모든 값이 null입니다.')
    }
  }

  // 6. season_donation_rankings unit 확인
  console.log('\n' + '=' .repeat(60))
  console.log('\n🔍 season_donation_rankings.unit 확인:\n')

  const { data: rankSample } = await supabase
    .from('season_donation_rankings')
    .select('rank, donor_name, unit')
    .eq('season_id', 1)
    .order('rank', { ascending: true })
    .limit(5)

  if (rankSample) {
    rankSample.forEach(r => {
      console.log(`  ${r.rank}위. ${r.donor_name}: unit=${r.unit || '(null)'}`)
    })

    const hasUnit = rankSample.some(r => r.unit !== null)
    if (!hasUnit) {
      console.log('\n  ⚠️ unit 컬럼 값이 모두 null입니다.')
    }
  }

  console.log('\n✅ 스키마 검증 완료')
}

main().catch(console.error)
