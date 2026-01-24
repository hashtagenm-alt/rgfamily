-- vip_images 테이블에 공개 읽기 RLS 정책 추가
-- 왜? VIP 시그니처 이미지는 누구나 볼 수 있어야 함 (비로그인 사용자 포함)

-- 기존 정책 확인 및 삭제 (충돌 방지)
DROP POLICY IF EXISTS "vip_images_public_read" ON vip_images;
DROP POLICY IF EXISTS "Anyone can read vip_images" ON vip_images;

-- 공개 읽기 정책 추가: 모든 사용자(anon 포함)가 vip_images를 조회 가능
CREATE POLICY "vip_images_public_read"
ON vip_images
FOR SELECT
TO public
USING (true);

-- 정책 확인
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'vip_images';
