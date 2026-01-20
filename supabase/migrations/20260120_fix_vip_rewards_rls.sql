-- VIP Rewards RLS 정책 수정
-- 기존: 본인(profile_id = auth.uid()) 또는 스태프만 SELECT 가능
-- 변경: 모든 로그인 사용자가 SELECT 가능 (VIP 페이지 공개 열람)

-- 기존 SELECT 정책 삭제
DROP POLICY IF EXISTS "VIP rewards visible to owners and staff" ON public.vip_rewards;

-- 새 SELECT 정책: 모든 인증된 사용자가 조회 가능
CREATE POLICY "VIP rewards visible to authenticated users"
  ON public.vip_rewards
  FOR SELECT
  TO authenticated
  USING (true);

-- vip_images도 동일하게 수정 필요
DROP POLICY IF EXISTS "VIP images visible to owners and staff" ON public.vip_images;

-- vip_images SELECT 정책: 모든 인증된 사용자가 조회 가능
CREATE POLICY "VIP images visible to authenticated users"
  ON public.vip_images
  FOR SELECT
  TO authenticated
  USING (true);
