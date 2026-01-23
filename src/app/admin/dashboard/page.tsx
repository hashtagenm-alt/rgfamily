'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy,
  Users,
  RefreshCw,
  AlertCircle,
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
  is_active: boolean
  current_rank_id: number | null
  current_rank?: BjRank | null
}

// 시즌 요약 통계
interface SeasonStats {
  currentEpisode: number
  totalEpisodes: number
  activeBjCount: number
}

export default function BjDashboardPage() {
  const supabase = useSupabaseContext()
  const [bjList, setBjList] = useState<BjStatus[]>([])
  const [ranks, setRanks] = useState<BjRank[]>([])
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'unit' | 'rank'>('rank')

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

      // 2. BJ 멤버 목록 조회 (organization 테이블에서 대표 제외, 비활성 멤버도 포함)
      const { data: bjData, error: bjError } = await supabase
        .from('organization')
        .select('*')
        .neq('role', '대표')
        .order('position_order', { ascending: true })

      if (bjError) throw bjError

      // 직급 정보 매핑
      const bjWithRanks = (bjData || []).map((bj) => ({
        id: bj.id,
        name: bj.name,
        image_url: bj.image_url,
        unit: bj.unit,
        role: bj.role,
        is_active: bj.is_active ?? true,
        current_rank_id: bj.current_rank_id,
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

        setSeasonStats({
          currentEpisode: latestEpisode?.episode_number || 0,
          totalEpisodes: episodeCount || 0,
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
      case 'unit':
        // Excel 먼저, 그 다음 Crew
        if (a.unit !== b.unit) {
          return a.unit === 'excel' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
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
          <h1>출연BJ 관리</h1>
          <p>BJ 직급 및 현황 관리</p>
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
              <Trophy size={20} style={{ color: '#fd68ba' }} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{seasonStats.currentEpisode}회</span>
              <span className={styles.statLabel}>현재 에피소드</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* 빠른 액션 */}
      <div className={styles.quickActions}>
        <a href="/admin/ranks" className={styles.actionBtn}>
          <span>직급 관리</span>
        </a>
        <a href="/admin/organization" className={styles.actionBtn}>
          <span>조직도 관리</span>
        </a>
      </div>

      {/* BJ 현황 테이블 */}
      <section className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <h2>BJ 현황</h2>
          <div className={styles.sortButtons}>
            <button
              onClick={() => setSortBy('unit')}
              className={`${styles.sortBtn} ${sortBy === 'unit' ? styles.active : ''}`}
            >
              소속순
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
                <th>순번</th>
                <th>BJ명</th>
                <th>소속</th>
                <th>현재 직급</th>
                <th>상태</th>
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
                  <td>
                    <span className={`${styles.statusBadge} ${bj.is_active ? styles.active : styles.inactive}`}>
                      {bj.is_active ? '활성' : '비활성'}
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
