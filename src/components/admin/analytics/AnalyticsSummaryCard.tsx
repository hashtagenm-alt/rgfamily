'use client'

import { useState, useMemo } from 'react'
import { Heart, Users, TrendingUp, Award, Loader2, ArrowUpRight, ArrowDownRight, ChevronDown } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import type { AnalyticsSummary, BjStats, EpisodeTrendData } from '@/lib/actions/analytics'
import { ChartContainer, ChartTooltip, CHART_COLORS, CHART_THEME, formatChartNumber } from './charts/RechartsTheme'
import styles from './AnalyticsSummaryCard.module.css'

interface AnalyticsSummaryCardProps {
  summary: AnalyticsSummary | null
  bjStats: BjStats[]
  episodeTrend: EpisodeTrendData[]
  isLoading: boolean
}

function DeltaBadge({ value }: { value: number | undefined }) {
  if (value === undefined || value === null) return null
  const isPositive = value > 0
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`${styles.delta} ${isPositive ? styles.deltaUp : styles.deltaDown}`}>
      <Icon size={14} />
      {Math.abs(value)}%
    </span>
  )
}

function Sparkline({ data, color }: { data: { v: number }[]; color: string }) {
  if (data.length < 2) return null
  return (
    <div className={styles.sparkline}>
      <LineChart width={100} height={40} data={data}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </div>
  )
}

const BJ_SHOW_COUNT = 5 // 기본 표시 BJ 수


