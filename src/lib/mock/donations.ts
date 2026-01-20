/**
 * Mock Donations Data - Expanded for realistic service
 * 후원 내역 (하트 단위) - 실제 서비스 대응용 확장 데이터
 */

import type { Donation } from '@/types/database'
import { mockEpisodes } from './episodes'

// 후원자 이름 풀 (50명) - Top 10은 실제 랭킹 닉네임
const donorNames = [
  // Top 10 실제 닉네임 (닉네임만, 아이디 제외)
  '미키', '미드', '농심육개장라면', '[RG]✨린아의발굴™', '❥CaNnOt',
  '태린공주❤️줄여보자', '⭐건빵이미래쥐', '[RG]린아✨여행™', '가윤이꼬❤️털이', '언제나♬',
  // 11위 이하 (랜덤)
  '러브앤조이', '스타라이트', '팬심가득', '응원단장', '행복전도사',
  '사랑의하트', '빛나는별', '달빛천사', '은하수', '무지개빛',
  '햇살가득', '꿈꾸는별', '하늘빛', '바다향기', '산들바람',
  '봄날의꽃', '여름밤꿈', '가을단풍', '겨울눈꽃', '사계절',
  '황금날개', '은빛날개', '청동날개', '다이아몬드', '에메랄드',
  '루비하트', '사파이어', '진주빛', '오팔빛깔', '자수정',
  '달나라토끼', '별똥별', '유성우', '은하계', '우주탐험',
  '판타지아', '드림캐처', '럭키스타', '매직걸', '원더풀'
]

// 해당 시즌의 에피소드 중 날짜에 맞는 에피소드 찾기
function findEpisodeForDate(seasonId: number, donationDate: Date): number | null {
  const seasonEpisodes = mockEpisodes
    .filter(ep => ep.season_id === seasonId)
    .sort((a, b) => new Date(a.broadcast_date).getTime() - new Date(b.broadcast_date).getTime())

  // 가장 가까운 이전 에피소드 찾기
  for (let i = seasonEpisodes.length - 1; i >= 0; i--) {
    const epDate = new Date(seasonEpisodes[i].broadcast_date)
    if (epDate <= donationDate) {
      return seasonEpisodes[i].id
    }
  }

  // 첫 에피소드보다 이전이면 첫 에피소드에 배정
  return seasonEpisodes.length > 0 ? seasonEpisodes[0].id : null
}

// 시즌별 후원 데이터 생성기
function generateSeasonDonations(
  seasonId: number,
  baseId: number,
  donorCount: number,
  dateRange: { start: string; end: string }
): Donation[] {
  const donations: Donation[] = []
  const startDate = new Date(dateRange.start)
  const endDate = new Date(dateRange.end)

  // 각 시즌의 탑 랭커 금액 기준점
  const seasonMaxAmounts: Record<number, number> = {
    1: 180000,  // 시즌1: 18만 하트
    2: 250000,  // 시즌2: 25만 하트
    3: 320000,  // 시즌3: 32만 하트
    4: 450000,  // 시즌4: 45만 하트 (현재 진행중)
  }

  const maxAmount = seasonMaxAmounts[seasonId] || 200000

  // 선택된 후원자들에게 랭킹별 금액 분배
  const shuffledDonors = [...donorNames].sort(() => Math.random() - 0.5).slice(0, donorCount)

  shuffledDonors.forEach((donorName, index) => {
    const rank = index + 1
    const donorId = `user-${rank}`

    // 랭킹에 따른 금액 계산 (1등은 최대, 50등은 최소)
    const rankFactor = Math.pow(0.92, rank - 1) // 지수 감소
    const baseAmount = Math.floor(maxAmount * rankFactor * (0.9 + Math.random() * 0.2))

    // 유닛 배정 (Excel vs Crew 비율 약 6:4)
    const unit = Math.random() > 0.4 ? 'excel' : 'crew'

    // 3-8개의 후원 내역으로 분산
    const donationCount = Math.floor(Math.random() * 6) + 3
    let remainingAmount = baseAmount

    for (let i = 0; i < donationCount && remainingAmount > 0; i++) {
      const isLast = i === donationCount - 1
      const donationAmount = isLast
        ? remainingAmount
        : Math.floor(remainingAmount * (0.15 + Math.random() * 0.35))

      remainingAmount -= donationAmount

      // 랜덤 날짜 생성
      const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
      const donationDate = new Date(randomTime)

      // 후원 날짜에 맞는 에피소드 찾기
      const episodeId = findEpisodeForDate(seasonId, donationDate)

      // 메시지 (30% 확률로 포함)
      const messages = [
        '응원합니다!', '화이팅!', '최고에요!', '오늘도 수고하셨어요',
        '항상 감사해요', '사랑해요', '영원한 팬이에요', null, null, null
      ]
      const message = messages[Math.floor(Math.random() * messages.length)]

      donations.push({
        id: baseId++,
        donor_id: donorId,
        donor_name: donorName,
        amount: donationAmount,
        season_id: seasonId,
        episode_id: episodeId,
        unit: unit as 'excel' | 'crew',
        message,
        created_at: donationDate.toISOString()
      })
    }
  })

  return donations
}

// 시즌 1 데이터 (2024.01 ~ 2024.03) - 30명
const season1Donations = generateSeasonDonations(1, 1, 30, {
  start: '2024-01-01',
  end: '2024-03-31'
})

// 시즌 2 데이터 (2024.04 ~ 2024.06) - 35명
const season2Donations = generateSeasonDonations(2, 200, 35, {
  start: '2024-04-01',
  end: '2024-06-30'
})

// 시즌 3 데이터 (2024.07 ~ 2024.09) - 40명
const season3Donations = generateSeasonDonations(3, 400, 40, {
  start: '2024-07-01',
  end: '2024-09-30'
})

// 시즌 4 데이터 (2024.10 ~ 현재) - 50명 (진행중)
const season4Donations = generateSeasonDonations(4, 600, 50, {
  start: '2024-10-01',
  end: '2025-12-31'
})

// 모든 후원 데이터 합치기
export const mockDonations: Donation[] = [
  ...season1Donations,
  ...season2Donations,
  ...season3Donations,
  ...season4Donations
].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

// 랭킹 계산용 집계 함수
export function aggregateDonationsByDonor(seasonId?: number) {
  const filtered = seasonId
    ? mockDonations.filter(d => d.season_id === seasonId)
    : mockDonations

  const aggregated = filtered.reduce((acc, donation) => {
    const key = donation.donor_name
    if (!acc[key]) {
      acc[key] = {
        donor_id: donation.donor_id || '',
        donor_name: donation.donor_name,
        total_amount: 0,
        unit: donation.unit,
        donation_count: 0
      }
    }
    acc[key].total_amount += donation.amount
    acc[key].donation_count++
    return acc
  }, {} as Record<string, { donor_id: string; donor_name: string; total_amount: number; unit: string | null; donation_count: number }>)

  return Object.values(aggregated)
    .sort((a, b) => b.total_amount - a.total_amount)
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }))
}
