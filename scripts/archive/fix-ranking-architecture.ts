/**
 * 랭킹 아키텍처 수정 스크립트
 *
 * 문제: total_donation_rankings가 뷰로 변환되어 레거시 데이터 유실
 * 해결: 백업에서 복원하고 3화 데이터 추가
 *
 * 사용법: npx tsx scripts/fix-ranking-architecture.ts
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
  auth: { persistSession: false },
})

async function main() {
  console.log('🔧 랭킹 아키텍처 수정 시작...\n')

  // 1. 백업 데이터 가져오기
  console.log('1. 백업 데이터 조회...')
  const { data: backupData, error: backupError } = await supabase
    .from('total_donation_rankings_backup_20260125')
    .select('donor_name, total_amount')

  if (backupError) {
    console.error('백업 조회 실패:', backupError.message)
    return
  }
  console.log(`   - 백업 레코드: ${backupData.length}개`)

  // 2. 3화 데이터 가져오기 (episode_id = 14)
  console.log('2. 3화 후원 데이터 조회...')
  const { data: ep14Data, error: ep14Error } = await supabase
    .from('donations')
    .select('donor_name, amount')
    .eq('episode_id', 14)
    .gt('amount', 0)

  if (ep14Error) {
    console.error('3화 데이터 조회 실패:', ep14Error.message)
    return
  }

  // 3화 데이터 집계
  const ep14Map = new Map<string, number>()
  for (const d of ep14Data || []) {
    ep14Map.set(d.donor_name, (ep14Map.get(d.donor_name) || 0) + d.amount)
  }
  console.log(`   - 3화 후원자: ${ep14Map.size}명`)

  // 3. 백업 + 3화 합산
  console.log('3. 데이터 합산...')
  const combinedMap = new Map<string, number>()

  // 백업 데이터 추가
  for (const b of backupData) {
    combinedMap.set(b.donor_name, (combinedMap.get(b.donor_name) || 0) + b.total_amount)
  }

  // 3화 데이터 추가
  for (const [name, amount] of ep14Map) {
    combinedMap.set(name, (combinedMap.get(name) || 0) + amount)
  }

  // 정렬 및 순위 부여
  const sortedData = [...combinedMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount], idx) => ({
      rank: idx + 1,
      donor_name: name,
      total_amount: amount,
    }))

  console.log(`   - 합산 후 총 후원자: ${sortedData.length}명`)
  console.log(`   - 상위 5명:`)
  for (const r of sortedData.slice(0, 5)) {
    console.log(`     ${r.rank}. ${r.donor_name}: ${r.total_amount.toLocaleString()}`)
  }

  // 4. 기존 total_donation_rankings 데이터 확인
  const { count: existingCount } = await supabase
    .from('total_donation_rankings')
    .select('*', { count: 'exact', head: true })

  // 5. 데이터 삭제 후 삽입
  console.log('\n4. total_donation_rankings 업데이트...')

  if (existingCount && existingCount > 0) {
    console.log(`   - 기존 데이터 ${existingCount}건 삭제...`)
    const { error: deleteError } = await supabase
      .from('total_donation_rankings')
      .delete()
      .neq('id', 0) // 모든 행 삭제

    if (deleteError) {
      console.error('삭제 실패:', deleteError.message)
      // 테이블이 아닌 뷰일 수 있으므로 계속 진행
    }
  }

  // 데이터 삽입 (100개씩 배치)
  const batchSize = 100
  let insertedCount = 0

  for (let i = 0; i < sortedData.length; i += batchSize) {
    const batch = sortedData.slice(i, i + batchSize)
    const { error: insertError } = await supabase
      .from('total_donation_rankings')
      .insert(batch)

    if (insertError) {
      console.error(`삽입 실패 (batch ${i}):`, insertError.message)
      // 뷰일 경우 삽입 불가 - 에러 메시지 확인
      if (insertError.message.includes('cannot insert into view')) {
        console.log('\n⚠️  total_donation_rankings가 뷰입니다. SQL로 직접 수정이 필요합니다.')
        console.log('   Supabase Dashboard > SQL Editor에서 다음 쿼리 실행:')
        console.log('\n--- SQL 시작 ---')
        console.log('DROP VIEW IF EXISTS total_donation_rankings CASCADE;')
        console.log('')
        console.log('CREATE TABLE total_donation_rankings (')
        console.log('  id SERIAL PRIMARY KEY,')
        console.log('  rank INTEGER NOT NULL,')
        console.log('  donor_name TEXT NOT NULL,')
        console.log('  total_amount BIGINT NOT NULL DEFAULT 0,')
        console.log('  is_permanent_vip BOOLEAN DEFAULT FALSE')
        console.log(');')
        console.log('--- SQL 끝 ---')
        console.log('\n그 후 이 스크립트를 다시 실행하세요.')
        return
      }
      break
    }
    insertedCount += batch.length
  }

  if (insertedCount > 0) {
    console.log(`   - ${insertedCount}건 삽입 완료`)
  }

  // 6. 검증
  console.log('\n5. 검증...')
  const { data: verifyData } = await supabase
    .from('total_donation_rankings')
    .select('rank, donor_name, total_amount')
    .order('rank')
    .limit(10)

  if (verifyData && verifyData.length > 0) {
    console.log('   ✅ total_donation_rankings 상위 10명:')
    for (const r of verifyData) {
      console.log(`   ${r.rank}. ${r.donor_name}: ${r.total_amount.toLocaleString()}`)
    }
  }

  // total_rankings_public 확인
  const { data: publicData } = await supabase
    .from('total_rankings_public')
    .select('rank, donor_name, total_amount')
    .order('rank')
    .limit(5)

  if (publicData && publicData.length > 0) {
    console.log('\n   ✅ total_rankings_public (홈페이지) 상위 5명:')
    for (const r of publicData) {
      console.log(`   ${r.rank}. ${r.donor_name}: ${r.total_amount.toLocaleString()}`)
    }
  } else {
    console.log('\n   ⚠️  total_rankings_public 데이터 없음')
  }

  console.log('\n✅ 완료!')
}

main().catch(console.error)
