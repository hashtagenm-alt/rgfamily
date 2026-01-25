-- =====================================================
-- 랭킹 스키마 최적화 마이그레이션
--
-- 목표: 데이터 정합성 보장 및 자동 동기화
-- 작성일: 2026-01-25
-- =====================================================

-- =========================================
-- 1. 랭킹 데이터 자동 갱신 함수
-- =========================================

-- 시즌 랭킹 갱신 함수
CREATE OR REPLACE FUNCTION refresh_season_rankings(p_season_id INTEGER)
RETURNS void AS $$
BEGIN
  -- 기존 시즌 랭킹 삭제
  DELETE FROM public.season_donation_rankings WHERE season_id = p_season_id;

  -- donations 기반 새 랭킹 삽입
  INSERT INTO public.season_donation_rankings (season_id, rank, donor_name, total_amount, donation_count, unit)
  SELECT
    p_season_id as season_id,
    ROW_NUMBER() OVER (ORDER BY SUM(d.amount) DESC) as rank,
    d.donor_name,
    SUM(d.amount) as total_amount,
    COUNT(*) as donation_count,
    COALESCE(p.unit, 'excel') as unit
  FROM public.donations d
  LEFT JOIN public.profiles p ON d.donor_name = p.nickname
  WHERE d.season_id = p_season_id AND d.amount > 0
  GROUP BY d.donor_name, p.unit
  ORDER BY total_amount DESC;

  -- gauge_percent 업데이트
  UPDATE public.season_donation_rankings sdr
  SET gauge_percent = ROUND(
    (sdr.total_amount::numeric / NULLIF(
      (SELECT MAX(total_amount) FROM public.season_donation_rankings WHERE season_id = p_season_id), 0
    )) * 100
  )::integer
  WHERE sdr.season_id = p_season_id;

  RAISE NOTICE 'Season % rankings refreshed', p_season_id;
END;
$$ LANGUAGE plpgsql;

-- 종합 랭킹 갱신 함수
CREATE OR REPLACE FUNCTION refresh_total_rankings()
RETURNS void AS $$
BEGIN
  -- 기존 종합 랭킹 삭제
  DELETE FROM public.total_donation_rankings WHERE id > 0;

  -- donations 기반 새 랭킹 삽입
  INSERT INTO public.total_donation_rankings (rank, donor_name, total_amount, is_permanent_vip)
  SELECT
    ROW_NUMBER() OVER (ORDER BY SUM(d.amount) DESC) as rank,
    d.donor_name,
    SUM(d.amount) as total_amount,
    FALSE as is_permanent_vip
  FROM public.donations d
  WHERE d.amount > 0
  GROUP BY d.donor_name
  ORDER BY total_amount DESC;

  RAISE NOTICE 'Total rankings refreshed';
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- 2. donations 변경 시 자동 랭킹 갱신 트리거
-- =========================================

-- donations 변경 시 호출되는 함수
CREATE OR REPLACE FUNCTION on_donation_change()
RETURNS TRIGGER AS $$
DECLARE
  affected_season_id INTEGER;
BEGIN
  -- INSERT/UPDATE/DELETE에 따라 영향받는 시즌 ID 결정
  IF TG_OP = 'DELETE' THEN
    affected_season_id := OLD.season_id;
  ELSE
    affected_season_id := NEW.season_id;
  END IF;

  -- 시즌 랭킹 갱신 (시즌 ID가 있는 경우만)
  IF affected_season_id IS NOT NULL AND affected_season_id > 0 THEN
    PERFORM refresh_season_rankings(affected_season_id);
  END IF;

  -- 종합 랭킹 갱신
  PERFORM refresh_total_rankings();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 기존 트리거 삭제 (있으면)
DROP TRIGGER IF EXISTS trigger_donation_change ON public.donations;

-- 새 트리거 생성 (비활성화 상태로 - 성능 이슈 가능)
-- 주의: 대량 데이터 삽입 시 성능 저하 가능
-- 필요 시 활성화: ALTER TABLE public.donations ENABLE TRIGGER trigger_donation_change;
-- CREATE TRIGGER trigger_donation_change
-- AFTER INSERT OR UPDATE OR DELETE ON public.donations
-- FOR EACH ROW EXECUTE FUNCTION on_donation_change();

