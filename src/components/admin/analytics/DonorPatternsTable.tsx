'use client'

import { useState, useMemo } from 'react'
import { RefreshCw, Loader2, Filter } from 'lucide-react'
import type { DonorPattern } from '@/lib/actions/analytics'
import styles from './DonorPatternsTable.module.css'

interface DonorPatternsTableProps {
  patterns: DonorPattern[]
  isLoading: boolean
  onRefresh: () => Promise<void>
}

type PatternType = '전체' | '올인형' | '분산형' | '소액다건' | '고액소건' | '일반'

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

export function DonorPatternsTable({ patterns, isLoading, onRefresh }: DonorPatternsTableProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filterType, setFilterType] = useState<PatternType>('전체')
  const [searchQuery, setSearchQuery] = useState('')

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

  // 필터링된 데이터
  const filteredPatterns = useMemo(() => {
    return patterns.filter((p) => {
      const matchesType = filterType === '전체' || p.pattern_type === filterType
      const matchesSearch = p.donor_name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesType && matchesSearch
    })
  }, [patterns, filterType, searchQuery])

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

      {/* 패턴별 통계 */}
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

      {/* 검색 */}
      <div className={styles.searchWrapper}>
        <input
          type="text"
          placeholder="후원자 닉네임 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
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
              <th>BJ 수</th>
              <th>최대 비중</th>
              <th>평균 후원</th>
              <th>주 대상</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatterns.slice(0, 100).map((p) => (
              <tr key={p.donor_name}>
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
                <td>{p.unique_bjs}</td>
                <td>{p.max_bj_ratio}%</td>
                <td>{formatNumber(p.avg_donation)}</td>
                <td className={styles.favoriteBj}>{p.favorite_bj}</td>
              </tr>
            ))}
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
