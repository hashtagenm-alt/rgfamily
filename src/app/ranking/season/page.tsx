'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Trophy, Sparkles, ChevronRight, Clock, Archive, Zap, Pencil } from 'lucide-react'
import { useRanking } from '@/lib/hooks/useRanking'
import { useAuthContext } from '@/lib/context/AuthContext'
import { AdminSeasonOverlay, SeasonEditModal } from '@/components/ranking'
import type { Season } from '@/types/database'
import styles from './page.module.css'

export default function SeasonListPage() {
  const { seasons, isLoading, refetch } = useRanking()
  const { isAdmin } = useAuthContext()

  // 관리자 편집 모달 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingSeason, setEditingSeason] = useState<Season | null>(null)

  // 시즌 편집 모달 열기
  const handleEditSeason = (season: Season) => {
    if (!isAdmin()) return
    setEditingSeason(season)
    setIsEditModalOpen(true)
  }

  // 편집 모달 닫기
  const handleModalClose = () => {
    setIsEditModalOpen(false)
    setEditingSeason(null)
  }

  // 저장/삭제 후 새로고침
  const handleSeasonSaved = () => {
    setIsEditModalOpen(false)
    setEditingSeason(null)
    refetch()
  }

  const handleSeasonDeleted = () => {
    setIsEditModalOpen(false)
    setEditingSeason(null)
    refetch()
  }

  // 현재 진행 중인 시즌과 아카이브 시즌 분리
  const { activeSeason, archivedSeasons } = useMemo(() => {
    const active = seasons.find(s => s.is_active) || null
    const archived = seasons.filter(s => !s.is_active).sort((a, b) =>
      new Date(b.end_date || b.start_date).getTime() - new Date(a.end_date || a.start_date).getTime()
    )
    return { activeSeason: active, archivedSeasons: archived }
  }, [seasons])

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // 시즌 남은 일수 계산
  const getDaysRemaining = (endDate: string | null) => {
    if (!endDate) return null
    const end = new Date(endDate)
    const now = new Date()
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }

  return (
    <main className={styles.main}>
      {/* Navigation Bar */}
      <nav className={styles.pageNav}>
        <Link href="/ranking" className={styles.backBtn}>
          <ArrowLeft size={18} />
        </Link>
        <div className={styles.navTitle}>
          <Sparkles size={14} />
          <span>SEASONS</span>
        </div>
        <Link href="/ranking" className={styles.totalBtn}>
          <Trophy size={14} />
          <span>전체</span>
        </Link>
      </nav>

      {/* Hero Section */}
      <div className={styles.hero}>
        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className={styles.heroBadge}>SEASON RANKINGS</span>
          <h1 className={styles.title}>SEASONS</h1>
          <p className={styles.subtitle}>RG Family 시즌별 후원 랭킹</p>
        </motion.div>
      </div>

      <div className={styles.container}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>시즌 정보를 불러오는 중...</span>
          </div>
        ) : (
          <>
            {/* Current Active Season */}
            {activeSeason && (
              <motion.section
                className={styles.activeSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className={styles.sectionHeader}>
                  <Zap size={18} />
                  <h2>진행 중인 시즌</h2>
                </div>

                <div className={styles.activeCardWrapper}>
                  <Link
                    href={`/ranking/season/${activeSeason.id}`}
                    className={styles.activeCard}
                  >
                    <div className={styles.activeGlow} />
                    <div className={styles.activeContent}>
                      <div className={styles.activeBadge}>
                        <span className={styles.liveDot} />
                        LIVE
                      </div>
                      <h3 className={styles.activeTitle}>{activeSeason.name}</h3>
                      <div className={styles.activeMeta}>
                        <span className={styles.dateRange}>
                          <Calendar size={14} />
                          {formatDate(activeSeason.start_date)} ~ {activeSeason.end_date ? formatDate(activeSeason.end_date) : '진행 중'}
                        </span>
                        {activeSeason.end_date && getDaysRemaining(activeSeason.end_date) !== null && (
                          <span className={styles.daysLeft}>
                            <Clock size={14} />
                            D-{getDaysRemaining(activeSeason.end_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={styles.activeArrow}>
                      <ChevronRight size={24} />
                    </div>
                  </Link>
                  {/* Admin Edit Button */}
                  {isAdmin() && (
                    <button
                      className={styles.editBtn}
                      onClick={() => handleEditSeason(activeSeason)}
                      title="수정"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              </motion.section>
            )}

            {/* Archived Seasons */}
            {archivedSeasons.length > 0 && (
              <motion.section
                className={styles.archiveSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className={styles.sectionHeader}>
                  <Archive size={18} />
                  <h2>지난 시즌</h2>
                  <span className={styles.count}>{archivedSeasons.length}</span>
                </div>

                <div className={styles.archiveGrid}>
                  {archivedSeasons.map((season, index) => (
                    <motion.div
                      key={season.id}
                      className={styles.archiveCardWrapper}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                    >
                      <Link
                        href={`/ranking/season/${season.id}`}
                        className={styles.archiveCard}
                      >
                        <div className={styles.archiveIcon}>
                          <Trophy size={20} />
                        </div>
                        <div className={styles.archiveInfo}>
                          <h3>{season.name}</h3>
                          <span className={styles.archiveDate}>
                            {formatDate(season.start_date)} ~ {season.end_date ? formatDate(season.end_date) : ''}
                          </span>
                        </div>
                        <ChevronRight size={18} className={styles.archiveArrow} />
                      </Link>
                      {/* Admin Edit Button */}
                      {isAdmin() && (
                        <button
                          className={styles.editBtn}
                          onClick={() => handleEditSeason(season)}
                          title="수정"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* No Seasons */}
            {seasons.length === 0 && (
              <div className={styles.empty}>
                <Calendar size={48} />
                <p>등록된 시즌이 없습니다</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Admin Floating Add Button */}
      <AdminSeasonOverlay
        onSeasonCreated={refetch}
        onSeasonUpdated={refetch}
        onSeasonDeleted={refetch}
      />

      {/* Admin Edit Modal (from card edit buttons) */}
      <SeasonEditModal
        isOpen={isEditModalOpen}
        season={editingSeason}
        onClose={handleModalClose}
        onSaved={handleSeasonSaved}
        onDeleted={handleSeasonDeleted}
      />
    </main>
  )
}
