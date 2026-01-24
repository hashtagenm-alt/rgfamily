-- ============================================================
-- BJ 계정 분리를 위한 is_bj 컬럼 추가
-- 실행: Supabase Dashboard SQL Editor
-- ============================================================

-- 1. is_bj 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_bj BOOLEAN DEFAULT FALSE;

-- 2. 기존 BJ 계정에 is_bj = true 설정
UPDATE profiles
SET is_bj = TRUE
WHERE id IN (
  SELECT profile_id
  FROM organization
  WHERE profile_id IS NOT NULL AND is_active = TRUE
);

-- 3. 확인
SELECT nickname, role, is_bj FROM profiles WHERE is_bj = TRUE;

-- ============================================================
-- 권한 체계 정리
-- ============================================================
-- role = "superadmin"           → 최고관리자
-- role = "admin"                → 관리자
-- role = "moderator"            → 중재자
-- role = "vip"                  → VIP 후원자
-- role = "member" + is_bj=true  → BJ
-- role = "member" + is_bj=false → 일반 시청자
-- ============================================================
