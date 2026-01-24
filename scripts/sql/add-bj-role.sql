-- ============================================================
-- BJ 역할 추가 마이그레이션
-- 실행: Supabase Dashboard SQL Editor
-- ============================================================

-- 1. role 컬럼 제약 조건 확인 및 수정
-- 기존 체크 제약 조건 제거 (있는 경우)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 새 체크 제약 조건 추가 (bj 포함)
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
CHECK (role IN ('member', 'bj', 'vip', 'moderator', 'admin', 'superadmin'));

-- 2. 기존 BJ 계정의 role을 'bj'로 변경
UPDATE profiles
SET role = 'bj'
WHERE id IN (
  SELECT profile_id
  FROM organization
  WHERE profile_id IS NOT NULL AND is_active = TRUE
);

-- 3. 확인
SELECT nickname, role, email FROM profiles WHERE role = 'bj';

-- ============================================================
-- 권한 체계 정리 (수정됨)
-- ============================================================
-- role = "superadmin"  → 최고관리자
-- role = "admin"       → 관리자
-- role = "moderator"   → 중재자
-- role = "vip"         → VIP 후원자
-- role = "bj"          → BJ (스트리머)
-- role = "member"      → 일반 시청자
-- ============================================================
