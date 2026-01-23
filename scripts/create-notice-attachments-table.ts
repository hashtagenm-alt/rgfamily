/**
 * notice_attachments 테이블 생성 스크립트
 *
 * 실행: npx tsx scripts/create-notice-attachments-table.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// .env.local 로드
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('환경변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
})

async function createTable() {
  console.log('notice_attachments 테이블 생성 중...')

  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      -- 테이블이 이미 존재하는지 확인
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'notice_attachments') THEN
          -- 공지사항 첨부파일 테이블 생성
          CREATE TABLE notice_attachments (
            id SERIAL PRIMARY KEY,
            notice_id INTEGER NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
            file_url TEXT NOT NULL,
            file_name TEXT NOT NULL,
            file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
            file_size INTEGER,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          -- 인덱스 생성
          CREATE INDEX idx_notice_attachments_notice_id ON notice_attachments(notice_id);

          -- RLS 활성화
          ALTER TABLE notice_attachments ENABLE ROW LEVEL SECURITY;

          -- 조회 정책: 모든 사용자 허용
          CREATE POLICY "notice_attachments_select" ON notice_attachments
            FOR SELECT USING (true);

          -- 관리자 정책: admin/superadmin만 CUD 허용
          CREATE POLICY "notice_attachments_admin_insert" ON notice_attachments
            FOR INSERT WITH CHECK (
              EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'superadmin')
              )
            );

          CREATE POLICY "notice_attachments_admin_update" ON notice_attachments
            FOR UPDATE USING (
              EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'superadmin')
              )
            );

          CREATE POLICY "notice_attachments_admin_delete" ON notice_attachments
            FOR DELETE USING (
              EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'superadmin')
              )
            );

          RAISE NOTICE 'notice_attachments 테이블이 생성되었습니다.';
        ELSE
          RAISE NOTICE 'notice_attachments 테이블이 이미 존재합니다.';
        END IF;
      END $$;
    `
  })

  if (error) {
    // exec_sql RPC가 없을 경우 직접 쿼리 시도
    console.log('RPC 실패, 직접 SQL 실행 시도...')

    // 테이블 존재 확인
    const { data: tables } = await supabase
      .from('information_schema.tables' as any)
      .select('table_name')
      .eq('table_name', 'notice_attachments')
      .single()

    if (tables) {
      console.log('✅ notice_attachments 테이블이 이미 존재합니다.')
      return
    }

    console.error('❌ 테이블 생성 실패:', error.message)
    console.log('\n수동으로 Supabase Dashboard에서 SQL을 실행해주세요.')
    process.exit(1)
  }

  console.log('✅ notice_attachments 테이블 생성 완료!')
}

createTable()
