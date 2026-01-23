-- RG Family 통합 관리 대시보드 - 신규 테이블 스키마
-- 실행 전 주의: Supabase Dashboard에서 SQL Editor로 실행
-- 실행 순서: 1. 테이블 생성 → 2. 인덱스 생성 → 3. 초기 데이터 삽입 → 4. organization 테이블 확장

-- ============================================
-- 1. bj_ranks (직급 테이블)
-- 직급 마스터 데이터 관리
-- ============================================
CREATE TABLE IF NOT EXISTS bj_ranks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(20) NOT NULL UNIQUE,      -- 여왕, 공주, 황족...
  level INTEGER NOT NULL,                 -- 1(최고) ~ 12(최저)
  display_order INTEGER NOT NULL,         -- UI 표시 순서
  color VARCHAR(7),                       -- 뱃지 색상 (hex)
  icon_url TEXT,                          -- 직급 아이콘 URL
  description TEXT,                       -- 직급 설명
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE bj_ranks IS 'BJ 직급 마스터 테이블 - 직급전에서 사용되는 12단계 직급 정의';
COMMENT ON COLUMN bj_ranks.level IS '직급 레벨 (1=최고, 12=최저)';

-- ============================================
-- 2. bj_rank_history (직급 변동 이력)
-- 직급전 결과 및 직급 변동 추적
-- ============================================
CREATE TABLE IF NOT EXISTS bj_rank_history (
  id SERIAL PRIMARY KEY,
  bj_member_id INTEGER NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  episode_id INTEGER REFERENCES episodes(id) ON DELETE SET NULL,
  season_id INTEGER REFERENCES seasons(id) ON DELETE SET NULL,
  rank_id INTEGER NOT NULL REFERENCES bj_ranks(id),
  previous_rank_id INTEGER REFERENCES bj_ranks(id),
  change_reason VARCHAR(100),            -- '직급전 결과', '중간직급전', '페널티' 등
  is_rank_battle BOOLEAN DEFAULT FALSE,  -- 직급전 결과인지 (1화, 7화, 15화)
  battle_number INTEGER,                 -- 직급전 회차 (1=1차, 2=중간, 3=최종)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE bj_rank_history IS 'BJ 직급 변동 이력 - 직급전 결과 및 모든 직급 변동 기록';

CREATE INDEX IF NOT EXISTS idx_rank_history_bj ON bj_rank_history(bj_member_id);
CREATE INDEX IF NOT EXISTS idx_rank_history_episode ON bj_rank_history(episode_id);
CREATE INDEX IF NOT EXISTS idx_rank_history_season ON bj_rank_history(season_id);
CREATE INDEX IF NOT EXISTS idx_rank_history_rank_battle ON bj_rank_history(is_rank_battle) WHERE is_rank_battle = TRUE;

-- ============================================
-- 3. contribution_logs (기여도 변동 로그)
-- 실시간 기여도 가감 및 이력 관리
-- ============================================
CREATE TABLE IF NOT EXISTS contribution_logs (
  id SERIAL PRIMARY KEY,
  bj_member_id INTEGER NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  episode_id INTEGER REFERENCES episodes(id) ON DELETE SET NULL,
  season_id INTEGER REFERENCES seasons(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,               -- 양수: 가산, 음수: 차감
  reason VARCHAR(200) NOT NULL,          -- '직급 유지 보너스', '1vs1 승리', '벌칙' 등
  balance_after INTEGER NOT NULL,        -- 변동 후 잔액
  event_type VARCHAR(50),                -- 이벤트 타입 (직급전, 황금데이, 난사데이 등)
  created_by UUID REFERENCES auth.users(id), -- 관리자가 입력한 경우
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE contribution_logs IS 'BJ 기여도 변동 로그 - 모든 기여도 가감 이력 추적';

CREATE INDEX IF NOT EXISTS idx_contribution_bj ON contribution_logs(bj_member_id);
CREATE INDEX IF NOT EXISTS idx_contribution_episode ON contribution_logs(episode_id);
CREATE INDEX IF NOT EXISTS idx_contribution_season ON contribution_logs(season_id);
CREATE INDEX IF NOT EXISTS idx_contribution_event_type ON contribution_logs(event_type);

-- ============================================
-- 4. prize_penalties (상벌금 기록)
-- 에피소드별 상금/벌금 관리
-- ============================================
CREATE TABLE IF NOT EXISTS prize_penalties (
  id SERIAL PRIMARY KEY,
  bj_member_id INTEGER NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  episode_id INTEGER REFERENCES episodes(id) ON DELETE SET NULL,
  season_id INTEGER REFERENCES seasons(id) ON DELETE SET NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('prize', 'penalty')),
  amount INTEGER NOT NULL CHECK (amount > 0), -- 항상 양수 (type으로 구분)
  description VARCHAR(200),              -- '1등 상금', '2등 벌금', '특별 상금' 등
  is_paid BOOLEAN DEFAULT FALSE,         -- 지급/납부 완료 여부
  paid_at TIMESTAMPTZ,
  payment_note TEXT,                     -- 지급/납부 메모
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE prize_penalties IS 'BJ 상벌금 기록 - 에피소드별 상금/벌금 정산 관리';

CREATE INDEX IF NOT EXISTS idx_prize_bj ON prize_penalties(bj_member_id);
CREATE INDEX IF NOT EXISTS idx_prize_episode ON prize_penalties(episode_id);
CREATE INDEX IF NOT EXISTS idx_prize_season ON prize_penalties(season_id);
CREATE INDEX IF NOT EXISTS idx_prize_type ON prize_penalties(type);
CREATE INDEX IF NOT EXISTS idx_prize_unpaid ON prize_penalties(is_paid) WHERE is_paid = FALSE;

-- ============================================
-- 5. episode_teams (에피소드별 팀 구성)
-- 메이저/마이너, 여왕팀/공주팀, 용병팀 등
-- ============================================
CREATE TABLE IF NOT EXISTS episode_teams (
  id SERIAL PRIMARY KEY,
  episode_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  team_name VARCHAR(50) NOT NULL,        -- '메이저', '마이너', '여왕팀', '공주팀', '용병A팀'
  team_type VARCHAR(20) NOT NULL,        -- 'major_minor', 'queen_princess', 'mercenary', 'custom'
  team_color VARCHAR(7),                 -- 팀 색상 (hex)
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE episode_teams IS '에피소드별 팀 구성 - 명품데이, 팀데스매치, 용병데이 등에서 사용';

CREATE INDEX IF NOT EXISTS idx_episode_teams_episode ON episode_teams(episode_id);
CREATE INDEX IF NOT EXISTS idx_episode_teams_type ON episode_teams(team_type);

-- ============================================
-- 6. episode_team_members (팀 멤버 구성)
-- 에피소드 팀에 속한 BJ 멤버
-- ============================================
CREATE TABLE IF NOT EXISTS episode_team_members (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES episode_teams(id) ON DELETE CASCADE,
  bj_member_id INTEGER NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',     -- 'leader', 'member', 'mercenary'
  partner_bj_id INTEGER REFERENCES organization(id), -- 용병 데이: 친구 BJ
  partner_name VARCHAR(50),              -- 용병 파트너 이름 (organization에 없는 경우)
  stats JSONB,                           -- 추가 통계 (점수, 순위 등)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, bj_member_id)
);

COMMENT ON TABLE episode_team_members IS '팀 멤버 구성 - 각 팀에 속한 BJ 멤버 관리';

CREATE INDEX IF NOT EXISTS idx_team_members_team ON episode_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_bj ON episode_team_members(bj_member_id);

-- ============================================
-- 7. episode_matchups (1vs1 매칭)
-- 데스매치, 라이벌 매칭 관리
-- ============================================
CREATE TABLE IF NOT EXISTS episode_matchups (
  id SERIAL PRIMARY KEY,
  episode_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  bj_member_1_id INTEGER NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  bj_member_2_id INTEGER NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  winner_id INTEGER REFERENCES organization(id),
  match_type VARCHAR(20) NOT NULL,       -- '1vs1', 'rival', 'team_vs_team'
  match_order INTEGER DEFAULT 1,         -- 매칭 순서
  prize_type VARCHAR(20),                -- 'contribution', 'prize', 'penalty'
  prize_amount INTEGER,                  -- 상금/기여도 양
  match_result JSONB,                    -- 추가 결과 데이터 (스코어 등)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE episode_matchups IS '1vs1 매칭 - 데스매치, 라이벌 매칭, 기여도 쟁탈전';

CREATE INDEX IF NOT EXISTS idx_matchups_episode ON episode_matchups(episode_id);
CREATE INDEX IF NOT EXISTS idx_matchups_type ON episode_matchups(match_type);
CREATE INDEX IF NOT EXISTS idx_matchups_bj1 ON episode_matchups(bj_member_1_id);
CREATE INDEX IF NOT EXISTS idx_matchups_bj2 ON episode_matchups(bj_member_2_id);

-- ============================================
-- 8. organization 테이블 확장
-- 기존 테이블에 직급/기여도/상벌금 필드 추가
-- ============================================
ALTER TABLE organization
  ADD COLUMN IF NOT EXISTS current_rank_id INTEGER REFERENCES bj_ranks(id),
  ADD COLUMN IF NOT EXISTS total_contribution INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS season_contribution INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_prize INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_penalty INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prize_balance INTEGER DEFAULT 0; -- 상금 - 벌금 잔액

COMMENT ON COLUMN organization.current_rank_id IS '현재 직급 (FK to bj_ranks)';
COMMENT ON COLUMN organization.total_contribution IS '누적 기여도';
COMMENT ON COLUMN organization.season_contribution IS '현재 시즌 기여도';
COMMENT ON COLUMN organization.total_prize IS '누적 받은 상금';
COMMENT ON COLUMN organization.total_penalty IS '누적 받은 벌금';
COMMENT ON COLUMN organization.prize_balance IS '상벌금 잔액 (상금 - 벌금)';

-- ============================================
-- 9. 초기 직급 데이터 삽입
-- ============================================
INSERT INTO bj_ranks (name, level, display_order, color, description) VALUES
('여왕', 1, 1, '#FFD700', '최고 직급 - 시즌 1등'),
('공주', 2, 2, '#FFC0CB', '2등 직급'),
('황족', 3, 3, '#9400D3', '3등 직급'),
('귀족', 4, 4, '#4169E1', '4등 직급'),
('시녀장', 5, 5, '#228B22', '5등 직급'),
('시녀', 6, 6, '#32CD32', '6등 직급'),
('하녀1', 7, 7, '#808080', '7등 직급'),
('하녀2', 8, 8, '#A9A9A9', '8등 직급'),
('하녀3', 9, 9, '#C0C0C0', '9등 직급'),
('노예장', 10, 10, '#8B4513', '10등 직급'),
('노예', 11, 11, '#A0522D', '11등 직급'),
('쌉노예', 12, 12, '#D2691E', '최하위 직급')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 10. RLS 정책 (Row Level Security)
-- ============================================

-- bj_ranks: 모두 읽기 가능, 관리자만 수정 가능
ALTER TABLE bj_ranks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bj_ranks_read_all" ON bj_ranks
  FOR SELECT USING (true);

CREATE POLICY "bj_ranks_admin_all" ON bj_ranks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- bj_rank_history: 모두 읽기 가능, 관리자만 수정 가능
ALTER TABLE bj_rank_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bj_rank_history_read_all" ON bj_rank_history
  FOR SELECT USING (true);

CREATE POLICY "bj_rank_history_admin_all" ON bj_rank_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- contribution_logs: 모두 읽기 가능, 관리자만 수정 가능
ALTER TABLE contribution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contribution_logs_read_all" ON contribution_logs
  FOR SELECT USING (true);

CREATE POLICY "contribution_logs_admin_all" ON contribution_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- prize_penalties: 모두 읽기 가능, 관리자만 수정 가능
ALTER TABLE prize_penalties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prize_penalties_read_all" ON prize_penalties
  FOR SELECT USING (true);

CREATE POLICY "prize_penalties_admin_all" ON prize_penalties
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- episode_teams: 모두 읽기 가능, 관리자만 수정 가능
ALTER TABLE episode_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "episode_teams_read_all" ON episode_teams
  FOR SELECT USING (true);

CREATE POLICY "episode_teams_admin_all" ON episode_teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- episode_team_members: 모두 읽기 가능, 관리자만 수정 가능
ALTER TABLE episode_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "episode_team_members_read_all" ON episode_team_members
  FOR SELECT USING (true);

CREATE POLICY "episode_team_members_admin_all" ON episode_team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- episode_matchups: 모두 읽기 가능, 관리자만 수정 가능
ALTER TABLE episode_matchups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "episode_matchups_read_all" ON episode_matchups
  FOR SELECT USING (true);

CREATE POLICY "episode_matchups_admin_all" ON episode_matchups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- ============================================
-- 11. 유용한 함수들
-- ============================================

-- 기여도 변동 시 organization.total_contribution 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_bj_contribution()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE organization
    SET
      total_contribution = COALESCE(total_contribution, 0) + NEW.amount,
      season_contribution = COALESCE(season_contribution, 0) + NEW.amount
    WHERE id = NEW.bj_member_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bj_contribution ON contribution_logs;
CREATE TRIGGER trigger_update_bj_contribution
AFTER INSERT ON contribution_logs
FOR EACH ROW
EXECUTE FUNCTION update_bj_contribution();

-- 상벌금 기록 시 organization 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_bj_prize_penalty()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'prize' THEN
      UPDATE organization
      SET
        total_prize = COALESCE(total_prize, 0) + NEW.amount,
        prize_balance = COALESCE(prize_balance, 0) + NEW.amount
      WHERE id = NEW.bj_member_id;
    ELSE
      UPDATE organization
      SET
        total_penalty = COALESCE(total_penalty, 0) + NEW.amount,
        prize_balance = COALESCE(prize_balance, 0) - NEW.amount
      WHERE id = NEW.bj_member_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bj_prize_penalty ON prize_penalties;
CREATE TRIGGER trigger_update_bj_prize_penalty
AFTER INSERT ON prize_penalties
FOR EACH ROW
EXECUTE FUNCTION update_bj_prize_penalty();

-- 직급 변동 시 current_rank_id 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_bj_current_rank()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE organization
    SET current_rank_id = NEW.rank_id
    WHERE id = NEW.bj_member_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bj_current_rank ON bj_rank_history;
CREATE TRIGGER trigger_update_bj_current_rank
AFTER INSERT ON bj_rank_history
FOR EACH ROW
EXECUTE FUNCTION update_bj_current_rank();

-- ============================================
-- 완료!
-- ============================================
-- 이 스크립트 실행 후:
-- 1. Supabase Dashboard에서 테이블 생성 확인
-- 2. bj_ranks 테이블에 12개 직급 데이터 확인
-- 3. organization 테이블에 새 컬럼 추가 확인
