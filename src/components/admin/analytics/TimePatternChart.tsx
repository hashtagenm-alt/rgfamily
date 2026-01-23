'use client'

import { useState } from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'
import type { TimePatternData } from '@/lib/actions/analytics'
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

  const maxValue = Math.max(
    ...timePattern.map((d) => (viewMode === 'hearts' ? d.total_hearts : d.donation_count))
  )

  const formatHour = (hour: number) => {
    if (hour === 0) return '12AM'
    if (hour < 12) return `${hour}AM`
    if (hour === 12) return '12PM'
    return `${hour - 12}PM`
  }

  const formatNumber = (num: number) => num.toLocaleString()

  // 피크 시간대 찾기
  const peakHour = [...timePattern].sort((a, b) =>
    viewMode === 'hearts'
      ? b.total_hearts - a.total_hearts
      : b.donation_count - a.donation_count
  )[0]

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
          <button
            className={styles.refreshBtn}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {/* 피크 시간대 정보 */}
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

      {/* 차트 */}
      <div className={styles.chart}>
        {timePattern.map((data) => {
          const value = viewMode === 'hearts' ? data.total_hearts : data.donation_count
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0
          const isPeak = peakHour && data.hour === peakHour.hour

          return (
            <div key={data.hour} className={styles.barWrapper}>
              <div className={styles.barContainer}>
                <div
                  className={`${styles.bar} ${isPeak ? styles.peak : ''}`}
                  style={{ height: `${percentage}%` }}
                />
              </div>
              <span className={styles.hourLabel}>{formatHour(data.hour)}</span>
              <span className={styles.barValue}>
                {viewMode === 'hearts' ? formatNumber(data.total_hearts) : data.donation_count}
              </span>
            </div>
          )
        })}
      </div>

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
