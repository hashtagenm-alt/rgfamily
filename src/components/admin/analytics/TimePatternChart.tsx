'use client'

import { useState, useMemo, Fragment } from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import type { TimePatternData, TimePatternEnhanced } from '@/lib/actions/analytics'
import { ChartContainer, ChartTooltip, CHART_COLORS, CHART_THEME, formatChartNumber } from './charts/RechartsTheme'
import styles from './TimePatternChart.module.css'

interface TimePatternChartProps {
  timePattern: TimePatternData[]
  timePatternEnhanced: TimePatternEnhanced | null
  isTimePatternEnhancedLoading: boolean
  isLoading: boolean
  onRefresh: () => Promise<void>
}

type ViewMode = 'overall' | 'perBj' | 'heatmap' | 'donors'
type MetricMode = 'hearts' | 'count'

const formatHour = (hour: number) => {
  if (hour === 0) return '오전 12시'
  if (hour < 12) return `오전 ${hour}시`
  if (hour === 12) return '오후 12시'
  return `오후 ${hour - 12}시`
}

const formatHourShort = (hour: number) => {
  if (hour === 0) return '오전12'
  if (hour < 12) return `오전${hour}`
  if (hour === 12) return '오후12'
  return `오후${hour - 12}`
}

export function TimePatternChart({ timePattern, timePatternEnhanced, isTimePatternEnhancedLoading, isLoading, onRefresh }: TimePatternChartProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('overall')
  const [metricMode, setMetricMode] = useState<MetricMode>('hearts')
  const [selectedBj, setSelectedBj] = useState<string | null>(null)
  const [expandedDonor, setExpandedDonor] = useState<string | null>(null)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setIsRefreshing(false)
  }

  // Hooks must be called before any early returns
  const bjChartData = useMemo(() => {
    if (!timePatternEnhanced?.perBj || !selectedBj) return null
    const bjData = timePatternEnhanced.perBj.find(b => b.bj_name === selectedBj)
    if (!bjData) return null
    const maxH = Math.max(...bjData.hours.map(h => h.hearts), 1)
    return bjData.hours.map(h => ({
      hour: formatHourShort(h.hour),
      hearts: h.hearts,
      count: h.count,
      isPeak: h.hour === bjData.peak_hour,
      intensity: h.hearts / maxH,
    }))
  }, [timePatternEnhanced, selectedBj])

  // 히트맵 데이터
  const heatmapData = useMemo(() => {
    if (!timePatternEnhanced?.heatmap) return { bjs: [] as string[], hours: [] as number[], cells: [] as { bj_name: string; hour: number; intensity: number; hearts: number }[] }
    const bjSet = new Set<string>()
    for (const h of timePatternEnhanced.heatmap) bjSet.add(h.bj_name)
    const bjs = [...bjSet]
    const hours = Array.from({ length: 24 }, (_, i) => i)
    return { bjs, hours, cells: timePatternEnhanced.heatmap }
  }, [timePatternEnhanced])

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

  const peakHour = [...timePattern].sort((a, b) =>
    metricMode === 'hearts'
      ? b.total_hearts - a.total_hearts
      : b.donation_count - a.donation_count
  )[0]

  const maxVal = Math.max(
    ...timePattern.map(d => metricMode === 'hearts' ? d.total_hearts : d.donation_count)
  )

  const overallChartData = timePattern.map(d => ({
    hour: formatHourShort(d.hour),
    hearts: d.total_hearts,
    count: d.donation_count,
    intensity: maxVal > 0 ? (metricMode === 'hearts' ? d.total_hearts : d.donation_count) / maxVal : 0,
    isPeak: d.hour === peakHour?.hour,
  }))

  const getBarColor = (intensity: number, isPeak: boolean) => {
    if (isPeak) return '#fd68ba'
    const alpha = 0.2 + intensity * 0.6
    return `rgba(59, 130, 246, ${alpha})`
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>시간대별 후원 패턴</h3>
        <div className={styles.controls}>
          <div className={styles.viewToggle}>
            {(['overall', 'perBj', 'heatmap', 'donors'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                className={`${styles.toggleBtn} ${viewMode === mode ? styles.active : ''}`}
                onClick={() => setViewMode(mode)}
              >
                {{ overall: '전체', perBj: 'BJ별', heatmap: '히트맵', donors: '후원자별' }[mode]}
              </button>
            ))}
          </div>
          {viewMode === 'overall' && (
            <div className={styles.viewToggle}>
              <button
                className={`${styles.toggleBtn} ${metricMode === 'hearts' ? styles.active : ''}`}
                onClick={() => setMetricMode('hearts')}
              >
                하트
              </button>
              <button
                className={`${styles.toggleBtn} ${metricMode === 'count' ? styles.active : ''}`}
                onClick={() => setMetricMode('count')}
              >
                건수
              </button>
            </div>
          )}
          <button className={styles.refreshBtn} onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw size={16} className={isRefreshing ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {peakHour && viewMode === 'overall' && (
        <div className={styles.peakInfo}>
          <span className={styles.peakLabel}>피크 시간대</span>
          <span className={styles.peakValue}>{formatHour(peakHour.hour)}</span>
          <span className={styles.peakDetail}>
            ({metricMode === 'hearts'
              ? `${peakHour.total_hearts.toLocaleString()} 하트`
              : `${peakHour.donation_count.toLocaleString()}건`
            })
          </span>
          <span className={styles.peakDesc}>후원이 가장 활발한 시간대입니다</span>
        </div>
      )}

      {/* 전체 뷰 */}
      {viewMode === 'overall' && (
        <>
          <ChartContainer height={400}>
            <BarChart data={overallChartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid {...CHART_THEME.grid} />
              <XAxis dataKey="hour" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick, fontSize: 11 }} interval={1} />
              <YAxis yAxisId="left" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} tickFormatter={formatChartNumber} />
              <YAxis yAxisId="right" orientation="right" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} tickFormatter={(v: number) => `${v}건`} />
              <ChartTooltip
                valueFormatter={(v, name) => name === '하트' ? `${v.toLocaleString()} 하트` : `${v.toLocaleString()}건`}
              />
              {metricMode === 'hearts' ? (
                <Bar yAxisId="left" dataKey="hearts" name="하트" radius={[4, 4, 0, 0]} maxBarSize={24}>
                  {overallChartData.map((entry, i) => (
                    <Cell key={i} fill={getBarColor(entry.intensity, entry.isPeak)} />
                  ))}
                </Bar>
              ) : (
                <Bar yAxisId="right" dataKey="count" name="건수" radius={[4, 4, 0, 0]} maxBarSize={24}>
                  {overallChartData.map((entry, i) => (
                    <Cell key={i} fill={getBarColor(entry.intensity, entry.isPeak)} />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ChartContainer>

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
        </>
      )}

      {/* BJ별 뷰 */}
      {viewMode === 'perBj' && (
        <div className={styles.perBjSection}>
          {isTimePatternEnhancedLoading ? (
            <div className={styles.loading}><Loader2 size={24} className={styles.spinner} /> 로딩 중...</div>
          ) : (
            <>
              <div className={styles.bjSelector}>
                <select
                  value={selectedBj || ''}
                  onChange={(e) => setSelectedBj(e.target.value || null)}
                  className={styles.bjSelect}
                >
                  <option value="">BJ 선택...</option>
                  {timePatternEnhanced?.perBj.map(b => (
                    <option key={b.bj_name} value={b.bj_name}>
                      {b.bj_name} (피크: {formatHour(b.peak_hour)})
                    </option>
                  ))}
                </select>
              </div>

              {bjChartData && (
                <ChartContainer title={`${selectedBj} - 시간대별 하트`} height={350}>
                  <BarChart data={bjChartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid {...CHART_THEME.grid} />
                    <XAxis dataKey="hour" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick, fontSize: 11 }} interval={1} />
                    <YAxis {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} tickFormatter={formatChartNumber} />
                    <ChartTooltip valueFormatter={(v) => `${v.toLocaleString()} 하트`} />
                    <Bar dataKey="hearts" name="하트" radius={[4, 4, 0, 0]} maxBarSize={24}>
                      {bjChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.isPeak ? '#fd68ba' : `rgba(59, 130, 246, ${0.2 + entry.intensity * 0.6})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}

              {!selectedBj && (
                <div className={styles.emptyBj}>
                  <p>BJ를 선택하면 해당 BJ의 시간대별 후원 패턴을 볼 수 있습니다.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 히트맵 뷰 */}
      {viewMode === 'heatmap' && (
        <div className={styles.heatmapSection}>
          {isTimePatternEnhancedLoading ? (
            <div className={styles.loading}><Loader2 size={24} className={styles.spinner} /> 로딩 중...</div>
          ) : heatmapData.bjs.length > 0 ? (
            <>
              <p className={styles.heatmapDesc}>BJ(행) × 시간(열) - 색상 강도 = 하트 비중</p>
              <div className={styles.heatmapWrapper}>
                <div className={styles.heatmapGrid} style={{ gridTemplateColumns: `120px repeat(24, 1fr)` }}>
                  {/* 헤더 */}
                  <div className={styles.heatmapHeader}></div>
                  {heatmapData.hours.map(h => (
                    <div key={h} className={styles.heatmapHeader}>{h}</div>
                  ))}

                  {/* 데이터 행 */}
                  {heatmapData.bjs.slice(0, 15).map(bj => (
                    <Fragment key={`row-${bj}`}>
                      <div className={styles.heatmapLabel}>{bj}</div>
                      {heatmapData.hours.map(hour => {
                        const cell = heatmapData.cells.find(c => c.bj_name === bj && c.hour === hour)
                        const intensity = cell?.intensity ?? 0
                        return (
                          <div
                            key={`${bj}-${hour}`}
                            className={styles.heatmapCell}
                            style={{ background: `rgba(253, 104, 186, ${Math.max(intensity * 0.9, 0.03)})` }}
                            title={`${bj} ${formatHour(hour)}: ${(cell?.hearts ?? 0).toLocaleString()} 하트`}
                          >
                            {intensity > 0.3 && <span>{cell?.hearts ? formatChartNumber(cell.hearts) : ''}</span>}
                          </div>
                        )
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className={styles.emptyBj}><p>히트맵 데이터가 없습니다.</p></div>
          )}
        </div>
      )}

      {/* 후원자별 뷰 */}
      {viewMode === 'donors' && (
        <div className={styles.donorTimeSection}>
          {isTimePatternEnhancedLoading ? (
            <div className={styles.loading}><Loader2 size={24} className={styles.spinner} /> 로딩 중...</div>
          ) : timePatternEnhanced?.topDonorTimes && timePatternEnhanced.topDonorTimes.length > 0 ? (
            <div className={styles.donorTimeList}>
              {timePatternEnhanced.topDonorTimes.map(donor => (
                <div key={donor.donor_name} className={styles.donorTimeCard}>
                  <div
                    className={styles.donorTimeHeader}
                    onClick={() => setExpandedDonor(expandedDonor === donor.donor_name ? null : donor.donor_name)}
                  >
                    <span className={styles.donorTimeName}>{donor.donor_name}</span>
                    <span className={styles.donorTimeHearts}>{donor.total_hearts.toLocaleString()} 하트</span>
                    <span className={styles.donorTimePeak}>피크: {formatHour(donor.peak_hour)}</span>
                  </div>
                  {expandedDonor === donor.donor_name && (
                    <div className={styles.donorTimeBars}>
                      {donor.hours.map(h => {
                        const max = Math.max(...donor.hours.map(x => x.hearts), 1)
                        const pct = (h.hearts / max) * 100
                        return (
                          <div key={h.hour} className={styles.donorTimeBar} title={`${formatHour(h.hour)}: ${h.hearts.toLocaleString()}`}>
                            <div className={styles.donorTimeBarFill} style={{ width: `${pct}%`, background: h.hour === donor.peak_hour ? '#fd68ba' : '#3b82f6' }} />
                            <span className={styles.donorTimeHour}>{h.hour}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyBj}><p>후원자별 시간 데이터가 없습니다.</p></div>
          )}
        </div>
      )}
    </div>
  )
}
