-- ============================================================
-- 시그니처 자격 기반 VIP 클릭 시스템
-- 실행일: 2026-02-03
--
-- 변경사항:
-- 1. signature_eligibility 테이블 생성
-- 2. vip_clickable_profiles View를 시그니처 자격 기반으로 변경
-- 3. 시그니처 자격자(11명)만 프로필 클릭 가능
-- ============================================================

-- 1. 시그니처 자격 테이블 생성
CREATE TABLE IF NOT EXISTS public.signature_eligibility (
  id SERIAL PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  donor_name TEXT NOT NULL,
  sig_number INTEGER NOT NULL CHECK (sig_number BETWEEN 1 AND 3),
  episode_id INTEGER REFERENCES public.episodes(id),
  episode_number INTEGER,
  daily_amount INTEGER NOT NULL,
  threshold_amount INTEGER NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_claimed BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(donor_name, sig_number)
);

COMMENT ON TABLE public.signature_eligibility IS '시그니처 자격 기록 - 당일 10만/15만/20만 달성';
COMMENT ON COLUMN public.signature_eligibility.sig_number IS '시그니처 번호 (1=10만, 2=15만, 3=20만)';

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_sig_eligibility_donor ON public.signature_eligibility(donor_name);
CREATE INDEX IF NOT EXISTS idx_sig_eligibility_profile ON public.signature_eligibility(profile_id);

-- 3. RLS 정책
ALTER TABLE public.signature_eligibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sig_eligibility_read_all" ON public.signature_eligibility;
CREATE POLICY "sig_eligibility_read_all" ON public.signature_eligibility
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "sig_eligibility_admin_write" ON public.signature_eligibility;
CREATE POLICY "sig_eligibility_admin_write" ON public.signature_eligibility
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- 4. 권한
GRANT SELECT ON public.signature_eligibility TO anon, authenticated;

-- 5. 기존 Views 삭제 (CASCADE로 의존성 제거)
DROP VIEW IF EXISTS public.vip_clickable_profiles CASCADE;
DROP VIEW IF EXISTS public.season_rankings_public CASCADE;
DROP VIEW IF EXISTS public.total_rankings_public CASCADE;

-- 6. 시그니처 자격자 기반 VIP 클릭 View (핵심 변경)
-- 기존: vip_rewards 테이블 기반 (49명)
-- 변경: signature_eligibility 테이블 기반 (11명)
CREATE VIEW public.vip_clickable_profiles AS
SELECT DISTINCT
  p.id as profile_id,
  p.nickname,
  p.avatar_url,
  TRUE as is_vip_clickable
FROM public.profiles p
INNER JOIN public.signature_eligibility se ON se.donor_name = p.nickname
WHERE p.avatar_url IS NOT NULL AND p.avatar_url != '';

GRANT SELECT ON public.vip_clickable_profiles TO anon, authenticated;

-- 7. 시즌 랭킹 공개 View 재생성
CREATE VIEW public.season_rankings_public AS
SELECT
  sdr.id,
  sdr.season_id,
  sdr.rank,
  sdr.donor_name,
  sdr.donation_count,
  sdr.unit,
  CASE
    WHEN sdr.rank = 1 THEN 100
    ELSE ROUND((sdr.total_amount::numeric / NULLIF(
      (SELECT MAX(total_amount) FROM season_donation_rankings WHERE season_id = sdr.season_id), 0
    )) * 100)::integer
  END AS gauge_percent,
  p.id as profile_id,
  p.avatar_url,
  COALESCE(vcp.is_vip_clickable, FALSE) as is_vip_clickable,
  sdr.updated_at,
  sdr.created_at
FROM public.season_donation_rankings sdr
LEFT JOIN public.profiles p ON p.nickname = sdr.donor_name
LEFT JOIN public.vip_clickable_profiles vcp ON vcp.profile_id = p.id;

GRANT SELECT ON public.season_rankings_public TO anon, authenticated;

-- 8. 총 후원 랭킹 공개 View 재생성
CREATE VIEW public.total_rankings_public AS
SELECT
  tdr.id,
  tdr.rank,
  tdr.donor_name,
  CASE
    WHEN tdr.rank = 1 THEN 100
    ELSE ROUND((tdr.total_amount::numeric / NULLIF(
      (SELECT MAX(total_amount) FROM total_donation_rankings), 0
    )) * 100)::integer
  END AS gauge_percent,
  p.id as profile_id,
  p.avatar_url,
  COALESCE(vcp.is_vip_clickable, FALSE) as is_vip_clickable
FROM public.total_donation_rankings tdr
LEFT JOIN public.profiles p ON p.nickname = tdr.donor_name
LEFT JOIN public.vip_clickable_profiles vcp ON vcp.profile_id = p.id;

GRANT SELECT ON public.total_rankings_public TO anon, authenticated;

-- 9. 시그니처 자격 현황 View
CREATE OR REPLACE VIEW public.v_signature_status AS
SELECT
  donor_name,
  COUNT(*) as sig_count,
  MAX(CASE WHEN sig_number = 1 THEN episode_number END) as sig1_episode,
  MAX(CASE WHEN sig_number = 1 THEN daily_amount END) as sig1_amount,
  MAX(CASE WHEN sig_number = 2 THEN episode_number END) as sig2_episode,
  MAX(CASE WHEN sig_number = 2 THEN daily_amount END) as sig2_amount,
  MAX(CASE WHEN sig_number = 3 THEN episode_number END) as sig3_episode,
  MAX(CASE WHEN sig_number = 3 THEN daily_amount END) as sig3_amount,
  BOOL_AND(is_claimed) as all_claimed
FROM public.signature_eligibility
GROUP BY donor_name
ORDER BY COUNT(*) DESC, donor_name;

GRANT SELECT ON public.v_signature_status TO anon, authenticated;
