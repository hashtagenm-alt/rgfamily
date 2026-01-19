-- 손밍 멤버 비활성화 (삭제 대신 is_active = false)
-- 실행 완료: 2026-01-19
UPDATE organization
SET is_active = false
WHERE name = '손밍';
