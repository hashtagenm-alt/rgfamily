-- 시즌 1 후원 랭킹 데이터 (1회차 방송 기준)
-- Supabase SQL Editor에서 실행

-- 1. 시즌 1이 없으면 생성
INSERT INTO seasons (id, name, start_date, end_date, is_active, created_at)
VALUES (1, '시즌 1', '2025-01-01', NULL, true, NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active;

-- 2. 에피소드 1 (1회차 방송) 없으면 생성
INSERT INTO episodes (id, season_id, episode_number, title, broadcast_date, is_rank_battle, is_finalized, created_at)
VALUES (1, 1, 1, '시즌 1 - 1회차', '2025-01-20', false, true, NOW())
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  is_finalized = EXCLUDED.is_finalized;

-- 3. 기존 시즌 1 후원 데이터 삭제 (깨끗하게 시작)
DELETE FROM donations WHERE season_id = 1;

-- 4. Top 50 프로필 Upsert (profiles 테이블)
-- 후원자 ID는 panda_id 기반으로 생성

-- 1위: 손밍매니아
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at)
VALUES ('user-luka831', '손밍매니아', 'vip', 'excel', 254663, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, role = EXCLUDED.role, unit = EXCLUDED.unit, updated_at = NOW();

-- 2위: 미키™
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at)
VALUES ('user-mickey94', '미키™', 'vip', 'excel', 215381, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, role = EXCLUDED.role, unit = EXCLUDED.unit, updated_at = NOW();

-- 3위: 쩔어서짜다
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at)
VALUES ('user-ilcy2k', '쩔어서짜다', 'vip', 'excel', 185465, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, role = EXCLUDED.role, unit = EXCLUDED.unit, updated_at = NOW();

-- 4위: ❥CaNnOt
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at)
VALUES ('user-2395546632', '❥CaNnOt', 'vip', 'crew', 176754, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, role = EXCLUDED.role, unit = EXCLUDED.unit, updated_at = NOW();

-- 5위: 까부는넌내꺼야119
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at)
VALUES ('user-skypower1119', '까부는넌내꺼야119', 'vip', 'excel', 70847, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, role = EXCLUDED.role, unit = EXCLUDED.unit, updated_at = NOW();

-- 6위: ☀칰힌사주면천사☀
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at)
VALUES ('user-symail92', '☀칰힌사주면천사☀', 'vip', 'excel', 58895, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, role = EXCLUDED.role, unit = EXCLUDED.unit, updated_at = NOW();

-- 7위: 한세아♡백작♡하얀만두피
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at)
VALUES ('user-welcometome791', '한세아♡백작♡하얀만두피', 'vip', 'excel', 49523, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, role = EXCLUDED.role, unit = EXCLUDED.unit, updated_at = NOW();

-- 8위: 시라☆구구단☆시우
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at)
VALUES ('user-16516385', '시라☆구구단☆시우', 'vip', 'excel', 48690, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, role = EXCLUDED.role, unit = EXCLUDED.unit, updated_at = NOW();

-- 9위: 한세아내꺼♡호랭이
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at)
VALUES ('user-yuricap85', '한세아내꺼♡호랭이', 'vip', 'excel', 47367, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, role = EXCLUDED.role, unit = EXCLUDED.unit, updated_at = NOW();

-- 10위: [RG]✨린아의발굴™
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at)
VALUES ('user-ksbjh77', '[RG]✨린아의발굴™', 'vip', 'excel', 40685, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, role = EXCLUDED.role, unit = EXCLUDED.unit, updated_at = NOW();

-- 11위~50위: member role
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-thursdayday', '미드굿♣️가애', 'member', 'excel', 36970, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-rhehrgks486', '❤️지수ෆ해린❤️치토스㉦', 'member', 'excel', 36488, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-tmdgus080222', '조패러갈꽈', 'member', 'excel', 27020, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-bbwin12', '✨바위늪✨', 'member', 'excel', 25062, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-bravo1975', '가윤이꼬❤️함주라', 'member', 'excel', 22822, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-tnvenvelv777', 'qldh라유', 'member', 'excel', 22621, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-loveday77', '[RG]린아✨여행™', 'member', 'excel', 19032, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-skrrrr12', '김스껄', 'member', 'excel', 15741, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-museent03020302', '[로진]43세정영민', 'member', 'excel', 14432, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-rriiiqp123', '이태린ෆ', 'member', 'excel', 14205, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-uuu981214', 'ෆ유은', 'member', 'excel', 13797, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-wony0502', '홍서하네❥페르소나™', 'member', 'excel', 12364, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-kim6223164', '57774', 'member', 'excel', 12208, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-wow486', '니니ღ', 'member', 'excel', 12095, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-akffkdcodl', '말랑채이', 'member', 'excel', 12003, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-okd12121', '채은S2으악❤️', 'member', 'excel', 11866, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-disk197346', '[RG]린아네☀둥그레', 'member', 'excel', 11381, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-bluekjhmi', '아름다운집', 'member', 'excel', 11018, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-4427766178', '미쯔✨', 'member', 'excel', 10673, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-duxnqkrxn', '♬♪행복한베니와✨엔띠♬', 'member', 'excel', 10008, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-oxxx139', '소율❤️', 'member', 'excel', 10001, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-ysooa1030', '[S]윤수아잉❤️', 'member', 'excel', 10000, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-syk7574', '✧도루묵✧', 'member', 'excel', 7717, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-ejeh2472', '사랑해씌발™', 'member', 'excel', 7257, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-dungeon7', '계몽☽BJ죽어흑흑_조랭', 'member', 'crew', 6878, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-mugongja', '[SD]티모', 'member', 'excel', 6124, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-kingofthestock', '풀묶™', 'member', 'excel', 5674, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-dyeks10', '손밍ღ타코보이', 'member', 'excel', 5647, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-365719', '가윤이꼬❤️털이', 'member', 'excel', 5419, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-gjsfken77', '[GV]케인♣️', 'member', 'crew', 5036, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-tjdsdm12', '시은◡*', 'member', 'excel', 5000, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-no0163', '유진이ෆ', 'member', 'excel', 4853, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-mmkorea', '이태리ෆ탤받쮸', 'member', 'excel', 4848, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-anfth1234', '갈색말티푸', 'member', 'excel', 4564, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-njw7920', '❤️사람❤️', 'member', 'excel', 4462, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-asm3158', 'FA진스', 'member', 'excel', 4444, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-bbbb1007', '✿도화살✿', 'member', 'excel', 4315, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-scv19001', '잔망미니언즈', 'member', 'excel', 4276, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-3293064651', '킴소금쟁이', 'member', 'excel', 4000, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();
INSERT INTO profiles (id, nickname, role, unit, total_donation, created_at, updated_at) VALUES ('user-dogyoung9157', '도도_♡', 'member', 'excel', 3815, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, total_donation = EXCLUDED.total_donation, unit = EXCLUDED.unit, updated_at = NOW();

-- 5. 후원 내역 추가 (donations 테이블)
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-luka831', '손밍매니아', 254663, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-mickey94', '미키™', 215381, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-ilcy2k', '쩔어서짜다', 185465, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-2395546632', '❥CaNnOt', 176754, 1, 1, 'crew', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-skypower1119', '까부는넌내꺼야119', 70847, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-symail92', '☀칰힌사주면천사☀', 58895, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-welcometome791', '한세아♡백작♡하얀만두피', 49523, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-16516385', '시라☆구구단☆시우', 48690, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-yuricap85', '한세아내꺼♡호랭이', 47367, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-ksbjh77', '[RG]✨린아의발굴™', 40685, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-thursdayday', '미드굿♣️가애', 36970, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-rhehrgks486', '❤️지수ෆ해린❤️치토스㉦', 36488, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-tmdgus080222', '조패러갈꽈', 27020, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-bbwin12', '✨바위늪✨', 25062, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-bravo1975', '가윤이꼬❤️함주라', 22822, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-tnvenvelv777', 'qldh라유', 22621, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-loveday77', '[RG]린아✨여행™', 19032, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-skrrrr12', '김스껄', 15741, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-museent03020302', '[로진]43세정영민', 14432, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-rriiiqp123', '이태린ෆ', 14205, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-uuu981214', 'ෆ유은', 13797, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-wony0502', '홍서하네❥페르소나™', 12364, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-kim6223164', '57774', 12208, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-wow486', '니니ღ', 12095, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-akffkdcodl', '말랑채이', 12003, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-okd12121', '채은S2으악❤️', 11866, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-disk197346', '[RG]린아네☀둥그레', 11381, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-bluekjhmi', '아름다운집', 11018, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-4427766178', '미쯔✨', 10673, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-duxnqkrxn', '♬♪행복한베니와✨엔띠♬', 10008, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-oxxx139', '소율❤️', 10001, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-ysooa1030', '[S]윤수아잉❤️', 10000, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-syk7574', '✧도루묵✧', 7717, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-ejeh2472', '사랑해씌발™', 7257, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-dungeon7', '계몽☽BJ죽어흑흑_조랭', 6878, 1, 1, 'crew', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-mugongja', '[SD]티모', 6124, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-kingofthestock', '풀묶™', 5674, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-dyeks10', '손밍ღ타코보이', 5647, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-365719', '가윤이꼬❤️털이', 5419, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-gjsfken77', '[GV]케인♣️', 5036, 1, 1, 'crew', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-tjdsdm12', '시은◡*', 5000, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-no0163', '유진이ෆ', 4853, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-mmkorea', '이태리ෆ탤받쮸', 4848, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-anfth1234', '갈색말티푸', 4564, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-njw7920', '❤️사람❤️', 4462, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-asm3158', 'FA진스', 4444, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-bbbb1007', '✿도화살✿', 4315, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-scv19001', '잔망미니언즈', 4276, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-3293064651', '킴소금쟁이', 4000, 1, 1, 'excel', '2025-01-20T00:00:00Z');
INSERT INTO donations (donor_id, donor_name, amount, season_id, episode_id, unit, created_at) VALUES ('user-dogyoung9157', '도도_♡', 3815, 1, 1, 'excel', '2025-01-20T00:00:00Z');

-- 완료 메시지
SELECT '시즌 1 후원 랭킹 데이터 업로드 완료! (Top 50)' as result;
