-- 시즌별 후원 랭킹 테이블 생성
-- Supabase Dashboard > SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS season_donation_rankings (
  id SERIAL PRIMARY KEY,
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 100),
  donor_name TEXT NOT NULL,
  total_amount INTEGER NOT NULL DEFAULT 0,
  donation_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 같은 시즌에서 같은 순위는 하나만
  UNIQUE(season_id, rank)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_season_donation_rankings_season
  ON season_donation_rankings(season_id);

CREATE INDEX IF NOT EXISTS idx_season_donation_rankings_donor
  ON season_donation_rankings(donor_name);

-- 테이블 설명
COMMENT ON TABLE season_donation_rankings IS '시즌별 후원 랭킹 (Top 50)';
COMMENT ON COLUMN season_donation_rankings.season_id IS '시즌 ID';
COMMENT ON COLUMN season_donation_rankings.rank IS '순위 (1-100)';
COMMENT ON COLUMN season_donation_rankings.donor_name IS '후원자 닉네임';
COMMENT ON COLUMN season_donation_rankings.total_amount IS '총 후원 하트 (외부 노출 금지)';
COMMENT ON COLUMN season_donation_rankings.donation_count IS '후원 건수';

-- RLS 정책 (읽기만 허용)
ALTER TABLE season_donation_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "시즌 랭킹 읽기 허용" ON season_donation_rankings
  FOR SELECT USING (true);

CREATE POLICY "시즌 랭킹 수정은 관리자만" ON season_donation_rankings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );
