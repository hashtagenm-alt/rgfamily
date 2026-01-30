-- ================================================
-- 시그니처 테이블 RLS 정책 수정
-- 문제: 기존 정책이 role = 'admin'만 허용 (superadmin 제외)
-- 해결: is_admin() 함수 사용하여 admin, superadmin 모두 허용
-- 실행: Supabase Dashboard SQL Editor에서 실행
-- ================================================

-- 1. 기존 signatures 정책 삭제
DROP POLICY IF EXISTS "signatures_insert_admin" ON public.signatures;
DROP POLICY IF EXISTS "signatures_update_admin" ON public.signatures;
DROP POLICY IF EXISTS "signatures_delete_admin" ON public.signatures;

-- 2. 새 signatures 정책 생성 (is_admin() 사용)
CREATE POLICY "signatures_insert_admin" ON public.signatures
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "signatures_update_admin" ON public.signatures
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "signatures_delete_admin" ON public.signatures
  FOR DELETE USING (public.is_admin());

-- 3. 기존 signature_videos 정책 삭제
DROP POLICY IF EXISTS "signature_videos_insert_admin" ON public.signature_videos;
DROP POLICY IF EXISTS "signature_videos_update_admin" ON public.signature_videos;
DROP POLICY IF EXISTS "signature_videos_delete_admin" ON public.signature_videos;

-- 4. 새 signature_videos 정책 생성 (is_admin() 사용)
CREATE POLICY "signature_videos_insert_admin" ON public.signature_videos
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "signature_videos_update_admin" ON public.signature_videos
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "signature_videos_delete_admin" ON public.signature_videos
  FOR DELETE USING (public.is_admin());

-- 5. 확인
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('signatures', 'signature_videos');
