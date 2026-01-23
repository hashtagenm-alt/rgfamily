#!/usr/bin/env node
/**
 * 구버전 호환용 donations 뷰 생성 스크립트
 *
 * 목적: 구버전 코드가 donations 테이블을 쿼리할 때
 *       season_rankings_public 데이터를 반환하도록 함
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
})

async function createDonationsView() {
  console.log('🔧 donations 뷰 생성 중...\n')

  // SQL to create the donations view
  const sql = `
    -- 기존 donations 테이블/뷰가 있으면 삭제
    DROP VIEW IF EXISTS donations CASCADE;
    DROP TABLE IF EXISTS donations CASCADE;

    -- 구버전 호환용 donations 뷰 생성
    CREATE VIEW donations AS
    SELECT
        row_number() OVER (ORDER BY rank) as id,
        NULL::uuid as donor_id,
        donor_name,
        COALESCE(gauge_percent, 0)::numeric as amount,
        season_id,
        unit,
        NOW() as created_at
    FROM season_rankings_public;

    -- 뷰에 대한 SELECT 권한 부여
    GRANT SELECT ON donations TO anon;
    GRANT SELECT ON donations TO authenticated;
  `

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

  if (error) {
    // RPC 함수가 없으면 직접 쿼리 시도
    console.log('RPC 함수 없음, 직접 실행 시도...')

    // Supabase에서는 직접 DDL 실행이 제한됨
    // Management API를 통해 실행해야 함
    console.log('\n⚠️  Supabase Dashboard에서 직접 SQL을 실행해주세요:')
    console.log('=' .repeat(60))
    console.log(sql)
    console.log('=' .repeat(60))
    console.log('\n📍 Supabase Dashboard > SQL Editor에서 위 쿼리 실행')
    return false
  }

  console.log('✅ donations 뷰 생성 완료!')
  return true
}

// 테스트: 뷰가 작동하는지 확인
async function testView() {
  console.log('\n🧪 donations 뷰 테스트...')

  const { data, error } = await supabase
    .from('donations')
    .select('donor_id, donor_name, amount, season_id, unit')
    .eq('season_id', 1)
    .limit(5)

  if (error) {
    console.log('❌ 테스트 실패:', error.message)
    return false
  }

  console.log('✅ 테스트 성공! 데이터 샘플:')
  console.table(data)
  return true
}

async function main() {
  const created = await createDonationsView()

  if (created) {
    await testView()
  }
}

main().catch(console.error)
