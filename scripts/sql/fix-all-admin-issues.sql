-- ================================================
-- 관리자 기능 문제 종합 수정
-- 1. 시그니처 RLS 정책 수정 (superadmin 허용)
-- 2. 총후원랭킹 RLS 정책 수정 (superadmin 허용)
-- 3. 후원 랭킹 donor_id 컬럼 추가
-- 실행: Supabase Dashboard SQL Editor에서 실행
-- ================================================

-- =====================
-- PART 1: 시그니처 RLS
-- =====================

-- 1.1 기존 signatures 정책 삭제
DROP POLICY IF EXISTS "signatures_insert_admin" ON public.signatures;
DROP POLICY IF EXISTS "signatures_update_admin" ON public.signatures;
DROP POLICY IF EXISTS "signatures_delete_admin" ON public.signatures;
DROP POLICY IF EXISTS "Admins can insert signatures" ON public.signatures;
DROP POLICY IF EXISTS "Admins can update signatures" ON public.signatures;
DROP POLICY IF EXISTS "Admins can delete signatures" ON public.signatures;

-- 1.2 새 signatures 정책 생성 (is_admin() 사용 - admin, superadmin 모두 허용)
CREATE POLICY "signatures_insert_admin" ON public.signatures
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "signatures_update_admin" ON public.signatures
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "signatures_delete_admin" ON public.signatures
  FOR DELETE USING (public.is_admin());

-- 1.3 기존 signature_videos 정책 삭제
DROP POLICY IF EXISTS "signature_videos_insert_admin" ON public.signature_videos;
DROP POLICY IF EXISTS "signature_videos_update_admin" ON public.signature_videos;
DROP POLICY IF EXISTS "signature_videos_delete_admin" ON public.signature_videos;

-- 1.4 새 signature_videos 정책 생성
CREATE POLICY "signature_videos_insert_admin" ON public.signature_videos
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "signature_videos_update_admin" ON public.signature_videos
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "signature_videos_delete_admin" ON public.signature_videos
  FOR DELETE USING (public.is_admin());

-- =====================
-- PART 2: 총후원랭킹 RLS
-- =====================

-- 2.1 기존 total_donation_rankings RLS 정책 삭제
DROP POLICY IF EXISTS "총후원랭킹 관리자 수정" ON public.total_donation_rankings;
DROP POLICY IF EXISTS "total_donation_rankings_admin_policy" ON public.total_donation_rankings;

-- 2.2 새 total_donation_rankings 관리자 정책 생성 (is_admin() 사용)
CREATE POLICY "total_donation_rankings_admin_policy" ON public.total_donation_rankings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================
-- PART 3: 후원 랭킹 donor_id
-- =====================

-- 3.1 season_donation_rankings 테이블에 donor_id 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'season_donation_rankings' AND column_name = 'donor_id'
  ) THEN
    ALTER TABLE season_donation_rankings
    ADD COLUMN donor_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3.2 total_donation_rankings 테이블에 donor_id 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'total_donation_rankings' AND column_name = 'donor_id'
  ) THEN
    ALTER TABLE total_donation_rankings
    ADD COLUMN donor_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3.3 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_season_donation_rankings_donor_id
ON season_donation_rankings(donor_id);

CREATE INDEX IF NOT EXISTS idx_total_donation_rankings_donor_id
ON total_donation_rankings(donor_id);

-- 3.4 기존 데이터 자동 매칭 (닉네임 기반)
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

-- =====================
-- PART 4: 결과 확인
-- =====================

-- 4.1 시그니처 RLS 정책 확인
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('signatures', 'signature_videos', 'total_donation_rankings')
ORDER BY tablename, policyname;

-- 4.2 랭킹 매칭 결과 확인
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
