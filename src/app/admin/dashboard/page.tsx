'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy,
  TrendingUp,
  Coins,
  Users,
  RefreshCw,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { useSupabaseContext } from '@/lib/context'
import type { Organization } from '@/types/database'
import styles from './page.module.css'

// BJ 직급 정보 타입
interface BjRank {
  id: number
  name: string
  level: number
  color: string | null
}

// BJ 현황 정보 타입
interface BjStatus {
  id: number
  name: string
  image_url: string | null
  unit: 'excel' | 'crew'
  role: string
  current_rank_id: number | null
  total_contribution: number
  season_contribution: number
  total_prize: number
  total_penalty: number
  prize_balance: number
  current_rank?: BjRank | null
}

// 시즌 요약 통계
interface SeasonStats {
  currentEpisode: number
  totalEpisodes: number
  totalContribution: number
  totalPrize: number
  totalPenalty: number
  activeBjCount: number
}

// 금액 포맷팅 (관리자용 - 실제 금액 표시)
const formatAmount = (amount: number): string => {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억`
  }
  if (amount >= 10000) {
    return `${Math.floor(amount / 10000)}만`
  }
  return amount.toLocaleString()
}

export default function BjDashboardPage() {
  const supabase = useSupabaseContext()
  const [bjList, setBjList] = useState<BjStatus[]>([])
  const [ranks, setRanks] = useState<BjRank[]>([])
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'contribution' | 'prize' | 'rank'>('contribution')

  // 데이터 로드
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // 1. 직급 마스터 데이터 조회
      const { data: ranksData, error: ranksError } = await supabase
        .from('bj_ranks')
        .select('*')
        .order('level', { ascending: true })

      if (ranksError) {
        console.error('직급 데이터 로드 실패:', ranksError)
        // 직급 테이블이 없으면 빈 배열로 처리
        setRanks([])
      } else {
        setRanks(ranksData || [])
      }

      // 2. BJ 멤버 목록 조회 (organization 테이블에서 대표 제외)
      const { data: bjData, error: bjError } = await supabase
        .from('organization')
        .select('*')
        .neq('role', '대표')
        .eq('is_active', true)
        .order('position_order', { ascending: true })

      if (bjError) throw bjError

      // 직급 정보 매핑
      const bjWithRanks = (bjData || []).map((bj) => ({
        ...bj,
        total_contribution: bj.total_contribution || 0,
        season_contribution: bj.season_contribution || 0,
        total_prize: bj.total_prize || 0,
        total_penalty: bj.total_penalty || 0,
        prize_balance: bj.prize_balance || 0,
        current_rank: ranksData?.find((r) => r.id === bj.current_rank_id) || null,
      })) as BjStatus[]

      setBjList(bjWithRanks)

      // 3. 시즌 통계 계산
      const { data: activeSeasonData } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .single()

      if (activeSeasonData) {
        const { count: episodeCount } = await supabase
          .from('episodes')
          .select('*', { count: 'exact', head: true })
          .eq('season_id', activeSeasonData.id)

        const { data: latestEpisode } = await supabase
          .from('episodes')
          .select('episode_number')
          .eq('season_id', activeSeasonData.id)
          .order('episode_number', { ascending: false })
          .limit(1)
          .single()

        // 전체 기여도/상벌금 합계
        const totalContribution = bjWithRanks.reduce((sum, bj) => sum + bj.season_contribution, 0)
        const totalPrize = bjWithRanks.reduce((sum, bj) => sum + bj.total_prize, 0)
        const totalPenalty = bjWithRanks.reduce((sum, bj) => sum + bj.total_penalty, 0)

        setSeasonStats({
          currentEpisode: latestEpisode?.episode_number || 0,
          totalEpisodes: episodeCount || 0,
          totalContribution,
          totalPrize,
          totalPenalty,
          activeBjCount: bjWithRanks.length,
        })
      }
    } catch (err) {
      console.error('데이터 로드 실패:', err)
      setError('데이터를 불러오는데 실패했습니다.')
    }

    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 정렬된 BJ 목록
  const sortedBjList = [...bjList].sort((a, b) => {
    switch (sortBy) {
      case 'contribution':
        return b.season_contribution - a.season_contribution
      case 'prize':
        return b.prize_balance - a.prize_balance
      case 'rank':
        const aLevel = a.current_rank?.level || 99
        const bLevel = b.current_rank?.level || 99
        return aLevel - bLevel
      default:
        return 0
    }
  })

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>BJ 현황 로딩 중...</span>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>BJ 통합 관리</h1>
          <p>직급, 기여도, 상벌금 통합 현황</p>
        </div>
        <button onClick={fetchData} className={styles.refreshBtn} disabled={isLoading}>
          <RefreshCw size={16} className={isLoading ? styles.spinning : ''} />
          <span>새로고침</span>
        </button>
      </header>

      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 시즌 통계 카드 */}
      {seasonStats && (
        <div className={styles.statsGrid}>
          <motion.div
            className={styles.statCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <div className={styles.statIcon} style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
              <Users size={20} style={{ color: '#6366f1' }} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{seasonStats.activeBjCount}</span>
              <span className={styles.statLabel}>활동 BJ</span>
            </div>
          </motion.div>

          <motion.div
            className={styles.statCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className={styles.statIcon} style={{ background: 'rgba(253, 104, 186, 0.1)' }}>
              <TrendingUp size={20} style={{ color: '#fd68ba' }} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{formatAmount(seasonStats.totalContribution)}</span>
              <span className={styles.statLabel}>총 기여도</span>
            </div>
          </motion.div>

          <motion.div
            className={styles.statCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className={styles.statIcon} style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
              <ArrowUpRight size={20} style={{ color: '#22c55e' }} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>₩{formatAmount(seasonStats.totalPrize)}</span>
              <span className={styles.statLabel}>총 상금</span>
            </div>
          </motion.div>

          <motion.div
            className={styles.statCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className={styles.statIcon} style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
              <ArrowDownRight size={20} style={{ color: '#ef4444' }} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>₩{formatAmount(seasonStats.totalPenalty)}</span>
              <span className={styles.statLabel}>총 벌금</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* 빠른 액션 */}
      <div className={styles.quickActions}>
        <a href="/admin/data-sync" className={styles.actionBtn}>
          <span>CSV 업로드</span>
        </a>
        <a href="/admin/ranks" className={styles.actionBtn}>
          <span>직급전 결과 입력</span>
        </a>
        <a href="/admin/contributions" className={styles.actionBtn}>
          <span>기여도 일괄 수정</span>
        </a>
        <a href="/admin/prizes" className={styles.actionBtn}>
          <span>상벌금 정산</span>
        </a>
      </div>

      {/* BJ 현황 테이블 */}
      <section className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <h2>BJ 현황</h2>
          <div className={styles.sortButtons}>
            <button
              onClick={() => setSortBy('contribution')}
              className={`${styles.sortBtn} ${sortBy === 'contribution' ? styles.active : ''}`}
            >
              기여도순
            </button>
            <button
              onClick={() => setSortBy('prize')}
              className={`${styles.sortBtn} ${sortBy === 'prize' ? styles.active : ''}`}
            >
              정산금순
            </button>
            <button
              onClick={() => setSortBy('rank')}
              className={`${styles.sortBtn} ${sortBy === 'rank' ? styles.active : ''}`}
            >
              직급순
            </button>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>순위</th>
                <th>BJ명</th>
                <th>소속</th>
                <th>현재 직급</th>
                <th className={styles.rightAlign}>기여도</th>
                <th className={styles.rightAlign}>받은 상금</th>
                <th className={styles.rightAlign}>받은 벌금</th>
                <th className={styles.rightAlign}>정산 잔액</th>
              </tr>
            </thead>
            <tbody>
              {sortedBjList.map((bj, index) => (
                <tr key={bj.id}>
                  <td className={styles.rankCell}>{index + 1}</td>
                  <td className={styles.nameCell}>
                    <span className={styles.bjName}>{bj.name}</span>
                  </td>
                  <td>
                    <span className={`${styles.unitBadge} ${bj.unit === 'excel' ? styles.excel : styles.crew}`}>
                      {bj.unit === 'excel' ? 'EXCEL' : 'CREW'}
                    </span>
                  </td>
                  <td>
                    {bj.current_rank ? (
                      <span
                        className={styles.rankBadge}
                        style={{ backgroundColor: bj.current_rank.color || '#666' }}
                      >
                        {bj.current_rank.name}
                      </span>
                    ) : (
                      <span className={styles.noRank}>미배정</span>
                    )}
                  </td>
                  <td className={styles.rightAlign}>
                    <span className={styles.contribution}>{formatAmount(bj.season_contribution)}</span>
                  </td>
                  <td className={styles.rightAlign}>
                    <span className={styles.prize}>₩{formatAmount(bj.total_prize)}</span>
                  </td>
                  <td className={styles.rightAlign}>
                    <span className={styles.penalty}>₩{formatAmount(bj.total_penalty)}</span>
                  </td>
                  <td className={styles.rightAlign}>
                    <span className={bj.prize_balance >= 0 ? styles.positive : styles.negative}>
                      {bj.prize_balance >= 0 ? '+' : ''}₩{formatAmount(Math.abs(bj.prize_balance))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedBjList.length === 0 && (
          <div className={styles.emptyState}>
            <Users size={32} />
            <p>등록된 BJ가 없습니다.</p>
            <a href="/admin/organization" className={styles.linkBtn}>
              조직도에서 BJ 등록하기
            </a>
          </div>
        )}
      </section>

      {/* 직급 범례 */}
      {ranks.length > 0 && (
        <section className={styles.legendSection}>
          <h3>직급 범례</h3>
          <div className={styles.legendGrid}>
            {ranks.map((rank) => (
              <div key={rank.id} className={styles.legendItem}>
                <span
                  className={styles.legendColor}
                  style={{ backgroundColor: rank.color || '#666' }}
                />
                <span className={styles.legendName}>{rank.name}</span>
                <span className={styles.legendLevel}>Lv.{rank.level}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
