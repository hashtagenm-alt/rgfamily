-- =====================================================
-- PandaTV ID 필드 추가
-- profiles 테이블에 pandatv_id 컬럼 추가
-- CSV 업로드 시 PandaTV 아이디를 저장하여 나중에 실제 가입 시 매칭
-- =====================================================

-- 1. pandatv_id 컬럼 추가
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pandatv_id VARCHAR(100) DEFAULT NULL;

-- 2. 인덱스 추가 (검색 최적화)
CREATE INDEX IF NOT EXISTS idx_profiles_pandatv_id ON public.profiles(pandatv_id);

-- 3. 주석 추가
COMMENT ON COLUMN public.profiles.pandatv_id IS 'PandaTV 플랫폼 아이디 (예: no0163). CSV 업로드 시 저장되며, 실제 가입 시 매칭에 사용';

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'profiles.pandatv_id 컬럼 추가 완료!';
END $$;
