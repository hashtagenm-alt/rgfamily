/**
 * Supabase PostgreSQL 직접 연결하여 마이그레이션 실행
 *
 * 사용법: npx tsx scripts/execute-migration.ts
 */

import { getServiceClient } from './lib/supabase'
const supabase = getServiceClient()

async function executeSQL(sql: string, description: string): Promise<boolean> {
  console.log(`\n📝 ${description}...`)

  // Supabase RPC를 통해 raw SQL 실행은 불가능
  // 대신 각 작업을 개별적으로 실행해야 함
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
    if (error) throw error
    console.log('✅ 완료')
    return true
  } catch (err: unknown) {
    // exec_sql RPC가 없을 수 있음
    const errMsg = err instanceof Error ? err.message : String(err)
    console.log(`❌ 실패: ${errMsg}`)
    return false
  }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🚀 시그니처 VIP 클릭 시스템 마이그레이션')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Supabase REST API로는 DDL 실행이 불가능함
  // 대신 테이블 존재 여부 확인 후 안내 메시지 출력

  const { data, error } = await supabase
    .from('signature_eligibility')
    .select('id')
    .limit(1)

  if (!error) {
    console.log('\n✅ signature_eligibility 테이블이 이미 존재합니다.')
    return
  }

  console.log('\n⚠️  signature_eligibility 테이블이 없습니다.')
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋 Supabase Dashboard에서 SQL 실행 필요:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n1. Supabase Dashboard 접속:')
  console.log('   https://supabase.com/dashboard/project/cdiptfmagemjfmsuphaj/sql/new')
  console.log('\n2. 아래 SQL 파일 내용을 복사하여 실행:')
  console.log('   supabase/migrations/20260203_signature_vip_click_system.sql')
  console.log('\n또는 터미널에서:')
  console.log('   supabase login')
  console.log('   supabase link --project-ref cdiptfmagemjfmsuphaj')
  console.log('   supabase db push')
}

main().catch(console.error)
