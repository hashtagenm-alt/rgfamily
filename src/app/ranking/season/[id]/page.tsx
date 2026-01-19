'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useRanking } from '@/lib/hooks/useRanking'
import { RankingPodium, RankingFullList } from '@/components/ranking'
import { Calendar, ArrowLeft, Trophy, Users, ChevronRight, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import styles from './page.module.css'

// Local helper functions
interface FormatDateOptions {
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
}

const formatDate = (dateStr: string, options?: FormatDateOptions): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', options);
};

const formatAmountShort = (amount: number): string => {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억`;
  }
  if (amount >= 10000) {
    return `${Math.floor(amount / 10000).toLocaleString()}만`;
  }
  return amount.toLocaleString();
};

export default function SeasonRankingPage() {
  const params = useParams()
  const router = useRouter()
  const listRef = useRef<HTMLDivElement>(null)

  const {
    rankings,
    seasons,
    currentSeason,
    selectedSeasonId,
    unitFilter,
    maxAmount,
    isLoading,
    setSelectedSeasonId,
    setUnitFilter,
  } = useRanking()

  // "current"인 경우 현재 활성 시즌 ID 사용
  const seasonId = useMemo(() => {
    if (params.id === 'current') {
      return currentSeason?.id || null
    }
    return params.id ? Number(params.id) : null
  }, [params.id, currentSeason])

  // URL의 시즌 ID로 설정
  useEffect(() => {
    if (seasonId && seasonId !== selectedSeasonId) {
      setSelectedSeasonId(seasonId)
    }
  }, [seasonId, selectedSeasonId, setSelectedSeasonId])

  // 선택된 시즌 정보
  const selectedSeason = useMemo(() => {
    return seasons.find(s => s.id === seasonId) || null
  }, [seasons, seasonId])

  // 날짜 포맷
  const formatSeasonDate = (dateStr: string) =>
    formatDate(dateStr, { year: 'numeric', month: 'short', day: 'numeric' })

  // 시즌 남은 일수 계산
  const daysRemaining = useMemo(() => {
    if (!selectedSeason?.end_date || !selectedSeason.is_active) return null
    const end = new Date(selectedSeason.end_date)
    const now = new Date()
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }, [selectedSeason])

  // TOP 50
  const top50 = rankings.slice(0, 50)
  const top3 = top50.slice(0, 3)

  // 시즌 통계
  const seasonStats = useMemo(() => {
    if (rankings.length === 0) return null
    const totalAmount = rankings.reduce((sum, r) => sum + r.totalAmount, 0)
    const participantCount = rankings.length
    const avgAmount = Math.round(totalAmount / participantCount)
    return { totalAmount, participantCount, avgAmount }
  }, [rankings])

  // 시즌을 찾을 수 없는 경우
  if (!isLoading && seasons.length > 0 && !selectedSeason) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.notFound}>
            <Trophy size={40} />
            <h2>시즌을 찾을 수 없습니다</h2>
            <p>존재하지 않는 시즌입니다.</p>
            <Link href="/ranking" className={styles.backButton}>
              전체 랭킹으로
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.main}>
      {/* Compact Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLeft}>
            <Link href="/ranking" className={styles.backBtn}>
              <ArrowLeft size={16} />
            </Link>
            <div className={styles.titleArea}>
              <h1 className={styles.pageTitle}>
                {selectedSeason?.name || 'Season'}
                {selectedSeason?.is_active && <span className={styles.liveDot} />}
              </h1>
              {selectedSeason && (
                <span className={styles.dateRange}>
                  <Calendar size={12} />
                  {formatSeasonDate(selectedSeason.start_date)} - {selectedSeason.end_date ? formatSeasonDate(selectedSeason.end_date) : '진행중'}
                  {daysRemaining !== null && daysRemaining > 0 && (
                    <span className={styles.daysLeft}>D-{daysRemaining}</span>
                  )}
                </span>
              )}
            </div>
          </div>
          <Link href="/ranking/vip" className={styles.vipLink}>
            <Trophy size={14} />
            <span>VIP</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      </header>

      <div className={styles.container}>
        {/* Quick Stats Bar */}
        {seasonStats && (
          <div className={styles.statsBar}>
            <div className={styles.statItem}>
              <Users size={14} />
              <span className={styles.statValue}>{seasonStats.participantCount}</span>
              <span className={styles.statLabel}>참여자</span>
            </div>
          </div>
        )}

        {/* Filters - Unified Style */}
        <div className={styles.filters}>
          <div className={styles.filterRow}>
            {/* All-Time / Season Toggle */}
            <div className={styles.filterGroup}>
              <Link href="/ranking" className={styles.typeTab}>
                All-Time
              </Link>
              <span className={`${styles.typeTab} ${styles.active}`}>
                <Calendar size={12} />
                Season
              </span>
            </div>

            {/* Season Dropdown */}
            <div className={styles.seasonDropdown}>
              <select
                value={seasonId || ''}
                onChange={(e) => router.push(`/ranking/season/${e.target.value}`)}
                className={styles.seasonSelect}
              >
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name} {season.is_active ? '●' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className={styles.selectIcon} />
            </div>
          </div>

          {/* Unit Filter */}
          <div className={styles.unitFilter}>
            {(['all', 'excel', 'crew'] as const).map((unit) => (
              <button
                key={unit}
                onClick={() => setUnitFilter(unit)}
                className={`${styles.unitBtn} ${unitFilter === unit ? styles.active : ''}`}
                data-unit={unit}
              >
                {unit === 'all' ? 'ALL' : unit.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
          </div>
        ) : rankings.length === 0 ? (
          <div className={styles.empty}>
            <Trophy size={32} />
            <p>이 시즌의 데이터가 없습니다</p>
          </div>
        ) : (
          <>
            {/* Podium */}
            <section className={styles.podiumSection}>
              <RankingPodium items={top3} />
            </section>

            {/* Full List */}
            <section ref={listRef} className={styles.listSection}>
              <div className={styles.listHeader}>
                <span className={styles.listTitle}>전체 랭킹</span>
                <span className={styles.listCount}>TOP {Math.min(50, rankings.length)}</span>
              </div>
              <RankingFullList
                rankings={top50}
                maxAmount={maxAmount}
                limit={50}
              />
            </section>
          </>
        )}
      </div>
    </main>
  )
}
