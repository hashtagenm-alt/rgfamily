'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Trophy, Crown, Flame, TrendingUp, Users, Sparkles } from 'lucide-react'
import { PageLayout } from '@/components/layout'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { getActiveSeason } from '@/lib/actions/seasons'
import { getPublicTotalRankings, getPublicSeasonRankings } from '@/lib/actions/donation-rankings'
import type { RankingItem, UnitFilter } from '@/types/common'
import { RankingPodium, RankingFullList } from '@/components/ranking'
import { logger } from '@/lib/utils/logger'
import styles from './page.module.css'

interface Season {
  id: number
  name: string
  is_active: boolean
}

export default function TotalRankingPage() {
  const listRef = useRef<HTMLDivElement>(null)
  const totalRankingsCache = useRef<Awaited<ReturnType<typeof getPublicTotalRankings>> | null>(null)
  const seasonCache = useRef<Season | null>(null)
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('all')
  const [rankings, setRankings] = useState<RankingItem[]>([])
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null)
  const [podiumProfileIds, setPodiumProfileIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 초기 데이터 로드 (총 랭킹 + 시즌 — 한 번만)
  const initData = useCallback(async () => {
    if (totalRankingsCache.current) return
    const [seasonResult, totalRankingsResult] = await Promise.all([
      getActiveSeason(),
      getPublicTotalRankings(60),
    ])
    totalRankingsCache.current = totalRankingsResult
    if (seasonResult.data) {
      seasonCache.current = seasonResult.data
      setCurrentSeason(seasonResult.data)
    }
  }, [])

  // unitFilter 변경 시 시즌 랭킹만 재조회 + 캐시된 총 랭킹으로 처리
  const buildRankings = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    await initData()

    const totalRankingsResult = totalRankingsCache.current!

    // 시즌 랭킹 조회 (unitFilter에 따라)
    const seasonRankingsMap: Record<string, number> = {}
    const unitParam = unitFilter !== 'all' ? (unitFilter as 'excel' | 'crew') : undefined
    if (seasonCache.current?.id) {
      const seasonRankingsResult = await getPublicSeasonRankings(
        seasonCache.current.id,
        50,
        unitParam
      )

      ;(seasonRankingsResult.data || []).forEach((item) => {
        seasonRankingsMap[item.donor_name.trim()] = item.rank
      })
    }

    // 랭킹 데이터 처리
    if (totalRankingsResult.error) {
      logger.error('총 후원 랭킹 로드 실패:', totalRankingsResult.error)
      setError('랭킹 데이터를 불러오는데 실패했습니다.')
      setRankings([])
      setIsLoading(false)
      return
    }

    // View에서 제공하는 데이터 직접 사용 (profile_id, avatar_url, is_vip_clickable 포함)
    // 중복 닉네임만 제거 (donation_count/top_bj 없어도 포함하여 50명 채움)
    const seenDonors = new Set<string>()
    let filteredData = (totalRankingsResult.data || []).filter((item) => {
      const name = item.donor_name.trim()
      if (seenDonors.has(name)) return false
      seenDonors.add(name)
      return true
    })

    // unit 필터 적용: 엑셀/크루 선택 시 해당 unit의 시즌 랭킹에 있는 후원자만 표시
    if (unitFilter !== 'all' && Object.keys(seasonRankingsMap).length > 0) {
      filteredData = filteredData.filter(
        (item) => seasonRankingsMap[item.donor_name.trim()] !== undefined
      )
    }

    // 순위 재정렬 (1부터, 최대 50명)
    const sorted = filteredData.slice(0, 50).map((item, idx) => {
      const trimmedName = item.donor_name.trim()
      return {
        donorId: item.profile_id || null,
        donorName: item.donor_name,
        avatarUrl: item.avatar_url || null,
        viewerScore: item.viewer_score || 0,
        donationCount: item.donation_count || 0,
        topBj: item.top_bj || null,
        rank: idx + 1,
        totalRank: idx + 1,
        seasonRank: seasonRankingsMap[trimmedName] || undefined,
        hasVipRewards: item.is_vip_clickable || false,
      }
    })

    // VIP 페이지 클릭 가능한 사용자 (View의 is_vip_clickable 기반)
    const clickableIds = sorted
      .filter((item) => item.donorId && item.hasVipRewards)
      .map((item) => item.donorId as string)
    setPodiumProfileIds([...new Set(clickableIds)])

    setRankings(sorted)

    setIsLoading(false)
  }, [unitFilter, initData])

  const handleRefetch = useCallback(() => {
    totalRankingsCache.current = null
    seasonCache.current = null
    buildRankings()
  }, [buildRankings])

  useEffect(() => {
    buildRankings()
  }, [buildRankings])

  const top3 = rankings.slice(0, 3)

  return (
    <PageLayout showSideBanners={false}>
      <main className={styles.main}>
        <Navbar />

        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroGlow} />
          <div className={styles.heroContent}>
            <div className={styles.heroTitleRow}>
              <Crown className={styles.heroCrown} size={36} />
              <h1 className={styles.heroTitle}>후원 랭킹</h1>
            </div>
            <p className={styles.heroSubtitle}>RG FAMILY를 빛내주신 후원자님들께 감사드립니다</p>

            {/* Quick Links */}
            <div className={styles.heroLinks}>
              {currentSeason && (
                <Link
                  href={`/ranking/season/${currentSeason.id}`}
                  className={styles.heroLinkSeason}
                >
                  <Flame size={16} />
                  <span>{currentSeason.name} 진행중</span>
                </Link>
              )}
            </div>
          </div>
        </section>

        <div className={styles.container}>
          {/* Unit Filter */}
          <div className={styles.filterSection}>
            <div className={styles.unitFilter}>
              <div className={styles.unitFilterLabel}>
                <Users size={14} />
                <span>소속별 보기</span>
              </div>
              <div className={styles.unitTabs}>
                <div className={styles.unitTabIndicator} data-active={unitFilter} />
                {(['all', 'excel', 'crew'] as const).map((unit) => (
                  <button
                    key={unit}
                    onClick={() => setUnitFilter(unit)}
                    className={`${styles.unitTab} ${unitFilter === unit ? styles.active : ''}`}
                    data-unit={unit}
                  >
                    {unit === 'all' && <Sparkles size={14} />}
                    <span>{unit === 'all' ? '전체' : unit === 'excel' ? '엑셀' : '크루'}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <span>랭킹을 불러오는 중...</span>
            </div>
          ) : error ? (
            <div className={styles.error}>
              <Trophy size={48} />
              <p>{error}</p>
              <button onClick={handleRefetch} className={styles.retryBtn}>
                다시 시도
              </button>
            </div>
          ) : rankings.length === 0 ? (
            <div className={styles.empty}>
              <Trophy size={48} />
              <p>아직 등록된 후원 데이터가 없습니다</p>
            </div>
          ) : (
            <>
              {/* Top 3 Podium - 프리미엄 소개 영역 */}
              <section className={styles.podiumSection}>
                <RankingPodium
                  items={top3}
                  podiumProfileIds={podiumProfileIds}
                  onRefetch={handleRefetch}
                />
              </section>

              {/* Full Ranking List */}
              <section ref={listRef} className={styles.listSection}>
                <div className={styles.listHeader}>
                  <h2 className={styles.listTitle}>
                    <TrendingUp size={16} />
                    전체 랭킹
                  </h2>
                  <span className={styles.listBadge}>TOP {Math.min(50, rankings.length)}</span>
                </div>
                <RankingFullList
                  rankings={rankings}
                  limit={50}
                  podiumProfileIds={podiumProfileIds}
                />
              </section>
            </>
          )}
        </div>
        <Footer />
      </main>
    </PageLayout>
  )
}
