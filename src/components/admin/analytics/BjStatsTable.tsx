'use client'

import { useState, useMemo, Fragment } from 'react'
import { RefreshCw, Loader2, ChevronUp, ChevronDown, ChevronRight, Sparkles, TrendingUp, TrendingDown, Minus, Lightbulb } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { BjStats, BjEpisodeTrendData, BjDetailedStats, BjDonorDetail, BjGrowthMetrics } from '@/lib/actions/analytics'
import type { BjInsightsData, BjAffinityData, BjInsightEntry } from '@/lib/actions/analytics-advanced'
import { ChartContainer, ChartTooltip, CHART_COLORS, CHART_THEME, formatChartNumber } from './charts/RechartsTheme'
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

const TREND_LABELS: Record<string, string> = {
  up: '증가 (후반부 평균 > 전반부)',
  down: '감소 (후반부 평균 < 전반부 또는 최근 불참)',
  stable: '안정 (전반/후반 유사)',
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  const label = TREND_LABELS[trend] || ''
  if (trend === 'up') return <span title={label}><TrendingUp size={14} color="#10b981" /></span>
  if (trend === 'down') return <span title={label}><TrendingDown size={14} color="#ef4444" /></span>
  return <span title={label}><Minus size={14} color="#6b7280" /></span>
}

function MiniSparkline({ data }: { data: { episode_number: number; amount: number }[] }) {
  if (data.length === 0) return null
  const maxVal = Math.max(...data.map(d => d.amount), 1)
  return (
    <div className={styles.sparkline}>
      {data.map((d, i) => (
        <div
          key={i}
          className={styles.sparkBar}
          style={{ height: `${Math.max(4, (d.amount / maxVal) * 28)}px` }}
          title={`${d.episode_number}화: ${d.amount.toLocaleString()}`}
        />
      ))}
    </div>
  )
}

// 변화율을 사람이 읽기 쉽게 포맷
function formatChangeLabel(change: number): string {
  if (change > 300) return '급증'
  if (change < -80) return '급감'
  return `${change > 0 ? '+' : ''}${change}%`
}

