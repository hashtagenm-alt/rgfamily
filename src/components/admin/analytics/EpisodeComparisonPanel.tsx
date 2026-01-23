'use client'

import { useState } from 'react'
import { GitCompare, Loader2, ArrowUp, ArrowDown, Minus, Users, Heart, TrendingUp } from 'lucide-react'
import type { EpisodeComparison } from '@/lib/actions/analytics'
import styles from './EpisodeComparisonPanel.module.css'

interface EpisodeComparisonPanelProps {
  episodes: { id: number; title: string; season_id: number }[]
  comparison: EpisodeComparison | null
  isLoading: boolean
  onCompare: (ep1Id: number, ep2Id: number) => Promise<void>
}

export function EpisodeComparisonPanel({
  episodes,
  comparison,
  isLoading,
  onCompare,
}: EpisodeComparisonPanelProps) {
  const [ep1Id, setEp1Id] = useState<number | null>(null)
  const [ep2Id, setEp2Id] = useState<number | null>(null)

  const handleCompare = () => {
    if (ep1Id && ep2Id && ep1Id !== ep2Id) {
      onCompare(ep1Id, ep2Id)
    }
  }

  const formatNumber = (num: number) => num.toLocaleString()

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp size={14} className={styles.up} />
    if (change < 0) return <ArrowDown size={14} className={styles.down} />
    return <Minus size={14} className={styles.neutral} />
  }

  const getChangeClass = (change: number) => {
    if (change > 0) return styles.up
    if (change < 0) return styles.down
    return styles.neutral
  }

  return (
    <div className={styles.container}>
      {/* 선택 UI */}
      <div className={styles.selector}>
        <div className={styles.selectorItem}>
          <label>에피소드 1</label>
          <select
            value={ep1Id || ''}
            onChange={(e) => setEp1Id(Number(e.target.value) || null)}
            className={styles.select}
          >
            <option value="">선택...</option>
            {episodes.map((ep) => (
              <option key={ep.id} value={ep.id} disabled={ep.id === ep2Id}>
                {ep.title}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.vsIcon}>
          <GitCompare size={24} />
        </div>

        <div className={styles.selectorItem}>
          <label>에피소드 2</label>
          <select
            value={ep2Id || ''}
            onChange={(e) => setEp2Id(Number(e.target.value) || null)}
            className={styles.select}
          >
            <option value="">선택...</option>
            {episodes.map((ep) => (
              <option key={ep.id} value={ep.id} disabled={ep.id === ep1Id}>
                {ep.title}
              </option>
            ))}
          </select>
        </div>

        <button
          className={styles.compareBtn}
          onClick={handleCompare}
          disabled={!ep1Id || !ep2Id || ep1Id === ep2Id || isLoading}
        >
          {isLoading ? (
            <Loader2 size={18} className={styles.spinner} />
          ) : (
            '비교하기'
          )}
        </button>
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className={styles.loading}>
          <Loader2 size={32} className={styles.spinner} />
          <span>비교 분석 중...</span>
        </div>
      )}

      {/* 결과 */}
      {!isLoading && comparison && (
        <div className={styles.result}>
          {/* 기본 통계 비교 */}
          <div className={styles.statsComparison}>
            <div className={styles.statColumn}>
              <h4>{comparison.episode1.title}</h4>
              <div className={styles.statValue}>
                <Heart size={16} />
                {formatNumber(comparison.episode1.total_hearts)}
              </div>
              <div className={styles.statValue}>
                <TrendingUp size={16} />
                {formatNumber(comparison.episode1.donation_count)}건
              </div>
              <div className={styles.statValue}>
                <Users size={16} />
                {formatNumber(comparison.episode1.unique_donors)}명
              </div>
            </div>

            <div className={styles.changeColumn}>
              <h4>변화</h4>
              <div className={`${styles.changeValue} ${getChangeClass(comparison.episode2.total_hearts - comparison.episode1.total_hearts)}`}>
                {getChangeIcon(comparison.episode2.total_hearts - comparison.episode1.total_hearts)}
                {formatNumber(Math.abs(comparison.episode2.total_hearts - comparison.episode1.total_hearts))}
              </div>
              <div className={`${styles.changeValue} ${getChangeClass(comparison.episode2.donation_count - comparison.episode1.donation_count)}`}>
                {getChangeIcon(comparison.episode2.donation_count - comparison.episode1.donation_count)}
                {Math.abs(comparison.episode2.donation_count - comparison.episode1.donation_count)}건
              </div>
              <div className={`${styles.changeValue} ${getChangeClass(comparison.episode2.unique_donors - comparison.episode1.unique_donors)}`}>
                {getChangeIcon(comparison.episode2.unique_donors - comparison.episode1.unique_donors)}
                {Math.abs(comparison.episode2.unique_donors - comparison.episode1.unique_donors)}명
              </div>
            </div>

            <div className={styles.statColumn}>
              <h4>{comparison.episode2.title}</h4>
              <div className={styles.statValue}>
                <Heart size={16} />
                {formatNumber(comparison.episode2.total_hearts)}
              </div>
              <div className={styles.statValue}>
                <TrendingUp size={16} />
                {formatNumber(comparison.episode2.donation_count)}건
              </div>
              <div className={styles.statValue}>
                <Users size={16} />
                {formatNumber(comparison.episode2.unique_donors)}명
              </div>
            </div>
          </div>

          {/* 후원자 변화 */}
          <div className={styles.donorChanges}>
            <h4>후원자 변화</h4>
            <div className={styles.donorChangeGrid}>
              <div className={styles.donorChangeItem}>
                <span className={styles.donorChangeValue}>{comparison.donor_changes.continued}</span>
                <span className={styles.donorChangeLabel}>연속 참여</span>
              </div>
              <div className={`${styles.donorChangeItem} ${styles.new}`}>
                <span className={styles.donorChangeValue}>+{comparison.donor_changes.new_donors}</span>
                <span className={styles.donorChangeLabel}>신규 참여</span>
              </div>
              <div className={`${styles.donorChangeItem} ${styles.left}`}>
                <span className={styles.donorChangeValue}>-{comparison.donor_changes.left_donors}</span>
                <span className={styles.donorChangeLabel}>이탈</span>
              </div>
            </div>
          </div>

          {/* BJ별 변화 */}
          <div className={styles.bjChanges}>
            <h4>BJ별 변화 (상위/하위 5)</h4>
            <div className={styles.bjChangeList}>
              {/* 상승 */}
              <div className={styles.bjChangeSection}>
                <span className={styles.bjSectionLabel}>상승</span>
                {comparison.bj_changes
                  .filter((b) => b.change > 0)
                  .slice(0, 5)
                  .map((bj) => (
                    <div key={bj.bj_name} className={styles.bjChangeItem}>
                      <span className={styles.bjName}>{bj.bj_name}</span>
                      <span className={`${styles.bjChange} ${styles.up}`}>
                        <ArrowUp size={12} />
                        +{formatNumber(bj.change)} ({bj.change_percent > 0 ? '+' : ''}{bj.change_percent}%)
                      </span>
                    </div>
                  ))}
              </div>

              {/* 하락 */}
              <div className={styles.bjChangeSection}>
                <span className={styles.bjSectionLabel}>하락</span>
                {comparison.bj_changes
                  .filter((b) => b.change < 0)
                  .slice(-5)
                  .reverse()
                  .map((bj) => (
                    <div key={bj.bj_name} className={styles.bjChangeItem}>
                      <span className={styles.bjName}>{bj.bj_name}</span>
                      <span className={`${styles.bjChange} ${styles.down}`}>
                        <ArrowDown size={12} />
                        {formatNumber(bj.change)} ({bj.change_percent}%)
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 초기 상태 */}
      {!isLoading && !comparison && (
        <div className={styles.placeholder}>
          <GitCompare size={48} />
          <p>두 에피소드를 선택하여 비교 분석을 시작하세요</p>
        </div>
      )}
    </div>
  )
}
