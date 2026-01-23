-- 공지사항 첨부파일 테이블
-- 다중 이미지/영상 첨부 지원

CREATE TABLE IF NOT EXISTS notice_attachments (
  id SERIAL PRIMARY KEY,
  notice_id INTEGER NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
  file_size INTEGER,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_notice_attachments_notice_id ON notice_attachments(notice_id);

-- RLS 활성화
ALTER TABLE notice_attachments ENABLE ROW LEVEL SECURITY;

-- 조회 정책: 모든 사용자 허용
DROP POLICY IF EXISTS "notice_attachments_select" ON notice_attachments;
CREATE POLICY "notice_attachments_select" ON notice_attachments
  FOR SELECT USING (true);

-- 삽입 정책: admin/superadmin만
DROP POLICY IF EXISTS "notice_attachments_admin_insert" ON notice_attachments;
CREATE POLICY "notice_attachments_admin_insert" ON notice_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- 수정 정책: admin/superadmin만
DROP POLICY IF EXISTS "notice_attachments_admin_update" ON notice_attachments;
CREATE POLICY "notice_attachments_admin_update" ON notice_attachments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- 삭제 정책: admin/superadmin만
DROP POLICY IF EXISTS "notice_attachments_admin_delete" ON notice_attachments;
CREATE POLICY "notice_attachments_admin_delete" ON notice_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );
