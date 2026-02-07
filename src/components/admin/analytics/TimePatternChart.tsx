'use client'

import { useState } from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import type { TimePatternData } from '@/lib/actions/analytics'
import { ChartContainer, ChartTooltip, CHART_THEME, formatChartNumber } from './charts/RechartsTheme'
import styles from './TimePatternChart.module.css'

interface TimePatternChartProps {
  timePattern: TimePatternData[]
  isLoading: boolean
  onRefresh: () => Promise<void>
}

export function TimePatternChart({ timePattern, isLoading, onRefresh }: TimePatternChartProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'hearts' | 'count'>('hearts')

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setIsRefreshing(false)
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Loader2 size={32} className={styles.spinner} />
        <span>데이터를 불러오는 중...</span>
      </div>
    )
  }

  if (timePattern.length === 0) {
    return (
      <div className={styles.empty}>
        <p>시간대별 데이터가 없습니다.</p>
        <p className={styles.subtext}>상세 후원 데이터가 있는 에피소드를 선택해주세요.</p>
      </div>
    )
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return '12AM'
    if (hour < 12) return `${hour}AM`
    if (hour === 12) return '12PM'
    return `${hour - 12}PM`
  }

  const formatNumber = (num: number) => num.toLocaleString()

  const peakHour = [...timePattern].sort((a, b) =>
    viewMode === 'hearts'
      ? b.total_hearts - a.total_hearts
      : b.donation_count - a.donation_count
  )[0]

  const maxVal = Math.max(
    ...timePattern.map(d => viewMode === 'hearts' ? d.total_hearts : d.donation_count)
  )

  const chartData = timePattern.map(d => ({
    hour: formatHour(d.hour),
    hearts: d.total_hearts,
    count: d.donation_count,
    intensity: maxVal > 0 ? (viewMode === 'hearts' ? d.total_hearts : d.donation_count) / maxVal : 0,
    isPeak: d.hour === peakHour?.hour,
  }))

  const getBarColor = (intensity: number, isPeak: boolean) => {
    if (isPeak) return '#fd68ba'
    const alpha = 0.2 + intensity * 0.6
    return `rgba(59, 130, 246, ${alpha})`
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>시간대별 후원 패턴</h3>
        <div className={styles.controls}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.toggleBtn} ${viewMode === 'hearts' ? styles.active : ''}`}
              onClick={() => setViewMode('hearts')}
            >
              하트
            </button>
            <button
              className={`${styles.toggleBtn} ${viewMode === 'count' ? styles.active : ''}`}
              onClick={() => setViewMode('count')}
            >
              건수
            </button>
          </div>
          <button className={styles.refreshBtn} onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw size={16} className={isRefreshing ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {peakHour && (
        <div className={styles.peakInfo}>
          <span className={styles.peakLabel}>피크 시간대</span>
          <span className={styles.peakValue}>{formatHour(peakHour.hour)}</span>
          <span className={styles.peakDetail}>
            ({viewMode === 'hearts'
              ? `${formatNumber(peakHour.total_hearts)} 하트`
              : `${formatNumber(peakHour.donation_count)}건`
            })
          </span>
        </div>
      )}

      <ChartContainer height={400}>
        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid {...CHART_THEME.grid} />
          <XAxis dataKey="hour" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick, fontSize: 11 }} interval={1} />
          <YAxis yAxisId="left" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} tickFormatter={formatChartNumber} />
          <YAxis yAxisId="right" orientation="right" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} tickFormatter={(v: number) => `${v}건`} />
          <ChartTooltip
            valueFormatter={(v, name) => name === '하트' ? `${v.toLocaleString()} 하트` : `${v.toLocaleString()}건`}
          />
          {viewMode === 'hearts' ? (
            <Bar yAxisId="left" dataKey="hearts" name="하트" radius={[4, 4, 0, 0]} maxBarSize={24}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={getBarColor(entry.intensity, entry.isPeak)} />
              ))}
            </Bar>
          ) : (
            <Bar yAxisId="right" dataKey="count" name="건수" radius={[4, 4, 0, 0]} maxBarSize={24}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={getBarColor(entry.intensity, entry.isPeak)} />
              ))}
            </Bar>
          )}
        </BarChart>
      </ChartContainer>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={styles.legendBar} />
          <span>일반 시간대</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendBar} ${styles.peakLegend}`} />
          <span>피크 시간대</span>
        </div>
      </div>
    </div>
  )
}
