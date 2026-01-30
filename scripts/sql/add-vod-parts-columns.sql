-- VOD 파트 분할을 위한 컬럼 추가
ALTER TABLE media_content 
ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES media_content(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS part_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_parts INTEGER DEFAULT 1;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_media_content_parent_id ON media_content(parent_id);

COMMENT ON COLUMN media_content.parent_id IS '파트 분할 시 첫 번째 파트(대표)의 ID';
COMMENT ON COLUMN media_content.part_number IS '파트 번호 (1, 2, 3...)';
COMMENT ON COLUMN media_content.total_parts IS '전체 파트 수';
