/**
 * Supabase SQL 마이그레이션 실행 스크립트
 * Management API를 사용하여 DDL 실행
 */

import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_PROJECT_REF = 'cdiptfmagemjfmsuphaj'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// SQL 마이그레이션
const MIGRATION_SQL = `
-- 1. season_donation_rankings에 unit 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'season_donation_rankings' AND column_name = 'unit'
  ) THEN
    ALTER TABLE season_donation_rankings
    ADD COLUMN unit TEXT CHECK (unit IN ('excel', 'crew'));
  END IF;
END $$;

-- 2. 시즌 1 데이터에 unit='excel' 적용
UPDATE season_donation_rankings SET unit = 'excel' WHERE season_id = 1 AND unit IS NULL;

-- 3. profiles에 account_type 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN account_type TEXT DEFAULT 'real' CHECK (account_type IN ('real', 'virtual', 'system'));
  END IF;
END $$;

-- 4. 테스트/내부 이메일 계정들을 virtual로 표시
UPDATE profiles SET account_type = 'virtual'
WHERE (email LIKE '%@rg-family.test' OR email LIKE '%@rgfamily.internal')
  AND (account_type IS NULL OR account_type = 'real');

-- 5. 이메일 없는 계정들도 virtual로
UPDATE profiles SET account_type = 'virtual' WHERE email IS NULL AND (account_type IS NULL OR account_type = 'real');
`

async function runMigration() {
  console.log('🚀 마이그레이션 실행 중...\n')

  // Supabase Management API endpoint
  const url = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: MIGRATION_SQL }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`❌ API 에러 (${response.status}): ${errorText}`)
      console.log('\n💡 Management API 접근 권한이 없습니다.')
      console.log('   Supabase Dashboard에서 직접 SQL을 실행해주세요.')
      return false
    }

    const result = await response.json()
    console.log('✅ 마이그레이션 완료!')
    console.log(result)
    return true
  } catch (error) {
    console.log(`❌ 에러: ${error}`)
    return false
  }
}

runMigration()
