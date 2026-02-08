'use client'

import { useState, useMemo } from 'react'
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  ComposedChart, Area, Line, Bar,
  AreaChart,
  LineChart,
  XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import type { EpisodeTrendData, BjEpisodeTrendData } from '@/lib/actions/analytics'
import { ChartContainer, ChartTooltip, CHART_COLORS, CHART_THEME, formatChartNumber } from './charts/RechartsTheme'
import styles from './EpisodeTrendPanel.module.css'

interface EpisodeTrendPanelProps {
  episodeTrend: EpisodeTrendData[]
  bjEpisodeTrend: BjEpisodeTrendData[]
  isLoading: boolean
}

export function EpisodeTrendPanel({ episodeTrend, bjEpisodeTrend, isLoading }: EpisodeTrendPanelProps) {
  const [showHearts, setShowHearts] = useState(true)
  const [showDonors, setShowDonors] = useState(true)
  const [showAvg, setShowAvg] = useState(false)

  // KPI 요약
  const kpi = useMemo(() => {
    if (episodeTrend.length < 2) return null
    const last = episodeTrend[episodeTrend.length - 1]
    const prev = episodeTrend[episodeTrend.length - 2]
    const totalHearts = episodeTrend.reduce((s, e) => s + e.total_hearts, 0)
    const avgHearts = Math.round(totalHearts / episodeTrend.length)

    const heartChange = prev.total_hearts > 0
      ? Math.round(((last.total_hearts - prev.total_hearts) / prev.total_hearts) * 100)
      : 0
    const donorChange = prev.donor_count > 0
      ? Math.round(((last.donor_count - prev.donor_count) / prev.donor_count) * 100)
      : 0

    return {
      lastHearts: last.total_hearts,
      heartChange,
      lastDonors: last.donor_count,
      donorChange,
      avgHearts,
      totalEpisodes: episodeTrend.length,
    }
  }, [episodeTrend])

  // 메인 차트 데이터
  const mainChartData = useMemo(() =>
    episodeTrend.map(e => ({
      name: `${e.episode_number}화`,
      hearts: e.total_hearts,
      donors: e.donor_count,
      avg: e.avg_donation,
      isRankBattle: e.is_rank_battle,
    })), [episodeTrend])

  // BJ 기여도 스택 데이터
  const bjStackData = useMemo(() => {
    if (bjEpisodeTrend.length === 0) return []
    const top7 = bjEpisodeTrend.slice(0, 7)
    if (top7.length === 0 || top7[0].episodes.length === 0) return []

    return top7[0].episodes.map((_, epIdx) => {
      const point: Record<string, number | string> = {
        name: `${top7[0].episodes[epIdx].episode_number}화`,
      }
      for (const bj of top7) {
        point[bj.bj_name] = bj.episodes[epIdx]?.hearts ?? 0
      }
      return point
    })
  }, [bjEpisodeTrend])

  const bjNames = useMemo(() => bjEpisodeTrend.slice(0, 7).map(b => b.bj_name), [bjEpisodeTrend])

  // 재참여율 추이
  const retentionLineData = useMemo(() =>
    episodeTrend.filter(e => e.donor_count > 0).map(e => ({
      name: `${e.episode_number}화`,
      rate: Math.round((e.returning_donors / e.donor_count) * 100),
      newDonors: e.new_donors,
      returning: e.returning_donors,
    })), [episodeTrend])

  const TrendIcon = ({ value }: { value: number }) => {
    if (value > 0) return <TrendingUp size={16} className={styles.trendUp} />
    if (value < 0) return <TrendingDown size={16} className={styles.trendDown} />
    return <Minus size={16} className={styles.trendNeutral} />
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Loader2 size={32} className={styles.spinner} />
        <span>회차별 추이 분석 중...</span>
      </div>
    )
  }

  if (episodeTrend.length === 0) {
    return (
      <div className={styles.empty}>
        <p>회차별 추이 데이터가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* KPI 요약 행 */}
      {kpi && (
        <div className={styles.kpiRow}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>최신 회차 하트</span>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{kpi.lastHearts.toLocaleString()}</span>
              <TrendIcon value={kpi.heartChange} />
              <span className={`${styles.kpiDelta} ${kpi.heartChange >= 0 ? styles.deltaUp : styles.deltaDown}`}>
                {kpi.heartChange > 0 ? '+' : ''}{kpi.heartChange}%
              </span>
            </div>
            <span className={styles.kpiDesc}>가장 최근 에피소드의 총 후원 하트</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>최신 회차 후원자</span>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{kpi.lastDonors}</span>
              <TrendIcon value={kpi.donorChange} />
              <span className={`${styles.kpiDelta} ${kpi.donorChange >= 0 ? styles.deltaUp : styles.deltaDown}`}>
                {kpi.donorChange > 0 ? '+' : ''}{kpi.donorChange}%
              </span>
            </div>
            <span className={styles.kpiDesc}>최근 에피소드에 참여한 고유 후원자 수</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>평균 하트/회차</span>
            <span className={styles.kpiValue}>{kpi.avgHearts.toLocaleString()}</span>
            <span className={styles.kpiDesc}>전체 회차의 평균 후원 하트</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>총 회차</span>
            <span className={styles.kpiValue}>{kpi.totalEpisodes}</span>
            <span className={styles.kpiDesc}>분석 대상 에피소드 수 (확정된 회차만)</span>
          </div>
        </div>
      )}

      {/* 메인 ComposedChart - 토글 가능 */}
      <div className={styles.toggleRow}>
        <label className={styles.toggleLabel}>
          <input type="checkbox" checked={showHearts} onChange={e => setShowHearts(e.target.checked)} />
          <span style={{ color: CHART_COLORS[0] }}>하트</span>
        </label>
        <label className={styles.toggleLabel}>
          <input type="checkbox" checked={showDonors} onChange={e => setShowDonors(e.target.checked)} />
          <span style={{ color: CHART_COLORS[1] }}>후원자수</span>
        </label>
        <label className={styles.toggleLabel}>
          <input type="checkbox" checked={showAvg} onChange={e => setShowAvg(e.target.checked)} />
          <span style={{ color: CHART_COLORS[3] }}>평균후원</span>
        </label>
      </div>

      <ChartContainer title="회차별 후원 추이" height={350}>
        <ComposedChart data={mainChartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid {...CHART_THEME.grid} />
          <XAxis dataKey="name" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick, fontSize: 11 }} />
          <YAxis yAxisId="left" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} tickFormatter={formatChartNumber} />
          <YAxis yAxisId="right" orientation="right" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} />
          <ChartTooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {showHearts && (
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="hearts"
              name="하트"
              fill={`${CHART_COLORS[0]}33`}
              stroke={CHART_COLORS[0]}
              strokeWidth={2}
            />
          )}
          {showDonors && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="donors"
              name="후원자수"
              stroke={CHART_COLORS[1]}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          )}
          {showAvg && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="avg"
              name="평균후원"
              stroke={CHART_COLORS[3]}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3 }}
            />
          )}
        </ComposedChart>
      </ChartContainer>

      {/* BJ별 기여도 스택 */}
      {bjStackData.length > 0 && (
        <ChartContainer title="BJ별 기여도 스택 (상위 7)" height={300}>
          <AreaChart data={bjStackData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...CHART_THEME.grid} />
            <XAxis dataKey="name" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick, fontSize: 11 }} />
            <YAxis {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} tickFormatter={formatChartNumber} />
            <ChartTooltip valueFormatter={(v) => `${v.toLocaleString()} 하트`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {bjNames.map((name, i) => (
              <Area
                key={name}
                type="monotone"
                dataKey={name}
                stackId="1"
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      )}

      {/* 후원자 재참여율 추이 */}
      {retentionLineData.length > 1 && (
        <ChartContainer title="후원자 재참여율 추이" height={250}>
          <LineChart data={retentionLineData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid {...CHART_THEME.grid} />
            <XAxis dataKey="name" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick, fontSize: 11 }} />
            <YAxis {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
            <ChartTooltip valueFormatter={(v, name) => name === '재참여율' ? `${v}%` : `${v}명`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="rate" name="재참여율" stroke={CHART_COLORS[2]} strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="newDonors" name="신규" stroke={CHART_COLORS[4]} strokeWidth={1.5} strokeDasharray="4 4" />
          </LineChart>
        </ChartContainer>
      )}

      {/* 에피소드 카드 그리드 */}
      <div className={styles.episodeGrid}>
        {episodeTrend.map((ep, i) => {
          const prev = i > 0 ? episodeTrend[i - 1] : null
          const heartChange = prev && prev.total_hearts > 0
            ? Math.round(((ep.total_hearts - prev.total_hearts) / prev.total_hearts) * 100)
            : null

          return (
            <div key={ep.episode_id} className={`${styles.episodeCard} ${ep.is_rank_battle ? styles.rankBattle : ''}`}>
              <div className={styles.epCardHeader}>
                <span className={styles.epNumber}>{ep.episode_number}화</span>
                {ep.is_rank_battle && <span className={styles.rankBadge}>직급전</span>}
              </div>
              <div className={styles.epStat}>
                <span className={styles.epStatLabel}>하트</span>
                <span className={styles.epStatValue}>{ep.total_hearts.toLocaleString()}</span>
                {heartChange !== null && (
                  <span className={`${styles.epDelta} ${heartChange >= 0 ? styles.deltaUp : styles.deltaDown}`}>
                    {heartChange > 0 ? '+' : ''}{heartChange}%
                  </span>
                )}
              </div>
              <div className={styles.epStat}>
                <span className={styles.epStatLabel}>후원자</span>
                <span className={styles.epStatValue}>{ep.donor_count}명</span>
              </div>
              <div className={styles.epStat}>
                <span className={styles.epStatLabel}>신규</span>
                <span className={styles.epStatValue}>{ep.new_donors}명</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
