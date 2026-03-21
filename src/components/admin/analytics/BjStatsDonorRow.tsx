'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react'
import type { BjDonorDetail } from '@/lib/actions/analytics'
import styles from './BjStatsTable.module.css'

const TREND_LABELS: Record<string, string> = {
  up: '증가 (후반부 평균 > 전반부)',
  down: '감소 (후반부 평균 < 전반부 또는 최근 불참)',
  stable: '안정 (전반/후반 유사)',
}

export function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  const label = TREND_LABELS[trend] || ''
  if (trend === 'up') return <span title={label}><TrendingUp size={14} color="#10b981" /></span>
  if (trend === 'down') return <span title={label}><TrendingDown size={14} color="#ef4444" /></span>
  return <span title={label}><Minus size={14} color="#6b7280" /></span>
}

export function MiniSparkline({ data }: { data: { episode_number: number; amount: number }[] }) {
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

export function formatChangeLabel(change: number): string {
  if (change > 300) return '급증'
  if (change < -80) return '급감'
  return `${change > 0 ? '+' : ''}${change}%`
}

export function DonorRow({ donor }: { donor: BjDonorDetail }) {
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
