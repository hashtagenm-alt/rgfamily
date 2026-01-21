-- 총 후원 랭킹 테이블 (역대 누적) - Top 50
-- 주의: total_amount는 외부에 절대 노출하지 않고 게이지로만 표현

CREATE TABLE IF NOT EXISTS public.total_donation_rankings (
  id SERIAL PRIMARY KEY,
  rank INTEGER NOT NULL UNIQUE,
  donor_name TEXT NOT NULL,
  total_amount INTEGER NOT NULL,
  is_permanent_vip BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_tdr_rank ON public.total_donation_rankings(rank);

-- RLS 활성화
ALTER TABLE public.total_donation_rankings ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 정책 (단, total_amount는 API에서 제외해야 함)
CREATE POLICY "총후원랭킹 공개 읽기"
  ON public.total_donation_rankings
  FOR SELECT
  TO public
  USING (true);

-- 관리자만 수정 가능
CREATE POLICY "총후원랭킹 관리자 수정"
  ON public.total_donation_rankings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 코멘트
COMMENT ON TABLE public.total_donation_rankings IS '총 후원 랭킹 (역대 누적) - Top 50';
COMMENT ON COLUMN public.total_donation_rankings.total_amount IS '총 후원 하트 수 - 외부 노출 금지, 게이지로만 표현';

-- Top 50 데이터 삽입
INSERT INTO public.total_donation_rankings (rank, donor_name, total_amount, is_permanent_vip) VALUES
(1, '미키™', 626663, true),
(2, '손밍매니아', 254663, false),
(3, '❥CaNnOt', 236386, false),
(4, '쩔어서짜다', 185465, false),
(5, '미드굿♣️가애', 146276, true),
(6, '[RG]✨린아의발굴™', 103309, true),
(7, '농심육개장라면', 84177, true),
(8, '까부는넌내꺼야119', 70847, false),
(9, '☀칰힌사주면천사☀', 58907, false),
(10, '[RG]린아✨여행™', 56157, false),
(11, '한세아내꺼♡호랭이', 50300, false),
(12, '한세아♡백작♡하얀만두피', 50023, false),
(13, '시라☆구구단☆시우', 48720, false),
(14, '태린공주❤️줄여보자', 46926, false),
(15, '⭐건빵이미래쥐', 42395, false),
(16, '❤️지수ෆ해린❤️치토스㉦', 36488, false),
(17, '가윤이꼬❤️털이', 35951, false),
(18, '✨바위늪✨', 28452, false),
(19, '조패러갈꽈', 27020, false),
(20, 'qldh라유', 25795, false),
(21, '김스껄', 25008, false),
(22, '가윤이꼬❤️함주라', 22822, false),
(23, '언제나♬', 20873, false),
(24, '한은비ღ안줘ღ', 20727, false),
(25, '☾코코에르메스', 20070, false),
(26, '린아사단✨탱커', 18492, false),
(27, '[RG]린아네☀둥그레', 18433, false),
(28, '미쯔✨', 18279, false),
(29, '개호구⭐즈하⭐광대', 18015, false),
(30, '앵겨라잉', 15588, false),
(31, '태린공주❤️마비™', 15240, false),
(32, '[로진]버러지원엔터대표', 15209, false),
(33, '홍서하네❥페르소나™', 14950, false),
(34, '이태린ෆ', 14205, false),
(35, 'ෆ유은', 13797, false),
(36, '❤️재활중~방랑자❤️', 13198, false),
(37, '57774', 12208, false),
(38, '니니ღ', 12095, false),
(39, '말랑채이', 12003, false),
(40, '채은S2으악❤️', 11866, false),
(41, '아름다운집', 11018, false),
(42, '사랑해씌발™', 10606, false),
(43, '♬♪행복한베니와✨엔띠♬', 10008, false),
(44, '소율❤️', 10001, false),
(45, '[S]윤수아잉❤️', 10000, false),
(46, '리정팔', 10000, false),
(47, '한세령❤️', 10000, false),
(48, '홍서하네❥홍바스', 9341, false),
(49, '태린공주❤️깡총⁀증기선', 9048, false),
(50, '박하은❤️왕교대교', 8866, false)
ON CONFLICT (rank) DO UPDATE SET
  donor_name = EXCLUDED.donor_name,
  total_amount = EXCLUDED.total_amount,
  is_permanent_vip = EXCLUDED.is_permanent_vip,
  updated_at = NOW();
