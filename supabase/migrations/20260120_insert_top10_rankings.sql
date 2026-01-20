-- =====================================================
-- Top 10 후원 랭킹 데이터 삽입
-- 실제 후원자 닉네임 기반 프로필 및 후원 데이터
-- =====================================================

-- 1. 시즌 4 존재 확인 (없으면 생성)
INSERT INTO public.seasons (id, name, start_date, is_active)
VALUES (4, '시즌 4 - 겨울의 축제', '2026-01-01', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Top 10 후원자 프로필 생성
-- 참고: id는 UUID 형식, 실제 유저 연동 전까지 임시 UUID 사용

-- 1위: 미키™
INSERT INTO public.profiles (id, nickname, role, unit, total_donation, created_at, updated_at)
VALUES (
  'donor-001-miki-tm',
  '미키™',
  'vip',
  'excel',
  10000000,  -- 1위 후원액
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  nickname = EXCLUDED.nickname,
  role = EXCLUDED.role,
  total_donation = EXCLUDED.total_donation,
  updated_at = NOW();

-- 2위: 미드굿♣가애
INSERT INTO public.profiles (id, nickname, role, unit, total_donation, created_at, updated_at)
VALUES (
  'donor-002-midgood',
  '미드굿♣가애',
  'vip',
  'excel',
  9500000,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  nickname = EXCLUDED.nickname,
  role = EXCLUDED.role,
  total_donation = EXCLUDED.total_donation,
  updated_at = NOW();

-- 3위: 농심육개장라면
INSERT INTO public.profiles (id, nickname, role, unit, total_donation, created_at, updated_at)
VALUES (
  'donor-003-nongshim',
  '농심육개장라면',
  'vip',
  'excel',
  9000000,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  nickname = EXCLUDED.nickname,
  role = EXCLUDED.role,
  total_donation = EXCLUDED.total_donation,
  updated_at = NOW();

-- 4위: [RG]✨린아의발굴™
INSERT INTO public.profiles (id, nickname, role, unit, total_donation, created_at, updated_at)
VALUES (
  'donor-004-rg-rina-discovery',
  '[RG]✨린아의발굴™',
  'vip',
  'excel',
  8500000,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  nickname = EXCLUDED.nickname,
  role = EXCLUDED.role,
  total_donation = EXCLUDED.total_donation,
  updated_at = NOW();

-- 5위: ❥CaNnOt
INSERT INTO public.profiles (id, nickname, role, unit, total_donation, created_at, updated_at)
VALUES (
  'donor-005-cannot',
  '❥CaNnOt',
  'vip',
  'excel',
  8000000,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  nickname = EXCLUDED.nickname,
  role = EXCLUDED.role,
  total_donation = EXCLUDED.total_donation,
  updated_at = NOW();

-- 6위: 태린공주❤️줄여보자
INSERT INTO public.profiles (id, nickname, role, unit, total_donation, created_at, updated_at)
VALUES (
  'donor-006-taerin-princess',
  '태린공주❤️줄여보자',
  'vip',
  'excel',
  7500000,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  nickname = EXCLUDED.nickname,
  role = EXCLUDED.role,
  total_donation = EXCLUDED.total_donation,
  updated_at = NOW();

-- 7위: ⭐건빵이미래쥐
INSERT INTO public.profiles (id, nickname, role, unit, total_donation, created_at, updated_at)
VALUES (
  'donor-007-gunbbang',
  '⭐건빵이미래쥐',
  'vip',
  'excel',
  7000000,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  nickname = EXCLUDED.nickname,
  role = EXCLUDED.role,
  total_donation = EXCLUDED.total_donation,
  updated_at = NOW();

-- 8위: [RG]린아✨여행™
INSERT INTO public.profiles (id, nickname, role, unit, total_donation, created_at, updated_at)
VALUES (
  'donor-008-rg-rina-travel',
  '[RG]린아✨여행™',
  'vip',
  'excel',
  6500000,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  nickname = EXCLUDED.nickname,
  role = EXCLUDED.role,
  total_donation = EXCLUDED.total_donation,
  updated_at = NOW();

-- 9위: 가윤이꼬❤️털이
INSERT INTO public.profiles (id, nickname, role, unit, total_donation, created_at, updated_at)
VALUES (
  'donor-009-gayun-kkotteori',
  '가윤이꼬❤️털이',
  'vip',
  'excel',
  6000000,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  nickname = EXCLUDED.nickname,
  role = EXCLUDED.role,
  total_donation = EXCLUDED.total_donation,
  updated_at = NOW();

-- 10위: 언제나♬
INSERT INTO public.profiles (id, nickname, role, unit, total_donation, created_at, updated_at)
VALUES (
  'donor-010-always',
  '언제나♬',
  'vip',
  'excel',
  5500000,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  nickname = EXCLUDED.nickname,
  role = EXCLUDED.role,
  total_donation = EXCLUDED.total_donation,
  updated_at = NOW();

-- 3. 후원 내역 데이터 삽입 (donations 테이블)
-- 시즌 4 기준 후원 기록

INSERT INTO public.donations (donor_name, donor_id, amount, season_id, donated_at)
VALUES
  ('미키™', 'donor-001-miki-tm', 10000000, 4, '2026-01-15 12:00:00+09'),
  ('미드굿♣가애', 'donor-002-midgood', 9500000, 4, '2026-01-15 11:00:00+09'),
  ('농심육개장라면', 'donor-003-nongshim', 9000000, 4, '2026-01-15 10:00:00+09'),
  ('[RG]✨린아의발굴™', 'donor-004-rg-rina-discovery', 8500000, 4, '2026-01-14 15:00:00+09'),
  ('❥CaNnOt', 'donor-005-cannot', 8000000, 4, '2026-01-14 14:00:00+09'),
  ('태린공주❤️줄여보자', 'donor-006-taerin-princess', 7500000, 4, '2026-01-14 13:00:00+09'),
  ('⭐건빵이미래쥐', 'donor-007-gunbbang', 7000000, 4, '2026-01-13 16:00:00+09'),
  ('[RG]린아✨여행™', 'donor-008-rg-rina-travel', 6500000, 4, '2026-01-13 15:00:00+09'),
  ('가윤이꼬❤️털이', 'donor-009-gayun-kkotteori', 6000000, 4, '2026-01-12 18:00:00+09'),
  ('언제나♬', 'donor-010-always', 5500000, 4, '2026-01-12 17:00:00+09')
ON CONFLICT DO NOTHING;

-- 4. VIP 보상 데이터 삽입 (Top 3)
INSERT INTO public.vip_rewards (profile_id, season_id, rank, personal_message, dedication_video_url, created_at)
VALUES
  ('donor-001-miki-tm', 4, 1, '미키™님, 압도적인 1위로 항상 최고의 응원을 보내주셔서 진심으로 감사합니다! 💖', 'https://youtube.com/watch?v=example1', NOW()),
  ('donor-002-midgood', 4, 2, '미드굿♣가애님, 든든한 2위 서포터로 항상 함께해주셔서 감사합니다! 💕', 'https://youtube.com/watch?v=example2', NOW()),
  ('donor-003-nongshim', 4, 3, '농심육개장라면님, 변함없는 응원에 진심으로 감사드립니다! 🧡', 'https://youtube.com/watch?v=example3', NOW())
ON CONFLICT DO NOTHING;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'Top 10 랭킹 데이터 삽입 완료!';
END $$;
