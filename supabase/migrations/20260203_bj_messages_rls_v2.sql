-- BJ 감사 메시지 RLS 정책 수정
-- 목적: 비로그인 사용자도 공개 메시지 조회 가능하게 변경
-- 비공개 메시지 권한 제어는 앱 레벨(Server Actions)에서 처리

-- 기존 SELECT 정책 삭제
DROP POLICY IF EXISTS "VIP 본인 또는 관리자만 조회 가능" ON public.bj_thank_you_messages;

-- 새 SELECT 정책: 삭제되지 않은 메시지는 누구나 조회 가능
-- (비공개 메시지의 내용 열람 권한은 Server Actions에서 canViewContent로 제어)
CREATE POLICY "BJ 메시지 조회 정책" ON public.bj_thank_you_messages
FOR SELECT USING (
  is_deleted = false
);

-- 기존 INSERT/UPDATE/DELETE 정책은 유지 (BJ 멤버/관리자만 가능)
