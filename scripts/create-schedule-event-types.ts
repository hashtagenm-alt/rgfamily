/**
 * schedule_event_types 테이블 생성 및 초기 데이터 삽입
 *
 * 실행: npx ts-node scripts/create-schedule-event-types.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

// 이벤트 타입 데이터
const eventTypes = [
  { code: 'broadcast', label: '방송', color: '#7f9b88', icon: 'radio', display_order: 1 },
  { code: 'collab', label: '콜라보', color: '#8a94a6', icon: 'users', display_order: 2 },
  { code: 'event', label: '이벤트', color: '#c89b6b', icon: 'calendar', display_order: 3 },
  { code: 'notice', label: '공지', color: '#b8a07a', icon: 'bell', display_order: 4 },
  { code: '休', label: '휴방', color: '#8b94a5', icon: 'moon', display_order: 5 },
]

async function main() {
  console.log('🚀 schedule_event_types 테이블 설정 시작\n')

  // 1. 테이블 존재 여부 확인
  console.log('📋 테이블 확인 중...')
  const { data: existingData, error: checkError } = await supabase
    .from('schedule_event_types')
    .select('*')
    .limit(1)

  if (checkError && checkError.code === '42P01') {
    // 테이블이 없음 - SQL로 생성해야 함
    console.log('⚠️  테이블이 없습니다. Supabase SQL Editor에서 다음 SQL을 실행하세요:\n')
    console.log(`
-- schedule_event_types 테이블 생성
CREATE TABLE IF NOT EXISTS schedule_event_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  label VARCHAR(50) NOT NULL,
  color VARCHAR(10),
  icon VARCHAR(30),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE schedule_event_types ENABLE ROW LEVEL SECURITY;

-- 읽기는 모든 사용자 허용
CREATE POLICY "schedule_event_types_read" ON schedule_event_types
  FOR SELECT USING (true);

-- 수정은 관리자만
CREATE POLICY "schedule_event_types_admin" ON schedule_event_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );
`)
    console.log('\n위 SQL 실행 후 이 스크립트를 다시 실행하세요.')
    return
  }

  if (checkError) {
    console.error('❌ 테이블 확인 실패:', checkError.message)
    return
  }

  console.log('✅ 테이블 존재 확인됨')

  // 2. 기존 데이터 확인
  const { data: currentData } = await supabase
    .from('schedule_event_types')
    .select('*')
    .order('display_order')

  if (currentData && currentData.length > 0) {
    console.log('\n📊 기존 데이터:')
    currentData.forEach(t => {
      console.log(`   ${t.code}: ${t.label} (${t.color})`)
    })
    console.log('\n이미 데이터가 있습니다. 덮어쓰시겠습니까? (y/n)')

    // 자동으로 업데이트 진행
    console.log('→ 자동 업데이트 진행...')
  }

  // 3. 데이터 삽입/업데이트 (upsert)
  console.log('\n📝 이벤트 타입 데이터 삽입 중...')

  for (const eventType of eventTypes) {
    const { error } = await supabase
      .from('schedule_event_types')
      .upsert(eventType, { onConflict: 'code' })

    if (error) {
      console.error(`   ❌ ${eventType.code} 삽입 실패:`, error.message)
    } else {
      console.log(`   ✅ ${eventType.code}: ${eventType.label} (${eventType.color})`)
    }
  }

  // 4. 결과 확인
  console.log('\n📊 최종 데이터:')
  const { data: finalData } = await supabase
    .from('schedule_event_types')
    .select('*')
    .order('display_order')

  finalData?.forEach(t => {
    console.log(`   ${t.display_order}. ${t.code}: ${t.label} [${t.color}] ${t.icon || ''}`)
  })

  console.log('\n✅ 완료!')
}

main().catch(console.error)
