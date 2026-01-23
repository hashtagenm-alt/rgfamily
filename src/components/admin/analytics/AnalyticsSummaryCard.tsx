'use client'

import { Heart, Users, TrendingUp, Award, Loader2 } from 'lucide-react'
import type { AnalyticsSummary, BjStats } from '@/lib/actions/analytics'
import styles from './AnalyticsSummaryCard.module.css'

interface AnalyticsSummaryCardProps {
  summary: AnalyticsSummary | null
  bjStats: BjStats[]
  isLoading: boolean
}

export function AnalyticsSummaryCard({ summary, bjStats, isLoading }: AnalyticsSummaryCardProps) {
  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Loader2 size={32} className={styles.spinner} />
        <span>데이터를 불러오는 중...</span>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className={styles.empty}>
        <p>분석할 데이터가 없습니다.</p>
        <p className={styles.subtext}>시즌과 에피소드를 선택해주세요.</p>
      </div>
    )
  }

  const formatNumber = (num: number) => num.toLocaleString()

  // 전체 BJ (출연자 전체)
  const allBjs = bjStats

  return (
    <div className={styles.container}>
      {/* 요약 카드들 */}
      <div className={styles.summaryGrid}>
        <div className={styles.card}>
          <div className={styles.cardIcon} style={{ background: 'rgba(253, 104, 186, 0.1)' }}>
            <Heart size={24} color="#fd68ba" />
          </div>
          <div className={styles.cardContent}>
            <span className={styles.cardLabel}>총 후원 하트</span>
            <span className={styles.cardValue}>{formatNumber(summary.total_hearts)}</span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardIcon} style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
            <TrendingUp size={24} color="#3b82f6" />
          </div>
          <div className={styles.cardContent}>
            <span className={styles.cardLabel}>총 후원 건수</span>
            <span className={styles.cardValue}>{formatNumber(summary.total_donations)}</span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardIcon} style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
            <Users size={24} color="#10b981" />
          </div>
          <div className={styles.cardContent}>
            <span className={styles.cardLabel}>후원자 수</span>
            <span className={styles.cardValue}>{formatNumber(summary.unique_donors)}</span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardIcon} style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
            <Award size={24} color="#f59e0b" />
          </div>
          <div className={styles.cardContent}>
            <span className={styles.cardLabel}>평균 후원</span>
            <span className={styles.cardValue}>{formatNumber(summary.avg_donation)}</span>
          </div>
        </div>
      </div>

      {/* 상위 정보 */}
      <div className={styles.highlights}>
        <div className={styles.highlightCard}>
          <h3 className={styles.highlightTitle}>TOP 후원자</h3>
          <span className={styles.highlightValue}>{summary.top_donor}</span>
        </div>
        <div className={styles.highlightCard}>
          <h3 className={styles.highlightTitle}>TOP BJ</h3>
          <span className={styles.highlightValue}>{summary.top_bj}</span>
        </div>
      </div>

      {/* 전체 BJ 후원 분포 */}
      {allBjs.length > 0 && (
        <div className={styles.topBjSection}>
          <h3 className={styles.sectionTitle}>BJ별 후원 분포 (전체 출연자)</h3>
          <div className={styles.barChart}>
            {allBjs.map((bj, index) => {
              const maxHearts = allBjs[0]?.total_hearts || 1
              const percentage = (bj.total_hearts / maxHearts) * 100
              return (
                <div key={bj.bj_name} className={styles.barItem}>
                  <div className={styles.barLabel}>
                    <span className={styles.barRank}>{index + 1}</span>
                    <span className={styles.barName}>{bj.bj_name}</span>
                  </div>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className={styles.barValue}>{formatNumber(bj.total_hearts)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
