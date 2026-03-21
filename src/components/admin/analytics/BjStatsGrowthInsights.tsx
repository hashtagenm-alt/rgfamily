'use client'

import { Sparkles, TrendingUp, TrendingDown } from 'lucide-react'
import styles from './BjStatsTable.module.css'

interface GrowthEntry {
  name: string
  growth: number
  consistency: number
  momentum: number
}

interface GrowthInsightsData {
  growing: GrowthEntry[]
  declining: GrowthEntry[]
}

interface NotableAlert {
  bj_name: string
  donors: string[]
}

interface BjStatsGrowthInsightsProps {
  growthInsights: GrowthInsightsData
  notableAlerts: NotableAlert[]
}

export function BjStatsGrowthInsights({ growthInsights, notableAlerts }: BjStatsGrowthInsightsProps) {
  return (
    <>
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
    </>
  )
}
