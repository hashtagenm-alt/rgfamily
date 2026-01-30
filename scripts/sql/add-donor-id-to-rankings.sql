-- ================================================
-- 후원 랭킹 테이블에 donor_id FK 컬럼 추가
-- 실행: Supabase Dashboard SQL Editor에서 실행
-- ================================================

-- 1. season_donation_rankings 테이블에 donor_id 추가
ALTER TABLE season_donation_rankings
ADD COLUMN IF NOT EXISTS donor_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. total_donation_rankings 테이블에 donor_id 추가
ALTER TABLE total_donation_rankings
ADD COLUMN IF NOT EXISTS donor_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_season_donation_rankings_donor_id
ON season_donation_rankings(donor_id);

CREATE INDEX IF NOT EXISTS idx_total_donation_rankings_donor_id
ON total_donation_rankings(donor_id);

-- 4. 기존 데이터 자동 매칭 (닉네임 기반)
-- 시즌 랭킹 매칭
UPDATE season_donation_rankings sdr
SET donor_id = p.id
FROM profiles p
WHERE LOWER(TRIM(sdr.donor_name)) = LOWER(TRIM(p.nickname))
  AND sdr.donor_id IS NULL;

-- 총 후원 랭킹 매칭
UPDATE total_donation_rankings tdr
SET donor_id = p.id
FROM profiles p
WHERE LOWER(TRIM(tdr.donor_name)) = LOWER(TRIM(p.nickname))
  AND tdr.donor_id IS NULL;

-- 5. 매칭 결과 확인
SELECT
  'season_donation_rankings' as table_name,
  COUNT(*) as total,
  COUNT(donor_id) as linked,
  COUNT(*) - COUNT(donor_id) as unlinked
FROM season_donation_rankings
UNION ALL
SELECT
  'total_donation_rankings' as table_name,
  COUNT(*) as total,
  COUNT(donor_id) as linked,
  COUNT(*) - COUNT(donor_id) as unlinked
FROM total_donation_rankings;
