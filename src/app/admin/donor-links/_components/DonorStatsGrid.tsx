import { Trophy, CheckCircle, XCircle, Crown } from 'lucide-react'
import pageStyles from '../page.module.css'

interface DonorStats {
  total: number
  linked: number
  unlinked: number
  seasonLinked: number
  seasonTotal: number
  totalLinked: number
  totalTotal: number
}

interface DonorStatsGridProps {
  stats: DonorStats
}

export function DonorStatsGrid({ stats }: DonorStatsGridProps) {
  return (
    <div className={pageStyles.statsGrid}>
      <div className={pageStyles.statCard}>
        <Trophy size={20} />
        <span>전체 랭킹</span>
        <strong>{stats.total}</strong>
      </div>
      <div className={pageStyles.statCard}>
        <CheckCircle size={20} className={pageStyles.successIcon} />
        <span>연결됨</span>
        <strong>{stats.linked}</strong>
      </div>
      <div className={pageStyles.statCard}>
        <XCircle size={20} className={pageStyles.warningIcon} />
        <span>미연결</span>
        <strong>{stats.unlinked}</strong>
      </div>
      <div className={pageStyles.statCard}>
        <Crown size={20} className={pageStyles.goldIcon} />
        <span>시즌 랭킹</span>
        <strong>{stats.seasonLinked}/{stats.seasonTotal}</strong>
      </div>
    </div>
  )
}
