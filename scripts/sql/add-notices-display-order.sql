-- notices 테이블에 display_order 컬럼 추가
-- display_order가 NULL이면 최신순, 값이 있으면 그 순서대로 정렬

-- 1. display_order 컬럼 추가
ALTER TABLE notices
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT NULL;

-- 2. 인덱스 추가 (정렬 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_notices_display_order
ON notices (display_order NULLS LAST, created_at DESC);

-- 3. 정렬 순서 설명:
-- ORDER BY display_order IS NULL, display_order ASC, created_at DESC
-- → display_order가 있는 항목이 먼저 (순서대로)
-- → 나머지는 최신순으로
