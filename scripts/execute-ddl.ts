/**
 * Supabase DDL 실행 스크립트
 *
 * service_role 키를 사용하여 DDL(CREATE, ALTER, DROP) 실행
 *
 * 사용법:
 *   npx tsx scripts/execute-ddl.ts --file scripts/sql/create-nickname-aliases.sql
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function executeSql(sql: string): Promise<boolean> {
  // Supabase JS client는 DDL 직접 실행을 지원하지 않음
  // REST API를 통해 rpc 함수 또는 pg_execute 사용 시도

  // 방법 1: exec_sql RPC 함수가 있는지 확인
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

  if (error) {
    // RPC 함수가 없으면 HTTP API 직접 호출
    console.log('⚠️ exec_sql RPC 없음, 대체 방법 시도...')
    return false
  }

  return true
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] !== '--file') {
    console.log('사용법: npx tsx scripts/execute-ddl.ts --file <sql-file>')
    console.log('')
    console.log('예시:')
    console.log('  npx tsx scripts/execute-ddl.ts --file scripts/sql/create-nickname-aliases.sql')
    process.exit(0)
  }

  const sqlFile = args[1]
  if (!sqlFile || !fs.existsSync(sqlFile)) {
    console.error(`❌ SQL 파일을 찾을 수 없습니다: ${sqlFile}`)
    process.exit(1)
  }

  const sql = fs.readFileSync(sqlFile, 'utf-8')
  console.log(`📄 SQL 파일 읽기: ${sqlFile}`)
  console.log('─'.repeat(60))
  console.log(sql.substring(0, 500) + (sql.length > 500 ? '\n...(생략)' : ''))
  console.log('─'.repeat(60))

  // DDL은 Supabase JS로 직접 실행이 어려움
  // 대신 테이블이 이미 존재하는지 확인하고 안내

  const tableName = 'nickname_aliases'

  console.log(`\n🔍 ${tableName} 테이블 존재 여부 확인...`)

  const { error: checkError } = await supabase
    .from(tableName)
    .select('id')
    .limit(1)

  if (!checkError) {
    console.log(`✅ ${tableName} 테이블이 이미 존재합니다!`)

    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    console.log(`   현재 ${count || 0}개 행 존재`)
    return
  }

  if (checkError.code === '42P01' || checkError.code === 'PGRST205') {
    // 테이블이 존재하지 않음
    console.log(`⚠️ ${tableName} 테이블이 존재하지 않습니다.`)
    console.log('')
    console.log('📋 Supabase Dashboard에서 직접 SQL을 실행해주세요:')
    console.log('   1. https://supabase.com/dashboard/project/cdiptfmagemjfmsuphaj/sql')
    console.log('   2. 아래 SQL 복사하여 실행:')
    console.log('')
    console.log('─'.repeat(60))
    console.log(sql)
    console.log('─'.repeat(60))
    console.log('')
    console.log('테이블 생성 후 다시 실행하면 확인됩니다.')
  } else {
    console.error('❌ 알 수 없는 오류:', checkError)
  }
}

main().catch(console.error)
