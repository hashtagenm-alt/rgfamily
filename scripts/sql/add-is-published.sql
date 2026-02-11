-- media_content: 공개/비공개 토글 컬럼 추가
ALTER TABLE media_content ADD COLUMN is_published boolean NOT NULL DEFAULT false;
UPDATE media_content SET is_published = true;
CREATE INDEX idx_media_content_published ON media_content (is_published) WHERE is_published = true;

-- signature_videos: 공개/비공개 토글 컬럼 추가
ALTER TABLE signature_videos ADD COLUMN is_published boolean NOT NULL DEFAULT false;
UPDATE signature_videos SET is_published = true;
CREATE INDEX idx_sig_videos_published ON signature_videos (is_published) WHERE is_published = true;
