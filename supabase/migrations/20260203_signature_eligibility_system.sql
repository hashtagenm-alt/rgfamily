-- ============================================================
-- 시그니처 자격 관리 시스템
--
-- 기준:
-- - 1번째 시그: 당일 누적 10만+ 하트
-- - 2번째 시그: 1번째 이후 회차에서 당일 15만+ 하트
-- - 3번째 시그: 2번째 이후 회차에서 당일 20만+ 하트
-- ============================================================

-- 1. 시그니처 자격 기록 테이블
CREATE TABLE IF NOT EXISTS public.signature_eligibility (
  id SERIAL PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  donor_name TEXT NOT NULL,
  sig_number INTEGER NOT NULL CHECK (sig_number BETWEEN 1 AND 3), -- 1, 2, 3번째 시그
  episode_id INTEGER REFERENCES public.episodes(id),
  episode_number INTEGER, -- 회차 번호 (표시용)
  daily_amount INTEGER NOT NULL, -- 당일 누적 후원액
  threshold_amount INTEGER NOT NULL, -- 달성 기준액 (10만/15만/20만)
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_claimed BOOLEAN DEFAULT FALSE, -- 시그니처 이미지 수령 여부
  claimed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(donor_name, sig_number) -- 동일 후원자는 각 시그 번호당 1개만
);

COMMENT ON TABLE public.signature_eligibility IS '시그니처 자격 기록 - 당일 누적 10만/15만/20만 달성 기록';
COMMENT ON COLUMN public.signature_eligibility.sig_number IS '시그니처 번호 (1=10만, 2=15만, 3=20만)';
COMMENT ON COLUMN public.signature_eligibility.is_claimed IS '시그니처 이미지 수령 완료 여부';

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_sig_eligibility_donor ON public.signature_eligibility(donor_name);
CREATE INDEX IF NOT EXISTS idx_sig_eligibility_profile ON public.signature_eligibility(profile_id);
CREATE INDEX IF NOT EXISTS idx_sig_eligibility_episode ON public.signature_eligibility(episode_id);
CREATE INDEX IF NOT EXISTS idx_sig_eligibility_claimed ON public.signature_eligibility(is_claimed);

-- 3. RLS 정책
ALTER TABLE public.signature_eligibility ENABLE ROW LEVEL SECURITY;

-- 모든 사용자 읽기 허용
CREATE POLICY "sig_eligibility_read_all" ON public.signature_eligibility
  FOR SELECT USING (true);

-- 관리자만 쓰기 허용
CREATE POLICY "sig_eligibility_admin_write" ON public.signature_eligibility
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- 4. 에피소드별 후원자 당일 누적 View
CREATE OR REPLACE VIEW public.v_episode_donor_totals AS
SELECT
  d.episode_id,
  e.episode_number,
  d.donor_name,
  SUM(d.amount) as daily_total,
  COUNT(*) as donation_count,
  CASE
    WHEN SUM(d.amount) >= 200000 THEN 3
    WHEN SUM(d.amount) >= 150000 THEN 2
    WHEN SUM(d.amount) >= 100000 THEN 1
    ELSE 0
  END as max_sig_level
FROM public.donations d
JOIN public.episodes e ON e.id = d.episode_id
GROUP BY d.episode_id, e.episode_number, d.donor_name
HAVING SUM(d.amount) >= 100000
ORDER BY e.episode_number, SUM(d.amount) DESC;

COMMENT ON VIEW public.v_episode_donor_totals IS '에피소드별 후원자 당일 누적 (10만+ 필터)';

-- 5. 시그니처 자격 현황 View (시그 개수별)
CREATE OR REPLACE VIEW public.v_signature_status AS
SELECT
  donor_name,
  COUNT(*) as sig_count,
  MAX(CASE WHEN sig_number = 1 THEN episode_number END) as sig1_episode,
  MAX(CASE WHEN sig_number = 1 THEN daily_amount END) as sig1_amount,
  MAX(CASE WHEN sig_number = 2 THEN episode_number END) as sig2_episode,
  MAX(CASE WHEN sig_number = 2 THEN daily_amount END) as sig2_amount,
  MAX(CASE WHEN sig_number = 3 THEN episode_number END) as sig3_episode,
  MAX(CASE WHEN sig_number = 3 THEN daily_amount END) as sig3_amount,
  BOOL_AND(is_claimed) as all_claimed
FROM public.signature_eligibility
GROUP BY donor_name
ORDER BY COUNT(*) DESC, donor_name;

COMMENT ON VIEW public.v_signature_status IS '후원자별 시그니처 자격 현황';

-- 6. 권한 부여
GRANT SELECT ON public.signature_eligibility TO anon, authenticated;
GRANT SELECT ON public.v_episode_donor_totals TO anon, authenticated;
GRANT SELECT ON public.v_signature_status TO anon, authenticated;

-- 7. 시그니처 자격 계산 함수
CREATE OR REPLACE FUNCTION calculate_signature_eligibility()
RETURNS TABLE(
  donor_name TEXT,
  sig_number INTEGER,
  episode_id INTEGER,
  episode_number INTEGER,
  daily_amount INTEGER,
  threshold_amount INTEGER
) AS $$
DECLARE
  r RECORD;
  donor_sig_count INTEGER;
  threshold INTEGER;
BEGIN
  -- 임시 테이블로 모든 10만+ 기록 수집
  FOR r IN (
    SELECT
      edt.donor_name,
      edt.episode_id,
      edt.episode_number,
      edt.daily_total
    FROM v_episode_donor_totals edt
    ORDER BY edt.donor_name, edt.episode_number
  ) LOOP
    -- 해당 후원자의 현재 시그 개수 조회
    SELECT COUNT(*) INTO donor_sig_count
    FROM signature_eligibility se
    WHERE se.donor_name = r.donor_name;

    -- 다음 시그 번호 및 기준액 결정
    IF donor_sig_count = 0 AND r.daily_total >= 100000 THEN
      sig_number := 1;
      threshold := 100000;
    ELSIF donor_sig_count = 1 AND r.daily_total >= 150000 THEN
      -- 1번째 시그 에피소드 이후인지 확인
      IF r.episode_number > (
        SELECT MAX(se.episode_number)
        FROM signature_eligibility se
        WHERE se.donor_name = r.donor_name AND se.sig_number = 1
      ) THEN
        sig_number := 2;
        threshold := 150000;
      ELSE
        CONTINUE;
      END IF;
    ELSIF donor_sig_count = 2 AND r.daily_total >= 200000 THEN
      -- 2번째 시그 에피소드 이후인지 확인
      IF r.episode_number > (
        SELECT MAX(se.episode_number)
        FROM signature_eligibility se
        WHERE se.donor_name = r.donor_name AND se.sig_number = 2
      ) THEN
        sig_number := 3;
        threshold := 200000;
      ELSE
        CONTINUE;
      END IF;
    ELSE
      CONTINUE;
    END IF;

    -- 결과 반환
    RETURN QUERY SELECT
      r.donor_name,
      sig_number,
      r.episode_id,
      r.episode_number,
      r.daily_total::INTEGER,
      threshold;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_signature_eligibility IS '시그니처 자격 자동 계산 (순차적 기준 적용)';