export function AnalyticsSummaryCard({ summary, bjStats, episodeTrend, isLoading }: AnalyticsSummaryCardProps) {
  const [showAllBj, setShowAllBj] = useState(false)

  const deltas = useMemo(() => {
    if (episodeTrend.length < 2) return null
    const last = episodeTrend[episodeTrend.length - 1]
    const prev = episodeTrend[episodeTrend.length - 2]

    const calc = (a: number, b: number) => b > 0 ? Math.round(((a - b) / b) * 100) : 0

    return {
      heartsDelta: calc(last.total_hearts, prev.total_hearts),
      donorsDelta: calc(last.donor_count, prev.donor_count),
      avgDelta: calc(last.avg_donation, prev.avg_donation),
    }
  }, [episodeTrend])

  const insights = useMemo(() => {
    const items: string[] = []
    if (episodeTrend.length >= 2) {
      const last = episodeTrend[episodeTrend.length - 1]
      const prev = episodeTrend[episodeTrend.length - 2]

      if (last.total_hearts > prev.total_hearts) {
        const pct = Math.round(((last.total_hearts - prev.total_hearts) / prev.total_hearts) * 100)
        items.push(`${last.episode_number}화 후원이 전회차 대비 ${pct}% 증가`)
      } else if (last.total_hearts < prev.total_hearts) {
        const pct = Math.round(((prev.total_hearts - last.total_hearts) / prev.total_hearts) * 100)
        items.push(`${last.episode_number}화 후원이 전회차 대비 ${pct}% 감소`)
      }

      if (last.new_donors > 0) items.push(`신규 후원자 ${last.new_donors}명 유입`)
      if (last.returning_donors > 0) {
        const retRate = Math.round((last.returning_donors / last.donor_count) * 100)
        items.push(`재참여율 ${retRate}% (${last.returning_donors}명)`)
      }
    }

    if (bjStats.length >= 2) {
      const top = bjStats[0]
      const totalHearts = bjStats.reduce((s, b) => s + b.total_hearts, 0)
      const pct = Math.round((top.total_hearts / totalHearts) * 100)
      items.push(`${top.bj_name} BJ가 전체 후원의 ${pct}% 차지`)
    }

    return items
  }, [episodeTrend, bjStats])

  const sparkHearts = useMemo(() => episodeTrend.map(e => ({ v: e.total_hearts })), [episodeTrend])
  const sparkDonors = useMemo(() => episodeTrend.map(e => ({ v: e.donor_count })), [episodeTrend])
  const sparkAvg = useMemo(() => episodeTrend.map(e => ({ v: e.avg_donation })), [episodeTrend])

  const bjBarData = useMemo(() =>
    bjStats.map(b => ({ name: b.bj_name, hearts: b.total_hearts })), [bjStats])

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

  return (
    <div className={styles.container}>
      {/* KPI 카드 */}
      <div className={styles.summaryGrid}>
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.cardIcon} style={{ background: 'rgba(253, 104, 186, 0.1)' }}>
              <Heart size={24} color="#fd68ba" />
            </div>
            <Sparkline data={sparkHearts} color="#fd68ba" />
          </div>
          <div className={styles.cardContent}>
            <span className={styles.cardLabel}>총 후원 하트</span>
            <div className={styles.cardValueRow}>
              <span className={styles.cardValue} style={{ color: '#fd68ba' }}>{formatNumber(summary.total_hearts)}</span>
              <DeltaBadge value={deltas?.heartsDelta} />
            </div>
            <span className={styles.cardDesc}>선택한 범위 내 전체 후원 하트 합계</span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.cardIcon} style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
              <TrendingUp size={24} color="#3b82f6" />
            </div>
          </div>
          <div className={styles.cardContent}>
            <span className={styles.cardLabel}>총 후원 건수</span>
            <div className={styles.cardValueRow}>
              <span className={styles.cardValue} style={{ color: '#3b82f6' }}>{formatNumber(summary.total_donations)}</span>
            </div>
            <span className={styles.cardDesc}>개별 후원 횟수의 합계</span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.cardIcon} style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
              <Users size={24} color="#10b981" />
            </div>
            <Sparkline data={sparkDonors} color="#10b981" />
          </div>
          <div className={styles.cardContent}>
            <span className={styles.cardLabel}>후원자 수</span>
            <div className={styles.cardValueRow}>
              <span className={styles.cardValue} style={{ color: '#10b981' }}>{formatNumber(summary.unique_donors)}</span>
              <DeltaBadge value={deltas?.donorsDelta} />
            </div>
            <span className={styles.cardDesc}>중복 제거된 고유 후원자 수</span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.cardIcon} style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
              <Award size={24} color="#f59e0b" />
            </div>
            <Sparkline data={sparkAvg} color="#f59e0b" />
          </div>
          <div className={styles.cardContent}>
            <span className={styles.cardLabel}>평균 후원</span>
            <div className={styles.cardValueRow}>
              <span className={styles.cardValue} style={{ color: '#f59e0b' }}>{formatNumber(summary.avg_donation)}</span>
              <DeltaBadge value={deltas?.avgDelta} />
            </div>
            <span className={styles.cardDesc}>후원 1건당 평균 하트</span>
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

      {/* Quick Insights */}
      {insights.length > 0 && (
        <div className={styles.insightsSection}>
          <h3 className={styles.sectionTitle}>주요 인사이트</h3>
          <div className={styles.insightsList}>
            {insights.map((insight, i) => (
              <div key={i} className={styles.insightItem}>
                <span className={styles.insightBullet} />
                <span>{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BJ 후원 분포 - 상위 N명 + 펼치기 */}
      {bjBarData.length > 0 && (() => {
        const visibleData = showAllBj ? bjBarData : bjBarData.slice(0, BJ_SHOW_COUNT)
        const hasMore = bjBarData.length > BJ_SHOW_COUNT

        return (
          <div className={styles.section}>
            <ChartContainer title={`BJ별 후원 분포 (${showAllBj ? '전체' : `상위 ${BJ_SHOW_COUNT}명`})`} height={Math.max(200, visibleData.length * 36)}>
              <BarChart data={visibleData} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                <CartesianGrid {...CHART_THEME.grid} horizontal={false} />
                <XAxis type="number" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} tickFormatter={formatChartNumber} />
                <YAxis type="category" dataKey="name" width={70} {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick, fontSize: 13 }} />
                <ChartTooltip valueFormatter={(v) => `${v.toLocaleString()} 하트`} />
                <Bar dataKey="hearts" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {visibleData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            {hasMore && (
              <button
                className={styles.expandBtn}
                onClick={() => setShowAllBj(!showAllBj)}
              >
                <ChevronDown size={14} style={{ transform: showAllBj ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                {showAllBj ? '접기' : `나머지 ${bjBarData.length - BJ_SHOW_COUNT}명 더보기`}
              </button>
            )}
          </div>
        )
      })()}
    </div>
  )
}
