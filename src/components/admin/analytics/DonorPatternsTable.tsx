'use client'

import { useState, useMemo, Fragment } from 'react'
import { RefreshCw, Loader2, Filter, TrendingUp, TrendingDown, Minus, ChevronRight, Search, User, Heart, BarChart as BarChartIcon, Clock } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import type { DonorPattern, DonorSearch } from '@/lib/actions/analytics'
import type { RFMData, RFMEntry } from '@/lib/actions/analytics-advanced'
import { ChartContainer, ChartTooltip, CHART_COLORS, CHART_THEME, formatChartNumber } from './charts/RechartsTheme'
import styles from './DonorPatternsTable.module.css'

interface DonorPatternsTableProps {
  patterns: DonorPattern[]
  isLoading: boolean
  onRefresh: () => Promise<void>
  searchResult: DonorSearch | null
  isSearchLoading: boolean
  onSearch: (name: string) => Promise<void>
  rfmData?: RFMData | null
  isRfmLoading?: boolean
}

type PatternType = '전체' | '올인형' | '분산형' | '소액다건' | '고액소건' | '꾸준형' | '급성장형' | '일반'
type TrendFilter = 'all' | 'increasing' | 'decreasing' | 'stable'

const PATTERN_COLORS: Record<string, string> = {
  올인형: '#ef4444',
  분산형: '#3b82f6',
  소액다건: '#10b981',
  고액소건: '#f59e0b',
  꾸준형: '#8b5cf6',
  급성장형: '#06b6d4',
  일반: '#6b7280',
}

const PATTERN_DESCRIPTIONS: Record<string, string> = {
  올인형: '한 BJ에 80% 이상 집중',
  분산형: '3명 이상 BJ에 골고루',
  소액다건: '평균 3천 미만, 5건 이상',
  고액소건: '평균 2만 이상, 3건 이하',
  꾸준형: '60%+ 참여, 안정적 후원',
  급성장형: '점진적 후원 증가 추세',
  일반: '일반적인 후원 패턴',
}

const TREND_LABELS: Record<string, string> = {
  increasing: '점진적 증가 (회귀 기반)',
  decreasing: '점진적 감소 (회귀 기반)',
  stable: '안정적 추세',
}

const SEGMENT_COLORS: Record<string, string> = {
  '핵심 VIP': '#d4a800',
  '충성 고래': '#3b82f6',
  '성장 잠재력': '#10b981',
  '고액 장기부재': '#ef4444',
  '복귀 대상 고래': '#6b7280',
  '신규 관심자': '#06b6d4',
  '장기 부재': '#9ca3af',
  '일반': '#8b5cf6',
}

/** R/F/M 점수(1-5)를 ★☆로 표현 */
function StarRating({ score, label }: { score: number; label: string }) {
  return (
    <span className={styles.starRow} title={`${label} ${score}/5`}>
      <span className={styles.starLabel}>{label}</span>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < score ? styles.starFilled : styles.starEmpty}>★</span>
      ))}
    </span>
  )
}

function TrendIcon({ trend }: { trend: string }) {
  const label = TREND_LABELS[trend] || ''
  if (trend === 'increasing') return <span title={label}><TrendingUp size={14} color="#10b981" /></span>
  if (trend === 'decreasing') return <span title={label}><TrendingDown size={14} color="#ef4444" /></span>
  return <span title={label}><Minus size={14} color="#6b7280" /></span>
}

