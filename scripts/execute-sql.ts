/**
 * Supabase SQL 직접 실행
 *
 * REST API를 통해 DDL 문 실행
 *
 * 사용법: npx tsx scripts/execute-sql.ts
 */

import dotenv from 'dotenv'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function executeSQL(sql: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql }),
  })

  if (!response.ok) {
    // RPC 함수가 없을 수 있음, 다른 방법 시도
    return { success: false, error: `HTTP ${response.status}` }
  }

  return { success: true }
}

async function main() {
  console.log('🔧 Supabase SQL 실행...\n')

  // 먼저 profiles 테이블의 현재 role 값 확인
  const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=role&limit=1`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })

  if (checkResponse.ok) {
    console.log('✅ Supabase 연결 확인됨\n')
  } else {
    console.error('❌ Supabase 연결 실패')
    return
  }

  // BJ role 추가를 위한 SQL (RPC 없이 profiles 업데이트로 테스트)
  console.log('📝 BJ role 값으로 프로필 업데이트 시도...')

  // 직접 REST API로 update 시도
  const testUpdateResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.test-id`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ role: 'bj' }),
    }
  )

  console.log(`  테스트 응답: ${testUpdateResponse.status}`)

  if (testUpdateResponse.status === 400) {
    const errorText = await testUpdateResponse.text()
    if (errorText.includes('invalid input value for enum')) {
      console.log('\n⚠️  "bj" role이 아직 DB enum에 없습니다.')
      console.log('\n📋 Supabase Dashboard에서 다음 SQL을 실행해주세요:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`
-- 1. 기존 check constraint 삭제
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. 새 check constraint 추가 (bj 포함)
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
CHECK (role IN ('member', 'bj', 'vip', 'moderator', 'admin', 'superadmin'));

-- 3. BJ 계정 role 업데이트
UPDATE profiles
SET role = 'bj'
WHERE id IN (
  SELECT profile_id
  FROM organization
  WHERE profile_id IS NOT NULL AND is_active = TRUE
);

-- 4. 확인
SELECT nickname, role FROM profiles WHERE role = 'bj';
      `)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      // 브라우저로 Supabase Dashboard 열기
      console.log('\n🌐 Supabase Dashboard를 여는 중...')
      const { exec } = await import('child_process')
      exec(`open "https://supabase.com/dashboard/project/cdiptfmagemjfmsuphaj/sql/new"`)
    }
  } else if (testUpdateResponse.ok || testUpdateResponse.status === 404) {
    console.log('✅ "bj" role이 이미 사용 가능합니다!')
  }
}

main().catch(console.error)
