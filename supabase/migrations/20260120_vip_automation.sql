-- VIP 자동화 시스템 마이그레이션
-- 직급전(rank battle) 종료 시 Top 3에게 자동으로 VIP 개인 페이지 생성

-- 1. episodes 테이블에 확정 상태 컬럼 추가
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT false;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;

-- 2. vip_rewards 테이블에 직급전 회차 기록용 컬럼 추가
ALTER TABLE vip_rewards ADD COLUMN IF NOT EXISTS episode_id INT REFERENCES episodes(id);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_episodes_is_finalized ON episodes(is_finalized);
CREATE INDEX IF NOT EXISTS idx_vip_rewards_episode ON vip_rewards(episode_id);
CREATE INDEX IF NOT EXISTS idx_vip_rewards_profile_episode ON vip_rewards(profile_id, episode_id);

-- 4. 코멘트 추가
COMMENT ON COLUMN episodes.is_finalized IS '직급전 확정 여부: true=확정됨(Top3 VIP 생성 완료)';
COMMENT ON COLUMN episodes.finalized_at IS '직급전 확정 시각';
COMMENT ON COLUMN vip_rewards.episode_id IS '직급전 회차 ID (어느 직급전에서 VIP가 되었는지 추적용)';
