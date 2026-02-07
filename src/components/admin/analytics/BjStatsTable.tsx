'use client'

import { useState, useMemo } from 'react'
import { RefreshCw, Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import type { BjStats, BjEpisodeTrendData } from '@/lib/actions/analytics'
import { ChartContainer, ChartTooltip, CHART_COLORS, CHART_THEME, formatChartNumber } from './charts/RechartsTheme'
import styles from './BjStatsTable.module.css'

interface BjStatsTableProps {
  bjStats: BjStats[]
  bjEpisodeTrend: BjEpisodeTrendData[]
  isLoading: boolean
  onRefresh: () => Promise<void>
}

type SortField = 'total_hearts' | 'donation_count' | 'unique_donors' | 'avg_donation'
type SortDirection = 'asc' | 'desc'

export function BjStatsTable({ bjStats, bjEpisodeTrend, isLoading, onRefresh }: BjStatsTableProps) {
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
        <button className={styles.refreshBtn} onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw size={16} className={isRefreshing ? styles.spinning : ''} />
          새로고침
        </button>
      </div>

      {/* 차트 영역 */}
      <div className={styles.chartsRow}>
        {pieData.length > 0 && (
          <ChartContainer title="BJ별 하트 점유율" height={300} className={styles.chartHalf}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${percent}%`}
                labelLine={false}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip valueFormatter={(v) => `${v.toLocaleString()} 하트`} />
            </PieChart>
          </ChartContainer>
        )}

        {lineData.length > 0 && (
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
        )}
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
