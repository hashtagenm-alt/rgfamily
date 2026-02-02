-- ============================================================
-- VIP 클릭 가능 프로필 View 기반 전환
-- 실행일: 2026-02-03
-- ============================================================

-- 1. 기존 Views 삭제
DROP VIEW IF EXISTS public.season_rankings_public CASCADE;
DROP VIEW IF EXISTS public.total_rankings_public CASCADE;
DROP VIEW IF EXISTS public.vip_clickable_profiles CASCADE;

-- 2. VIP 클릭 가능 프로필 View 생성
CREATE VIEW public.vip_clickable_profiles AS
SELECT DISTINCT p.id as profile_id, p.nickname, p.avatar_url, TRUE as is_vip_clickable
FROM public.profiles p
INNER JOIN public.vip_rewards vr ON vr.profile_id = p.id
WHERE p.avatar_url IS NOT NULL AND p.avatar_url != '';

GRANT SELECT ON public.vip_clickable_profiles TO anon, authenticated;

-- 3. 시즌 랭킹 View
CREATE VIEW public.season_rankings_public AS
SELECT sdr.id, sdr.season_id, sdr.rank, sdr.donor_name, sdr.donation_count, sdr.unit,
  CASE WHEN sdr.rank = 1 THEN 100 ELSE ROUND((sdr.total_amount::numeric / NULLIF((SELECT MAX(total_amount) FROM season_donation_rankings WHERE season_id = sdr.season_id), 0)) * 100)::integer END AS gauge_percent,
  p.id as profile_id, p.avatar_url,
  COALESCE(vcp.is_vip_clickable, FALSE) as is_vip_clickable,
  sdr.updated_at, sdr.created_at
FROM public.season_donation_rankings sdr
LEFT JOIN public.profiles p ON p.nickname = sdr.donor_name
LEFT JOIN public.vip_clickable_profiles vcp ON vcp.profile_id = p.id;

GRANT SELECT ON public.season_rankings_public TO anon, authenticated;

-- 4. 총 후원 랭킹 View (timestamp 컬럼 없음)
CREATE VIEW public.total_rankings_public AS
SELECT tdr.id, tdr.rank, tdr.donor_name,
  CASE WHEN tdr.rank = 1 THEN 100 ELSE ROUND((tdr.total_amount::numeric / NULLIF((SELECT MAX(total_amount) FROM total_donation_rankings), 0)) * 100)::integer END AS gauge_percent,
  p.id as profile_id, p.avatar_url,
  COALESCE(vcp.is_vip_clickable, FALSE) as is_vip_clickable
FROM public.total_donation_rankings tdr
LEFT JOIN public.profiles p ON p.nickname = tdr.donor_name
LEFT JOIN public.vip_clickable_profiles vcp ON vcp.profile_id = p.id;

GRANT SELECT ON public.total_rankings_public TO anon, authenticated;
