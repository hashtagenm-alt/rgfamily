-- VIP 자동화 시스템을 위한 스키마 확장
-- 직급전 종료 시 Top 3 VIP 자동 생성 지원

-- =====================================================
-- 1. episodes 테이블에 확정 상태 컬럼 추가
-- =====================================================
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT false;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;

COMMENT ON COLUMN episodes.is_finalized IS '직급전 확정 여부 - true면 Top 3 VIP 보상이 확정됨';
COMMENT ON COLUMN episodes.finalized_at IS '직급전 확정 시각';

-- =====================================================
-- 2. vip_rewards 테이블에 episode_id 추가
-- =====================================================
ALTER TABLE vip_rewards ADD COLUMN IF NOT EXISTS episode_id INT REFERENCES episodes(id) ON DELETE SET NULL;

COMMENT ON COLUMN vip_rewards.episode_id IS '어느 직급전 회차에서 VIP가 되었는지 추적용';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_vip_rewards_episode ON vip_rewards(episode_id);
CREATE INDEX IF NOT EXISTS idx_episodes_is_finalized ON episodes(is_finalized);

-- =====================================================
-- 3. 직급전 Top 3 조회 함수 (기존 get_episode_rankings 활용)
-- =====================================================
-- 기존 get_episode_rankings 함수가 이미 있음 (20260116_create_episodes_table.sql)
-- 해당 함수는 p_limit 파라미터로 Top N 조회 가능

-- =====================================================
-- 4. 직급전 확정 시 기존 보상 중복 체크 함수
-- =====================================================
CREATE OR REPLACE FUNCTION check_vip_reward_exists(
  p_profile_id UUID,
  p_episode_id INT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM vip_rewards
    WHERE profile_id = p_profile_id
    AND episode_id = p_episode_id
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_vip_reward_exists IS '특정 회차에 대한 VIP 보상이 이미 존재하는지 확인';

-- =====================================================
-- 5. 직급전 확정 RLS 정책 (관리자만 확정 가능)
-- =====================================================
-- 기존 episodes 테이블 RLS 정책이 관리자 전용 수정을 허용하므로 추가 정책 불필요

-- =====================================================
-- 6. vip_rewards 테이블 정책 업데이트 (episode_id 포함 레코드 허용)
-- =====================================================
-- 기존 정책이 이미 관리자 전용 INSERT/UPDATE를 허용하므로 추가 정책 불필요