-- =========================================
-- 3. 데이터 정합성 검증 뷰
-- =========================================

-- 시즌 랭킹 불일치 검증 뷰
CREATE OR REPLACE VIEW public.v_season_ranking_mismatch AS
SELECT
  d.season_id,
  d.donor_name,
  d.donations_total,
  sdr.total_amount as ranking_total,
  d.donations_total - COALESCE(sdr.total_amount, 0) as difference
FROM (
  SELECT season_id, donor_name, SUM(amount) as donations_total
  FROM public.donations
  WHERE season_id > 0 AND amount > 0
  GROUP BY season_id, donor_name
) d
LEFT JOIN public.season_donation_rankings sdr
  ON d.season_id = sdr.season_id AND d.donor_name = sdr.donor_name
WHERE d.donations_total != COALESCE(sdr.total_amount, 0)
ORDER BY ABS(d.donations_total - COALESCE(sdr.total_amount, 0)) DESC;

COMMENT ON VIEW public.v_season_ranking_mismatch IS '시즌 랭킹과 donations 불일치 확인용 뷰';

-- 종합 랭킹 불일치 검증 뷰
CREATE OR REPLACE VIEW public.v_total_ranking_mismatch AS
SELECT
  d.donor_name,
  d.donations_total,
  tdr.total_amount as ranking_total,
  d.donations_total - COALESCE(tdr.total_amount, 0) as difference
FROM (
  SELECT donor_name, SUM(amount) as donations_total
  FROM public.donations
  WHERE amount > 0
  GROUP BY donor_name
) d
LEFT JOIN public.total_donation_rankings tdr ON d.donor_name = tdr.donor_name
WHERE d.donations_total != COALESCE(tdr.total_amount, 0)
ORDER BY ABS(d.donations_total - COALESCE(tdr.total_amount, 0)) DESC;

COMMENT ON VIEW public.v_total_ranking_mismatch IS '종합 랭킹과 donations 불일치 확인용 뷰';

-- =========================================
-- 4. season_rankings_public 뷰에 gauge_percent 추가
-- =========================================

-- season_rankings_public 뷰가 이미 gauge_percent를 포함하는지 확인하고 업데이트
CREATE OR REPLACE VIEW public.season_rankings_public AS
SELECT
  id,
  season_id,
  rank,
  donor_name,
  donation_count,
  unit,
  COALESCE(gauge_percent,
    ROUND(
      (total_amount::numeric / NULLIF((
        SELECT MAX(total_amount)
        FROM public.season_donation_rankings sdr2
        WHERE sdr2.season_id = sdr.season_id
      ), 0)) * 100
    )::integer
  ) as gauge_percent,
  updated_at,
  created_at
FROM public.season_donation_rankings sdr
ORDER BY season_id, rank;

COMMENT ON VIEW public.season_rankings_public IS '시즌별 공개 랭킹 (gauge_percent 포함)';

-- =========================================
-- 5. 완료 메시지
-- =========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '랭킹 스키마 최적화 완료!';
  RAISE NOTICE '';
  RAISE NOTICE '추가된 기능:';
  RAISE NOTICE '1. refresh_season_rankings(season_id) - 시즌 랭킹 수동 갱신';
  RAISE NOTICE '2. refresh_total_rankings() - 종합 랭킹 수동 갱신';
  RAISE NOTICE '3. v_season_ranking_mismatch - 시즌 데이터 불일치 검증';
  RAISE NOTICE '4. v_total_ranking_mismatch - 종합 데이터 불일치 검증';
  RAISE NOTICE '';
  RAISE NOTICE '사용법:';
  RAISE NOTICE '- 시즌 랭킹 갱신: SELECT refresh_season_rankings(1);';
  RAISE NOTICE '- 종합 랭킹 갱신: SELECT refresh_total_rankings();';
  RAISE NOTICE '- 불일치 확인: SELECT * FROM v_season_ranking_mismatch;';
  RAISE NOTICE '========================================';
END $$;
