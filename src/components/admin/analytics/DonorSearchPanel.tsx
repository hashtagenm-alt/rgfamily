'use client'

import { useState } from 'react'
import { Search, Loader2, User, Heart, BarChart } from 'lucide-react'
import type { DonorSearch } from '@/lib/actions/analytics'
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const formatNumber = (num: number) => num.toLocaleString()

  return (
    <div className={styles.container}>
      {/* 검색 입력 */}
      <div className={styles.searchBox}>
        <input
          type="text"
          placeholder="후원자 닉네임을 입력하세요..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className={styles.searchInput}
        />
        <button
          className={styles.searchBtn}
          onClick={handleSearch}
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? (
            <Loader2 size={20} className={styles.spinner} />
          ) : (
            <Search size={20} />
          )}
        </button>
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className={styles.loading}>
          <Loader2 size={32} className={styles.spinner} />
          <span>검색 중...</span>
        </div>
      )}

      {/* 결과 없음 */}
      {!isLoading && result === null && query && (
        <div className={styles.noResult}>
          <User size={48} />
          <p>검색 결과가 없습니다.</p>
        </div>
      )}

      {/* 결과 표시 */}
      {!isLoading && result && (
        <div className={styles.result}>
          {/* 프로필 카드 */}
          <div className={styles.profileCard}>
            <div className={styles.profileHeader}>
              <div className={styles.avatar}>
                <User size={32} />
              </div>
              <div className={styles.profileInfo}>
                <h3 className={styles.donorName}>{result.donor_name}</h3>
                <span
                  className={styles.patternBadge}
                  style={{ background: PATTERN_COLORS[result.pattern_type] }}
                >
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
                <BarChart size={16} className={styles.statIcon} />
                <span className={styles.statValue}>{result.donation_count}</span>
                <span className={styles.statLabel}>후원 건수</span>
              </div>
            </div>
          </div>

          {/* 에피소드별 참여 */}
          {result.episodes.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>에피소드별 참여</h4>
              <div className={styles.episodeList}>
                {result.episodes.map((ep) => (
                  <div key={ep.episode_id} className={styles.episodeItem}>
                    <span className={styles.episodeTitle}>{ep.episode_title}</span>
                    <span className={styles.episodeStats}>
                      {formatNumber(ep.hearts)} 하트 · {ep.count}건
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BJ별 분포 */}
          {result.bj_distribution.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>BJ별 후원 분포 (전체 출연자)</h4>
              <div className={styles.distributionChart}>
                {result.bj_distribution.map((bj, index) => (
                  <div key={bj.bj_name} className={styles.distributionItem}>
                    <div className={styles.bjInfo}>
                      <span className={styles.bjRank}>{index + 1}</span>
                      <span className={styles.bjName}>{bj.bj_name}</span>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${bj.percent}%` }}
                      />
                    </div>
                    <span className={styles.bjStats}>
                      {formatNumber(bj.hearts)} ({bj.percent}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 초기 상태 */}
      {!isLoading && !result && !query && (
        <div className={styles.placeholder}>
          <Search size={48} />
          <p>후원자를 검색하여 상세 분석을 확인하세요</p>
        </div>
      )}
    </div>
  )
}
