'use client'

import { useState, useMemo } from 'react'
import { RefreshCw, Loader2, Filter, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react'
import { PieChart, Pie, Cell } from 'recharts'
import type { DonorPattern } from '@/lib/actions/analytics'
import { ChartContainer, ChartTooltip, CHART_COLORS } from './charts/RechartsTheme'
import styles from './DonorPatternsTable.module.css'

interface DonorPatternsTableProps {
  patterns: DonorPattern[]
  isLoading: boolean
  onRefresh: () => Promise<void>
}

type PatternType = '전체' | '올인형' | '분산형' | '소액다건' | '고액소건' | '일반'
type TrendFilter = 'all' | 'increasing' | 'decreasing' | 'stable'

const PATTERN_COLORS: Record<string, string> = {
  올인형: '#ef4444',
  분산형: '#3b82f6',
  소액다건: '#10b981',
  고액소건: '#f59e0b',
  일반: '#6b7280',
}

const PATTERN_DESCRIPTIONS: Record<string, string> = {
  올인형: '한 BJ에 80% 이상 집중',
  분산형: '3명 이상 BJ에 골고루',
  소액다건: '평균 5천 미만, 5건 이상',
  고액소건: '평균 1만 이상, 3건 이하',
  일반: '일반적인 후원 패턴',
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'increasing') return <TrendingUp size={14} color="#10b981" />
  if (trend === 'decreasing') return <TrendingDown size={14} color="#ef4444" />
  return <Minus size={14} color="#6b7280" />
}

export function DonorPatternsTable({ patterns, isLoading, onRefresh }: DonorPatternsTableProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filterType, setFilterType] = useState<PatternType>('전체')
  const [trendFilter, setTrendFilter] = useState<TrendFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedDonor, setExpandedDonor] = useState<string | null>(null)

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
        <h3 className={styles.title}>후원자 패턴 분류</h3>
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
            <ChartContainer title="패턴 분포" height={220}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name} ${value}`}
                  labelLine={false}
                >
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip valueFormatter={(v) => `${v}명`} />
              </PieChart>
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
              <th>총 하트</th>
              <th>건수</th>
              <th>참여</th>
              <th>추이</th>
              <th>BJ 수</th>
              <th>최대 비중</th>
              <th>주 대상</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredPatterns.slice(0, 100).map((p) => {
              const isExpanded = expandedDonor === p.donor_name
              return (
                <>
                  <tr
                    key={p.donor_name}
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
                      <td colSpan={10}>
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
                            첫 참여: {p.first_episode}화 / 최근: {p.last_episode}화
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
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
    </div>
  )
}
