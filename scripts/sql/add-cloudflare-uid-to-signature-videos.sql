-- 시그니처 영상에 Cloudflare Stream UID 컬럼 추가
-- Supabase Dashboard SQL Editor에서 실행

-- 1. cloudflare_uid 컬럼 추가
ALTER TABLE signature_videos
ADD COLUMN IF NOT EXISTS cloudflare_uid VARCHAR(64) NULL;

-- 2. cloudflare_uid 인덱스 추가 (NULL이 아닌 값만)
CREATE INDEX IF NOT EXISTS idx_signature_videos_cloudflare_uid
ON signature_videos(cloudflare_uid)
WHERE cloudflare_uid IS NOT NULL;

-- 3. 컬럼 추가 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'signature_videos'
ORDER BY ordinal_position;
