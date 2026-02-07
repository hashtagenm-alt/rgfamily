'use client'

import { useMemo } from 'react'
import { Loader2, UserPlus, UserCheck, Shield, AlertTriangle, UserX } from 'lucide-react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, BarChart } from 'recharts'
import type { DonorRetentionData } from '@/lib/actions/analytics'
import { ChartContainer, ChartTooltip, CHART_THEME, formatChartNumber } from './charts/RechartsTheme'
import styles from './DonorRetentionPanel.module.css'

interface DonorRetentionPanelProps {
  retention: DonorRetentionData | null
  isLoading: boolean
}

const LIFECYCLE_CONFIG = [
  { key: 'new_count', label: 'New', icon: UserPlus, color: '#10b981', desc: '최신 회차 첫 참여' },
  { key: 'active_count', label: 'Active', icon: UserCheck, color: '#3b82f6', desc: '최근 2회 이내 참여' },
  { key: 'loyal_count', label: 'Loyal', icon: Shield, color: '#8b5cf6', desc: '60% 이상 회차 참여' },
  { key: 'at_risk_count', label: 'At-risk', icon: AlertTriangle, color: '#f59e0b', desc: '참여 후 최근 불참' },
  { key: 'churned_count', label: 'Churned', icon: UserX, color: '#ef4444', desc: '1회 참여 후 이탈' },
] as const

export function DonorRetentionPanel({ retention, isLoading }: DonorRetentionPanelProps) {
  // 파레토 차트 데이터 (개별 + 누적)
  const paretoData = useMemo(() => {
    if (!retention?.pareto) return []
    return retention.pareto.map(p => ({
      name: `상위 ${p.top_percent}%`,
      hearts_percent: p.hearts_percent,
      top_percent: p.top_percent,
    }))
  }, [retention])

  // 퍼널 데이터
  const funnelData = useMemo(() => {
    if (!retention?.funnel) return []
    const maxCount = retention.funnel[0]?.count || 1
    return retention.funnel.map(f => ({
      name: f.label,
      count: f.count,
      percent: Math.round((f.count / maxCount) * 100),
    }))
  }, [retention])

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Loader2 size={32} className={styles.spinner} />
        <span>리텐션 분석 중...</span>
      </div>
    )
  }

  if (!retention) {
    return (
      <div className={styles.empty}>
        <p>후원자 리텐션 데이터가 없습니다.</p>
      </div>
    )
  }

  const lifecycle = retention.lifecycle

  return (
    <div className={styles.container}>
      {/* 라이프사이클 카드 5개 */}
      <div className={styles.lifecycleRow}>
        {LIFECYCLE_CONFIG.map(({ key, label, icon: Icon, color, desc }) => {
          const count = lifecycle[key]
          const total = lifecycle.new_count + lifecycle.active_count + lifecycle.loyal_count +
            lifecycle.at_risk_count + lifecycle.churned_count
          const pct = total > 0 ? Math.round((count / total) * 100) : 0

          return (
            <div key={key} className={styles.lifecycleCard} style={{ borderTopColor: color }}>
              <div className={styles.lifecycleHeader}>
                <Icon size={20} color={color} />
                <span className={styles.lifecycleLabel}>{label}</span>
              </div>
              <span className={styles.lifecycleCount} style={{ color }}>{count}</span>
              <span className={styles.lifecyclePct}>{pct}%</span>
              <span className={styles.lifecycleDesc}>{desc}</span>
            </div>
          )
        })}
      </div>

      {/* 코호트 히트맵 테이블 */}
      {retention.cohorts.length > 0 && (
        <div className={styles.cohortSection}>
          <h4 className={styles.sectionTitle}>코호트 리텐션 히트맵</h4>
          <p className={styles.sectionDesc}>첫 참여 회차별 리텐션율 (%, 배경색 강도 = 리텐션율)</p>
          <div className={styles.cohortTableWrapper}>
            <table className={styles.cohortTable}>
              <thead>
                <tr>
                  <th>첫 참여</th>
                  <th>인원</th>
                  {retention.cohorts[0]?.retention.map((r) => (
                    <th key={r.episode_number}>{r.episode_number}화</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {retention.cohorts.map((cohort) => (
                  <tr key={cohort.first_episode}>
                    <td className={styles.cohortLabel}>{cohort.first_episode}화</td>
                    <td className={styles.cohortCount}>{cohort.total_donors}</td>
                    {cohort.retention.map((r) => {
                      const alpha = r.rate / 100
                      const bg = r.episode_number === cohort.first_episode
                        ? `rgba(253, 104, 186, ${Math.max(alpha, 0.15)})`
                        : `rgba(59, 130, 246, ${Math.max(alpha * 0.8, 0.05)})`
                      return (
                        <td
                          key={r.episode_number}
                          className={styles.cohortCell}
                          style={{ background: bg }}
                        >
                          {r.rate}%
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 퍼널 차트 - 가로 BarChart */}
      {funnelData.length > 0 && (
        <ChartContainer title="참여 퍼널" subtitle="전체 → 다회 참여 → 전회차 참여" height={200}>
          <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 50, left: 10, bottom: 5 }}>
            <CartesianGrid {...CHART_THEME.grid} horizontal={false} />
            <XAxis type="number" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} />
            <YAxis type="category" dataKey="name" width={90} {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick, fontSize: 13 }} />
            <ChartTooltip valueFormatter={(v) => `${v}명`} />
            <Bar dataKey="count" name="후원자" fill="#fd68ba" radius={[0, 4, 4, 0]} maxBarSize={28} />
          </BarChart>
        </ChartContainer>
      )}

      {/* 파레토 차트 - ComposedChart: 개별(Bar) + 누적(Line) + 80% 참조선 */}
      {paretoData.length > 0 && (
        <ChartContainer
          title="파레토 분석"
          subtitle="상위 N% 후원자가 전체 하트의 몇 %를 차지하는지"
          height={300}
        >
          <ComposedChart data={paretoData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid {...CHART_THEME.grid} />
            <XAxis dataKey="name" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick, fontSize: 12 }} />
            <YAxis
              {...CHART_THEME.axis}
              tick={{ ...CHART_THEME.axis.tick }}
              tickFormatter={(v: number) => `${v}%`}
              domain={[0, 100]}
            />
            <ChartTooltip valueFormatter={(v) => `${v}%`} />
            <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '80%', fill: '#ef4444', fontSize: 12 }} />
            <Bar dataKey="hearts_percent" name="하트 비중" fill="#fd68ba" radius={[4, 4, 0, 0]} maxBarSize={40} fillOpacity={0.7} />
            <Line type="monotone" dataKey="hearts_percent" name="누적" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
          </ComposedChart>
        </ChartContainer>
      )}
    </div>
  )
}
