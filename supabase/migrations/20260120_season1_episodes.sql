-- RG Family 시즌1 에피소드 일정 추가
-- 생성일: 2026-01-20

-- 1. 기존 시즌1 에피소드 데이터 정리 (중복 방지)
DELETE FROM schedules WHERE title LIKE '[RG FAMILY] 시즌1%';
DELETE FROM timeline_events WHERE title LIKE '[RG FAMILY] 시즌1%';

-- 2. schedules 테이블에 에피소드 일정 추가 (캘린더용)
INSERT INTO schedules (title, description, event_type, start_datetime, is_all_day, color) VALUES
-- 01화: 2026-01-20 (화)
('[RG FAMILY] 시즌1 / 01화!', '대망의 첫 회! 직급전!', 'broadcast', '2026-01-20 14:00:00+09', false, '#fd68ba'),
-- 02화: 2026-01-22 (목)
('[RG FAMILY] 시즌1 / 02화!', '황금or벌금데이', 'broadcast', '2026-01-22 14:00:00+09', false, '#fd68ba'),
-- 03화: 2026-01-24 (토)
('[RG FAMILY] 시즌1 / 03화!', '퇴근전쟁', 'broadcast', '2026-01-24 14:00:00+09', false, '#fd68ba'),
-- 04화: 2026-01-27 (화)
('[RG FAMILY] 시즌1 / 04화!', '난사데이', 'broadcast', '2026-01-27 14:00:00+09', false, '#fd68ba'),
-- 05화: 2026-01-29 (목)
('[RG FAMILY] 시즌1 / 05화!', '명품데이 - 메이져 5명, 마이너 7명 경쟁', 'broadcast', '2026-01-29 14:00:00+09', false, '#fd68ba'),
-- 06화: 2026-01-31 (토)
('[RG FAMILY] 시즌1 / 06화!', '1vs1 데스매치', 'broadcast', '2026-01-31 14:00:00+09', false, '#fd68ba'),
-- 07화: 2026-02-03 (화)
('[RG FAMILY] 시즌1 / 07화!', '뉴시그데이 & 중간직급전', 'broadcast', '2026-02-03 14:00:00+09', false, '#fd68ba'),
-- 08화: 2026-02-05 (목)
('[RG FAMILY] 시즌1 / 08화!', '대표를 이겨라', 'broadcast', '2026-02-05 14:00:00+09', false, '#fd68ba'),
-- 09화: 2026-02-07 (토)
('[RG FAMILY] 시즌1 / 09화!', '주차방지데이', 'broadcast', '2026-02-07 14:00:00+09', false, '#fd68ba'),
-- 10화: 2026-02-10 (화)
('[RG FAMILY] 시즌1 / 10화!', '용병 데이_1', 'broadcast', '2026-02-10 14:00:00+09', false, '#fd68ba'),
-- 11화: 2026-02-12 (목)
('[RG FAMILY] 시즌1 / 11화!', NULL, 'broadcast', '2026-02-12 14:00:00+09', false, '#fd68ba'),
-- 12화: 2026-02-14 (토)
('[RG FAMILY] 시즌1 / 12화!', NULL, 'broadcast', '2026-02-14 14:00:00+09', false, '#fd68ba'),
-- 13화: 2026-02-17 (화)
('[RG FAMILY] 시즌1 / 13화!', NULL, 'broadcast', '2026-02-17 14:00:00+09', false, '#fd68ba'),
-- 14화: 2026-02-19 (목)
('[RG FAMILY] 시즌1 / 14화!', NULL, 'broadcast', '2026-02-19 14:00:00+09', false, '#fd68ba'),
-- 15화 (최종): 2026-02-24 (화)
('[RG FAMILY] 시즌1 / 15화!', '최종 직급전', 'broadcast', '2026-02-24 14:00:00+09', false, '#ffd700');

