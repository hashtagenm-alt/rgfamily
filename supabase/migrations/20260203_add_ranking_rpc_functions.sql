-- 랭킹 데이터 트랜잭션 RPC 함수
-- 원자적 DELETE + INSERT로 중간 실패 시 자동 롤백

-- ============================================================
-- 1. 시즌 랭킹 upsert (upsert_season_rankings)
-- ============================================================
-- 특정 시즌의 랭킹 데이터를 원자적으로 교체
-- p_unit이 NULL이면 해당 시즌 전체 삭제, 아니면 해당 unit만 삭제
CREATE OR REPLACE FUNCTION upsert_season_rankings(
  p_season_id INTEGER,
  p_unit TEXT DEFAULT NULL,
  p_rankings JSONB DEFAULT '[]'::JSONB
)
RETURNS TABLE(
  inserted_count INTEGER,
  deleted_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
  v_inserted_count INTEGER;
BEGIN
  -- 1. 기존 데이터 삭제
  IF p_unit IS NULL THEN
    DELETE FROM season_donation_rankings
    WHERE season_id = p_season_id;
  ELSE
    DELETE FROM season_donation_rankings
    WHERE season_id = p_season_id
      AND unit::TEXT = p_unit;
  END IF;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- 2. 새 데이터 삽입 (unit은 text로 받아서 테이블 타입으로 자동 캐스팅)
  INSERT INTO season_donation_rankings (
    season_id,
    rank,
    donor_name,
    total_amount,
    donation_count,
    unit,
    updated_at
  )
  SELECT
    p_season_id,
    (item->>'rank')::INTEGER,
    item->>'donor_name',
    (item->>'total_amount')::INTEGER,
    COALESCE((item->>'donation_count')::INTEGER, 0),
    (item->>'unit'),  -- NULL이면 NULL, 아니면 text → enum 자동 캐스팅
    NOW()
  FROM jsonb_array_elements(p_rankings) AS item;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  RETURN QUERY SELECT v_inserted_count, v_deleted_count;
END;
$$;

-- 권한 설정 (service_role만 실행 가능)
REVOKE ALL ON FUNCTION upsert_season_rankings FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_season_rankings TO service_role;

-- ============================================================
-- 2. 총 후원 랭킹 upsert (upsert_total_rankings)
-- ============================================================
-- 전체 랭킹 데이터를 원자적으로 교체
CREATE OR REPLACE FUNCTION upsert_total_rankings(
  p_rankings JSONB DEFAULT '[]'::JSONB
)
RETURNS TABLE(
  inserted_count INTEGER,
  deleted_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
  v_inserted_count INTEGER;
BEGIN
  -- 1. 기존 데이터 전체 삭제
  DELETE FROM total_donation_rankings WHERE id > 0;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- 2. 새 데이터 삽입
  INSERT INTO total_donation_rankings (
    rank,
    donor_name,
    total_amount,
    is_permanent_vip,
    updated_at
  )
  SELECT
    (item->>'rank')::INTEGER,
    item->>'donor_name',
    (item->>'total_amount')::INTEGER,
    COALESCE((item->>'is_permanent_vip')::BOOLEAN, false),
    NOW()
  FROM jsonb_array_elements(p_rankings) AS item;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  RETURN QUERY SELECT v_inserted_count, v_deleted_count;
END;
$$;

-- 권한 설정 (service_role만 실행 가능)
REVOKE ALL ON FUNCTION upsert_total_rankings FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_total_rankings TO service_role;

-- ============================================================
-- 3. 함수 존재 여부 확인 헬퍼 (pg_proc_exists)
-- ============================================================
CREATE OR REPLACE FUNCTION pg_proc_exists(func_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = func_name
  );
END;
$$;

-- 권한 설정
GRANT EXECUTE ON FUNCTION pg_proc_exists TO authenticated;
GRANT EXECUTE ON FUNCTION pg_proc_exists TO service_role;

-- ============================================================
-- 코멘트 추가
-- ============================================================
COMMENT ON FUNCTION upsert_season_rankings IS '시즌별 랭킹 데이터를 원자적으로 교체 (DELETE + INSERT in transaction)';
COMMENT ON FUNCTION upsert_total_rankings IS '총 후원 랭킹 데이터를 원자적으로 교체 (DELETE + INSERT in transaction)';
COMMENT ON FUNCTION pg_proc_exists IS 'public 스키마에 함수 존재 여부 확인';
