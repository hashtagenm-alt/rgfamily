'use client'

import { useState } from 'react'
import { RefreshCw, Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import type { BjStats } from '@/lib/actions/analytics'
import styles from './BjStatsTable.module.css'

interface BjStatsTableProps {
  bjStats: BjStats[]
  isLoading: boolean
  onRefresh: () => Promise<void>
}

type SortField = 'total_hearts' | 'donation_count' | 'unique_donors' | 'avg_donation'
type SortDirection = 'asc' | 'desc'

export function BjStatsTable({ bjStats, isLoading, onRefresh }: BjStatsTableProps) {
  const [sortField, setSortField] = useState<SortField>('total_hearts')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setIsRefreshing(false)
  }

  const sortedData = [...bjStats].sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
  })

  const formatNumber = (num: number) => num.toLocaleString()

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Loader2 size={32} className={styles.spinner} />
        <span>데이터를 불러오는 중...</span>
      </div>
    )
  }

  if (bjStats.length === 0) {
    return (
      <div className={styles.empty}>
        <p>BJ별 후원 데이터가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>BJ별 후원 현황</h3>
        <button
          className={styles.refreshBtn}
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={isRefreshing ? styles.spinning : ''} />
          새로고침
        </button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.rankCol}>#</th>
              <th>BJ</th>
              <th
                className={`${styles.sortable} ${sortField === 'total_hearts' ? styles.active : ''}`}
                onClick={() => handleSort('total_hearts')}
              >
                총 하트 <SortIcon field="total_hearts" />
              </th>
              <th
                className={`${styles.sortable} ${sortField === 'donation_count' ? styles.active : ''}`}
                onClick={() => handleSort('donation_count')}
              >
                후원 건수 <SortIcon field="donation_count" />
              </th>
              <th
                className={`${styles.sortable} ${sortField === 'unique_donors' ? styles.active : ''}`}
                onClick={() => handleSort('unique_donors')}
              >
                후원자 수 <SortIcon field="unique_donors" />
              </th>
              <th
                className={`${styles.sortable} ${sortField === 'avg_donation' ? styles.active : ''}`}
                onClick={() => handleSort('avg_donation')}
              >
                평균 후원 <SortIcon field="avg_donation" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((bj, index) => (
              <tr key={bj.bj_name}>
                <td className={styles.rankCol}>
                  <span className={`${styles.rank} ${index < 3 ? styles[`rank${index + 1}`] : ''}`}>
                    {index + 1}
                  </span>
                </td>
                <td className={styles.bjName}>{bj.bj_name}</td>
                <td className={styles.hearts}>{formatNumber(bj.total_hearts)}</td>
                <td>{formatNumber(bj.donation_count)}</td>
                <td>{formatNumber(bj.unique_donors)}</td>
                <td>{formatNumber(bj.avg_donation)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
