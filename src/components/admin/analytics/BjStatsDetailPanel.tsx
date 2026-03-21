'use client'

import { Loader2, Lightbulb } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { BjDetailedStats, BjEpisodeTrendData, BjInsightsData, BjInsightEntry } from '@/lib/actions/analytics'
import { ChartContainer, ChartTooltip, CHART_COLORS, CHART_THEME, formatChartNumber } from './charts/RechartsTheme'
import { DonorRow } from './BjStatsDonorRow'
import styles from './BjStatsTable.module.css'

interface EpisodeSummary {
  peakEpisode: number
  peakHearts: number
  participatedCount: number
  totalEpisodes: number
  avgPerEpisode: number
  growth: number | null
}

interface BjStatsDetailPanelProps {
  bjName: string
  detail: BjDetailedStats
  epTrend: BjEpisodeTrendData | undefined
  epSummary: EpisodeSummary | null
  isBjDetailedStatsLoading: boolean
  bjInsightsMap: Map<string, BjInsightEntry>
  bjInsights: BjInsightsData | null | undefined
  isBjInsightsLoading: boolean
}

export function BjStatsDetailPanel({
  bjName,
  detail,
  epTrend,
  epSummary,
  isBjDetailedStatsLoading,
  bjInsightsMap,
  bjInsights,
  isBjInsightsLoading,
}: BjStatsDetailPanelProps) {
  const gm = detail.growth_metrics

  // 차트 데이터: 실제 하트 + 추세선 + 에피소드 설명
  const epChartData = gm?.episode_growth_line.map(e => ({
    ep: `${e.episode_number}화`,
    label: e.description ? `${e.episode_number}화 (${e.description})` : `${e.episode_number}화`,
    hearts: e.actual,
    trendLine: e.trend_line > 0 ? e.trend_line : undefined,
  })) ?? epTrend?.episodes.map(e => ({
    ep: `${e.episode_number}화`,
    label: `${e.episode_number}화`,
    hearts: e.hearts,
    trendLine: undefined as number | undefined,
  })) ?? []

  const insights = bjInsightsMap.get(bjName)

  return (
    <td colSpan={8}>
      <div className={styles.detailContent}>
        {/* BJ 에피소드 요약 통계 */}
        <div className={styles.bjSummaryRow}>
          {epSummary && (
            <>
              <div className={styles.bjSummaryStat}>
                <span className={styles.bjSummaryLabel}>피크 회차</span>
                <span className={styles.bjSummaryValue}>{epSummary.peakEpisode}화</span>
                <span className={styles.bjSummaryDesc}>{epSummary.peakHearts.toLocaleString()} 하트</span>
              </div>
              <div className={styles.bjSummaryStat}>
                <span className={styles.bjSummaryLabel}>참여율</span>
                <span className={styles.bjSummaryValue}>{epSummary.participatedCount}/{epSummary.totalEpisodes}</span>
                <span className={styles.bjSummaryDesc}>{Math.round((epSummary.participatedCount / epSummary.totalEpisodes) * 100)}% 참여</span>
              </div>
              <div className={styles.bjSummaryStat}>
                <span className={styles.bjSummaryLabel}>회차 평균</span>
                <span className={styles.bjSummaryValue}>{epSummary.avgPerEpisode.toLocaleString()}</span>
                <span className={styles.bjSummaryDesc}>참여 회차 기준</span>
              </div>
            </>
          )}
          {gm && (
            <>
              <div className={styles.bjSummaryStat}>
                <span className={styles.bjSummaryLabel}>전체 성장률</span>
                <span className={`${styles.bjSummaryValue} ${gm.growth_rate >= 0 ? styles.growthUp : styles.growthDown}`}>
                  {gm.growth_rate > 0 ? '+' : ''}{gm.growth_rate}%
                </span>
                <span className={styles.bjSummaryDesc}>회차별 평균 변화</span>
              </div>
              <div className={styles.bjSummaryStat}>
                <span className={styles.bjSummaryLabel}>추세 안정도</span>
                <span className={styles.bjSummaryValue}>
                  {gm.consistency >= 60 ? '높음' : gm.consistency >= 30 ? '보통' : '낮음'}
                </span>
                <span className={styles.bjSummaryDesc}>
                  {gm.consistency >= 60 ? '꾸준한 흐름' : gm.consistency >= 30 ? '변동 있음' : '들쭉날쭉'}
                </span>
              </div>
              <div className={styles.bjSummaryStat}>
                <span className={styles.bjSummaryLabel}>최근 흐름</span>
                <span className={`${styles.bjSummaryValue} ${gm.recent_momentum >= 0 ? styles.growthUp : styles.growthDown}`}>
                  {gm.recent_momentum > 0 ? '+' : ''}{gm.recent_momentum}%
                </span>
                <span className={styles.bjSummaryDesc}>최근 3화 vs 이전 3화</span>
              </div>
            </>
          )}
        </div>

        {/* 신규 vs 기존 후원자 기여도 */}
        {gm && (
          <div className={styles.donorContributionRow}>
            <div className={styles.contributionBar}>
              <div className={styles.contributionFillNew} style={{ width: `${gm.growth_from_new}%` }} />
              <div className={styles.contributionFillExisting} style={{ width: `${gm.growth_from_existing}%` }} />
            </div>
            <div className={styles.contributionLabels}>
              <span style={{ color: '#10b981' }}>새 후원자 {gm.growth_from_new}%</span>
              <span>회차당 평균 신규 {gm.donor_acquisition_rate}명</span>
              <span style={{ color: '#3b82f6' }}>단골 {gm.growth_from_existing}%</span>
            </div>
          </div>
        )}

        {/* BJ Actionable Insights */}
        {(() => {
          if (!insights && !isBjInsightsLoading) return null
          if (isBjInsightsLoading) return (
            <div className={styles.detailLoading}>
              <Loader2 size={16} className={styles.spinner} /> 인사이트 로딩 중...
            </div>
          )
          if (!insights) return null
          return (
            <div className={styles.insightsSection}>
              {/* Donor Health Mini Bar */}
              <div className={styles.donorHealthRow}>
                <span className={styles.donorHealthTitle}>후원자 상태 분포</span>
                <div className={styles.donorHealthBar}>
                  {insights.donor_health.growing > 0 && (
                    <div className={styles.healthGrowing} style={{ flex: insights.donor_health.growing }} title={`증가 중 ${insights.donor_health.growing}명`} />
                  )}
                  {insights.donor_health.stable > 0 && (
                    <div className={styles.healthStable} style={{ flex: insights.donor_health.stable }} title={`유지 중 ${insights.donor_health.stable}명`} />
                  )}
                  {insights.donor_health.declining > 0 && (
                    <div className={styles.healthDeclining} style={{ flex: insights.donor_health.declining }} title={`줄어드는 중 ${insights.donor_health.declining}명`} />
                  )}
                  {insights.donor_health.at_risk > 0 && (
                    <div className={styles.healthAtRisk} style={{ flex: insights.donor_health.at_risk }} title={`이탈 위험 ${insights.donor_health.at_risk}명`} />
                  )}
                </div>
                <div className={styles.donorHealthLegend}>
                  <span><span className={styles.legendDot} style={{ background: '#10b981' }} />증가 중 {insights.donor_health.growing}</span>
                  <span><span className={styles.legendDot} style={{ background: '#3b82f6' }} />유지 중 {insights.donor_health.stable}</span>
                  <span><span className={styles.legendDot} style={{ background: '#f59e0b' }} />줄어드는 중 {insights.donor_health.declining}</span>
                  <span><span className={styles.legendDot} style={{ background: '#ef4444' }} />이탈 위험 {insights.donor_health.at_risk}</span>
                </div>
              </div>

              {/* Rank Battle Effect + Best/Worst Episode + Retention */}
              <div className={styles.insightMetricsRow}>
                <div className={styles.insightMetric}>
                  <span className={styles.insightMetricLabel}>직급전 효과</span>
                  <span className={`${styles.insightMetricValue} ${insights.rank_battle_effect >= 1 ? styles.growthUp : styles.growthDown}`}>
                    {insights.rank_battle_effect > 0 ? `\u00d7${insights.rank_battle_effect.toFixed(2)}` : 'N/A'}
                  </span>
                  <span className={styles.insightMetricDesc}>
                    {insights.rank_battle_effect >= 1.2 ? '직급전에 후원이 많이 늘어요' : insights.rank_battle_effect >= 1 ? '보통 수준' : '일반 방송이 더 잘 나와요'}
                  </span>
                </div>
                <div className={styles.insightMetric}>
                  <span className={styles.insightMetricLabel}>최고 에피소드</span>
                  <span className={`${styles.insightMetricValue} ${styles.growthUp}`}>
                    {insights.best_episode ? `${insights.best_episode.episode_number}화` : '-'}
                  </span>
                  <span className={styles.insightMetricDesc}>
                    {insights.best_episode
                      ? `${insights.best_episode.hearts.toLocaleString()} 하트${insights.best_episode.description ? ` (${insights.best_episode.description})` : ''}`
                      : '데이터 부족'}
                  </span>
                </div>
                <div className={styles.insightMetric}>
                  <span className={styles.insightMetricLabel}>최저 에피소드</span>
                  <span className={`${styles.insightMetricValue} ${styles.growthDown}`}>
                    {insights.worst_episode ? `${insights.worst_episode.episode_number}화` : '-'}
                  </span>
                  <span className={styles.insightMetricDesc}>
                    {insights.worst_episode
                      ? `${insights.worst_episode.hearts.toLocaleString()} 하트${insights.worst_episode.description ? ` (${insights.worst_episode.description})` : ''}`
                      : '데이터 부족'}
                  </span>
                </div>
                <div className={styles.insightMetric}>
                  <span className={styles.insightMetricLabel}>신규 후원자 정착률</span>
                  <span className={styles.insightMetricValue}>{insights.new_donor_retention_rate}%</span>
                  <span className={styles.insightMetricDesc}>
                    {(() => {
                      const globalRate = bjInsights?.global_retention_rate ?? 0
                      if (globalRate > 0 && insights.new_donor_retention_rate >= globalRate * 1.2) return `평균(${globalRate}%)보다 우수해요`
                      if (globalRate > 0 && insights.new_donor_retention_rate < globalRate) return `평균(${globalRate}%)보다 낮아요`
                      return '평균 수준이에요'
                    })()}
                  </span>
                </div>
              </div>

              {/* Korean Actionable Insights */}
              {insights.actionable_insights.length > 0 && (
                <div className={styles.actionInsightsRow}>
                  {insights.actionable_insights.map((text, idx) => (
                    <div key={idx} className={styles.actionInsightCard}>
                      <Lightbulb size={14} color="#f59e0b" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {/* BJ 회차별 하트 차트 + 추세선 */}
        {epChartData.length > 1 && (
          <div className={styles.bjEpChart}>
            <ChartContainer title="회차별 하트 흐름" height={200}>
              <LineChart data={epChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid {...CHART_THEME.grid} />
                <XAxis dataKey="ep" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick, fontSize: 11 }} />
                <YAxis {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} tickFormatter={formatChartNumber} />
                <ChartTooltip
                  labelFormatter={(_, payload) => {
                    const item = payload?.[0]?.payload
                    return item?.label ?? String(_)
                  }}
                  valueFormatter={(v) => `${v.toLocaleString()} 하트`}
                />
                <Line
                  type="monotone"
                  dataKey="hearts"
                  name="하트"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="trendLine"
                  name="평균 흐름"
                  stroke="#6b7280"
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                  dot={false}
                  connectNulls={false}
                />
              </LineChart>
            </ChartContainer>
          </div>
        )}

        <h4 className={styles.detailTitle}>Top 5 후원자</h4>
        {isBjDetailedStatsLoading ? (
          <div className={styles.detailLoading}>
            <Loader2 size={16} className={styles.spinner} /> 로딩 중...
          </div>
        ) : (
          <div className={styles.donorList}>
            {detail.top_donors.slice(0, 5).map(donor => (
              <DonorRow key={donor.donor_name} donor={donor} />
            ))}
          </div>
        )}
      </div>
    </td>
  )
}
