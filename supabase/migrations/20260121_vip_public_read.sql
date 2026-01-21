-- VIP 관련 테이블 공개 읽기 허용
-- 비로그인 사용자도 VIP 라운지, VIP 프로필 페이지 접근 가능하도록

-- 1. vip_rewards: 공개 읽기 허용
DROP POLICY IF EXISTS "VIP rewards visible to authenticated users" ON public.vip_rewards;
DROP POLICY IF EXISTS "VIP rewards public read" ON public.vip_rewards;

CREATE POLICY "VIP rewards public read"
  ON public.vip_rewards
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. vip_images: 공개 읽기 허용
DROP POLICY IF EXISTS "VIP images visible to authenticated users" ON public.vip_images;
DROP POLICY IF EXISTS "VIP images public read" ON public.vip_images;

CREATE POLICY "VIP images public read"
  ON public.vip_images
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. profiles: 공개 읽기 허용 (VIP 닉네임 조회용)
DROP POLICY IF EXISTS "Profiles public read" ON public.profiles;

CREATE POLICY "Profiles public read"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. seasons: 공개 읽기 허용
DROP POLICY IF EXISTS "Seasons public read" ON public.seasons;

CREATE POLICY "Seasons public read"
  ON public.seasons
  FOR SELECT
  TO anon, authenticated
  USING (true);
