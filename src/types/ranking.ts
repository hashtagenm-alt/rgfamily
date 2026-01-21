/**
 * 랭킹 타입
 *
 * 후원 랭킹 관련 타입 정의
 */

/** 랭킹 아이템 */
export interface RankingItem {
  rank: number
  donorId: string | null
  donorName: string
  avatarUrl: string | null
  totalAmount: number
  donationCount?: number      // 후원 횟수
  messageCount?: number       // 메시지 수
  lastDonationDate?: string   // 마지막 후원 날짜
  seasonId?: number
  seasonName?: string
}

/** 명예의 전당 항목 - 포디움 달성 기록 */
export interface HallOfFameEntry {
  profileId: string
  nickname: string
  avatarUrl: string | null
  rank: number
  seasonId: number
  seasonName: string
  episodeId: number | null
  episodeTitle: string | null
  episodeNumber: number | null
  achievedAt: string
}

/** 시즌별 명예의 전당 데이터 */
export interface HallOfFameSeasonData {
  season: {
    id: number
    name: string
    isActive: boolean
    startDate: string
    endDate: string | null
  }
  entries: HallOfFameEntry[]
}

/** 명예의 전당 전체 데이터 */
export interface HallOfFameData {
  totalAchievers: number       // 역대 포디움 달성자 수 (중복 제거)
  totalEpisodes: number        // 진행된 직급전 수
  seasons: HallOfFameSeasonData[]
}
