'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tv, Plus, X, Save, Trophy, Check, AlertTriangle } from 'lucide-react'
import { DataTable, Column } from '@/components/admin'
import { useAdminCRUD, useAlert } from '@/lib/hooks'
import { useSupabaseContext } from '@/lib/context'
import { finalizeRankBattle } from '@/lib/actions/episodes'
import type { Season } from '@/types/database'
import styles from '../shared.module.css'
import pageStyles from './page.module.css'

interface Episode {
  id: number
  seasonId: number
  episodeNumber: number
  title: string
  broadcastDate: string
  isRankBattle: boolean
  isFinalized: boolean
  finalizedAt: string | null
  description: string | null
  createdAt: string
}

export default function EpisodesPage() {
  const supabase = useSupabaseContext()
  const alertHandler = useAlert()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [confirmModalEpisode, setConfirmModalEpisode] = useState<Episode | null>(null)

  // 시즌 목록 로드
  useEffect(() => {
    const loadSeasons = async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('start_date', { ascending: false })

      if (!error && data) {
        setSeasons(data)
        // 활성 시즌 선택 또는 첫 번째 시즌
        const activeSeason = data.find(s => s.is_active) || data[0]
        if (activeSeason) {
          setSelectedSeasonId(activeSeason.id)
        }
      }
    }
    loadSeasons()
  }, [supabase])

  const {
    items: episodes,
    isLoading,
    isModalOpen,
    isNew,
    editingItem: editingEpisode,
    setEditingItem: setEditingEpisode,
    openAddModal,
    openEditModal,
    closeModal,
    handleSave,
    handleDelete,
    refetch,
  } = useAdminCRUD<Episode>({
    tableName: 'episodes',
    defaultItem: {
      seasonId: selectedSeasonId || 0,
      episodeNumber: 1,
      title: '',
      broadcastDate: new Date().toISOString().split('T')[0],
      isRankBattle: false,
      isFinalized: false,
      finalizedAt: null,
      description: null,
    },
    orderBy: { column: 'episode_number', ascending: true },
    fromDbFormat: (row) => ({
      id: row.id as number,
      seasonId: row.season_id as number,
      episodeNumber: row.episode_number as number,
      title: row.title as string,
      broadcastDate: row.broadcast_date as string,
      isRankBattle: row.is_rank_battle as boolean,
      isFinalized: row.is_finalized as boolean,
      finalizedAt: row.finalized_at as string | null,
      description: row.description as string | null,
      createdAt: row.created_at as string,
    }),
    toDbFormat: (item) => ({
      season_id: item.seasonId,
      episode_number: item.episodeNumber,
      title: item.title,
      broadcast_date: item.broadcastDate,
      is_rank_battle: item.isRankBattle,
      description: item.description,
    }),
    validate: (item) => {
      if (!item.title) return '제목을 입력해주세요.'
      if (!item.episodeNumber || item.episodeNumber < 1) return '회차 번호를 입력해주세요.'
      if (!item.seasonId) return '시즌을 선택해주세요.'
      return null
    },
    deleteConfirmMessage: '정말 삭제하시겠습니까?\n\n관련된 후원 데이터의 episode_id가 null로 변경됩니다.',
    alertHandler,
  })

  // 시즌 변경 시 에피소드 목록 필터링
  const filteredEpisodes = selectedSeasonId
    ? episodes.filter(ep => ep.seasonId === selectedSeasonId)
    : episodes

  // 시즌 변경 시 refetch
  useEffect(() => {
    if (selectedSeasonId) {
      refetch()
    }
  }, [selectedSeasonId, refetch])

  // 추가 모달 열 때 선택된 시즌 ID 설정
  const handleOpenAddModal = () => {
    openAddModal()
    setTimeout(() => {
      setEditingEpisode(prev => prev ? { ...prev, seasonId: selectedSeasonId || 0 } : null)
    }, 0)
  }

  // 직급전 확정 처리
  const handleFinalize = async (episode: Episode) => {
    setConfirmModalEpisode(episode)
  }

  const confirmFinalize = async () => {
    if (!confirmModalEpisode) return

    setIsFinalizing(true)
    try {
      const result = await finalizeRankBattle(confirmModalEpisode.id)

      if (result.error) {
        alertHandler.showError(result.error, '확정 실패')
      } else if (result.data) {
        const { created, skipped } = result.data
        alertHandler.showSuccess(
          `직급전이 확정되었습니다.\nVIP 생성: ${created}명, 스킵: ${skipped}명`,
          '확정 완료'
        )
        await refetch()
      }
    } catch (err) {
      alertHandler.showError('확정 처리 중 오류가 발생했습니다.', '오류')
      console.error(err)
    } finally {
      setIsFinalizing(false)
      setConfirmModalEpisode(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const columns: Column<Episode>[] = [
    {
      key: 'episodeNumber',
      header: '회차',
      width: '80px',
      render: (item) => <span className={pageStyles.episodeNumber}>{item.episodeNumber}회</span>,
    },
    { key: 'title', header: '제목', width: '200px' },
    {
      key: 'broadcastDate',
      header: '방송일',
      width: '140px',
      render: (item) => <span style={{ whiteSpace: 'nowrap' }}>{formatDate(item.broadcastDate)}</span>,
    },
    {
      key: 'isRankBattle',
      header: '직급전',
      width: '100px',
      render: (item) => (
        item.isRankBattle ? (
          <span className={`${styles.statusBadge} ${pageStyles.rankBattle}`}>
            <Trophy size={12} />
            직급전
          </span>
        ) : (
          <span className={styles.statusBadge}>일반</span>
        )
      ),
    },
    {
      key: 'isFinalized',
      header: '확정',
      width: '120px',
      render: (item) => {
        if (!item.isRankBattle) return <span className={styles.statusBadge}>-</span>

        if (item.isFinalized) {
          return (
            <span className={`${styles.statusBadge} ${styles.active}`}>
              <Check size={12} />
              확정됨
            </span>
          )
        }

        return (
          <button
            className={pageStyles.finalizeButton}
            onClick={(e) => {
              e.stopPropagation()
              handleFinalize(item)
            }}
          >
            확정하기
          </button>
        )
      },
    },
    {
      key: 'finalizedAt',
      header: '확정일',
      width: '140px',
      render: (item) => (
        <span style={{ whiteSpace: 'nowrap', color: 'var(--text-tertiary)' }}>
          {item.finalizedAt ? formatDate(item.finalizedAt) : '-'}
        </span>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Tv size={24} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>에피소드 관리</h1>
            <p className={styles.subtitle}>시즌별 에피소드 및 직급전 관리</p>
          </div>
        </div>
        <div className={pageStyles.headerActions}>
          <select
            className={pageStyles.seasonSelect}
            value={selectedSeasonId || ''}
            onChange={(e) => setSelectedSeasonId(Number(e.target.value))}
          >
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name} {season.is_active && '(활성)'}
              </option>
            ))}
          </select>
          <button onClick={handleOpenAddModal} className={styles.addButton}>
            <Plus size={18} />
            에피소드 추가
          </button>
        </div>
      </header>

      <DataTable
        data={filteredEpisodes}
        columns={columns}
        onEdit={openEditModal}
        onDelete={handleDelete}
        searchPlaceholder="제목으로 검색..."
        isLoading={isLoading}
      />

      {/* 에피소드 추가/수정 모달 */}
      <AnimatePresence>
        {isModalOpen && editingEpisode && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className={styles.modal}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2>{isNew ? '에피소드 추가' : '에피소드 수정'}</h2>
                <button onClick={closeModal} className={styles.closeButton}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>시즌</label>
                  <select
                    value={editingEpisode.seasonId || ''}
                    onChange={(e) =>
                      setEditingEpisode({ ...editingEpisode, seasonId: Number(e.target.value) })
                    }
                    className={styles.select}
                  >
                    <option value="">시즌 선택</option>
                    {seasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>회차 번호</label>
                    <input
                      type="number"
                      min="1"
                      value={editingEpisode.episodeNumber || ''}
                      onChange={(e) =>
                        setEditingEpisode({ ...editingEpisode, episodeNumber: Number(e.target.value) })
                      }
                      className={styles.input}
                      placeholder="1"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>방송일</label>
                    <input
                      type="date"
                      value={editingEpisode.broadcastDate?.split('T')[0] || ''}
                      onChange={(e) =>
                        setEditingEpisode({ ...editingEpisode, broadcastDate: e.target.value })
                      }
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>제목</label>
                  <input
                    type="text"
                    value={editingEpisode.title || ''}
                    onChange={(e) =>
                      setEditingEpisode({ ...editingEpisode, title: e.target.value })
                    }
                    className={styles.input}
                    placeholder="예: 시즌1 1회"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>설명 (선택)</label>
                  <textarea
                    value={editingEpisode.description || ''}
                    onChange={(e) =>
                      setEditingEpisode({ ...editingEpisode, description: e.target.value || null })
                    }
                    className={styles.textarea}
                    placeholder="에피소드 설명..."
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={editingEpisode.isRankBattle || false}
                      onChange={(e) =>
                        setEditingEpisode({ ...editingEpisode, isRankBattle: e.target.checked })
                      }
                      className={styles.checkbox}
                      disabled={editingEpisode.isFinalized}
                    />
                    <Trophy size={16} style={{ color: 'var(--gold)' }} />
                    <span>직급전으로 설정</span>
                  </label>
                  <p className={styles.hint}>
                    직급전 회차의 Top 3 후원자에게 VIP 보상이 자동 부여됩니다.
                  </p>
                  {editingEpisode.isFinalized && (
                    <p className={pageStyles.warningText}>
                      이미 확정된 직급전은 설정을 변경할 수 없습니다.
                    </p>
                  )}
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button onClick={closeModal} className={styles.cancelButton}>
                  취소
                </button>
                <button onClick={handleSave} className={styles.saveButton}>
                  <Save size={16} />
                  {isNew ? '추가' : '저장'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 직급전 확정 확인 모달 */}
      <AnimatePresence>
        {confirmModalEpisode && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isFinalizing && setConfirmModalEpisode(null)}
          >
            <motion.div
              className={pageStyles.confirmModal}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={pageStyles.confirmHeader}>
                <AlertTriangle size={48} className={pageStyles.confirmIcon} />
                <h2>직급전 확정</h2>
              </div>

              <div className={pageStyles.confirmBody}>
                <p className={pageStyles.confirmTitle}>
                  &quot;{confirmModalEpisode.title}&quot;
                </p>
                <p className={pageStyles.confirmDescription}>
                  이 직급전을 확정하시겠습니까?
                </p>
                <ul className={pageStyles.confirmList}>
                  <li>Top 3 후원자에게 VIP 보상이 자동 생성됩니다.</li>
                  <li>한 번 확정하면 취소할 수 없습니다.</li>
                  <li>기존 VIP 권한은 유지됩니다.</li>
                </ul>
              </div>

              <div className={pageStyles.confirmFooter}>
                <button
                  onClick={() => setConfirmModalEpisode(null)}
                  className={styles.cancelButton}
                  disabled={isFinalizing}
                >
                  취소
                </button>
                <button
                  onClick={confirmFinalize}
                  className={pageStyles.confirmButton}
                  disabled={isFinalizing}
                >
                  {isFinalizing ? '확정 중...' : '확정하기'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
