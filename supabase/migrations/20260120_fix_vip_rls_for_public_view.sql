-- ============================================================
-- VIP Rewards & Images RLS 정책 수정
-- 모든 로그인 사용자가 VIP 페이지 조회 가능하도록 변경
-- ============================================================

-- 기존 SELECT 정책 삭제
DROP POLICY IF EXISTS "VIP rewards visible to owners and staff" ON public.vip_rewards;
DROP POLICY IF EXISTS "VIP rewards visible to owners and admins" ON public.vip_rewards;
DROP POLICY IF EXISTS "VIP Rewards are viewable by everyone" ON public.vip_rewards;

-- 새 SELECT 정책: 모든 로그인 사용자가 조회 가능
CREATE POLICY "VIP rewards viewable by authenticated users"
  ON public.vip_rewards FOR SELECT
  USING (auth.role() = 'authenticated');

-- 기존 관리자 정책 유지 (INSERT/UPDATE/DELETE)
-- Staff can manage vip_rewards 정책이 이미 있으므로 유지

-- ============================================================
-- VIP Images RLS 정책 수정
-- ============================================================

-- 기존 SELECT 정책 삭제
DROP POLICY IF EXISTS "VIP images visible to owners and staff" ON public.vip_images;
DROP POLICY IF EXISTS "VIP images visible to reward owners and admins" ON public.vip_images;

-- 새 SELECT 정책: 모든 로그인 사용자가 조회 가능
CREATE POLICY "VIP images viewable by authenticated users"
  ON public.vip_images FOR SELECT
  USING (auth.role() = 'authenticated');

-- 기존 관리자 정책 유지 (INSERT/UPDATE/DELETE)
-- Staff can manage vip_images 정책이 이미 있으므로 유지
