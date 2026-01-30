-- signature_videos 테이블에 Cloudflare Stream 지원 추가
ALTER TABLE signature_videos
ADD COLUMN IF NOT EXISTS cloudflare_uid TEXT DEFAULT NULL;

COMMENT ON COLUMN signature_videos.cloudflare_uid IS 'Cloudflare Stream video UID. 설정 시 Cloudflare Stream으로 재생.';
