-- BJ 감사인사 공개/비공개 기능 마이그레이션
-- is_public: true = 모든 VIP 회원에게 공개, false = 채널주인과 작성자 BJ만 열람 가능

-- bj_thank_you_messages 테이블에 is_public 컬럼 추가
ALTER TABLE bj_thank_you_messages
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- 기존 메시지는 모두 공개로 설정
UPDATE bj_thank_you_messages
SET is_public = true
WHERE is_public IS NULL;

-- 인덱스 생성 (공개/비공개 필터링 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_bj_messages_is_public
ON bj_thank_you_messages(is_public);

-- 복합 인덱스: vip_profile_id + is_public (VIP 페이지에서 공개 메시지 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_bj_messages_vip_public
ON bj_thank_you_messages(vip_profile_id, is_public)
WHERE is_deleted = false;

-- 코멘트 추가
COMMENT ON COLUMN bj_thank_you_messages.is_public IS
'공개 여부: true=모든 VIP 회원 공개, false=채널주인+작성자 BJ만 열람 가능';
