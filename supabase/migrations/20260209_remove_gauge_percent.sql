-- gauge_percent 제거: 프론트엔드에서 미사용, 불필요한 서브쿼리 성능 낭비
-- 실행: Supabase Dashboard SQL Editor에서 직접 실행

-- 1) total_rankings_public 재생성 (gauge_percent 제거)
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

-- 2) season_rankings_public 재생성 (gauge_percent 제거)
DROP VIEW IF EXISTS season_rankings_public CASCADE;

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

-- 3) 권한 부여
GRANT SELECT ON total_rankings_public TO anon, authenticated;
GRANT SELECT ON season_rankings_public TO anon, authenticated;
