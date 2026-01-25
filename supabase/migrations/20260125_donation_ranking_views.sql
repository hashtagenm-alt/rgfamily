-- =====================================================
-- 후원 랭킹 뷰 시스템 추가
-- 기존 테이블을 유지하면서 새로운 뷰 기반 랭킹 시스템 추가
-- 실행 전 반드시 백업 필수!
-- =====================================================

-- =====================================================
-- 1단계: 기존 테이블 백업 (안전을 위해)
-- =====================================================

-- 기존 total_donation_rankings 백업
CREATE TABLE IF NOT EXISTS public.total_donation_rankings_backup_20260125 AS
SELECT * FROM public.total_donation_rankings;

-- 기존 season_donation_rankings 백업
CREATE TABLE IF NOT EXISTS public.season_donation_rankings_backup_20260125 AS
SELECT * FROM public.season_donation_rankings;

-- =====================================================
-- 2단계: episodes 테이블에 후원 관련 필드 추가
-- =====================================================

-- source_file: CSV 파일명 (중복 임포트 방지용)
ALTER TABLE public.episodes
ADD COLUMN IF NOT EXISTS source_file TEXT;

-- total_hearts: 해당 회차 총 하트 (캐시)
ALTER TABLE public.episodes
ADD COLUMN IF NOT EXISTS total_hearts BIGINT DEFAULT 0;

-- donor_count: 해당 회차 후원자 수 (캐시)
ALTER TABLE public.episodes
ADD COLUMN IF NOT EXISTS donor_count INTEGER DEFAULT 0;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_episodes_source_file ON public.episodes(source_file);

COMMENT ON COLUMN public.episodes.source_file IS 'CSV 파일명 - 중복 임포트 방지용';
COMMENT ON COLUMN public.episodes.total_hearts IS '해당 회차 총 하트 (캐시)';
COMMENT ON COLUMN public.episodes.donor_count IS '해당 회차 후원자 수 (캐시)';

-- =====================================================
-- 3단계: donations 테이블에 필드 추가
-- =====================================================

-- member_name: 참여 BJ (CSV의 참여BJ 컬럼, target_bj와 동일 개념)
ALTER TABLE public.donations
ADD COLUMN IF NOT EXISTS member_name TEXT;

-- heart_score: 하트 점수 (음수 가능)
ALTER TABLE public.donations
ADD COLUMN IF NOT EXISTS heart_score BIGINT;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_donations_member_name ON public.donations(member_name);
CREATE INDEX IF NOT EXISTS idx_donations_donor_name ON public.donations(donor_name);
CREATE INDEX IF NOT EXISTS idx_donations_donated_at ON public.donations(donated_at);

COMMENT ON COLUMN public.donations.member_name IS '참여 BJ (CSV 임포트시 사용)';
COMMENT ON COLUMN public.donations.heart_score IS '하트 점수 (음수 가능)';

-- =====================================================
-- 4단계: "레거시" 에피소드 생성 (기존 총합 데이터용)
-- =====================================================

-- 시즌 0: 엑셀부 이전 데이터 (없으면 생성)
INSERT INTO public.seasons (id, name, start_date, is_active)
VALUES (0, '엑셀부 이전', '2024-01-01', false)
ON CONFLICT (id) DO NOTHING;

-- 레거시 에피소드: 기존 총합 랭킹 데이터를 위한 가상 에피소드
-- (episode_id = 0으로 donations에 연결됨)
-- 이 에피소드는 기존 total_donation_rankings 데이터를 donations 테이블로 옮길 때 사용

-- =====================================================
-- 5단계: 랭킹 뷰 생성
-- =====================================================

-- 전체 랭킹 뷰 (역대 누적) - donations 테이블에서 자동 계산
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

COMMENT ON VIEW public.v_total_rankings IS '전체 후원 랭킹 (역대 누적) - donations 테이블에서 자동 계산';

-- 시즌별 랭킹 뷰
CREATE OR REPLACE VIEW public.v_season_rankings AS
SELECT
  ROW_NUMBER() OVER (PARTITION BY d.season_id ORDER BY SUM(d.amount) DESC) as rank,
  d.donor_name,
  d.season_id,
  s.name as season_name,
  SUM(d.amount) as total_amount,
  COUNT(*) as donation_count
FROM public.donations d
JOIN public.seasons s ON d.season_id = s.id
WHERE d.amount > 0 AND d.season_id > 0  -- 레거시(시즌0) 제외
GROUP BY d.donor_name, d.season_id, s.name
ORDER BY d.season_id, total_amount DESC;

COMMENT ON VIEW public.v_season_rankings IS '시즌별 후원 랭킹 - 자동 계산';

-- 회차별 랭킹 뷰
CREATE OR REPLACE VIEW public.v_episode_rankings AS
SELECT
  ROW_NUMBER() OVER (PARTITION BY d.episode_id ORDER BY SUM(d.amount) DESC) as rank,
  d.donor_name,
  d.episode_id,
  e.episode_number,
  e.title as episode_title,
  e.season_id,
  SUM(d.amount) as total_amount,
  COUNT(*) as donation_count
FROM public.donations d
JOIN public.episodes e ON d.episode_id = e.id
WHERE d.amount > 0 AND e.season_id > 0  -- 레거시 제외
GROUP BY d.donor_name, d.episode_id, e.episode_number, e.title, e.season_id
ORDER BY d.episode_id, total_amount DESC;

COMMENT ON VIEW public.v_episode_rankings IS '회차별 후원 랭킹 - 자동 계산';

-- =====================================================
-- 6단계: 기존 total_donation_rankings 데이터를 donations로 마이그레이션 (선택적)
-- =====================================================

-- 아래 쿼리는 수동으로 실행하세요 (기존 데이터 마이그레이션 원할 경우):
-- 주의: 기존 donations 테이블에 이미 데이터가 있다면 중복 확인 필요!

/*
-- 기존 total_donation_rankings를 레거시 donations로 변환
INSERT INTO public.donations (donor_name, amount, season_id, episode_id, member_name, donated_at, created_at)
SELECT
  donor_name,
  total_amount,
  0,  -- 레거시 시즌
  NULL,  -- 레거시 에피소드 (별도 생성 필요)
  'legacy',
  '2024-12-31'::TIMESTAMPTZ,
  NOW()
FROM public.total_donation_rankings_backup_20260125
WHERE NOT EXISTS (
  SELECT 1 FROM public.donations d
  WHERE d.donor_name = total_donation_rankings_backup_20260125.donor_name
  AND d.season_id = 0
);
*/

-- =====================================================
-- 완료 메시지
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ 후원 랭킹 뷰 시스템 추가 완료!';
  RAISE NOTICE '- episodes 테이블에 source_file, total_hearts, donor_count 필드 추가됨';
  RAISE NOTICE '- donations 테이블에 member_name, heart_score 필드 추가됨';
  RAISE NOTICE '- 랭킹 뷰 3개 생성됨 (v_total_rankings, v_season_rankings, v_episode_rankings)';
  RAISE NOTICE '- 기존 테이블(total_donation_rankings, season_donation_rankings)은 그대로 유지됨';
  RAISE NOTICE '⚠️ 기존 총합 랭킹 데이터 마이그레이션은 수동으로 실행하세요!';
END $$;
