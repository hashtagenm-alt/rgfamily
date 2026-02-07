-- 레거시 후원 데이터 테이블
-- 시즌1 이전 누적 후원 데이터를 저장하기 위한 테이블

CREATE TABLE IF NOT EXISTS legacy_donation_totals (
  id SERIAL PRIMARY KEY,
  donor_name TEXT UNIQUE NOT NULL,
  total_amount INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_legacy_donation_totals_donor_name
  ON legacy_donation_totals(donor_name);
CREATE INDEX IF NOT EXISTS idx_legacy_donation_totals_total_amount
  ON legacy_donation_totals(total_amount DESC);

-- RLS 정책 (service_role만 접근 가능)
ALTER TABLE legacy_donation_totals ENABLE ROW LEVEL SECURITY;

-- 기본적으로 모든 접근 차단
CREATE POLICY "No public access to legacy_donation_totals"
  ON legacy_donation_totals
  FOR ALL
  USING (false);

-- service_role은 모든 작업 가능
CREATE POLICY "Service role full access to legacy_donation_totals"
  ON legacy_donation_totals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 코멘트 추가
COMMENT ON TABLE legacy_donation_totals IS '시즌1 이전 누적 후원 데이터. 스크립트에서 관리하며 UI에서는 직접 접근하지 않음.';
COMMENT ON COLUMN legacy_donation_totals.donor_name IS '후원자 닉네임 (고유)';
COMMENT ON COLUMN legacy_donation_totals.total_amount IS '레거시 총 후원 하트';
COMMENT ON COLUMN legacy_donation_totals.note IS '메모 (닉네임 변경 이력 등)';
