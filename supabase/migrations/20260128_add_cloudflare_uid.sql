-- Cloudflare Stream 통합을 위한 cloudflare_uid 컬럼 추가
ALTER TABLE media_content
ADD COLUMN IF NOT EXISTS cloudflare_uid TEXT DEFAULT NULL;

COMMENT ON COLUMN media_content.cloudflare_uid IS 'Cloudflare Stream video UID. 설정 시 Cloudflare Stream으로 재생.';
