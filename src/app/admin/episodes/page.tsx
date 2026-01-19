'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tv, Plus, X, Save, Trophy, Check, AlertCircle } from 'lucide-react'
import { DataTable, Column } from '@/components/admin'
import { useAdminCRUD, useAlert } from '@/lib/hooks'
import { useSupabaseContext } from '@/lib/context'
import { finalizeRankBattle } from '@/lib/actions/episodes'
import styles from '../shared.module.css'

interface Season {
  id: number
  name: string
}

interface Episode {
  id: number
  seasonId: number
  episodeNumber: number
  title: string
  broadcastDate: string
  isRankBattle: boolean
  description: string | null
  isFinalized: boolean
  finalizedAt: string | null
  createdAt: string
  seasonName?: string
}

export default function EpisodesPage() {
  const supabase = useSupabaseContext()
  const alertHandler = useAlert()

  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null)
  const [isFinalizing, setIsFinalizing] = useState(false)

  useEffect(() => {
    const fetchSeasons = async () => {
      const { data } = await supabase
        .from('seasons')
        .select('id, name')
        .order('start_date', { ascending: false })

      if (data && data.length > 0) {
        setSeasons(data)
        const activeSeason = data.find((s) => (s as { is_active?: boolean }).is_active) || data[0]
        setSelectedSeasonId(activeSeason.id)
      }
    }
    fetchSeasons()
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
      description: null,
    },
    orderBy: { column: 'episode_number', ascending: false },
    selectQuery: '*, seasons(name)',
    fromDbFormat: (row) => ({
      id: row.id as number,
      seasonId: row.season_id as number,
      episodeNumber: row.episode_number as number,
      title: row.title as string,
      broadcastDate: row.broadcast_date as string,
      isRankBattle: row.is_rank_battle as boolean,
      description: row.description as string | null,
      isFinalized: row.is_finalized as boolean,
      finalizedAt: row.finalized_at as string | null,
      createdAt: row.created_at as string,
      seasonName: (row.seasons as { name: string } | null)?.name,
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
      if (!item.title) return '에피소드 제목을 입력해주세요.'
      if (!item.seasonId) return '시즌을 선택해주세요.'
      if (!item.episodeNumber || item.episodeNumber < 1) return '회차 번호를 입력해주세요.'
      return null
    },
    deleteConfirmMessage: '정말 삭제하시겠습니까?\n\n관련된 후원 데이터가 있는 경우 삭제할 수 없습니다.',
    alertHandler,
  })

  const handleOpenAddModal = useCallback(() => {
    openAddModal()
    const maxEpisode = episodes
      .filter((e) => e.seasonId === selectedSeasonId)
      .reduce((max, e) => Math.max(max, e.episodeNumber), 0)
    setEditingEpisode((prev) =>
      prev ? { ...prev, seasonId: selectedSeasonId || 0, episodeNumber: maxEpisode + 1 } : null
    )
  }, [openAddModal, episodes, selectedSeasonId, setEditingEpisode])

  const filteredEpisodes = selectedSeasonId
    ? episodes.filter((e) => e.seasonId === selectedSeasonId)
    : episodes

  const handleFinalize = async (episode: Episode) => {
    const confirmed = await alertHandler.showConfirm(
      `"${episode.title}" 직급전을 확정하시겠습니까?\n\nTop 3 후원자에게 VIP 보상이 자동으로 생성됩니다.`,
      { title: '직급전 확정', variant: 'warning', confirmText: '확정', cancelText: '취소' }
    )
    if (!confirmed) return

    setIsFinalizing(true)
    try {
      const result = await finalizeRankBattle(episode.id)
      if (result.error) {
        alertHandler.showError(result.error, '확정 실패')
        return
      }
      if (result.data) {
        alertHandler.showSuccess(
          `직급전 확정 완료!\n\n생성된 VIP 보상: ${result.data.created}명\n스킵된 항목: ${result.data.skipped}건`,
          '확정 완료'
        )
        await refetch()
      }
    } catch (error) {
      alertHandler.showError(
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        '확정 실패'
      )
    } finally {
      setIsFinalizing(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }

  const columns: Column<Episode>[] = [
    {
      key: 'episodeNumber',
      header: '회차',
      width: '80px',
      render: (item) => <span style={{ fontWeight: 600 }}>{item.episodeNumber}회</span>,
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
      render: (item) =>
        item.isRankBattle ? (
          <span className={`${styles.statusBadge} ${styles.active}`}>
            <Trophy size={12} style={{ marginRight: 4 }} />직급전
          </span>
        ) : (
          <span className={styles.statusBadge}>일반</span>
        ),
    },
    {
      key: 'isFinalized',
      header: '확정',
      width: '120px',
      render: (item) => {
        if (!item.isRankBattle) return <span style={{ color: '#666' }}>-</span>
        if (item.isFinalized) {
          return (
            <span className={`${styles.statusBadge} ${styles.active}`}>
              <Check size={12} style={{ marginRight: 4 }} />확정됨
            </span>
          )
        }
        return (
          <button
            onClick={(e) => { e.stopPropagation(); handleFinalize(item) }}
            disabled={isFinalizing}
            style={{
              background: 'linear-gradient(135deg, #fd68ba 0%, #ff8e53 100%)',
              color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px',
              cursor: isFinalizing ? 'not-allowed' : 'pointer',
              opacity: isFinalizing ? 0.7 : 1, fontSize: '12px', fontWeight: 500,
            }}
          >
            {isFinalizing ? '처리중...' : '확정하기'}
          </button>
        )
      },
    },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Tv size={24} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>에피소드 관리</h1>
            <p className={styles.subtitle}>방송 회차 및 직급전 관리</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={selectedSeasonId || ''}
            onChange={(e) => setSelectedSeasonId(e.target.value ? Number(e.target.value) : null)}
            className={styles.input}
            style={{ width: '180px' }}
          >
            <option value="">전체 시즌</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>{season.name}</option>
            ))}
          </select>
          <button onClick={handleOpenAddModal} className={styles.addButton}>
            <Plus size={18} />에피소드 추가
          </button>
        </div>
      </header>

      <div style={{
        background: 'rgba(253, 104, 186, 0.1)', border: '1px solid rgba(253, 104, 186, 0.3)',
        borderRadius: '8px', padding: '12px 16px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <AlertCircle size={18} style={{ color: '#fd68ba' }} />
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          <strong>직급전 확정</strong>을 하면 해당 회차 Top 3 후원자에게 VIP 개인 페이지가 자동으로 생성됩니다.
        </span>
      </div>

      <DataTable
        data={filteredEpisodes}
        columns={columns}
        onEdit={openEditModal}
        onDelete={(item) => {
          if (item.isFinalized) {
            alertHandler.showError('확정된 직급전은 삭제할 수 없습니다.', '삭제 불가')
            return Promise.resolve(false)
          }
          return handleDelete(item)
        }}
        searchPlaceholder="에피소드 제목으로 검색..."
        isLoading={isLoading}
      />

      <AnimatePresence>
        {isModalOpen && editingEpisode && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className={styles.modal}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2>{isNew ? '에피소드 추가' : '에피소드 수정'}</h2>
                <button onClick={closeModal} className={styles.closeButton}><X size={20} /></button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>시즌</label>
                    <select
                      value={editingEpisode.seasonId || ''}
                      onChange={(e) => setEditingEpisode({ ...editingEpisode, seasonId: Number(e.target.value) })}
                      className={styles.input}
                      disabled={!isNew && editingEpisode.isFinalized}
                    >
                      <option value="">시즌 선택</option>
                      {seasons.map((season) => (
                        <option key={season.id} value={season.id}>{season.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>회차</label>
                    <input
                      type="number" min="1"
                      value={editingEpisode.episodeNumber || ''}
                      onChange={(e) => setEditingEpisode({ ...editingEpisode, episodeNumber: parseInt(e.target.value) || 1 })}
                      className={styles.input}
                      disabled={!isNew && editingEpisode.isFinalized}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>제목</label>
                  <input
                    type="text"
                    value={editingEpisode.title || ''}
                    onChange={(e) => setEditingEpisode({ ...editingEpisode, title: e.target.value })}
                    className={styles.input}
                    placeholder="예: 리나의 심야라디오 12회"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>방송일</label>
                  <input
                    type="date"
                    value={editingEpisode.broadcastDate || ''}
                    onChange={(e) => setEditingEpisode({ ...editingEpisode, broadcastDate: e.target.value })}
                    className={styles.input}
                    disabled={!isNew && editingEpisode.isFinalized}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>설명 (선택)</label>
                  <textarea
                    value={editingEpisode.description || ''}
                    onChange={(e) => setEditingEpisode({ ...editingEpisode, description: e.target.value || null })}
                    className={styles.textarea}
                    rows={3}
                    placeholder="에피소드 설명 (선택사항)"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={editingEpisode.isRankBattle || false}
                      onChange={(e) => setEditingEpisode({ ...editingEpisode, isRankBattle: e.target.checked })}
                      className={styles.checkbox}
                      disabled={!isNew && editingEpisode.isFinalized}
                    />
                    <Trophy size={16} style={{ marginLeft: 4, color: '#ffd700' }} />
                    <span>직급전 회차</span>
                  </label>
                  <p className={styles.hint}>직급전으로 설정하면 확정 시 Top 3에게 VIP 보상이 자동 생성됩니다.</p>
                </div>

                {!isNew && editingEpisode.isFinalized && (
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '8px', padding: '12px 16px', marginTop: '12px',
                  }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#22c55e' }}>
                      <Check size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                      이 에피소드는 이미 확정되어 일부 필드 수정이 제한됩니다.
                    </p>
                  </div>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button onClick={closeModal} className={styles.cancelButton}>취소</button>
                <button onClick={handleSave} className={styles.saveButton}>
                  <Save size={16} />{isNew ? '추가' : '저장'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
