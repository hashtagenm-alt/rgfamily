'use client'

import { useMemo } from 'react'
import {
  Loader2,
  UserPlus,
  UserCheck,
  Shield,
  AlertTriangle,
  UserX,
  Lightbulb,
  Fish,
  Waves,
  Anchor,
} from 'lucide-react'
import {
  ComposedChart,
  Bar,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  BarChart,
} from 'recharts'
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

const SEGMENT_CONFIG = {
  whale: { label: '고래 (Whale)', icon: Anchor, color: '#8b5cf6', desc: '상위 10% 후원자' },
  dolphin: { label: '돌고래 (Dolphin)', icon: Waves, color: '#3b82f6', desc: '상위 10~50%' },
  minnow: { label: '물고기 (Minnow)', icon: Fish, color: '#10b981', desc: '하위 50%' },
} as const

const RISK_LABELS = {
  high: '높음',
  medium: '보통',
  low: '낮음',
} as const

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

  // 평균 후원 추이 데이터
  const avgTrendData = useMemo(() => {
    if (!retention?.avgDonationTrend) return []
    return retention.avgDonationTrend.map(t => ({
      name: `${t.episode_number}화`,
      avg_amount: t.avg_amount,
      median_amount: t.median_amount,
    }))
  }, [retention])

  // 재활성화 데이터
  const reactivationData = useMemo(() => {
    if (!retention?.reactivation) return []
    return retention.reactivation.map(r => ({
      name: `${r.episode_number}화`,
      reactivated: r.reactivated,
      rate: r.rate,
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

      {/* 인사이트 카드 Row */}
      {retention.insights.length > 0 && (
        <div className={styles.insightsRow}>
          {retention.insights.map((insight, idx) => (
            <div key={idx} className={styles.insightCard}>
              <Lightbulb size={18} />
              <span>{insight}</span>
            </div>
          ))}
        </div>
      )}

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
        <ChartContainer title="참여 퍼널" subtitle="전체 -> 다회 참여 -> 전회차 참여" height={200}>
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

      {/* 평균 후원 추이 LineChart */}
      {avgTrendData.length > 0 && (
        <div className={styles.avgTrendSection}>
          <ChartContainer
            title="회차별 평균 후원 추이"
            subtitle="평균(avg)과 중앙값(median) 비교 - 차이가 클수록 고액 후원자 영향 큼"
            height={280}
          >
            <LineChart data={avgTrendData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid {...CHART_THEME.grid} />
              <XAxis dataKey="name" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick, fontSize: 12 }} />
              <YAxis
                {...CHART_THEME.axis}
                tick={{ ...CHART_THEME.axis.tick }}
                tickFormatter={(v: number) => formatChartNumber(v)}
              />
              <ChartTooltip valueFormatter={(v) => `${formatChartNumber(v)} 하트`} />
              <Line
                type="monotone"
                dataKey="avg_amount"
                name="평균"
                stroke="#fd68ba"
                strokeWidth={2}
                dot={{ r: 4, fill: '#fd68ba' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="median_amount"
                name="중앙값"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4, fill: '#3b82f6' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ChartContainer>
        </div>
      )}

      {/* 후원자 가치 세그먼트 카드 */}
      {retention.donorValueSegments.length > 0 && (
        <div className={styles.segmentsRow}>
          {retention.donorValueSegments.map((seg) => {
            const config = SEGMENT_CONFIG[seg.segment]
            const SegIcon = config.icon
            return (
              <div
                key={seg.segment}
                className={styles.segmentCard}
                style={{ borderTopColor: config.color }}
              >
                <div className={styles.segmentIcon} style={{ color: config.color }}>
                  <SegIcon size={24} />
                  <span>{config.label}</span>
                </div>
                <p className={styles.segmentDesc}>{config.desc}</p>
                <div className={styles.segmentCount}>
                  <span className={styles.segmentValue} style={{ color: config.color }}>
                    {seg.count}
                  </span>
                  <span className={styles.segmentUnit}>명</span>
                </div>
                <div className={styles.segmentHearts}>
                  <span className={styles.segmentMetricLabel}>총 하트</span>
                  <span className={styles.segmentMetricValue}>{formatChartNumber(seg.total_hearts)}</span>
                </div>
                <div className={styles.segmentRetention}>
                  <span className={styles.segmentMetricLabel}>평균 참여율</span>
                  <span className={styles.segmentMetricValue}>{seg.avg_retention_rate}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 재활성화율 LineChart */}
      {reactivationData.length > 0 && (
        <div className={styles.reactivationSection}>
          <ChartContainer
            title="재활성화율 추이"
            subtitle="이전 회차 불참 후 다시 참여한 후원자 비율"
            height={260}
          >
            <LineChart data={reactivationData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid {...CHART_THEME.grid} />
              <XAxis dataKey="name" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick, fontSize: 12 }} />
              <YAxis
                {...CHART_THEME.axis}
                tick={{ ...CHART_THEME.axis.tick }}
                tickFormatter={(v: number) => `${v}%`}
                domain={[0, 'auto']}
              />
              <ChartTooltip
                valueFormatter={(v, name) =>
                  name === '재활성화율' ? `${v}%` : `${v}명`
                }
              />
              <Line
                type="monotone"
                dataKey="rate"
                name="재활성화율"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4, fill: '#10b981' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ChartContainer>
        </div>
      )}

      {/* 이탈 위험 테이블 */}
      {retention.churnRisk.length > 0 && (
        <div className={styles.churnSection}>
          <h4 className={styles.sectionTitle}>이탈 위험 후원자</h4>
          <p className={styles.sectionDesc}>
            2회 이상 참여 후 최근 불참 중인 후원자 (총 하트 기준 정렬)
          </p>
          <div className={styles.cohortTableWrapper}>
            <table className={styles.churnTable}>
              <thead>
                <tr>
                  <th>닉네임</th>
                  <th>마지막 참여</th>
                  <th>불참 회차</th>
                  <th>총 하트</th>
                  <th>위험도</th>
                </tr>
              </thead>
              <tbody>
                {retention.churnRisk.map((donor, idx) => (
                  <tr key={`${donor.donor_name}-${idx}`}>
                    <td className={styles.churnDonorName}>{donor.donor_name}</td>
                    <td>{donor.last_episode}화</td>
                    <td>{donor.episodes_missed}회</td>
                    <td>{formatChartNumber(donor.total_hearts)}</td>
                    <td>
                      <span
                        className={`${styles.riskBadge} ${
                          donor.risk_level === 'high'
                            ? styles.riskHigh
                            : donor.risk_level === 'medium'
                              ? styles.riskMedium
                              : styles.riskLow
                        }`}
                      >
                        {RISK_LABELS[donor.risk_level]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
