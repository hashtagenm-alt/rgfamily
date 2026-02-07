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
