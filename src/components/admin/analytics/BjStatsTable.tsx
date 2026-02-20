'use client'

import { useState, useMemo, Fragment } from 'react'
import { RefreshCw, Loader2, ChevronUp, ChevronDown, ChevronRight, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, BarChart, Bar } from 'recharts'
import type { BjStats, BjEpisodeTrendData, BjDetailedStats, BjDonorDetail } from '@/lib/actions/analytics'
import { ChartContainer, ChartTooltip, CHART_COLORS, CHART_THEME, formatChartNumber } from './charts/RechartsTheme'
import styles from './BjStatsTable.module.css'

interface BjStatsTableProps {
  bjStats: BjStats[]
  bjEpisodeTrend: BjEpisodeTrendData[]
  bjDetailedStats: BjDetailedStats[]
  isBjDetailedStatsLoading: boolean
  isLoading: boolean
  onRefresh: () => Promise<void>
}

type SortField = 'total_hearts' | 'donation_count' | 'unique_donors' | 'avg_donation'
type SortDirection = 'asc' | 'desc'

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp size={14} color="#10b981" />
  if (trend === 'down') return <TrendingDown size={14} color="#ef4444" />
  return <Minus size={14} color="#6b7280" />
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

function DonorRow({ donor }: { donor: BjDonorDetail }) {
  return (
    <div className={styles.donorRow}>
      <span className={styles.donorName2}>
        {donor.donor_name}
        {donor.is_new && <span className={styles.newBadge}>NEW</span>}
      </span>
      <span className={styles.donorHearts}>{donor.total_hearts.toLocaleString()}</span>
      <span className={styles.donorCount}>{donor.donation_count}건</span>
      <TrendIcon trend={donor.trend} />
      <MiniSparkline data={donor.episode_amounts} />
    </div>
  )
}

