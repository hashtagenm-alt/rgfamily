-- =====================================================
-- Top 10 후원 랭킹 데이터 삽입
-- 실제 후원자 닉네임 기반 후원 데이터
-- =====================================================

-- 1. 시즌 1 존재 확인 (없으면 생성)
INSERT INTO public.seasons (id, name, start_date, is_active)
VALUES (1, '시즌 1', '2026-01-20', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Top 10 후원 데이터 삽입 (donations 테이블)
-- donor_id는 NULL (실제 유저 연동 전)
-- donor_name으로 랭킹 표시

INSERT INTO public.donations (donor_name, donor_id, amount, season_id, unit, created_at)
VALUES
  ('미키™', NULL, 10000000, 1, 'excel', '2026-01-20 12:00:00+09'),
  ('미드굿♣가애', NULL, 9500000, 1, 'excel', '2026-01-20 11:00:00+09'),
  ('농심육개장라면', NULL, 9000000, 1, 'excel', '2026-01-20 10:00:00+09'),
  ('[RG]✨린아의발굴™', NULL, 8500000, 1, 'excel', '2026-01-20 09:00:00+09'),
  ('❥CaNnOt', NULL, 8000000, 1, 'excel', '2026-01-20 08:00:00+09'),
  ('태린공주❤️줄여보자', NULL, 7500000, 1, 'excel', '2026-01-20 07:00:00+09'),
  ('⭐건빵이미래쥐', NULL, 7000000, 1, 'excel', '2026-01-20 06:00:00+09'),
  ('[RG]린아✨여행™', NULL, 6500000, 1, 'excel', '2026-01-20 05:00:00+09'),
  ('가윤이꼬❤️털이', NULL, 6000000, 1, 'excel', '2026-01-20 04:00:00+09'),
  ('언제나♬', NULL, 5500000, 1, 'excel', '2026-01-20 03:00:00+09')
ON CONFLICT DO NOTHING;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'Top 10 랭킹 데이터 삽입 완료!';
END $$;
