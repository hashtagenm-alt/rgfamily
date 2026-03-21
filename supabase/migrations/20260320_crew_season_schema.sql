-- =============================================================
-- 크루부 + 시즌별 멤버 구성 스키마 확장
-- 2026-03-20
-- =============================================================

-- 1. season_members: 시즌별 멤버 구성 관리 (핵심 테이블)
-- organization = BJ 마스터 프로필 (전역)
-- season_members = 시즌별/유닛별 소속 관리
CREATE TABLE IF NOT EXISTS season_members (
  id              SERIAL PRIMARY KEY,
  season_id       INTEGER NOT NULL REFERENCES seasons(id),
  member_id       INTEGER NOT NULL REFERENCES organization(id),
  unit            TEXT NOT NULL CHECK (unit IN ('excel', 'crew')),
  role            TEXT NOT NULL DEFAULT 'member',
  position_order  INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(season_id, member_id, unit)
);

-- RLS
ALTER TABLE season_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "season_members_public_read" ON season_members
  FOR SELECT USING (true);

CREATE POLICY "season_members_admin_write" ON season_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_season_members_season ON season_members(season_id);
CREATE INDEX IF NOT EXISTS idx_season_members_member ON season_members(member_id);
CREATE INDEX IF NOT EXISTS idx_season_members_unit ON season_members(season_id, unit);

-- 2. episodes에 unit 컬럼 추가 + 유니크 제약 변경
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'excel' CHECK (unit IN ('excel', 'crew'));
UPDATE episodes SET unit = 'excel' WHERE unit IS NULL;

-- 유니크 제약: (season_id, episode_number) → (season_id, episode_number, unit)
ALTER TABLE episodes DROP CONSTRAINT IF EXISTS episodes_season_id_episode_number_key;
ALTER TABLE episodes ADD CONSTRAINT episodes_season_id_episode_number_unit_key UNIQUE (season_id, episode_number, unit);

-- 3. 기존 시즌1 엑셀부 멤버 → season_members 마이그레이션
INSERT INTO season_members (season_id, member_id, unit, role, position_order, is_active)
SELECT 1, id, 'excel', role, position_order, is_active
FROM organization WHERE unit = 'excel'
ON CONFLICT (season_id, member_id, unit) DO NOTHING;

-- 4. 크루부 BJ 추가 (organization 마스터 테이블)
-- 이태린: 신규 BJ (엑셀부에 없음)
INSERT INTO organization (unit, name, role, position_order, is_active, current_rank_id)
VALUES ('crew', '이태린', '멤버', 3, true, null)
ON CONFLICT DO NOTHING;

-- 기존 엑셀부 BJ를 크루부에도 등록 (같은 사람이 양쪽에 소속)
INSERT INTO organization (unit, name, role, position_order, is_active, profile_id, current_rank_id)
SELECT 'crew', name,
  CASE WHEN role = '대표' THEN '대표' ELSE '멤버' END,
  CASE name
    WHEN '린아' THEN 1
    WHEN '가애' THEN 2
    WHEN '가윤' THEN 4
    WHEN '설윤' THEN 5
    WHEN '해린' THEN 6
  END,
  true, profile_id, null
FROM organization
WHERE unit = 'excel' AND name IN ('린아', '가애', '가윤', '설윤', '해린')
ON CONFLICT DO NOTHING;

-- 5. 크루부 시즌1 멤버 → season_members
INSERT INTO season_members (season_id, member_id, unit, role, position_order, is_active)
SELECT 1, id, 'crew', role, position_order, is_active
FROM organization WHERE unit = 'crew'
ON CONFLICT (season_id, member_id, unit) DO NOTHING;

-- 6. 크루부 에피소드 생성
INSERT INTO episodes (season_id, episode_number, title, broadcast_date, is_rank_battle, description, is_finalized, unit)
VALUES
  (1, 1, '[RG FAMILY] 크루부 시즌1 / 01화!', '2026-03-15', false, '크루부 1화', false, 'crew'),
  (1, 2, '[RG FAMILY] 크루부 시즌1 / 02화!', '2026-03-19', false, '크루부 2화', false, 'crew')
ON CONFLICT DO NOTHING;
