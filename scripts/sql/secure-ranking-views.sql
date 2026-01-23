-- ============================================================
-- 후원 랭킹 테이블 보안 강화
-- Supabase Dashboard > SQL Editor에서 실행
--
-- 목적: total_amount(후원 금액) 외부 노출 차단
-- ============================================================

-- ============================================================
-- 1. 보안 View 생성 (total_amount 제외)
-- ============================================================

-- 시즌 랭킹용 공개 View (게이지 퍼센트 포함)
CREATE OR REPLACE VIEW public.season_rankings_public AS
SELECT
  sdr.id,
  sdr.season_id,
  sdr.rank,
  sdr.donor_name,
  sdr.donation_count,
  sdr.unit,
  -- 게이지 퍼센트: 1위 대비 비율 (1위=100, 나머지는 상대값)
  CASE
    WHEN sdr.rank = 1 THEN 100
    ELSE ROUND(
      (sdr.total_amount::numeric /
       NULLIF((SELECT MAX(total_amount) FROM season_donation_rankings WHERE season_id = sdr.season_id), 0)
      ) * 100
    )::integer
  END AS gauge_percent,
  sdr.updated_at,
  sdr.created_at
FROM public.season_donation_rankings sdr;

COMMENT ON VIEW public.season_rankings_public IS '시즌 랭킹 공개 View (total_amount 대신 gauge_percent 제공)';

-- 총 후원 랭킹용 공개 View (게이지 퍼센트 포함)
CREATE OR REPLACE VIEW public.total_rankings_public AS
SELECT
  tdr.id,
  tdr.rank,
  tdr.donor_name,
  -- 게이지 퍼센트: 1위 대비 비율 (1위=100, 나머지는 상대값)
  CASE
    WHEN tdr.rank = 1 THEN 100
    ELSE ROUND(
      (tdr.total_amount::numeric /
       NULLIF((SELECT MAX(total_amount) FROM total_donation_rankings), 0)
      ) * 100
    )::integer
  END AS gauge_percent,
  tdr.updated_at,
  tdr.created_at
FROM public.total_donation_rankings tdr;

COMMENT ON VIEW public.total_rankings_public IS '총 후원 랭킹 공개 View (total_amount 대신 gauge_percent 제공)';

-- ============================================================
-- 2. View 권한 설정
-- ============================================================

-- View는 security_invoker = false (기본값)로 두어
-- 원본 테이블 RLS를 우회하고 View 자체로 데이터 접근 가능
-- (View에는 민감한 total_amount가 없으므로 안전)

-- 모든 사용자에게 View 읽기 권한 부여
GRANT SELECT ON public.season_rankings_public TO anon, authenticated;
GRANT SELECT ON public.total_rankings_public TO anon, authenticated;

-- ============================================================
-- 3. 원본 테이블 RLS 정책 변경 (관리자만 접근)
-- ============================================================

-- season_donation_rankings: 기존 공개 읽기 정책 삭제
DROP POLICY IF EXISTS "시즌 랭킹 읽기 허용" ON public.season_donation_rankings;

-- season_donation_rankings: 관리자만 읽기 허용
CREATE POLICY "시즌 랭킹 관리자만 읽기" ON public.season_donation_rankings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- total_donation_rankings: 기존 공개 읽기 정책 삭제
DROP POLICY IF EXISTS "총후원랭킹 공개 읽기" ON public.total_donation_rankings;

-- total_donation_rankings: 관리자만 읽기 허용
CREATE POLICY "총후원랭킹 관리자만 읽기" ON public.total_donation_rankings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- ============================================================
-- 4. donations 테이블도 보안 강화 (선택사항)
-- ============================================================

-- donations: 기존 공개 읽기 정책 삭제
DROP POLICY IF EXISTS "Donations are viewable by everyone" ON public.donations;

-- donations: 관리자만 읽기 허용
CREATE POLICY "Donations 관리자만 읽기" ON public.donations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- ============================================================
-- 5. 검증 쿼리
-- ============================================================

-- 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('season_donation_rankings', 'total_donation_rankings', 'donations');

-- View 확인
SELECT table_name, view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('season_rankings_public', 'total_rankings_public');
