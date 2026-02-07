-- 후원 랭킹 View 하위호환성 확보
-- 구코드(gauge_percent)와 신코드(viewer_score) 모두 지원
-- 실행일: 2026-02-08

-- 1) total_rankings_public 재생성
DROP VIEW IF EXISTS total_rankings_public CASCADE;

CREATE VIEW total_rankings_public AS
SELECT tdr.id, tdr.rank, tdr.donor_name,
  -- 신코드용: 시청자 점수
  (tdr.total_amount * 50) AS viewer_score,
  -- 구코드 하위호환: 게이지 퍼센트 (1위 대비 %)
  CASE WHEN tdr.rank = 1 THEN 100
    ELSE ROUND((tdr.total_amount::numeric / NULLIF((SELECT MAX(total_amount) FROM total_donation_rankings), 0)) * 100)::integer
  END AS gauge_percent,
  tdr.donation_count, tdr.top_bj,
  p.id AS profile_id, p.avatar_url,
  COALESCE(vcp.is_vip_clickable, FALSE) AS is_vip_clickable
FROM total_donation_rankings tdr
LEFT JOIN profiles p ON p.nickname = tdr.donor_name
LEFT JOIN vip_clickable_profiles vcp ON vcp.profile_id = p.id;

-- 2) season_rankings_public 재생성
DROP VIEW IF EXISTS season_rankings_public CASCADE;

CREATE VIEW season_rankings_public AS
SELECT sdr.id, sdr.season_id, sdr.rank, sdr.donor_name,
  -- 신코드용: 시청자 점수
  (sdr.total_amount * 50) AS viewer_score,
  -- 구코드 하위호환: 게이지 퍼센트 (같은 시즌 1위 대비 %)
  CASE WHEN sdr.rank = 1 THEN 100
    ELSE ROUND((sdr.total_amount::numeric / NULLIF((
      SELECT MAX(total_amount) FROM season_donation_rankings sdr2
      WHERE sdr2.season_id = sdr.season_id
    ), 0)) * 100)::integer
  END AS gauge_percent,
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
