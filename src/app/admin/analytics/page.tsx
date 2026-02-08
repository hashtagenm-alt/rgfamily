'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Users, Clock, Search, GitCompare, Activity, Repeat } from 'lucide-react'
import { useAnalytics } from '@/lib/hooks'
import {
  AnalyticsSummaryCard,
  BjStatsTable,
  TimePatternChart,
  DonorPatternsTable,
  DonorSearchPanel,
  EpisodeComparisonPanel,
  EpisodeTrendPanel,
  DonorRetentionPanel,
} from '@/components/admin/analytics'
import styles from './page.module.css'

type TabType = 'overview' | 'trend' | 'bj' | 'retention' | 'time' | 'patterns' | 'compare' | 'search'

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
    episodeTrend,
    donorRetention,
    bjEpisodeTrend,
    isSummaryLoading,
    isBjStatsLoading,
    isTimePatternLoading,
    isDonorPatternsLoading,
    isComparisonLoading,
    isSearchLoading,
    isEpisodeTrendLoading,
    isDonorRetentionLoading,
    isBjEpisodeTrendLoading,
    bjDetailedStats,
    timePatternEnhanced,
    isBjDetailedStatsLoading,
    isTimePatternEnhancedLoading,
    error,
    seasons,
    episodes,
    loadBjStats,
    loadTimePattern,
    loadDonorPatterns,
    loadEpisodeComparison,
    searchDonorByName,
    loadEpisodeTrend,
    loadDonorRetention,
    loadBjEpisodeTrend,
    loadBjDetailedStats,
    loadTimePatternEnhanced,
  } = useAnalytics({ autoLoad: true })

  // Lazy loading: 탭 진입 시 해당 데이터만 로드 (초기에는 summary만 로드됨)
  useEffect(() => {
    // overview 탭: summary는 refreshAll에서 이미 로드됨, bjStats/episodeTrend는 lazy
    if (activeTab === 'overview') {
      if (bjStats.length === 0 && !isBjStatsLoading) loadBjStats()
      if (episodeTrend.length === 0 && !isEpisodeTrendLoading) loadEpisodeTrend()
    }
    if (activeTab === 'trend') {
      if (episodeTrend.length === 0 && !isEpisodeTrendLoading) loadEpisodeTrend()
      if (bjEpisodeTrend.length === 0 && !isBjEpisodeTrendLoading) loadBjEpisodeTrend()
    }
    if (activeTab === 'bj') {
      if (bjStats.length === 0 && !isBjStatsLoading) loadBjStats()
      if (bjEpisodeTrend.length === 0 && !isBjEpisodeTrendLoading) loadBjEpisodeTrend()
      if (bjDetailedStats.length === 0 && !isBjDetailedStatsLoading) loadBjDetailedStats()
    }
    if (activeTab === 'retention' && !donorRetention && !isDonorRetentionLoading) {
      loadDonorRetention()
    }
    if (activeTab === 'time') {
      if (timePattern.length === 0 && !isTimePatternLoading) loadTimePattern()
      if (!timePatternEnhanced && !isTimePatternEnhancedLoading) loadTimePatternEnhanced()
    }
    if (activeTab === 'patterns') {
      if (donorPatterns.length === 0 && !isDonorPatternsLoading) loadDonorPatterns()
    }
  }, [activeTab, bjStats.length, isBjStatsLoading, loadBjStats, episodeTrend.length, isEpisodeTrendLoading, loadEpisodeTrend, bjEpisodeTrend.length, isBjEpisodeTrendLoading, loadBjEpisodeTrend, bjDetailedStats.length, isBjDetailedStatsLoading, loadBjDetailedStats, donorRetention, isDonorRetentionLoading, loadDonorRetention, timePattern.length, isTimePatternLoading, loadTimePattern, timePatternEnhanced, isTimePatternEnhancedLoading, loadTimePatternEnhanced, donorPatterns.length, isDonorPatternsLoading, loadDonorPatterns])

  const tabs = [
    { id: 'overview', label: '요약', icon: BarChart3 },
    { id: 'trend', label: '회차별 추이', icon: Activity },
    { id: 'bj', label: 'BJ별 현황', icon: Users },
    { id: 'retention', label: '후원자 리텐션', icon: Repeat },
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

      <div className={styles.content}>
        {activeTab === 'overview' && (
          <AnalyticsSummaryCard
            summary={summary}
            bjStats={bjStats}
            episodeTrend={episodeTrend}
            isLoading={isSummaryLoading || isBjStatsLoading}
          />
        )}

        {activeTab === 'trend' && (
          <EpisodeTrendPanel
            episodeTrend={episodeTrend}
            bjEpisodeTrend={bjEpisodeTrend}
            isLoading={isEpisodeTrendLoading || isBjEpisodeTrendLoading}
          />
        )}

        {activeTab === 'bj' && (
          <BjStatsTable
            bjStats={bjStats}
            bjEpisodeTrend={bjEpisodeTrend}
            bjDetailedStats={bjDetailedStats}
            isBjDetailedStatsLoading={isBjDetailedStatsLoading}
            isLoading={isBjStatsLoading}
            onRefresh={loadBjStats}
          />
        )}

        {activeTab === 'retention' && (
          <DonorRetentionPanel
            retention={donorRetention}
            isLoading={isDonorRetentionLoading}
          />
        )}

        {activeTab === 'time' && (
          <TimePatternChart
            timePattern={timePattern}
            timePatternEnhanced={timePatternEnhanced}
            isTimePatternEnhancedLoading={isTimePatternEnhancedLoading}
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