export function DonorPatternsTable({ patterns, isLoading, onRefresh, searchResult, isSearchLoading, onSearch, rfmData, isRfmLoading: _isRfmLoading }: DonorPatternsTableProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filterType, setFilterType] = useState<PatternType>('전체')
  const [trendFilter, setTrendFilter] = useState<TrendFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedDonor, setExpandedDonor] = useState<string | null>(null)
  const [detailQuery, setDetailQuery] = useState('')
  const [showDetailSearch, setShowDetailSearch] = useState(false)

  // RFM 세그먼트 매핑 (donor_name → RFM entry)
  const rfmMap = useMemo(() => {
    if (!rfmData?.entries) return new Map<string, RFMEntry>()
    const map = new Map<string, RFMEntry>()
    for (const entry of rfmData.entries) {
      map.set(entry.donor_name, entry)
    }
    return map
  }, [rfmData])


  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setIsRefreshing(false)
  }

  // 패턴별 통계
  const patternStats = useMemo(() => {
    const stats: Record<string, number> = {
      올인형: 0,
      분산형: 0,
      소액다건: 0,
      고액소건: 0,
      꾸준형: 0,
      급성장형: 0,
      일반: 0,
    }
    patterns.forEach((p) => {
      stats[p.pattern_type] = (stats[p.pattern_type] || 0) + 1
    })
    return stats
  }, [patterns])

  // 패턴 분포 도넛 차트
  const donutData = useMemo(() => {
    return Object.entries(patternStats)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({
        name: type,
        value: count,
        color: PATTERN_COLORS[type],
      }))
  }, [patternStats])

  // 필터링된 데이터
  const filteredPatterns = useMemo(() => {
    return patterns.filter((p) => {
      const matchesType = filterType === '전체' || p.pattern_type === filterType
      const matchesSearch = p.donor_name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTrend = trendFilter === 'all' || p.trend === trendFilter
      return matchesType && matchesSearch && matchesTrend
    })
  }, [patterns, filterType, searchQuery, trendFilter])

  // 상세 검색 데이터
  const searchPieData = useMemo(() =>
    searchResult?.bj_distribution.map(bj => ({
      name: bj.bj_name,
      value: bj.hearts,
      percent: bj.percent,
    })) || [], [searchResult])

  const searchEpBarData = useMemo(() =>
    searchResult?.episodes.map(ep => ({
      name: ep.episode_title.replace(/^에피소드\s*/, ''),
      hearts: ep.hearts,
    })) || [], [searchResult])

  const handleDetailSearch = () => {
    if (detailQuery.trim()) {
      setShowDetailSearch(true)
      onSearch(detailQuery.trim())
    }
  }

  const handleDetailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleDetailSearch()
  }

  const formatNumber = (num: number) => num.toLocaleString()

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Loader2 size={32} className={styles.spinner} />
        <span>데이터를 불러오는 중...</span>
      </div>
    )
  }

  if (patterns.length === 0) {
    return (
      <div className={styles.empty}>
        <p>후원자 패턴 데이터가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>후원자 유형 분석</h3>
          <p className={styles.headerDesc}>후원 습관에 따라 후원자를 유형별로 나눠봤습니다</p>
        </div>
        <button
          className={styles.refreshBtn}
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={isRefreshing ? styles.spinning : ''} />
          새로고침
        </button>
      </div>

      {/* 패턴 분포 도넛 차트 + 패턴별 통계 */}
      <div className={styles.topSection}>
        {donutData.length > 0 && (
          <div className={styles.donutWrapper}>
            <ChartContainer title="패턴 분포" height={Math.max(160, donutData.length * 40)}>
              <BarChart data={donutData} layout="vertical" margin={{ top: 5, right: 50, left: 10, bottom: 5 }}>
                <CartesianGrid {...CHART_THEME.grid} horizontal={false} />
                <XAxis type="number" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} />
                <YAxis type="category" dataKey="name" width={70} {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick, fontSize: 13 }} />
                <ChartTooltip valueFormatter={(v) => `${v}명`} />
                <Bar dataKey="value" name="후원자" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        )}

        <div className={styles.statsGrid}>
          {Object.entries(patternStats).map(([type, count]) => (
            <button
              key={type}
              className={`${styles.statCard} ${filterType === type ? styles.active : ''}`}
              onClick={() => setFilterType(filterType === type ? '전체' : type as PatternType)}
              style={{ '--pattern-color': PATTERN_COLORS[type] } as React.CSSProperties}
            >
              <span className={styles.statType}>{type}</span>
              <span className={styles.statCount}>{count}명</span>
              <span className={styles.statDesc}>{PATTERN_DESCRIPTIONS[type]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 검색 + 필터 */}
      <div className={styles.searchWrapper}>
        <input
          type="text"
          placeholder="후원자 닉네임 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        <div className={styles.trendToggle}>
          {(['all', 'increasing', 'decreasing', 'stable'] as TrendFilter[]).map(t => (
            <button
              key={t}
              className={`${styles.trendBtn} ${trendFilter === t ? styles.trendActive : ''}`}
              onClick={() => setTrendFilter(t)}
            >
              {{ all: '전체', increasing: '증가', decreasing: '감소', stable: '안정' }[t]}
            </button>
          ))}
        </div>
        <span className={styles.trendDesc}>전체 시즌 전반/후반 평균 비교 · 불참 회차 = 0 포함</span>
        {filterType !== '전체' && (
          <span className={styles.filterBadge} style={{ background: PATTERN_COLORS[filterType] }}>
            <Filter size={12} />
            {filterType}
            <button onClick={() => setFilterType('전체')}>×</button>
          </span>
        )}
      </div>

      {/* 테이블 */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>닉네임</th>
              <th>패턴</th>
              <th>등급</th>
              <th>총 하트</th>
              <th>후원 횟수</th>
              <th>참여 회차</th>
              <th>변화</th>
              <th>후원 BJ</th>
              <th>집중도</th>
              <th>주력 BJ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredPatterns.slice(0, 100).map((p) => {
              const isExpanded = expandedDonor === p.donor_name
              return (
                <Fragment key={p.donor_name}>
                  <tr
                    onClick={() => setExpandedDonor(isExpanded ? null : p.donor_name)}
                    style={{ cursor: 'pointer' }}
                    className={isExpanded ? styles.expandedRow : ''}
                  >
                    <td className={styles.donorName}>{p.donor_name}</td>
                    <td>
                      <span
                        className={styles.patternBadge}
                        style={{ background: PATTERN_COLORS[p.pattern_type] }}
                      >
                        {p.pattern_type}
                      </span>
                    </td>
                    <td>
                      {(() => {
                        const rfm = rfmMap.get(p.donor_name)
                        if (!rfm) return <span className={styles.rfmNA}>-</span>
                        const segColor = SEGMENT_COLORS[rfm.segment] || '#8b5cf6'
                        return (
                          <div className={styles.rfmCell}>
                            <span
                              className={styles.rfmSegmentTag}
                              style={{ background: `${segColor}18`, color: segColor, borderColor: `${segColor}40` }}
                            >
                              {rfm.segment}
                            </span>
                            <div className={styles.rfmStars}>
                              <StarRating score={rfm.r_score} label="최근" />
                              <StarRating score={rfm.f_score} label="빈도" />
                              <StarRating score={rfm.m_score} label="금액" />
                            </div>
                          </div>
                        )
                      })()}
                    </td>
                    <td className={styles.hearts}>{formatNumber(p.total_hearts)}</td>
                    <td>{p.donation_count}</td>
                    <td>{p.episodes_participated}회</td>
                    <td><TrendIcon trend={p.trend} /></td>
                    <td>{p.unique_bjs}</td>
                    <td>{p.max_bj_ratio}%</td>
                    <td className={styles.favoriteBj}>{p.favorite_bj}</td>
                    <td className={styles.expandCol}>
                      <ChevronRight
                        size={14}
                        className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ''}`}
                      />
                    </td>
                  </tr>
                  {isExpanded && p.bj_distribution.length > 0 && (
                    <tr key={`${p.donor_name}-detail`} className={styles.detailRow}>
                      <td colSpan={11}>
                        <div className={styles.bjDistribution}>
                          <span className={styles.bjDistTitle}>BJ별 분포</span>
                          <div className={styles.bjDistBars}>
                            {p.bj_distribution.slice(0, 5).map(bj => (
                              <div key={bj.bj_name} className={styles.bjDistItem}>
                                <span className={styles.bjDistName}>{bj.bj_name}</span>
                                <div className={styles.bjDistBarBg}>
                                  <div
                                    className={styles.bjDistBarFill}
                                    style={{ width: `${bj.percent}%` }}
                                  />
                                </div>
                                <span className={styles.bjDistPct}>{bj.percent}%</span>
                              </div>
                            ))}
                          </div>
                          <div className={styles.bjDistMeta}>
                            <span>첫 참여: {p.first_episode}화 / 최근: {p.last_episode}화</span>
                            {p.peak_hours && p.peak_hours.length > 0 && (
                              <span className={styles.peakHours}>
                                <Clock size={12} className={styles.peakIcon} />
                                {p.peak_hours.map((h, i) => {
                                  const ampm = h.hour < 12 ? '오전' : '오후'
                                  const h12 = h.hour === 0 ? 12 : h.hour > 12 ? h.hour - 12 : h.hour
                                  return (
                                    <span key={h.hour} className={i === 0 ? styles.peakTop : styles.peakSub}>
                                      {ampm} {h12}시<span className={styles.peakCount}>({h.count}건)</span>
                                    </span>
                                  )
                                })}
                              </span>
                            )}
                          </div>
                          {(() => {
                            const rfm = rfmMap.get(p.donor_name)
                            if (!rfm) return null
                            return (
                              <div className={styles.crmInsights}>
                                <div className={styles.crmInsightItem}>
                                  <span className={styles.crmInsightLabel}>후원자 등급</span>
                                  <span className={styles.rfmSegmentBadge}>{rfm.segment}</span>
                                  <span className={styles.crmInsightDesc}>{rfm.recommendation}</span>
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
        {filteredPatterns.length > 100 && (
          <div className={styles.moreInfo}>
            +{filteredPatterns.length - 100}명 더 있음
          </div>
        )}
      </div>

      {/* 후원자 상세 검색 */}
      <div className={styles.detailSearchSection}>
        <div className={styles.detailSearchHeader}>
          <h3 className={styles.detailSearchTitle}>
            <Search size={18} />
            후원자 상세 검색
          </h3>
        </div>
        <div className={styles.detailSearchBox}>
          <input
            type="text"
            placeholder="후원자 닉네임을 입력하세요..."
            value={detailQuery}
            onChange={e => setDetailQuery(e.target.value)}
            onKeyDown={handleDetailKeyDown}
            className={styles.detailSearchInput}
          />
          <button
            className={styles.detailSearchBtn}
            onClick={handleDetailSearch}
            disabled={isSearchLoading || !detailQuery.trim()}
          >
            {isSearchLoading ? <Loader2 size={18} className={styles.spinner} /> : <Search size={18} />}
          </button>
        </div>

        {isSearchLoading && (
          <div className={styles.detailLoading}>
            <Loader2 size={24} className={styles.spinner} />
            <span>검색 중...</span>
          </div>
        )}

        {!isSearchLoading && showDetailSearch && !searchResult && (
          <div className={styles.detailNoResult}>
            <User size={36} />
            <p>검색 결과가 없습니다.</p>
          </div>
        )}

        {!isSearchLoading && searchResult && (
          <div className={styles.detailResult}>
            <div className={styles.detailProfile}>
              <div className={styles.detailProfileLeft}>
                <div className={styles.detailAvatar}><User size={24} /></div>
                <div>
                  <span className={styles.detailName}>{searchResult.donor_name}</span>
                  <span
                    className={styles.patternBadge}
                    style={{ background: PATTERN_COLORS[searchResult.pattern_type] }}
                  >
                    {searchResult.pattern_type}
                  </span>
                </div>
              </div>
              <div className={styles.detailStats}>
                <div className={styles.detailStatItem}>
                  <Heart size={14} color="#fd68ba" />
                  <span className={styles.detailStatValue}>{formatNumber(searchResult.total_hearts)}</span>
                  <span className={styles.detailStatLabel}>하트</span>
                </div>
                <div className={styles.detailStatItem}>
                  <BarChartIcon size={14} color="#3b82f6" />
                  <span className={styles.detailStatValue}>{searchResult.donation_count}</span>
                  <span className={styles.detailStatLabel}>건수</span>
                </div>
              </div>
              {(() => {
                const rfm = rfmMap.get(searchResult.donor_name)
                if (!rfm) return null
                return (
                  <div className={styles.searchCrmBadges}>
                    <span
                      className={styles.rfmSegmentBadge}
                      style={{
                        background: `${SEGMENT_COLORS[rfm.segment] || '#8b5cf6'}18`,
                        color: SEGMENT_COLORS[rfm.segment] || '#8b5cf6',
                      }}
                    >
                      {rfm.segment}
                    </span>
                  </div>
                )
              })()}
            </div>

            <div className={styles.detailCharts}>
              {searchEpBarData.length > 0 && (
                <ChartContainer title="에피소드별 참여" height={Math.max(180, searchEpBarData.length * 28)}>
                  <BarChart data={searchEpBarData} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                    <CartesianGrid {...CHART_THEME.grid} horizontal={false} />
                    <XAxis type="number" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} tickFormatter={formatChartNumber} />
                    <YAxis type="category" dataKey="name" width={80} {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick, fontSize: 11 }} />
                    <ChartTooltip valueFormatter={(v) => `${v.toLocaleString()} 하트`} />
                    <Bar dataKey="hearts" name="하트" fill="#fd68ba" radius={[0, 4, 4, 0]} maxBarSize={20} />
                  </BarChart>
                </ChartContainer>
              )}

              {searchPieData.length > 0 && (
                <ChartContainer title="BJ별 후원 분포" height={240}>
                  <PieChart>
                    <Pie
                      data={searchPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={85}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${percent}%`}
                      labelLine={false}
                    >
                      {searchPieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip valueFormatter={(v) => `${v.toLocaleString()} 하트`} />
                  </PieChart>
                </ChartContainer>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
