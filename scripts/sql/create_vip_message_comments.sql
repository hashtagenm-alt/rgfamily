-- VIP 개인 메시지 댓글 테이블
-- VIP 개인방송국 게시판 기능: VIP 본인 글에 팬들이 댓글/대댓글 작성

CREATE TABLE IF NOT EXISTS vip_message_comments (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES vip_personal_messages(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  parent_id INTEGER REFERENCES vip_message_comments(id) ON DELETE CASCADE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_vmc_message_id ON vip_message_comments(message_id);
CREATE INDEX IF NOT EXISTS idx_vmc_parent_id ON vip_message_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_vmc_author_id ON vip_message_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_vmc_created_at ON vip_message_comments(created_at DESC);

-- RLS 정책 설정
ALTER TABLE vip_message_comments ENABLE ROW LEVEL SECURITY;

-- 모든 로그인 사용자가 댓글 조회 가능
CREATE POLICY "Authenticated users can view comments" ON vip_message_comments
  FOR SELECT
  TO authenticated
  USING (is_deleted = FALSE);

-- 로그인 사용자가 댓글 작성 가능
CREATE POLICY "Authenticated users can insert comments" ON vip_message_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- 작성자 본인만 수정 가능
CREATE POLICY "Authors can update own comments" ON vip_message_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

-- 작성자 본인만 삭제 가능 (soft delete)
CREATE POLICY "Authors can soft delete own comments" ON vip_message_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (is_deleted = TRUE);

-- 관리자는 모든 댓글 조회 및 삭제 가능
CREATE POLICY "Admins can manage all comments" ON vip_message_comments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_vip_message_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vip_message_comments_updated_at_trigger ON vip_message_comments;
CREATE TRIGGER vip_message_comments_updated_at_trigger
  BEFORE UPDATE ON vip_message_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_vip_message_comments_updated_at();

-- 댓글 수 조회 함수
CREATE OR REPLACE FUNCTION get_vip_message_comment_count(p_message_id INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM vip_message_comments
    WHERE message_id = p_message_id AND is_deleted = FALSE
  );
END;
$$ LANGUAGE plpgsql;
