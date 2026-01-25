-- =====================================================
-- 랭킹 아키텍처 수정
--
-- 문제: total_donation_rankings가 뷰로 변환되어 레거시 데이터 유실
-- 해결: 테이블로 복원하고 올바른 뷰 구조 재설계
-- =====================================================

-- 1. 기존 total_donation_rankings 뷰 삭제 (의존성 있는 뷰들 먼저 삭제)
DROP VIEW IF EXISTS public.total_rankings_public CASCADE;
DROP VIEW IF EXISTS public.v_total_rankings CASCADE;

-- total_donation_rankings가 뷰인지 테이블인지 확인하고 삭제
DO $$
BEGIN
  -- 뷰라면 삭제
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'total_donation_rankings' AND schemaname = 'public') THEN
    DROP VIEW public.total_donation_rankings;
    RAISE NOTICE 'Dropped view total_donation_rankings';
  END IF;

  -- 테이블이 이미 존재한다면 스킵
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'total_donation_rankings' AND schemaname = 'public') THEN
    RAISE NOTICE 'Table total_donation_rankings already exists';
  END IF;
END $$;

-- 2. total_donation_rankings 테이블 재생성 (없으면)
CREATE TABLE IF NOT EXISTS public.total_donation_rankings (
  id SERIAL PRIMARY KEY,
  rank INTEGER NOT NULL,
  donor_name TEXT NOT NULL,
  total_amount BIGINT NOT NULL DEFAULT 0,
  is_permanent_vip BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 (없으면 생성)
CREATE INDEX IF NOT EXISTS idx_total_donation_rankings_rank ON public.total_donation_rankings(rank);
CREATE INDEX IF NOT EXISTS idx_total_donation_rankings_donor_name ON public.total_donation_rankings(donor_name);

-- 3. 백업에서 데이터 복원 + 3화 데이터 추가 (episode_id = 14)
--
-- 데이터 구조 설명:
-- - backup: 시즌1 1화+2화까지의 누적 데이터
-- - episode 14 (3화): 새로 추가된 데이터
-- - 합산: backup + 3화 데이터
--
INSERT INTO public.total_donation_rankings (rank, donor_name, total_amount)
SELECT
  ROW_NUMBER() OVER (ORDER BY combined.total DESC) as rank,
  combined.donor_name,
  combined.total as total_amount
FROM (
  -- 백업 데이터 + 3화 데이터 합산
  SELECT
    COALESCE(b.donor_name, d.donor_name) as donor_name,
    COALESCE(b.total_amount, 0) + COALESCE(d.ep14_amount, 0) as total
  FROM public.total_donation_rankings_backup_20260125 b
  FULL OUTER JOIN (
    -- 3화 (episode_id = 14) 데이터만 집계
    SELECT donor_name, SUM(amount) as ep14_amount
    FROM public.donations
    WHERE episode_id = 14 AND amount > 0
    GROUP BY donor_name
  ) d ON b.donor_name = d.donor_name
  WHERE COALESCE(b.total_amount, 0) + COALESCE(d.ep14_amount, 0) > 0
) combined
ORDER BY combined.total DESC
ON CONFLICT DO NOTHING;

-- 4. v_total_rankings 뷰 재생성 (레거시 + 시즌 데이터 통합)
--
-- 아키텍처:
-- - total_donation_rankings: 레거시 데이터 (시즌1 시작 전 누적)
-- - donations (season_id > 0): 시즌1 이후 개별 후원 기록
-- - v_total_rankings: 레거시 + 시즌 데이터 합산한 실시간 랭킹
--
-- 주의: 레거시 데이터에 시즌1 1화, 2화 데이터가 포함되어 있다면
--       중복이 발생할 수 있음. 현재는 donations만 사용하는 것이 안전함.
CREATE OR REPLACE VIEW public.v_total_rankings AS
SELECT
  ROW_NUMBER() OVER (ORDER BY SUM(amount) DESC) as rank,
  donor_name,
  SUM(amount) as total_amount,
  COUNT(*) as donation_count,
  MAX(donated_at) as last_donation_at
FROM public.donations
WHERE amount > 0
GROUP BY donor_name
ORDER BY total_amount DESC;

COMMENT ON VIEW public.v_total_rankings IS '전체 후원 랭킹 (donations 테이블 기반 실시간 계산)';

-- 5. total_rankings_public 뷰 재생성 (홈페이지용)
-- 기존 데이터(total_donation_rankings)를 사용
CREATE OR REPLACE VIEW public.total_rankings_public AS
SELECT
  rank,
  donor_name,
  total_amount,
  is_permanent_vip
FROM public.total_donation_rankings
ORDER BY rank;

COMMENT ON VIEW public.total_rankings_public IS '공개 전체 랭킹 (total_donation_rankings 기반, 관리자 수동 업데이트)';

-- 6. RLS 설정
ALTER TABLE public.total_donation_rankings ENABLE ROW LEVEL SECURITY;

-- 읽기 정책 (이미 있으면 무시)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'total_donation_rankings'
    AND policyname = 'total_donation_rankings_select_policy'
  ) THEN
    CREATE POLICY total_donation_rankings_select_policy ON public.total_donation_rankings
      FOR SELECT USING (true);
  END IF;
END $$;

-- 7. 완료 메시지
DO $$
DECLARE
  legacy_count INTEGER;
  donations_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO legacy_count FROM public.total_donation_rankings;
  SELECT COUNT(DISTINCT donor_name) INTO donations_count FROM public.donations WHERE season_id > 0;

  RAISE NOTICE '✅ 랭킹 아키텍처 수정 완료!';
  RAISE NOTICE '- total_donation_rankings (레거시): % 명', legacy_count;
  RAISE NOTICE '- donations 고유 후원자: % 명', donations_count;
  RAISE NOTICE '';
  RAISE NOTICE '📋 아키텍처 설명:';
  RAISE NOTICE '- total_donation_rankings: 레거시 총합 데이터 (관리자 수동 관리)';
  RAISE NOTICE '- donations: 시즌별 개별 후원 기록 (CSV 임포트)';
  RAISE NOTICE '- v_total_rankings: donations 실시간 집계';
  RAISE NOTICE '- total_rankings_public: 홈페이지 표시용 (legacy 기반)';
END $$;
