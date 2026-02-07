'use client'

import { useState } from 'react'
import { Search, Loader2, User, Heart, BarChart as BarChartIcon } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { DonorSearch } from '@/lib/actions/analytics'
import { ChartContainer, ChartTooltip, CHART_COLORS, CHART_THEME, formatChartNumber } from './charts/RechartsTheme'
import styles from './DonorSearchPanel.module.css'

interface DonorSearchPanelProps {
  result: DonorSearch | null
  isLoading: boolean
  onSearch: (name: string) => Promise<void>
}

const PATTERN_COLORS: Record<string, string> = {
  올인형: '#ef4444',
  분산형: '#3b82f6',
  소액다건: '#10b981',
  고액소건: '#f59e0b',
  일반: '#6b7280',
}

export function DonorSearchPanel({ result, isLoading, onSearch }: DonorSearchPanelProps) {
  const [query, setQuery] = useState('')

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const formatNumber = (num: number) => num.toLocaleString()

  const pieData = result?.bj_distribution.map(bj => ({
    name: bj.bj_name,
    value: bj.hearts,
    percent: bj.percent,
  })) || []

  const epBarData = result?.episodes.map(ep => ({
    name: ep.episode_title.replace(/^에피소드\s*/, ''),
    hearts: ep.hearts,
    count: ep.count,
  })) || []

  return (
    <div className={styles.container}>
      <div className={styles.searchBox}>
        <input
          type="text"
          placeholder="후원자 닉네임을 입력하세요..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className={styles.searchInput}
        />
        <button className={styles.searchBtn} onClick={handleSearch} disabled={isLoading || !query.trim()}>
          {isLoading ? <Loader2 size={20} className={styles.spinner} /> : <Search size={20} />}
        </button>
      </div>

      {isLoading && (
        <div className={styles.loading}>
          <Loader2 size={32} className={styles.spinner} />
          <span>검색 중...</span>
        </div>
      )}

      {!isLoading && result === null && query && (
        <div className={styles.noResult}>
          <User size={48} />
          <p>검색 결과가 없습니다.</p>
        </div>
      )}

      {!isLoading && result && (
        <div className={styles.result}>
          <div className={styles.profileCard}>
            <div className={styles.profileHeader}>
              <div className={styles.avatar}><User size={32} /></div>
              <div className={styles.profileInfo}>
                <h3 className={styles.donorName}>{result.donor_name}</h3>
                <span className={styles.patternBadge} style={{ background: PATTERN_COLORS[result.pattern_type] }}>
                  {result.pattern_type}
                </span>
              </div>
            </div>
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <Heart size={16} className={styles.statIcon} />
                <span className={styles.statValue}>{formatNumber(result.total_hearts)}</span>
                <span className={styles.statLabel}>총 하트</span>
              </div>
              <div className={styles.statItem}>
                <BarChartIcon size={16} className={styles.statIcon} />
                <span className={styles.statValue}>{result.donation_count}</span>
                <span className={styles.statLabel}>후원 건수</span>
              </div>
            </div>
          </div>

          {epBarData.length > 0 && (
            <div className={styles.section}>
              <ChartContainer title="에피소드별 참여" height={Math.max(200, epBarData.length * 32)}>
                <BarChart data={epBarData} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                  <CartesianGrid {...CHART_THEME.grid} horizontal={false} />
                  <XAxis type="number" {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick }} tickFormatter={formatChartNumber} />
                  <YAxis type="category" dataKey="name" width={80} {...CHART_THEME.axis} tick={{ ...CHART_THEME.axis.tick, fontSize: 11 }} />
                  <ChartTooltip valueFormatter={(v) => `${v.toLocaleString()} 하트`} />
                  <Bar dataKey="hearts" name="하트" fill="#fd68ba" radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ChartContainer>
            </div>
          )}

          {pieData.length > 0 && (
            <div className={styles.section}>
              <ChartContainer title="BJ별 후원 분포 (전체 출연자)" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${percent}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip valueFormatter={(v) => `${v.toLocaleString()} 하트`} />
                </PieChart>
              </ChartContainer>
            </div>
          )}
        </div>
      )}

      {!isLoading && !result && !query && (
        <div className={styles.placeholder}>
          <Search size={48} />
          <p>후원자를 검색하여 상세 분석을 확인하세요</p>
        </div>
      )}
    </div>
  )
}
