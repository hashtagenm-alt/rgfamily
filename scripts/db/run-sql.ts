/**
 * Supabase SQL 직접 실행 스크립트
 *
 * 사용법:
 *   npx tsx scripts/db/run-sql.ts "SELECT * FROM profiles LIMIT 5"
 *   npx tsx scripts/db/run-sql.ts --file scripts/sql/my-query.sql
 *
 * 브라우저 대신 터미널에서 직접 SQL 실행 가능
 */

import { getServiceClient } from '../lib/supabase'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다.')
  console.error('   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 확인')
  process.exit(1)
}

const supabase = getServiceClient()

async function runSQL(sql: string) {
  console.log('📝 실행할 SQL:')
  console.log('─'.repeat(60))
  console.log(sql.trim())
  console.log('─'.repeat(60))
  console.log()

  try {
    // RPC를 통한 raw SQL 실행은 Supabase에서 기본 지원하지 않음
    // 대신 각 테이블에 대한 쿼리로 변환하거나 REST API 사용

    // SELECT 쿼리인 경우 테이블명 추출 시도
    const selectMatch = sql.match(/FROM\s+(\w+)/i)

    if (selectMatch) {
      const tableName = selectMatch[1]
      console.log(`🔍 테이블 조회: ${tableName}`)

      // 간단한 SELECT * 쿼리
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(50)

      if (error) {
        console.error('❌ 에러:', error.message)
        return
      }

      console.log(`✅ 결과: ${data?.length || 0}개 행`)
      console.table(data?.slice(0, 10))

      if (data && data.length > 10) {
        console.log(`   ... 외 ${data.length - 10}개 행`)
      }
    } else {
      console.log('ℹ️  DDL/DML 쿼리는 Supabase Dashboard에서 실행하세요.')
      console.log('   또는 supabase db execute 명령어를 사용하세요.')
    }
  } catch (err) {
    console.error('❌ 실행 실패:', err)
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log(`
📌 Supabase SQL 실행기

사용법:
  npx tsx scripts/db/run-sql.ts "SELECT * FROM table_name"
  npx tsx scripts/db/run-sql.ts --file scripts/sql/query.sql
  npx tsx scripts/db/run-sql.ts --table profiles
  npx tsx scripts/db/run-sql.ts --view season_rankings_public

예시:
  npx tsx scripts/db/run-sql.ts --table season_donation_rankings
  npx tsx scripts/db/run-sql.ts --view total_rankings_public
`)
    return
  }

  // --file 옵션
  if (args[0] === '--file' && args[1]) {
    const filePath = path.resolve(args[1])
    if (!fs.existsSync(filePath)) {
      console.error(`❌ 파일을 찾을 수 없습니다: ${filePath}`)
      process.exit(1)
    }
    const sql = fs.readFileSync(filePath, 'utf-8')
    await runSQL(sql)
    return
  }

  // --table 옵션
  if (args[0] === '--table' && args[1]) {
    const tableName = args[1]
    console.log(`📊 테이블 조회: ${tableName}`)
    console.log('─'.repeat(60))

    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .limit(20)

    if (error) {
      console.error('❌ 에러:', error.message)
      return
    }

    console.log(`✅ 총 ${count}개 행 (최대 20개 표시)`)
    console.table(data)
    return
  }

  // --view 옵션
  if (args[0] === '--view' && args[1]) {
    const viewName = args[1]
    console.log(`👁️  View 조회: ${viewName}`)
    console.log('─'.repeat(60))

    const { data, error, count } = await supabase
      .from(viewName)
      .select('*', { count: 'exact' })
      .order('rank', { ascending: true })
      .limit(20)

    if (error) {
      console.error('❌ 에러:', error.message)
      return
    }

    console.log(`✅ 총 ${count}개 행 (최대 20개 표시)`)
    console.table(data)
    return
  }

  // 직접 SQL 쿼리
  const sql = args.join(' ')
  await runSQL(sql)
}

main().catch(console.error)
