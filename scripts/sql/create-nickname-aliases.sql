-- nickname_aliases 테이블 생성
-- 동일인물의 여러 닉네임을 매핑하여 중복 문제 해결

CREATE TABLE IF NOT EXISTS nickname_aliases (
  id SERIAL PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- 같은 닉네임은 하나의 프로필에만 연결
  UNIQUE(nickname)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_nickname_aliases_profile_id ON nickname_aliases(profile_id);
CREATE INDEX IF NOT EXISTS idx_nickname_aliases_nickname ON nickname_aliases(nickname);

-- RLS 정책 (관리자만 수정 가능)
ALTER TABLE nickname_aliases ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 조회 가능
CREATE POLICY "nickname_aliases_select_policy" ON nickname_aliases
  FOR SELECT USING (true);

-- 관리자만 삽입/수정/삭제 가능
CREATE POLICY "nickname_aliases_insert_policy" ON nickname_aliases
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

CREATE POLICY "nickname_aliases_update_policy" ON nickname_aliases
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

CREATE POLICY "nickname_aliases_delete_policy" ON nickname_aliases
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- 코멘트
COMMENT ON TABLE nickname_aliases IS '동일인물의 여러 닉네임을 매핑하는 테이블';
COMMENT ON COLUMN nickname_aliases.profile_id IS '프로필 UUID';
COMMENT ON COLUMN nickname_aliases.nickname IS '닉네임 (과거 또는 현재)';
COMMENT ON COLUMN nickname_aliases.is_primary IS '현재 사용 중인 대표 닉네임 여부';
