export interface RankingEntry {
  id: number
  rank: number
  donor_id: string | null
  donor_name: string
  total_amount: number
  source: 'season' | 'total'
  season_id?: number
  profile?: {
    id: string
    nickname: string
    avatar_url: string | null
    role: string
  } | null
}

export interface Profile {
  id: string
  nickname: string
  email: string | null
  avatar_url: string | null
  role: string
  total_donation: number
}

export type FilterType = 'all' | 'linked' | 'unlinked'
export type SourceFilter = 'all' | 'season' | 'total'