export function BjStatsTable({ bjStats, bjEpisodeTrend, bjDetailedStats, isBjDetailedStatsLoading, isLoading, onRefresh }: BjStatsTableProps) {
  const [sortField, setSortField] = useState<SortField>('total_hearts')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [expandedBj, setExpandedBj] = useState<string | null>(null)
  const [selectedBjForConcentration, setSelectedBjForConcentration] = useState<string | null>(null)

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

  const pieData = useMemo(() => {
    const total = bjStats.reduce((s, b) => s + b.total_hearts, 0)
    const top7 = bjStats.slice(0, 7).map(b => ({
      name: b.bj_name,
      value: b.total_hearts,
      percent: total > 0 ? Math.round((b.total_hearts / total) * 100) : 0,
    }))
    const otherHearts = bjStats.slice(7).reduce((s, b) => s + b.total_hearts, 0)
    if (otherHearts > 0) {
      top7.push({
        name: '기타',
        value: otherHearts,
        percent: total > 0 ? Math.round((otherHearts / total) * 100) : 0,
      })
    }
    return top7
  }, [bjStats])

  const concentrationData = useMemo(() => {
    const bj = selectedBjForConcentration || expandedBj
    if (!bj) return null
    const detail = bjDetailedStats.find(d => d.bj_name === bj)
    if (!detail?.donor_concentration?.length) return null
    const otherPct = 100 - detail.donor_concentration.reduce((s, d) => s + d.percent, 0)
    const data = detail.donor_concentration.map(d => ({
      name: d.donor_name,
      value: d.hearts,
      percent: d.percent,
    }))
    if (otherPct > 0) data.push({ name: '기타', value: 0, percent: otherPct })
    return data
  }, [bjDetailedStats, selectedBjForConcentration, expandedBj])

  const lineData = useMemo(() => {
    if (bjEpisodeTrend.length === 0) return []
    const top7 = bjEpisodeTrend.slice(0, 7)
    if (top7.length === 0 || top7[0].episodes.length === 0) return []

    return top7[0].episodes.map((_, epIdx) => {
      const point: Record<string, number | string> = {
        episode: `${top7[0].episodes[epIdx].episode_number}화`,
      }
      for (const bj of top7) {
        point[bj.bj_name] = bj.episodes[epIdx]?.hearts ?? 0
      }
      return point
    })
  }, [bjEpisodeTrend])

  const top7Names = useMemo(() => bjEpisodeTrend.slice(0, 7).map(b => b.bj_name), [bjEpisodeTrend])

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

      {/* 차트 영역 */}
      <div className={styles.chartsRow}>
        {pieData.length > 0 && (
          <ChartContainer title="BJ별 하트 점유율" height={Math.max(200, pieData.length * 40)} className={styles.chartHalf}>
            <BarChart data={pieData} layout="vertical" margin={{ top: 5, right: 50, left: 10, bottom: 5 }}>
              <CartesianGrid {...CHART_THEME.grid} horizontal={false} />
              <XAxis type="number" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={80} {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick, fontSize: 13 }} />
              <ChartTooltip valueFormatter={(v) => `${v}%`} />
              <Bar dataKey="percent" name="점유율" radius={[0, 4, 4, 0]} maxBarSize={24}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}

        {concentrationData ? (
          <ChartContainer
            title={`후원 집중도: ${selectedBjForConcentration || expandedBj}`}
            subtitle="Top 10 후원자 비중"
            height={Math.max(200, concentrationData.length * 32)}
            className={styles.chartHalf}
          >
            <BarChart data={concentrationData} layout="vertical" margin={{ top: 5, right: 50, left: 10, bottom: 5 }}>
              <CartesianGrid {...CHART_THEME.grid} horizontal={false} />
              <XAxis type="number" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} tickFormatter={(v: number) => `${v}%`} />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                {...CHART_THEME.axis}
                tick={{ ...CHART_THEME.axis.tick, fontSize: 12 }}
                tickFormatter={(v: string) => v.length > 6 ? v.slice(0, 6) + '…' : v}
              />
              <ChartTooltip valueFormatter={(v) => `${v}%`} />
              <Bar dataKey="percent" name="비중" radius={[0, 4, 4, 0]} maxBarSize={24}>
                {concentrationData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : lineData.length > 0 ? (
          <ChartContainer title="BJ별 회차 추이 (상위 7)" height={300} className={styles.chartHalf}>
            <LineChart data={lineData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid {...CHART_THEME.grid} />
              <XAxis dataKey="episode" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick, fontSize: 11 }} />
              <YAxis {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} tickFormatter={formatChartNumber} />
              <ChartTooltip valueFormatter={(v) => `${v.toLocaleString()} 하트`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {top7Names.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ChartContainer>
        ) : null}
      </div>

      {/* 테이블 */}
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
                총 하트 {renderSortIcon("total_hearts")}
              </th>
              <th
                className={`${styles.sortable} ${sortField === 'donation_count' ? styles.active : ''}`}
                onClick={() => handleSort('donation_count')}
              >
                후원 건수 {renderSortIcon("donation_count")}
              </th>
              <th
                className={`${styles.sortable} ${sortField === 'unique_donors' ? styles.active : ''}`}
                onClick={() => handleSort('unique_donors')}
              >
                후원자 수 {renderSortIcon("unique_donors")}
              </th>
              <th
                className={`${styles.sortable} ${sortField === 'avg_donation' ? styles.active : ''}`}
                onClick={() => handleSort('avg_donation')}
              >
                평균 후원 {renderSortIcon("avg_donation")}
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
                      setSelectedBjForConcentration(isExpanded ? null : bj.bj_name)
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
                    <td className={styles.expandCol}>
                      <ChevronRight
                        size={16}
                        className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ''}`}
                      />
                    </td>
                  </tr>
                  {isExpanded && detail && (
                    <tr key={`${bj.bj_name}-detail`} className={styles.detailRow}>
                      <td colSpan={7}>
                        <div className={styles.detailContent}>
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
