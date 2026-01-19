/**
 * Mock Schedules Data
 * RG Family 시즌1 일정 캘린더
 */

import type { Schedule } from '@/types/database'

// RG Family 시즌1 일정 (2026년)
export const mockSchedules: Schedule[] = [
  // ===== 시즌1 콘텐츠 일정 =====
  {
    id: 1,
    title: '[RG FAMILY] 시즌1 / 01화 - 직급전',
    description: `대망의 첫 회! 직급전!
• 1등 추가 기여도 10만점
• 2등 추가 기여도 7만점
• 3등 추가 기여도 5만점`,
    unit: 'excel',
    event_type: 'event',
    start_datetime: '2026-01-20T20:00:00+09:00',
    end_datetime: '2026-01-20T23:00:00+09:00',
    location: '팬더티비',
    is_all_day: false,
    color: '#fd68ba',
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    title: '[RG FAMILY] 시즌1 / 02화 - 황금or벌금데이',
    description: `황금or벌금데이
• 상금: 1등(3돈), 3등(2돈), 5등(1돈) / 총 480만원
• 벌금: 2등(200만원), 4등(100만원), 6등(50만원)
• 벌칙: 하위권 3명 옥상에서 아이스버킷 챌린지!`,
    unit: 'excel',
    event_type: 'event',
    start_datetime: '2026-01-22T20:00:00+09:00',
    end_datetime: '2026-01-22T23:00:00+09:00',
    location: '팬더티비',
    is_all_day: false,
    color: '#FFD700',
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 3,
    title: '[RG FAMILY] 시즌1 / 03화 - 퇴근전쟁',
    description: `퇴근전쟁
• 각 개인별 할당 하트 채우면 즉시 퇴근!`,
    unit: 'excel',
    event_type: 'event',
    start_datetime: '2026-01-24T20:00:00+09:00',
    end_datetime: '2026-01-24T23:00:00+09:00',
    location: '팬더티비',
    is_all_day: false,
    color: '#4CAF50',
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 4,
    title: '[RG FAMILY] 시즌1 / 04화 - 난사데이',
    description: `난사데이
• 메이저팀(1~6등): 이기면 기여도 10만점 or 상금 100만원 택1, 지면 기여도 10만점 뺏기기 or 벌금 100만원
• 마이너팀(7등 이하): 이기면 기여도 5만점 or 상금 50만원 택1, 지면 기여도 5만점 뺏기기 or 벌금 50만원`,
    unit: 'excel',
    event_type: 'event',
    start_datetime: '2026-01-27T20:00:00+09:00',
    end_datetime: '2026-01-27T23:00:00+09:00',
    location: '팬더티비',
    is_all_day: false,
    color: '#FF5722',
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 5,
    title: '[RG FAMILY] 시즌1 / 07화 - 뉴시그데이 & 중간직급전',
    description: `뉴시그데이 & 중간직급전
• 뉴시그 데이: 자신의 뉴시그를 가장 많이 받은 사람 1~3위까지 혜택!
  - 1위: 뉴시그 등록, 만개 개인시그 등록, 기여도 10만점
  - 2위: 뉴시그 등록, 기여도 7만점
  - 3위: 기여도 5만점
• 중간직급전:
  - 자리 유지: 기여도 3만점
  - 승진: 등수당 기여도 5만점
  - 강등: 기여도 -5만점`,
    unit: 'excel',
    event_type: 'event',
    start_datetime: '2026-02-03T20:00:00+09:00',
    end_datetime: '2026-02-03T23:00:00+09:00',
    location: '팬더티비',
    is_all_day: false,
    color: '#9C27B0',
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 6,
    title: '[RG FAMILY] 시즌1 / 11화 - 용병 데이 2',
    description: `용병 데이 2
• 자신의 친구 비제이가 받은 하트점수의 50%를 기여도로 획득
• 1등팀: 상금 2,000,000원
• 2등팀: 상금 1,000,000원
• 3등팀: 상금 500,000원`,
    unit: 'excel',
    event_type: 'event',
    start_datetime: '2026-02-12T20:00:00+09:00',
    end_datetime: '2026-02-12T23:00:00+09:00',
    location: '팬더티비',
    is_all_day: false,
    color: '#2196F3',
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 7,
    title: '[RG FAMILY] 시즌1 / 12화 - 설날특집 도파민데이',
    description: `설날특집 도파민데이
• 일반 시그(777~9999) 1개당 룰렛으로 기여도 획득
• 배율: 꽝, 2배, 3배, 4배 (만수르 이상은 꽝 없음)
• 도파민 시그: 1천개대, 3천개대, 5천개대, 만개대
• 당첨자가 누적된 기여도 전액 획득!

※ 콘텐츠 종료 후 설 연휴 휴방 공지
※ 팀데스매치 의상 준비 안내`,
    unit: 'excel',
    event_type: 'event',
    start_datetime: '2026-02-14T20:00:00+09:00',
    end_datetime: '2026-02-14T23:00:00+09:00',
    location: '팬더티비',
    is_all_day: false,
    color: '#E91E63',
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
  },

  // ===== 휴방/공휴일 =====
  {
    id: 8,
    title: '설 연휴 휴방',
    description: '설날 연휴 기간 휴방입니다.',
    unit: null,
    event_type: '休',
    start_datetime: '2026-02-16T00:00:00+09:00',
    end_datetime: '2026-02-17T23:59:59+09:00',
    location: null,
    is_all_day: true,
    color: '#9E9E9E',
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 9,
    title: '설 연휴 휴방',
    description: '설날 연휴 기간 휴방입니다.',
    unit: null,
    event_type: '休',
    start_datetime: '2026-02-17T00:00:00+09:00',
    end_datetime: '2026-02-17T23:59:59+09:00',
    location: null,
    is_all_day: true,
    color: '#9E9E9E',
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
  },
]
