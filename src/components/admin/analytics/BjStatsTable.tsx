'use client'

import { useState, useMemo, Fragment } from 'react'
import { RefreshCw, Loader2, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react'
import type { BjStats, BjEpisodeTrendData, BjDetailedStats, BjInsightsData, BjAffinityData, BjInsightEntry } from '@/lib/actions/analytics'
import { BjStatsGrowthInsights } from './BjStatsGrowthInsights'
import { BjStatsDetailPanel } from './BjStatsDetailPanel'
import styles from './BjStatsTable.module.css'

interface BjStatsTableProps {
  bjStats: BjStats[]
  bjEpisodeTrend: BjEpisodeTrendData[]
  bjDetailedStats: BjDetailedStats[]
  isBjDetailedStatsLoading: boolean
  isLoading: boolean
  onRefresh: () => Promise<void>
  bjInsights?: BjInsightsData | null
  bjAffinity?: BjAffinityData | null
  isBjInsightsLoading?: boolean
}

type SortField = 'total_hearts' | 'donation_count' | 'unique_donors' | 'avg_donation' | 'growth'
type SortDirection = 'asc' | 'desc'

// 성장 인사이트: 정식 BJ 멤버만 (용병/탈퇴 멤버 제외)
// RG_family, 린아, 가애는 대표/진행자라 성장률 비교 부적합
const ACTIVE_BJ_MEMBERS = new Set([
  '가윤', '설윤', '손밍', '월아', '채은', '청아', '퀸로니',
  '한백설', '한세아', '해린', '홍서하',
])

export function BjStatsTable({ bjStats, bjEpisodeTrend, bjDetailedStats, isBjDetailedStatsLoading, isLoading, onRefresh, bjInsights, bjAffinity, isBjInsightsLoading }: BjStatsTableProps) {
  const [sortField, setSortField] = useState<SortField>('total_hearts')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [expandedBj, setExpandedBj] = useState<string | null>(null)

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

  // 모든 BJ의 성장률: growth_metrics 우선, 없으면 에피소드 트렌드로 계산
  const bjGrowthMap = useMemo(() => {
    const map: Record<string, { rate: number | null; consistency: number | null; momentum: number | null }> = {}
    for (const bj of bjStats) {
      const detail = bjDetailedStats.find(d => d.bj_name === bj.bj_name)
      if (detail?.growth_metrics) {
        map[bj.bj_name] = {
          rate: detail.growth_metrics.growth_rate,
          consistency: detail.growth_metrics.consistency,
          momentum: detail.growth_metrics.recent_momentum,
        }
      } else {
        map[bj.bj_name] = { rate: null, consistency: null, momentum: null }
      }
    }
    return map
  }, [bjStats, bjDetailedStats])

  const bjInsightsMap = useMemo(() => {
    if (!bjInsights?.entries) return new Map<string, BjInsightEntry>()
    const map = new Map<string, BjInsightEntry>()
    for (const entry of bjInsights.entries) {
      map.set(entry.bj_name, entry)
    }
    return map
  }, [bjInsights])

  const sortedData = useMemo(() => {
    return [...bjStats].sort((a, b) => {
      if (sortField === 'growth') {
        const aVal = bjGrowthMap[a.bj_name]?.rate ?? -9999
        const bVal = bjGrowthMap[b.bj_name]?.rate ?? -9999
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
      const aVal = a[sortField]
      const bVal = b[sortField]
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [bjStats, sortField, sortDirection, bjGrowthMap])

  const growthInsights = useMemo(() => {
    const entries = Object.entries(bjGrowthMap)
      .filter(([name, v]) =>
        v.rate !== null &&
        ACTIVE_BJ_MEMBERS.has(name) &&
        v.rate > -100 // 중도하차 제외
      )
      .map(([name, v]) => ({
        name,
        growth: v.rate!,
        consistency: v.consistency ?? 0,
        momentum: v.momentum ?? 0,
      }))
      .sort((a, b) => b.growth - a.growth)

    const growing = entries.filter(e => e.growth > 5).slice(0, 3)
    const declining = entries.filter(e => e.growth < -5).sort((a, b) => a.growth - b.growth).slice(0, 3)

    return { growing, declining }
  }, [bjGrowthMap])

  // 신규 고액 후원자 알림
  const notableAlerts = useMemo(() => {
    const alerts: { bj_name: string; donors: string[] }[] = []
    for (const bj of bjDetailedStats) {
      if (bj.notable_new_donors.length > 0) {
        alerts.push({ bj_name: bj.bj_name, donors: bj.notable_new_donors })
      }
    }
    return alerts
  }, [bjDetailedStats])

  const formatNumber = (num: number) => num.toLocaleString()

  const renderSortIcon = (field: SortField) => {
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

  const getDetailForBj = (name: string) => bjDetailedStats.find(d => d.bj_name === name)
  const getEpisodeTrendForBj = (name: string) => bjEpisodeTrend.find(b => b.bj_name === name)

  // BJ별 에피소드 통계 요약 계산
  const getBjEpisodeSummary = (name: string) => {
    const trend = getEpisodeTrendForBj(name)
    if (!trend || trend.episodes.length === 0) return null
    const eps = trend.episodes
    const participated = eps.filter(e => e.hearts > 0)
    const peakEp = eps.reduce((max, e) => e.hearts > max.hearts ? e : max, eps[0])
    const totalHearts = eps.reduce((s, e) => s + e.hearts, 0)
    const avgPerEp = participated.length > 0 ? Math.round(totalHearts / participated.length) : 0

    // 성장률: 후반 평균 vs 전반 평균
    let growth: number | null = null
    if (eps.length >= 2) {
      const mid = Math.floor(eps.length / 2)
      const firstHalf = eps.slice(0, mid)
      const secondHalf = eps.slice(mid)
      const firstAvg = firstHalf.reduce((s, e) => s + e.hearts, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((s, e) => s + e.hearts, 0) / secondHalf.length
      if (firstAvg > 0) growth = Math.round(((secondAvg - firstAvg) / firstAvg) * 100)
    }

    return {
      peakEpisode: peakEp.episode_number,
      peakHearts: peakEp.hearts,
      participatedCount: participated.length,
      totalEpisodes: eps.length,
      avgPerEpisode: avgPerEp,
      growth,
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>BJ별 후원 현황</h3>
          <p className={styles.headerDesc}>각 BJ가 받은 후원을 비교합니다. 행을 클릭하면 상세 정보를 볼 수 있습니다.</p>
        </div>
        <button className={styles.refreshBtn} onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw size={16} className={isRefreshing ? styles.spinning : ''} />
          새로고침
        </button>
      </div>

      <BjStatsGrowthInsights
        growthInsights={growthInsights}
        notableAlerts={notableAlerts}
      />

      {/* 테이블 */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.rankCol}>#</th>
              <th className={styles.bjCol}>BJ</th>
              <th
                className={`${styles.heartsCol} ${styles.sortable} ${sortField === 'total_hearts' ? styles.active : ''}`}
                onClick={() => handleSort('total_hearts')}
              >
                총 하트 {renderSortIcon("total_hearts")}
              </th>
              <th
                className={`${styles.countCol} ${styles.sortable} ${sortField === 'donation_count' ? styles.active : ''}`}
                onClick={() => handleSort('donation_count')}
              >
                건수 {renderSortIcon("donation_count")}
              </th>
              <th
                className={`${styles.donorsCol} ${styles.sortable} ${sortField === 'unique_donors' ? styles.active : ''}`}
                onClick={() => handleSort('unique_donors')}
              >
                후원자 {renderSortIcon("unique_donors")}
              </th>
              <th
                className={`${styles.avgCol} ${styles.sortable} ${sortField === 'avg_donation' ? styles.active : ''}`}
                onClick={() => handleSort('avg_donation')}
              >
                평균 {renderSortIcon("avg_donation")}
              </th>
              <th
                className={`${styles.growthColHeader} ${styles.sortable} ${sortField === 'growth' ? styles.active : ''}`}
                onClick={() => handleSort('growth')}
              >
                성장률 {renderSortIcon("growth")}
              </th>
              <th className={styles.expandCol}></th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((bj, index) => {
              const detail = getDetailForBj(bj.bj_name)
              const isExpanded = expandedBj === bj.bj_name
              return (
                <Fragment key={bj.bj_name}>
                  <tr
                    className={isExpanded ? styles.expandedRow : ''}
                    onClick={() => {
                      setExpandedBj(isExpanded ? null : bj.bj_name)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className={styles.rankCol}>
                      <span className={`${styles.rank} ${index < 3 ? styles[`rank${index + 1}`] : ''}`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className={styles.bjName}>
                      {bj.bj_name}
                      {detail && detail.new_donor_count > 0 && (
                        <span className={styles.newCount}>+{detail.new_donor_count} 신규</span>
                      )}
                    </td>
                    <td className={styles.hearts}>{formatNumber(bj.total_hearts)}</td>
                    <td>{formatNumber(bj.donation_count)}</td>
                    <td>{formatNumber(bj.unique_donors)}</td>
                    <td>{formatNumber(bj.avg_donation)}</td>
                    <td className={styles.growthCell}>
                      {bjGrowthMap[bj.bj_name]?.rate !== null && bjGrowthMap[bj.bj_name]?.rate !== undefined ? (
                        <div className={styles.growthCellInner}>
                          <span className={`${styles.growthBadge} ${
                            bjGrowthMap[bj.bj_name]!.rate! > 5 ? styles.growthBadgeUp :
                            bjGrowthMap[bj.bj_name]!.rate! < -5 ? styles.growthBadgeDown :
                            styles.growthBadgeNeutral
                          }`}>
                            {bjGrowthMap[bj.bj_name]!.rate! > 0 ? '+' : ''}{bjGrowthMap[bj.bj_name]!.rate}%
                          </span>
                          {bjGrowthMap[bj.bj_name]!.consistency !== null && bjGrowthMap[bj.bj_name]!.consistency! > 30 && (
                            <span className={styles.consistencyDot} title={`추세 안정도 ${bjGrowthMap[bj.bj_name]!.consistency}%`}>
                              {bjGrowthMap[bj.bj_name]!.consistency! >= 60 ? '안정' : '보통'}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className={styles.growthNA}>-</span>
                      )}
                    </td>
                    <td className={styles.expandCol}>
                      <ChevronRight
                        size={16}
                        className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ''}`}
                      />
                    </td>
                  </tr>
                  {isExpanded && detail && (
                    <tr key={`${bj.bj_name}-detail`} className={styles.detailRow}>
                      <BjStatsDetailPanel
                        bjName={bj.bj_name}
                        detail={detail}
                        epTrend={getEpisodeTrendForBj(bj.bj_name)}
                        epSummary={getBjEpisodeSummary(bj.bj_name)}
                        isBjDetailedStatsLoading={isBjDetailedStatsLoading}
                        bjInsightsMap={bjInsightsMap}
                        bjInsights={bjInsights}
                        isBjInsightsLoading={isBjInsightsLoading ?? false}
                      />
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