-- 3. timeline_events 테이블에 에피소드 추가 (타임라인용)
INSERT INTO timeline_events (event_date, title, description, category, season_id, order_index) VALUES
('2026-01-20', '[RG FAMILY] 시즌1 / 01화!', '대망의 첫 회! 직급전!', 'broadcast', 10, 1),
('2026-01-22', '[RG FAMILY] 시즌1 / 02화!', '황금or벌금데이', 'broadcast', 10, 2),
('2026-01-24', '[RG FAMILY] 시즌1 / 03화!', '퇴근전쟁', 'broadcast', 10, 3),
('2026-01-27', '[RG FAMILY] 시즌1 / 04화!', '난사데이', 'broadcast', 10, 4),
('2026-01-29', '[RG FAMILY] 시즌1 / 05화!', '명품데이 - 메이져 5명, 마이너 7명 경쟁', 'broadcast', 10, 5),
('2026-01-31', '[RG FAMILY] 시즌1 / 06화!', '1vs1 데스매치', 'broadcast', 10, 6),
('2026-02-03', '[RG FAMILY] 시즌1 / 07화!', '뉴시그데이 & 중간직급전', 'broadcast', 10, 7),
('2026-02-05', '[RG FAMILY] 시즌1 / 08화!', '대표를 이겨라', 'broadcast', 10, 8),
('2026-02-07', '[RG FAMILY] 시즌1 / 09화!', '주차방지데이', 'broadcast', 10, 9),
('2026-02-10', '[RG FAMILY] 시즌1 / 10화!', '용병 데이_1', 'broadcast', 10, 10),
('2026-02-12', '[RG FAMILY] 시즌1 / 11화!', NULL, 'broadcast', 10, 11),
('2026-02-14', '[RG FAMILY] 시즌1 / 12화!', NULL, 'broadcast', 10, 12),
('2026-02-17', '[RG FAMILY] 시즌1 / 13화!', NULL, 'broadcast', 10, 13),
('2026-02-19', '[RG FAMILY] 시즌1 / 14화!', NULL, 'broadcast', 10, 14),
('2026-02-24', '[RG FAMILY] 시즌1 / 15화!', '최종 직급전', 'broadcast', 10, 15);

-- 4. episodes 테이블에도 추가 (에피소드 관리용)
-- 기존 데이터 정리
DELETE FROM episodes WHERE season_id = 10;

INSERT INTO episodes (season_id, episode_number, title, description, broadcast_date, is_rank_battle) VALUES
(10, 1, '대망의 첫 회! 직급전!', 'RG Family 시즌1 첫 번째 에피소드', '2026-01-20 14:00:00+09', true),
(10, 2, '황금or벌금데이', 'RG Family 시즌1 두 번째 에피소드', '2026-01-22 14:00:00+09', false),
(10, 3, '퇴근전쟁', 'RG Family 시즌1 세 번째 에피소드', '2026-01-24 14:00:00+09', false),
(10, 4, '난사데이', 'RG Family 시즌1 네 번째 에피소드', '2026-01-27 14:00:00+09', false),
(10, 5, '명품데이', '메이져 5명, 마이너 7명 경쟁', '2026-01-29 14:00:00+09', false),
(10, 6, '1vs1 데스매치', 'RG Family 시즌1 여섯 번째 에피소드', '2026-01-31 14:00:00+09', false),
(10, 7, '뉴시그데이 & 중간직급전', 'RG Family 시즌1 일곱 번째 에피소드 - 중간직급전', '2026-02-03 14:00:00+09', true),
(10, 8, '대표를 이겨라', 'RG Family 시즌1 여덟 번째 에피소드', '2026-02-05 14:00:00+09', false),
(10, 9, '주차방지데이', 'RG Family 시즌1 아홉 번째 에피소드', '2026-02-07 14:00:00+09', false),
(10, 10, '용병 데이_1', 'RG Family 시즌1 열 번째 에피소드', '2026-02-10 14:00:00+09', false),
(10, 11, '시즌1 11화', NULL, '2026-02-12 14:00:00+09', false),
(10, 12, '시즌1 12화', NULL, '2026-02-14 14:00:00+09', false),
(10, 13, '시즌1 13화', NULL, '2026-02-17 14:00:00+09', false),
(10, 14, '시즌1 14화', NULL, '2026-02-19 14:00:00+09', false),
(10, 15, '최종 직급전', 'RG Family 시즌1 최종 에피소드 - 최종 직급전', '2026-02-24 14:00:00+09', true);
