-- =============================================================
-- 게시판 글쓰기 RLS 정책 수정 (2026-01-19)
-- 기존 정책 삭제 후 재생성
-- =============================================================

-- 기존 posts 정책 삭제
DROP POLICY IF EXISTS "posts_select" ON public.posts;
DROP POLICY IF EXISTS "posts_insert" ON public.posts;
DROP POLICY IF EXISTS "posts_update" ON public.posts;
DROP POLICY IF EXISTS "posts_delete" ON public.posts;
DROP POLICY IF EXISTS "Moderators can update any post" ON public.posts;
DROP POLICY IF EXISTS "Moderators can delete any post" ON public.posts;

-- 기존 comments 정책 삭제
DROP POLICY IF EXISTS "comments_select" ON public.comments;
DROP POLICY IF EXISTS "comments_insert" ON public.comments;
DROP POLICY IF EXISTS "comments_update" ON public.comments;
DROP POLICY IF EXISTS "comments_delete" ON public.comments;
DROP POLICY IF EXISTS "Moderators can update any comment" ON public.comments;
DROP POLICY IF EXISTS "Moderators can delete any comment" ON public.comments;

-- 기존 guestbook 정책 삭제
DROP POLICY IF EXISTS "guestbook_select" ON public.tribute_guestbook;
DROP POLICY IF EXISTS "guestbook_insert" ON public.tribute_guestbook;
DROP POLICY IF EXISTS "guestbook_update" ON public.tribute_guestbook;
DROP POLICY IF EXISTS "guestbook_delete" ON public.tribute_guestbook;

-- =============================================================
-- posts 테이블 RLS 정책 재생성
-- =============================================================

-- RLS 활성화 확인
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- SELECT: 삭제되지 않은 글 (자유게시판은 모두, VIP는 VIP 사용자만)
CREATE POLICY "posts_select" ON public.posts FOR SELECT
  USING (is_deleted = false AND (board_type = 'free' OR public.is_vip_user(auth.uid())));

-- INSERT: 로그인한 사용자 (자유게시판은 모두, VIP는 VIP만)
CREATE POLICY "posts_insert" ON public.posts FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = author_id
    AND (board_type = 'free' OR public.is_vip_user(auth.uid()))
  );

-- UPDATE: 작성자 또는 스태프
CREATE POLICY "posts_update" ON public.posts FOR UPDATE
  USING (auth.uid() = author_id OR public.is_staff(auth.uid()));

-- DELETE: 작성자 또는 스태프
CREATE POLICY "posts_delete" ON public.posts FOR DELETE
  USING (auth.uid() = author_id OR public.is_staff(auth.uid()));

-- =============================================================
-- comments 테이블 RLS 정책 재생성
-- =============================================================

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- SELECT: 삭제되지 않은 댓글
CREATE POLICY "comments_select" ON public.comments FOR SELECT
  USING (is_deleted = false);

-- INSERT: 로그인한 사용자
CREATE POLICY "comments_insert" ON public.comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_id);

-- UPDATE: 작성자 또는 스태프
CREATE POLICY "comments_update" ON public.comments FOR UPDATE
  USING (auth.uid() = author_id OR public.is_staff(auth.uid()));

-- DELETE: 작성자 또는 스태프
CREATE POLICY "comments_delete" ON public.comments FOR DELETE
  USING (auth.uid() = author_id OR public.is_staff(auth.uid()));

-- =============================================================
-- tribute_guestbook 테이블 RLS 정책 재생성
-- =============================================================

ALTER TABLE public.tribute_guestbook ENABLE ROW LEVEL SECURITY;

-- SELECT: 승인되고 삭제되지 않은 방명록
CREATE POLICY "guestbook_select" ON public.tribute_guestbook FOR SELECT
  USING (is_approved = true AND is_deleted = false);

-- INSERT: 로그인한 사용자
CREATE POLICY "guestbook_insert" ON public.tribute_guestbook FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_id);

-- UPDATE: 작성자 또는 스태프
CREATE POLICY "guestbook_update" ON public.tribute_guestbook FOR UPDATE
  USING (auth.uid() = author_id OR public.is_staff(auth.uid()));

-- DELETE: 작성자 또는 스태프
CREATE POLICY "guestbook_delete" ON public.tribute_guestbook FOR DELETE
  USING (auth.uid() = author_id OR public.is_staff(auth.uid()));

-- =============================================================
-- 완료!
-- =============================================================
