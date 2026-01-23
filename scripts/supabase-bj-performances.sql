-- BJ 에피소드 성적 데이터 업로드 시스템 - Supabase SQL
-- 이 스크립트를 Supabase Dashboard > SQL Editor에서 실행하세요.

-- ============================================
-- Step 1: organization에 손밍 추가
-- ============================================
INSERT INTO organization (name, unit, role, is_active)
VALUES ('손밍', 'excel', '멤버', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- Step 2: episodes 테이블에 대표BJ 필드 추가
-- ============================================
-- representative_bj_total: RG_family(대표BJ) 합산 성적 저장
-- 저장 형식: {"hearts": 232872, "count": 65, "score": 232872, "contribution": 232872, "result": "상금 300만원"}
ALTER TABLE episodes
ADD COLUMN IF NOT EXISTS representative_bj_total JSONB DEFAULT NULL;

COMMENT ON COLUMN episodes.representative_bj_total IS
'대표BJ(RG_family) 합산 성적. {"hearts": number, "count": number, "score": number, "contribution": number, "result": string}';

-- ============================================
-- Step 3: bj_episode_performances 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS bj_episode_performances (
  id SERIAL PRIMARY KEY,
  episode_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  bj_member_id INTEGER NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  donation_hearts INTEGER NOT NULL DEFAULT 0,        -- 받은 하트
  donation_count INTEGER NOT NULL DEFAULT 0,         -- 후원 건수
  heart_score INTEGER NOT NULL DEFAULT 0,            -- 하트점수
  contribution INTEGER NOT NULL DEFAULT 0,           -- 기여도
  final_rank INTEGER,                                -- 최종 순위
  rank_result VARCHAR(50),                           -- 순위 결과 (예: 상금 300만원)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(episode_id, bj_member_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_bj_ep_perf_episode ON bj_episode_performances(episode_id);
CREATE INDEX IF NOT EXISTS idx_bj_ep_perf_member ON bj_episode_performances(bj_member_id);

-- 테이블 코멘트
COMMENT ON TABLE bj_episode_performances IS 'BJ별 에피소드 성적 기록';
COMMENT ON COLUMN bj_episode_performances.donation_hearts IS '받은 하트 개수';
COMMENT ON COLUMN bj_episode_performances.donation_count IS '후원 건수';
COMMENT ON COLUMN bj_episode_performances.heart_score IS '하트점수 (직급전 점수)';
COMMENT ON COLUMN bj_episode_performances.contribution IS '기여도';
COMMENT ON COLUMN bj_episode_performances.final_rank IS '최종 순위';
COMMENT ON COLUMN bj_episode_performances.rank_result IS '순위에 따른 결과 (상금 등)';

-- ============================================
-- Step 4: RLS 정책 설정
-- ============================================
ALTER TABLE bj_episode_performances ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자 조회 허용
CREATE POLICY "select_authenticated" ON bj_episode_performances
  FOR SELECT TO authenticated USING (true);

-- 익명 사용자도 조회 허용 (공개 데이터)
CREATE POLICY "select_anon" ON bj_episode_performances
  FOR SELECT TO anon USING (true);

-- 관리자만 수정 가능
CREATE POLICY "modify_admin" ON bj_episode_performances
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

-- ============================================
-- Step 5: updated_at 자동 업데이트 트리거
-- ============================================
CREATE OR REPLACE FUNCTION update_bj_episode_performances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bj_episode_performances_updated_at ON bj_episode_performances;
CREATE TRIGGER trigger_update_bj_episode_performances_updated_at
  BEFORE UPDATE ON bj_episode_performances
  FOR EACH ROW
  EXECUTE FUNCTION update_bj_episode_performances_updated_at();

-- ============================================
-- 확인 쿼리
-- ============================================
-- 추가된 손밍 확인
SELECT id, name, unit, role FROM organization WHERE name = '손밍';

-- episodes 테이블 컬럼 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'episodes' AND column_name = 'representative_bj_total';

-- bj_episode_performances 테이블 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bj_episode_performances'
ORDER BY ordinal_position;
