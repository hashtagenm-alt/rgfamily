-- 후원 랭킹 UI 개편: 게이지바 → 시청자 점수 시스템
-- total_donation_rankings에 donation_count, top_bj 컬럼 추가
-- season_donation_rankings에 top_bj 컬럼 추가
-- Public Views 재생성 (gauge_percent → viewer_score)

-- 1) total_donation_rankings에 컬럼 추가
ALTER TABLE total_donation_rankings ADD COLUMN IF NOT EXISTS donation_count integer DEFAULT 0;
ALTER TABLE total_donation_rankings ADD COLUMN IF NOT EXISTS top_bj text;

-- 2) season_donation_rankings에 컬럼 추가
ALTER TABLE season_donation_rankings ADD COLUMN IF NOT EXISTS top_bj text;

-- 3) Public Views 재생성 (gauge_percent → viewer_score)
DROP VIEW IF EXISTS season_rankings_public CASCADE;
DROP VIEW IF EXISTS total_rankings_public CASCADE;

CREATE VIEW total_rankings_public AS
SELECT tdr.id, tdr.rank, tdr.donor_name,
  (tdr.total_amount * 50) AS viewer_score,
  tdr.donation_count, tdr.top_bj,
  p.id AS profile_id, p.avatar_url,
  COALESCE(vcp.is_vip_clickable, FALSE) AS is_vip_clickable
FROM total_donation_rankings tdr
LEFT JOIN profiles p ON p.nickname = tdr.donor_name
LEFT JOIN vip_clickable_profiles vcp ON vcp.profile_id = p.id;

CREATE VIEW season_rankings_public AS
SELECT sdr.id, sdr.season_id, sdr.rank, sdr.donor_name,
  (sdr.total_amount * 50) AS viewer_score,
  sdr.donation_count, sdr.unit, sdr.top_bj,
  p.id AS profile_id, p.avatar_url,
  COALESCE(vcp.is_vip_clickable, FALSE) AS is_vip_clickable,
  sdr.updated_at, sdr.created_at
FROM season_donation_rankings sdr
LEFT JOIN profiles p ON p.nickname = sdr.donor_name
LEFT JOIN vip_clickable_profiles vcp ON vcp.profile_id = p.id;

GRANT SELECT ON total_rankings_public TO anon, authenticated;
GRANT SELECT ON season_rankings_public TO anon, authenticated;
