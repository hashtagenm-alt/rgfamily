'use client'

import { useMemo } from 'react'
import {
  Loader2,
  Shield,
  Users,
  UserCheck,
  UserMinus,
  Lightbulb,
  Heart,
  TrendingUp,
  AlertTriangle,
  Crown,
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
import type { ChurnPredictionData } from '@/lib/actions/analytics-advanced'
import { ChartContainer, ChartTooltip, CHART_THEME, formatChartNumber } from './charts/RechartsTheme'
import styles from './DonorRetentionPanel.module.css'

interface DonorRetentionPanelProps {
  retention: DonorRetentionData | null
  isLoading: boolean
  churnPrediction?: ChurnPredictionData | null
  isChurnPredictionLoading?: boolean
}

// 시즌 참여 분류 (완결 시즌 기준 - 회고적 분류 + 매출 포함)
const SUMMARY_CONFIG = [
  { key: 'core_fans', heartsKey: 'core_fans_hearts', pctKey: 'core_fans_hearts_pct', label: '핵심 팬', icon: Shield, color: '#8b5cf6', desc: '60%+ 회차 참여' },
  { key: 'regular_donors', heartsKey: 'regular_hearts', pctKey: 'regular_hearts_pct', label: '단골', icon: UserCheck, color: '#3b82f6', desc: '4회+ 참여' },
  { key: 'occasional_donors', heartsKey: 'occasional_hearts', pctKey: 'occasional_hearts_pct', label: '간헐', icon: Users, color: '#10b981', desc: '2~3회 참여' },
  { key: 'onetime_donors', heartsKey: 'onetime_hearts', pctKey: 'onetime_hearts_pct', label: '1회성', icon: UserMinus, color: '#6b7280', desc: '1회만 참여' },
] as const

const ADVANCED_RISK_STYLES: Record<string, string> = {
  '위험': styles.riskDanger,
  '주의': styles.riskWarning,
  '관심': styles.riskWatch,
  '안전': styles.riskSafe,
}

function SignalBar({ label, value, max = 25 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100)
  const color = pct >= 75 ? '#ef4444' : pct >= 50 ? '#f59e0b' : pct >= 25 ? '#eab308' : '#6b7280'
  return (
    <div className={styles.signalBar}>
      <span className={styles.signalLabel}>{label}</span>
      <div className={styles.signalTrack}>
        <div className={styles.signalFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className={styles.signalValue}>{value}</span>
    </div>
  )
}

export function DonorRetentionPanel({ retention, isLoading, churnPrediction, isChurnPredictionLoading }: DonorRetentionPanelProps) {
  // 파레토 차트 데이터
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

  // Growth Accounting 데이터 (후원자 수)
  const growthData = useMemo(() => {
    if (!retention?.growthAccounting) return []
    return retention.growthAccounting.map(ga => ({
      name: `${ga.episode_number}화`,
      label: ga.description ? `${ga.episode_number}화 (${ga.description})` : `${ga.episode_number}화`,
      new: ga.new_donors,
      retained: ga.retained_donors,
      resurrected: ga.resurrected_donors,
      churned: -ga.churned_donors,
      net: ga.net_growth,
      is_rank_battle: ga.is_rank_battle,
    }))
  }, [retention])

  // Growth Accounting 데이터 (하트)
  const growthHeartsData = useMemo(() => {
    if (!retention?.growthAccounting) return []
    return retention.growthAccounting.map(ga => ({
      name: `${ga.episode_number}화`,
      new_hearts: ga.new_hearts,
      retained_hearts: ga.retained_hearts,
      resurrected_hearts: ga.resurrected_hearts,
      lost_hearts: ga.lost_hearts,
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

  const ss = retention.seasonSummary

  return (
    <div className={styles.container}>
      {/* 매출 핵심 지표 (총매출, 에피소드당 평균, 안정성, 상위 의존도) */}
      <div className={styles.keyMetrics}>
        <div className={styles.keyMetricItem}>
          <Heart size={20} className={styles.keyMetricIcon} />
          <div className={styles.keyMetricText}>
            <span className={styles.keyMetricValue}>{formatChartNumber(ss.total_hearts)}</span>
            <span className={styles.keyMetricLabel}>총 하트 ({ss.total_episodes}회차, {ss.total_donors}명)</span>
          </div>
        </div>
        <div className={styles.keyMetricItem}>
          <TrendingUp size={20} className={styles.keyMetricIcon} />
          <div className={styles.keyMetricText}>
            <span className={styles.keyMetricValue}>{formatChartNumber(ss.avg_hearts_per_episode)}</span>
            <span className={styles.keyMetricLabel}>회차당 평균 하트</span>
          </div>
        </div>
        <div className={styles.keyMetricItem}>
          <Shield size={20} className={styles.keyMetricIcon} />
          <div className={styles.keyMetricText}>
            <span className={styles.keyMetricValue}>{ss.stable_revenue_ratio}%</span>
            <span className={styles.keyMetricLabel}>안정 매출 비중 (단골 4회+)</span>
          </div>
        </div>
        <div className={styles.keyMetricItem}>
          <AlertTriangle size={20} className={styles.keyMetricIcon} />
          <div className={styles.keyMetricText}>
            <span className={styles.keyMetricValue}>{ss.top5_hearts_pct}%</span>
            <span className={styles.keyMetricLabel}>상위 5명 의존도</span>
          </div>
        </div>
      </div>

      {/* 세그먼트별 매출 기여도 카드 */}
      <div className={styles.summaryRow}>
        {SUMMARY_CONFIG.map(({ key, heartsKey, pctKey, label, icon: Icon, color, desc }) => {
          const count = ss[key as keyof typeof ss] as number
          const hearts = ss[heartsKey as keyof typeof ss] as number
          const heartsPct = ss[pctKey as keyof typeof ss] as number
          const donorPct = ss.total_donors > 0 ? Math.round((count / ss.total_donors) * 100) : 0
          return (
            <div key={key} className={styles.summaryCard} style={{ borderTopColor: color }}>
              <div className={styles.summaryHeader}>
                <Icon size={18} color={color} />
                <span className={styles.summaryLabel}>{label}</span>
              </div>
              <span className={styles.summaryCount} style={{ color }}>{formatChartNumber(hearts)}</span>
              <span className={styles.summaryPct}>매출의 {heartsPct}%</span>
              <span className={styles.summaryDesc}>{count}명 ({donorPct}%) · {desc}</span>
            </div>
          )
        })}
      </div>

      {/* 상위 5명 의존도 상세 */}
      {ss.top5_donors && ss.top5_donors.length > 0 && (
        <div className={styles.top5Section}>
          <div className={styles.top5Header}>
            <Crown size={18} color="#ffd700" />
            <span className={styles.top5Title}>상위 5명 후원자</span>
            <span className={styles.top5Subtitle}>
              전체 매출의 {ss.top5_hearts_pct}% · 상위 10명은 {ss.top10_hearts_pct}%
            </span>
          </div>
          <div className={styles.top5List}>
            {ss.top5_donors.map((d, idx) => {
              const pct = ss.total_hearts > 0 ? Math.round((d.hearts / ss.total_hearts) * 1000) / 10 : 0
              return (
                <div key={d.name} className={styles.top5Item}>
                  <span className={styles.top5Rank} style={{ color: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'var(--text-secondary)' }}>
                    {idx + 1}
                  </span>
                  <span className={styles.top5Name}>{d.name}</span>
                  <div className={styles.top5Bar}>
                    <div className={styles.top5BarFill} style={{ width: `${Math.min(100, pct * 2)}%`, background: SUMMARY_CONFIG[0].color }} />
                  </div>
                  <span className={styles.top5Hearts}>{formatChartNumber(d.hearts)}</span>
                  <span className={styles.top5Pct}>{pct}%</span>
                </div>
              )
            })}
          </div>
          {ss.best_episode.number > 0 && ss.worst_episode.number > 0 && (
            <div className={styles.epRange}>
              <span>최고 {ss.best_episode.number}화 ({formatChartNumber(ss.best_episode.hearts)} 하트)</span>
              <span className={styles.epRangeDivider}>|</span>
              <span>최저 {ss.worst_episode.number}화 ({formatChartNumber(ss.worst_episode.hearts)} 하트)</span>
            </div>
          )}
        </div>
      )}

      {/* 인사이트 카드 */}
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

      {/* 이탈 위험 후원자 (유지) */}
      {churnPrediction && churnPrediction.entries.length > 0 ? (
        <div className={styles.churnSection}>
          <h4 className={styles.sectionTitle}>이탈 위험 후원자</h4>
          <p className={styles.sectionDesc}>
            최근 불참 횟수, 부재 기간, 금액 추세 등을 종합해서 이탈 위험을 예측합니다 (하트 많은 순)
          </p>

          <div className={styles.churnSummaryRow}>
            <div className={styles.churnSummaryCard}>
              <span className={styles.churnSummaryCount} style={{ color: '#ef4444' }}>
                {churnPrediction.summary.danger_count}
              </span>
              <span className={styles.churnSummaryLabel}>위험</span>
            </div>
            <div className={styles.churnSummaryCard}>
              <span className={styles.churnSummaryCount} style={{ color: '#f59e0b' }}>
                {churnPrediction.summary.warning_count}
              </span>
              <span className={styles.churnSummaryLabel}>주의</span>
            </div>
            <div className={styles.churnSummaryCard}>
              <span className={styles.churnSummaryCount} style={{ color: '#eab308' }}>
                {churnPrediction.summary.watch_count}
              </span>
              <span className={styles.churnSummaryLabel}>관심</span>
            </div>
            <div className={styles.churnSummaryCard}>
              <span className={styles.churnSummaryCount} style={{ color: '#6b7280' }}>
                {churnPrediction.summary.safe_count}
              </span>
              <span className={styles.churnSummaryLabel}>안전</span>
            </div>
          </div>

          <div className={styles.cohortTableWrapper}>
            <table className={styles.advancedChurnTable}>
              <thead>
                <tr>
                  <th>닉네임</th>
                  <th>총 하트</th>
                  <th>위험도</th>
                  <th>시그널</th>
                  <th>추천</th>
                </tr>
              </thead>
              <tbody>
                {churnPrediction.entries.map((entry, idx) => (
                  <tr key={`${entry.donor_name}-${idx}`}>
                    <td className={styles.churnDonorName}>{entry.donor_name}</td>
                    <td>{formatChartNumber(entry.total_hearts)}</td>
                    <td>
                      <span className={`${styles.riskBadge} ${ADVANCED_RISK_STYLES[entry.risk_level] || ''}`}>
                        {entry.risk_level} ({entry.risk_score})
                      </span>
                    </td>
                    <td>
                      <div className={styles.signalBars}>
                        <SignalBar label="최근불참" value={entry.signals.frequency} max={35} />
                        <SignalBar label="부재기간" value={entry.signals.gap} max={30} />
                        <SignalBar label="금액추세" value={entry.signals.amount} max={20} />
                        <SignalBar label="직급전" value={entry.signals.rank_battle} max={15} />
                      </div>
                    </td>
                    <td>
                      <span className={styles.recommendation}>{entry.recommendation}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : isChurnPredictionLoading ? (
        <div className={styles.churnSection}>
          <h4 className={styles.sectionTitle}>이탈 위험 후원자</h4>
          <div className={styles.loading} style={{ padding: '30px 20px' }}>
            <Loader2 size={24} className={styles.spinner} />
            <span>이탈 위험 분석 중...</span>
          </div>
        </div>
      ) : null}

      {/* Growth Accounting 차트 */}
      {growthData.length > 0 && (
        <div className={styles.growthSection}>
          <ChartContainer title="후원자 흐름 분석" subtitle="에피소드마다 후원자가 어떻게 변했는지 보여줍니다" height={300}>
            <BarChart data={growthData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }} stackOffset="sign">
              <CartesianGrid {...CHART_THEME.grid} />
              <XAxis dataKey="name" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick, fontSize: 11 }} />
              <YAxis {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} />
              <ChartTooltip
                labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? String(_)}
                valueFormatter={(v, name) => {
                  const absV = Math.abs(Number(v))
                  return `${absV}명 (${name})`
                }}
              />
              <ReferenceLine y={0} stroke="var(--text-tertiary)" strokeWidth={1} />
              <Bar dataKey="new" name="신규" stackId="a" fill="#10b981" />
              <Bar dataKey="retained" name="유지" stackId="a" fill="#3b82f6" />
              <Bar dataKey="resurrected" name="복귀" stackId="a" fill="#8b5cf6" />
              <Bar dataKey="churned" name="이탈" stackId="a" fill="#ef4444" />
            </BarChart>
          </ChartContainer>

          {/* 분류 기준 범례 */}
          <div className={styles.flowLegend}>
            <div className={styles.flowLegendItem}>
              <span className={styles.flowLegendDot} style={{ background: '#10b981' }} />
              <span className={styles.flowLegendLabel}>신규</span>
              <span className={styles.flowLegendDesc}>이번 회차에 처음 후원한 사람</span>
            </div>
            <div className={styles.flowLegendItem}>
              <span className={styles.flowLegendDot} style={{ background: '#3b82f6' }} />
              <span className={styles.flowLegendLabel}>유지</span>
              <span className={styles.flowLegendDesc}>직전 회차에도 후원 + 이번에도 후원</span>
            </div>
            <div className={styles.flowLegendItem}>
              <span className={styles.flowLegendDot} style={{ background: '#8b5cf6' }} />
              <span className={styles.flowLegendLabel}>복귀</span>
              <span className={styles.flowLegendDesc}>예전에 후원했지만 직전에 빠졌다가 다시 온 사람</span>
            </div>
            <div className={styles.flowLegendItem}>
              <span className={styles.flowLegendDot} style={{ background: '#ef4444' }} />
              <span className={styles.flowLegendLabel}>이탈</span>
              <span className={styles.flowLegendDesc}>직전 회차에 후원했지만 이번에 안 온 사람</span>
            </div>
          </div>

          <ChartContainer title="하트 흐름 분석" subtitle="에피소드마다 하트가 어떻게 변했는지 보여줍니다" height={300}>
            <BarChart data={growthHeartsData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }} stackOffset="sign">
              <CartesianGrid {...CHART_THEME.grid} />
              <XAxis dataKey="name" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick, fontSize: 11 }} />
              <YAxis {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} tickFormatter={formatChartNumber} />
              <ChartTooltip valueFormatter={(v) => `${formatChartNumber(Math.abs(Number(v)))} 하트`} />
              <ReferenceLine y={0} stroke="var(--text-tertiary)" strokeWidth={1} />
              <Bar dataKey="new_hearts" name="신규 하트" stackId="a" fill="#10b981" />
              <Bar dataKey="retained_hearts" name="유지 하트" stackId="a" fill="#3b82f6" />
              <Bar dataKey="resurrected_hearts" name="복귀 하트" stackId="a" fill="#8b5cf6" />
              <Bar dataKey="lost_hearts" name="이탈 하트" stackId="a" fill="#ef4444" />
            </BarChart>
          </ChartContainer>
        </div>
      )}

      {/* 코호트 히트맵 테이블 */}
      {retention.cohorts.length > 0 && (
        <div className={styles.cohortSection}>
          <h4 className={styles.sectionTitle}>첫 참여 회차별 유지율</h4>
          <p className={styles.sectionDesc}>처음 후원한 회차 기준으로, 이후에도 계속 후원한 비율</p>
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

      {/* 참여 깊이 분석 (퍼널) */}
      {funnelData.length > 0 && (
        <ChartContainer title="참여 깊이 분석" subtitle="전체 후원자 중 얼마나 깊이 참여하는지" height={240}>
          <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 50, left: 10, bottom: 5 }}>
            <CartesianGrid {...CHART_THEME.grid} horizontal={false} />
            <XAxis type="number" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} />
            <YAxis type="category" dataKey="name" width={100} {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick, fontSize: 13 }} />
            <ChartTooltip valueFormatter={(v) => `${v}명`} />
            <Bar dataKey="count" name="후원자" fill="#fd68ba" radius={[0, 4, 4, 0]} maxBarSize={28} />
          </BarChart>
        </ChartContainer>
      )}

      {/* 파레토 차트 */}
      {paretoData.length > 0 && (
        <ChartContainer
          title="상위 후원자 집중도"
          subtitle="소수의 후원자가 전체 하트의 대부분을 차지합니다"
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

      {/* 평균 후원 추이 */}
      {avgTrendData.length > 0 && (
        <div className={styles.avgTrendSection}>
          <ChartContainer
            title="1인당 평균 후원 추이"
            subtitle="평균과 중앙값 비교 — 차이가 크면 고액 후원자의 영향이 큽니다"
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
    </div>
  )
}
