-- 1. season_donation_rankings 테이블에 unit 컬럼 추가
-- 후원 랭킹 필터링을 위해 팬클럽 소속 정보 저장

ALTER TABLE season_donation_rankings
ADD COLUMN IF NOT EXISTS unit TEXT CHECK (unit IN ('excel', 'crew'));

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_season_donation_rankings_unit
  ON season_donation_rankings(unit);

COMMENT ON COLUMN season_donation_rankings.unit IS '팬클럽 소속 (excel/crew)';


-- 2. profiles 테이블에 account_type 컬럼 추가
-- 실제 가입 회원 vs 관리자가 임의 생성한 계정 구분

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'real' CHECK (account_type IN ('real', 'virtual', 'system'));

-- 기존 데이터 업데이트: 이메일이 없거나 특정 패턴이면 virtual로 표시
-- (실행 전 데이터 확인 필요 - 주석 처리)
-- UPDATE profiles SET account_type = 'virtual' WHERE email IS NULL;

COMMENT ON COLUMN profiles.account_type IS '계정 유형: real(실제 가입), virtual(임의 생성), system(시스템 계정)';


-- 3. 기존 시즌 1 데이터에 unit 일괄 업데이트 (모두 excel인 경우)
-- 실행 전 확인 필요 - 주석 처리
-- UPDATE season_donation_rankings SET unit = 'excel' WHERE season_id = 1;
