import type { Season } from '@/types/database'

export type TabType = 'season' | 'total' | 'import'

export interface SeasonRankingUI {
  id: number
  rank: number
  donorName: string
  totalAmount: number
  donationCount: number
  updatedAt: string
}

export interface TotalRankingUI {
  id: number
  rank: number
  donorName: string
  totalAmount: number
  updatedAt: string
}

export interface EpisodeOption {
  id: number
  episode_number: number
  title: string
  is_finalized: boolean
}

export interface CsvPreview {
  rowCount: number
  uniqueDonors: number
  totalHearts: number
  top5: Array<{ donor_name: string; total: number }>
  csvText: string
}

export type { Season }