function DonorRow({ donor }: { donor: BjDonorDetail }) {
  const [expanded, setExpanded] = useState(false)
  const eps = donor.episode_amounts
  const maxAmount = Math.max(...eps.map(e => e.amount), 1)

  // 최근 흐름: 참여 3회 이상이면 평균 기반, 2회면 클램핑, 1회면 표시 안 함
  let recentLabel: string | null = null
  let recentPositive = true
  if (eps.length >= 3) {
    const avg = donor.total_hearts / eps.length
    const last = eps[eps.length - 1].amount
    const pct = avg > 0 ? Math.round(((last - avg) / avg) * 100) : 0
    recentPositive = pct >= 0
    recentLabel = `최근 ${formatChangeLabel(pct)} (평균 대비)`
  } else if (eps.length === 2) {
    const last = eps[eps.length - 1].amount
    const prev = eps[eps.length - 2].amount
    if (prev > 0) {
      const pct = Math.round(((last - prev) / prev) * 100)
      recentPositive = pct >= 0
      recentLabel = pct > 300 || pct < -80
        ? `최근 ${formatChangeLabel(pct)}`
        : `최근 ${formatChangeLabel(pct)}`
    }
  }

  return (
    <div className={styles.donorRowWrapper}>
      <div className={styles.donorRow} onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
        <span className={styles.donorName2}>
          {donor.donor_name}
          {donor.is_new && <span className={styles.newBadge}>NEW</span>}
        </span>
        <span className={styles.donorHearts}>{donor.total_hearts.toLocaleString()}</span>
        <span className={styles.donorCount}>{donor.donation_count}건</span>
        <TrendIcon trend={donor.trend} />
        <MiniSparkline data={eps} />
        <ChevronDown size={14} className={styles.donorExpandIcon} style={{ transform: expanded ? 'rotate(180deg)' : 'none' }} />
      </div>
      {expanded && (
        <div className={styles.donorDetail}>
          <div className={styles.donorEpList}>
            {eps.map((e, i) => {
              let changeLabel: string | null = null
              let isPositive = true
              if (i === 0) {
                changeLabel = eps.length > 1 ? '첫 참여' : null
              } else {
                const prev = eps[i - 1].amount
                if (prev > 0) {
                  const pct = Math.round(((e.amount - prev) / prev) * 100)
                  isPositive = pct >= 0
                  changeLabel = formatChangeLabel(pct)
                } else {
                  changeLabel = '재참여'
                }
              }
              return (
                <div key={e.episode_number} className={styles.donorEpItem}>
                  <span className={styles.donorEpNum}>{e.episode_number}화</span>
                  <div className={styles.donorEpBar}>
                    <div
                      className={styles.donorEpBarFill}
                      style={{ width: `${Math.max(2, (e.amount / maxAmount) * 100)}%` }}
                    />
                  </div>
                  <span className={styles.donorEpAmount}>{e.amount.toLocaleString()}</span>
                  {changeLabel !== null && (
                    <span className={`${styles.donorEpChange} ${
                      changeLabel === '첫 참여' || changeLabel === '재참여'
                        ? styles.growthNeutralText
                        : isPositive ? styles.growthUp : styles.growthDown
                    }`}>
                      {changeLabel}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <div className={styles.donorEpSummary}>
            <span>참여 {eps.length}회</span>
            <span>평균 {Math.round(donor.total_hearts / eps.length).toLocaleString()}/회</span>
            {recentLabel && (
              <span className={recentPositive ? styles.growthUp : styles.growthDown}>
                {recentLabel}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

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

  // 성장 인사이트: 정식 BJ 멤버만 (용병/탈퇴 멤버 제외)
  // RG_family, 린아, 가애는 대표/진행자라 성장률 비교 부적합
  const ACTIVE_BJ_MEMBERS = new Set([
    '가윤', '설윤', '손밍', '월아', '채은', '청아', '퀸로니',
    '한백설', '한세아', '해린', '홍서하',
  ])
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

      {/* 신규 고액 후원자 알림 */}
      {notableAlerts.length > 0 && (
        <div className={styles.alertsRow}>
          {notableAlerts.map(alert => (
            <div key={alert.bj_name} className={styles.alertCard}>
              <Sparkles size={16} color="#f59e0b" />
              <span>
                <strong>{alert.bj_name}</strong>: {alert.donors.join(', ')} 신규 고액 후원
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 성장 인사이트 */}
      {(growthInsights.growing.length > 0 || growthInsights.declining.length > 0) && (
        <div className={styles.growthInsightsSection}>
          {growthInsights.growing.length > 0 && (
            <div className={styles.growthInsightCard}>
              <TrendingUp size={16} color="#10b981" />
              <span className={styles.growthInsightText}>
                <strong style={{ color: '#10b981' }}>점진적 성장</strong>{' '}
                {growthInsights.growing.map((g, i) => (
                  <span key={g.name}>
                    {i > 0 && ', '}
                    <strong>{g.name}</strong> +{g.growth}%
                    {g.consistency > 50 && <span className={styles.consistencyTag}> (꾸준히)</span>}
                  </span>
                ))}
              </span>
            </div>
          )}
          {growthInsights.declining.length > 0 && (
            <div className={styles.growthInsightCard}>
              <TrendingDown size={16} color="#ef4444" />
              <span className={styles.growthInsightText}>
                <strong style={{ color: '#ef4444' }}>하락 추세</strong>{' '}
                {growthInsights.declining.map((g, i) => (
                  <span key={g.name}>
                    {i > 0 && ', '}
                    <strong>{g.name}</strong> {g.growth}%
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>
      )}

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
                  {isExpanded && detail && (() => {
                    const epTrend = getEpisodeTrendForBj(bj.bj_name)
                    const gm = detail.growth_metrics
                    const epSummary = getBjEpisodeSummary(bj.bj_name)

                    // 차트 데이터: 실제 하트 + 추세선 + 에피소드 설명
                    const epChartData = gm?.episode_growth_line.map(e => ({
                      ep: `${e.episode_number}화`,
                      label: e.description ? `${e.episode_number}화 (${e.description})` : `${e.episode_number}화`,
                      hearts: e.actual,
                      trendLine: e.trend_line > 0 ? e.trend_line : undefined,
                    })) ?? epTrend?.episodes.map(e => ({
                      ep: `${e.episode_number}화`,
                      label: `${e.episode_number}화`,
                      hearts: e.hearts,
                      trendLine: undefined as number | undefined,
                    })) ?? []

                    return (
                      <tr key={`${bj.bj_name}-detail`} className={styles.detailRow}>
                        <td colSpan={8}>
                          <div className={styles.detailContent}>
                            {/* BJ 에피소드 요약 통계 */}
                            <div className={styles.bjSummaryRow}>
                              {epSummary && (
                                <>
                                  <div className={styles.bjSummaryStat}>
                                    <span className={styles.bjSummaryLabel}>피크 회차</span>
                                    <span className={styles.bjSummaryValue}>{epSummary.peakEpisode}화</span>
                                    <span className={styles.bjSummaryDesc}>{epSummary.peakHearts.toLocaleString()} 하트</span>
                                  </div>
                                  <div className={styles.bjSummaryStat}>
                                    <span className={styles.bjSummaryLabel}>참여율</span>
                                    <span className={styles.bjSummaryValue}>{epSummary.participatedCount}/{epSummary.totalEpisodes}</span>
                                    <span className={styles.bjSummaryDesc}>{Math.round((epSummary.participatedCount / epSummary.totalEpisodes) * 100)}% 참여</span>
                                  </div>
                                  <div className={styles.bjSummaryStat}>
                                    <span className={styles.bjSummaryLabel}>회차 평균</span>
                                    <span className={styles.bjSummaryValue}>{epSummary.avgPerEpisode.toLocaleString()}</span>
                                    <span className={styles.bjSummaryDesc}>참여 회차 기준</span>
                                  </div>
                                </>
                              )}
                              {gm && (
                                <>
                                  <div className={styles.bjSummaryStat}>
                                    <span className={styles.bjSummaryLabel}>전체 성장률</span>
                                    <span className={`${styles.bjSummaryValue} ${gm.growth_rate >= 0 ? styles.growthUp : styles.growthDown}`}>
                                      {gm.growth_rate > 0 ? '+' : ''}{gm.growth_rate}%
                                    </span>
                                    <span className={styles.bjSummaryDesc}>회차별 평균 변화</span>
                                  </div>
                                  <div className={styles.bjSummaryStat}>
                                    <span className={styles.bjSummaryLabel}>추세 안정도</span>
                                    <span className={styles.bjSummaryValue}>
                                      {gm.consistency >= 60 ? '높음' : gm.consistency >= 30 ? '보통' : '낮음'}
                                    </span>
                                    <span className={styles.bjSummaryDesc}>
                                      {gm.consistency >= 60 ? '꾸준한 흐름' : gm.consistency >= 30 ? '변동 있음' : '들쭉날쭉'}
                                    </span>
                                  </div>
                                  <div className={styles.bjSummaryStat}>
                                    <span className={styles.bjSummaryLabel}>최근 흐름</span>
                                    <span className={`${styles.bjSummaryValue} ${gm.recent_momentum >= 0 ? styles.growthUp : styles.growthDown}`}>
                                      {gm.recent_momentum > 0 ? '+' : ''}{gm.recent_momentum}%
                                    </span>
                                    <span className={styles.bjSummaryDesc}>최근 3화 vs 이전 3화</span>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* 신규 vs 기존 후원자 기여도 */}
                            {gm && (
                              <div className={styles.donorContributionRow}>
                                <div className={styles.contributionBar}>
                                  <div className={styles.contributionFillNew} style={{ width: `${gm.growth_from_new}%` }} />
                                  <div className={styles.contributionFillExisting} style={{ width: `${gm.growth_from_existing}%` }} />
                                </div>
                                <div className={styles.contributionLabels}>
                                  <span style={{ color: '#10b981' }}>새 후원자 {gm.growth_from_new}%</span>
                                  <span>회차당 평균 신규 {gm.donor_acquisition_rate}명</span>
                                  <span style={{ color: '#3b82f6' }}>단골 {gm.growth_from_existing}%</span>
                                </div>
                              </div>
                            )}

                            {/* BJ Actionable Insights */}
                            {(() => {
                              const insights = bjInsightsMap.get(bj.bj_name)
                              if (!insights && !isBjInsightsLoading) return null
                              if (isBjInsightsLoading) return (
                                <div className={styles.detailLoading}>
                                  <Loader2 size={16} className={styles.spinner} /> 인사이트 로딩 중...
                                </div>
                              )
                              if (!insights) return null
                              return (
                                <div className={styles.insightsSection}>
                                  {/* Donor Health Mini Bar */}
                                  <div className={styles.donorHealthRow}>
                                    <span className={styles.donorHealthTitle}>후원자 상태 분포</span>
                                    <div className={styles.donorHealthBar}>
                                      {insights.donor_health.growing > 0 && (
                                        <div className={styles.healthGrowing} style={{ flex: insights.donor_health.growing }} title={`증가 중 ${insights.donor_health.growing}명`} />
                                      )}
                                      {insights.donor_health.stable > 0 && (
                                        <div className={styles.healthStable} style={{ flex: insights.donor_health.stable }} title={`유지 중 ${insights.donor_health.stable}명`} />
                                      )}
                                      {insights.donor_health.declining > 0 && (
                                        <div className={styles.healthDeclining} style={{ flex: insights.donor_health.declining }} title={`줄어드는 중 ${insights.donor_health.declining}명`} />
                                      )}
                                      {insights.donor_health.at_risk > 0 && (
                                        <div className={styles.healthAtRisk} style={{ flex: insights.donor_health.at_risk }} title={`이탈 위험 ${insights.donor_health.at_risk}명`} />
                                      )}
                                    </div>
                                    <div className={styles.donorHealthLegend}>
                                      <span><span className={styles.legendDot} style={{ background: '#10b981' }} />증가 중 {insights.donor_health.growing}</span>
                                      <span><span className={styles.legendDot} style={{ background: '#3b82f6' }} />유지 중 {insights.donor_health.stable}</span>
                                      <span><span className={styles.legendDot} style={{ background: '#f59e0b' }} />줄어드는 중 {insights.donor_health.declining}</span>
                                      <span><span className={styles.legendDot} style={{ background: '#ef4444' }} />이탈 위험 {insights.donor_health.at_risk}</span>
                                    </div>
                                  </div>

                                  {/* Rank Battle Effect + Best/Worst Episode + Retention */}
                                  <div className={styles.insightMetricsRow}>
                                    <div className={styles.insightMetric}>
                                      <span className={styles.insightMetricLabel}>직급전 효과</span>
                                      <span className={`${styles.insightMetricValue} ${insights.rank_battle_effect >= 1 ? styles.growthUp : styles.growthDown}`}>
                                        {insights.rank_battle_effect > 0 ? `\u00d7${insights.rank_battle_effect.toFixed(2)}` : 'N/A'}
                                      </span>
                                      <span className={styles.insightMetricDesc}>
                                        {insights.rank_battle_effect >= 1.2 ? '직급전에 후원이 많이 늘어요' : insights.rank_battle_effect >= 1 ? '보통 수준' : '일반 방송이 더 잘 나와요'}
                                      </span>
                                    </div>
                                    <div className={styles.insightMetric}>
                                      <span className={styles.insightMetricLabel}>최고 에피소드</span>
                                      <span className={`${styles.insightMetricValue} ${styles.growthUp}`}>
                                        {insights.best_episode ? `${insights.best_episode.episode_number}화` : '-'}
                                      </span>
                                      <span className={styles.insightMetricDesc}>
                                        {insights.best_episode
                                          ? `${insights.best_episode.hearts.toLocaleString()} 하트${insights.best_episode.description ? ` (${insights.best_episode.description})` : ''}`
                                          : '데이터 부족'}
                                      </span>
                                    </div>
                                    <div className={styles.insightMetric}>
                                      <span className={styles.insightMetricLabel}>최저 에피소드</span>
                                      <span className={`${styles.insightMetricValue} ${styles.growthDown}`}>
                                        {insights.worst_episode ? `${insights.worst_episode.episode_number}화` : '-'}
                                      </span>
                                      <span className={styles.insightMetricDesc}>
                                        {insights.worst_episode
                                          ? `${insights.worst_episode.hearts.toLocaleString()} 하트${insights.worst_episode.description ? ` (${insights.worst_episode.description})` : ''}`
                                          : '데이터 부족'}
                                      </span>
                                    </div>
                                    <div className={styles.insightMetric}>
                                      <span className={styles.insightMetricLabel}>신규 후원자 정착률</span>
                                      <span className={styles.insightMetricValue}>{insights.new_donor_retention_rate}%</span>
                                      <span className={styles.insightMetricDesc}>
                                        {(() => {
                                          const globalRate = bjInsights?.global_retention_rate ?? 0
                                          if (globalRate > 0 && insights.new_donor_retention_rate >= globalRate * 1.2) return `평균(${globalRate}%)보다 우수해요`
                                          if (globalRate > 0 && insights.new_donor_retention_rate < globalRate) return `평균(${globalRate}%)보다 낮아요`
                                          return '평균 수준이에요'
                                        })()}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Korean Actionable Insights */}
                                  {insights.actionable_insights.length > 0 && (
                                    <div className={styles.actionInsightsRow}>
                                      {insights.actionable_insights.map((text, idx) => (
                                        <div key={idx} className={styles.actionInsightCard}>
                                          <Lightbulb size={14} color="#f59e0b" />
                                          <span>{text}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })()}

                            {/* BJ Affinity section removed - not actionable enough */}

                            {/* BJ 회차별 하트 차트 + 추세선 */}
                            {epChartData.length > 1 && (
                              <div className={styles.bjEpChart}>
                                <ChartContainer title="회차별 하트 흐름" height={200}>
                                  <LineChart data={epChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid {...CHART_THEME.grid} />
                                    <XAxis dataKey="ep" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick, fontSize: 11 }} />
                                    <YAxis {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} tickFormatter={formatChartNumber} />
                                    <ChartTooltip
                                      labelFormatter={(_, payload) => {
                                        const item = payload?.[0]?.payload
                                        return item?.label ?? String(_)
                                      }}
                                      valueFormatter={(v) => `${v.toLocaleString()} 하트`}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="hearts"
                                      name="하트"
                                      stroke={CHART_COLORS[0]}
                                      strokeWidth={2}
                                      dot={{ r: 4 }}
                                      activeDot={{ r: 6 }}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="trendLine"
                                      name="평균 흐름"
                                      stroke="#6b7280"
                                      strokeWidth={1.5}
                                      strokeDasharray="6 3"
                                      dot={false}
                                      connectNulls={false}
                                    />
                                  </LineChart>
                                </ChartContainer>
                              </div>
                            )}

                            <h4 className={styles.detailTitle}>Top 5 후원자</h4>
                            {isBjDetailedStatsLoading ? (
                              <div className={styles.detailLoading}>
                                <Loader2 size={16} className={styles.spinner} /> 로딩 중...
                              </div>
                            ) : (
                              <div className={styles.donorList}>
                                {detail.top_donors.slice(0, 5).map(donor => (
                                  <DonorRow key={donor.donor_name} donor={donor} />
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })()}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
