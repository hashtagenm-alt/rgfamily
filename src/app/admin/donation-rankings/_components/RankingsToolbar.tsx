'use client'

import { Download, RefreshCw, Loader2 } from 'lucide-react'
import type { TabType, Season } from './types'
import styles from '../../shared.module.css'

interface RankingsToolbarProps {
  activeTab: TabType
  seasons: Season[]
  selectedSeasonId: number | null
  isRefreshing: boolean
  isLoading: boolean
  seasonRankingsCount: number
  totalRankingsCount: number
  onSeasonChange: (seasonId: number) => void
  onRefreshSeason: () => void
  onRefreshTotal: () => void
  onDownloadSeason: () => void
  onDownloadTotal: () => void
}

export function RankingsToolbar({
  activeTab,
  seasons,
  selectedSeasonId,
  isRefreshing,
  isLoading,
  seasonRankingsCount,
  totalRankingsCount,
  onSeasonChange,
  onRefreshSeason,
  onRefreshTotal,
  onDownloadSeason,
  onDownloadTotal,
}: RankingsToolbarProps) {
  if (activeTab === 'season') {
    return (
      <div className={styles.uploadOptions}>
        <div className={styles.optionRow}>
          <label className={styles.optionLabel}>시즌 선택</label>
          <select
            className={styles.optionSelect}
            value={selectedSeasonId || ''}
            onChange={(e) => onSeasonChange(Number(e.target.value))}
          >
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name} {season.is_active ? '(활성)' : ''}
              </option>
            ))}
          </select>
          <button
            className={styles.saveButton}
            onClick={onRefreshSeason}
            disabled={isRefreshing || isLoading}
            style={{ gap: '0.5rem' }}
          >
            {isRefreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            시즌 랭킹 갱신
          </button>
          <button
            className={styles.downloadButton}
            onClick={onDownloadSeason}
            disabled={isLoading || seasonRankingsCount === 0}
          >
            <Download size={16} />
            Excel 다운로드
          </button>
        </div>
      </div>
    )
  }

  if (activeTab === 'total') {
    return (
      <div className={styles.uploadOptions}>
        <div className={styles.optionRow}>
          <button
            className={styles.saveButton}
            onClick={onRefreshTotal}
            disabled={isRefreshing || isLoading}
            style={{ gap: '0.5rem' }}
          >
            {isRefreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            종합 랭킹 갱신
          </button>
          <button
            className={styles.downloadButton}
            onClick={onDownloadTotal}
            disabled={isLoading || totalRankingsCount === 0}
          >
            <Download size={16} />
            Excel 다운로드
          </button>
        </div>
      </div>
    )
  }

  return null
}
