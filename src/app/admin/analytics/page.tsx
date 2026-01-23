'use client'

import { useState } from 'react'
import { BarChart3, TrendingUp, Users, Clock, Search, GitCompare } from 'lucide-react'
import { useAnalytics } from '@/lib/hooks'
import {
  AnalyticsSummaryCard,
  BjStatsTable,
  TimePatternChart,
  DonorPatternsTable,
  DonorSearchPanel,
  EpisodeComparisonPanel,
} from '@/components/admin/analytics'
import styles from './page.module.css'

type TabType = 'overview' | 'bj' | 'time' | 'patterns' | 'compare' | 'search'

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  const {
    seasonId,
    episodeId,
    setSeasonId,
    setEpisodeId,
    summary,
    bjStats,
    timePattern,
    donorPatterns,
    episodeComparison,
    donorSearchResult,
    isLoading,
    isSummaryLoading,
    isBjStatsLoading,
    isTimePatternLoading,
    isDonorPatternsLoading,
    isComparisonLoading,
    isSearchLoading,
    error,
    seasons,
    episodes,
    loadBjStats,
    loadTimePattern,
    loadDonorPatterns,
    loadEpisodeComparison,
    searchDonorByName,
    loadDonorBjRelations,
    donorBjRelations,
  } = useAnalytics({ autoLoad: true })

  const tabs = [
    { id: 'overview', label: '요약', icon: BarChart3 },
    { id: 'bj', label: 'BJ별 현황', icon: Users },
    { id: 'time', label: '시간대 패턴', icon: Clock },
    { id: 'patterns', label: '후원자 패턴', icon: TrendingUp },
    { id: 'compare', label: '회차별 비교', icon: GitCompare },
    { id: 'search', label: '후원자 검색', icon: Search },
  ]

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <BarChart3 size={28} />
          후원 분석 대시보드
        </h1>

        {/* 필터 */}
        <div className={styles.filters}>
          <select
            value={seasonId || ''}
            onChange={(e) => setSeasonId(e.target.value ? Number(e.target.value) : undefined)}
            className={styles.select}
          >
            <option value="">전체 시즌</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={episodeId || ''}
            onChange={(e) => setEpisodeId(e.target.value ? Number(e.target.value) : undefined)}
            className={styles.select}
            disabled={!seasonId}
          >
            <option value="">전체 에피소드</option>
            {episodes
              .filter((e) => !seasonId || e.season_id === seasonId)
              .map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
          </select>
        </div>
      </header>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {/* 탭 네비게이션 */}
      <nav className={styles.tabs}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
              onClick={() => setActiveTab(tab.id as TabType)}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* 탭 콘텐츠 */}
      <div className={styles.content}>
        {activeTab === 'overview' && (
          <AnalyticsSummaryCard
            summary={summary}
            bjStats={bjStats}
            isLoading={isSummaryLoading || isBjStatsLoading}
          />
        )}

        {activeTab === 'bj' && (
          <BjStatsTable
            bjStats={bjStats}
            isLoading={isBjStatsLoading}
            onRefresh={loadBjStats}
          />
        )}

        {activeTab === 'time' && (
          <TimePatternChart
            timePattern={timePattern}
            isLoading={isTimePatternLoading}
            onRefresh={loadTimePattern}
          />
        )}

        {activeTab === 'patterns' && (
          <DonorPatternsTable
            patterns={donorPatterns}
            isLoading={isDonorPatternsLoading}
            onRefresh={loadDonorPatterns}
          />
        )}

        {activeTab === 'compare' && (
          <EpisodeComparisonPanel
            episodes={episodes}
            comparison={episodeComparison}
            isLoading={isComparisonLoading}
            onCompare={loadEpisodeComparison}
          />
        )}

        {activeTab === 'search' && (
          <DonorSearchPanel
            result={donorSearchResult}
            isLoading={isSearchLoading}
            onSearch={searchDonorByName}
          />
        )}
      </div>
    </div>
  )
}
