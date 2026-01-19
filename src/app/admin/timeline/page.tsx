'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Plus, X, Save, Calendar, Image as ImageIcon, Sparkles, Tag } from 'lucide-react'
import { DataTable, Column } from '@/components/admin'
import { useAdminCRUD, useAlert } from '@/lib/hooks'
import { useSeasons } from '@/lib/context'
import type { Season } from '@/types/database'
import styles from '../shared.module.css'

type TimelineCategory = 'founding' | 'milestone' | 'event' | 'member'

interface TimelineEvent {
  id: number
  eventDate: string
  title: string
  description: string
  imageUrl: string | null
  category: TimelineCategory | null
  seasonId: number | null
  seasonName?: string
  createdAt: string
}

const categoryLabels: Record<TimelineCategory, string> = {
  founding: '창단',
  milestone: '마일스톤',
  event: '이벤트',
  member: '멤버',
}

const categoryColors: Record<TimelineCategory, string> = {
  founding: '#71717a',
  milestone: '#6b7280',
  event: '#52525b',
  member: '#8b8b8b',
}

export default function TimelinePage() {
  const seasonsRepo = useSeasons()
  const alertHandler = useAlert()
  const [seasons, setSeasons] = useState<Season[]>([])

  // 시즌 목록 로드
  useEffect(() => {
    const loadSeasons = async () => {
      const data = await seasonsRepo.findAll()
      setSeasons(data)
    }
    loadSeasons()
  }, [seasonsRepo])

  const {
    items: events,
    isLoading,
    isModalOpen,
    isNew,
    editingItem: editingEvent,
    setEditingItem: setEditingEvent,
    openAddModal,
    openEditModal,
    closeModal,
    handleSave,
    handleDelete,
  } = useAdminCRUD<TimelineEvent>({
    tableName: 'timeline_events',
    defaultItem: {
      eventDate: new Date().toISOString().split('T')[0],
      title: '',
      description: '',
      imageUrl: null,
      category: 'event',
      seasonId: null,
    },
    orderBy: { column: 'event_date', ascending: false },
    fromDbFormat: (row) => ({
      id: row.id as number,
      eventDate: row.event_date as string,
      title: row.title as string,
      description: (row.description as string) || '',
      imageUrl: row.image_url as string | null,
      category: row.category as TimelineCategory | null,
      seasonId: row.season_id as number | null,
      createdAt: row.created_at as string,
    }),
    toDbFormat: (item) => ({
      event_date: item.eventDate,
      title: item.title,
      description: item.description || null,
      image_url: item.imageUrl || null,
      category: item.category,
      season_id: item.seasonId,
    }),
    validate: (item) => {
      if (!item.title) return '이벤트 제목을 입력해주세요.'
      if (!item.eventDate) return '이벤트 날짜를 선택해주세요.'
      return null
    },
    alertHandler,
  })

  // 날짜가 미래인지 확인
  const isFutureDate = (dateStr: string) => {
    const eventDate = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return eventDate > today
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getSeasonName = (seasonId: number | null) => {
    if (!seasonId) return '-'
    const season = seasons.find(s => s.id === seasonId)
    return season?.name || '-'
  }

  const columns: Column<TimelineEvent>[] = [
    {
      key: 'eventDate',
      header: '날짜',
      width: '180px',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
          <span>{formatDate(item.eventDate)}</span>
          {isFutureDate(item.eventDate) && (
            <span className={styles.upcomingBadge}>예정</span>
          )}
        </div>
      ),
    },
    { key: 'title', header: '제목' },
    {
      key: 'category',
      header: '카테고리',
      width: '100px',
      render: (item) => item.category ? (
        <span
          className={styles.badge}
          style={{
            background: `${categoryColors[item.category]}20`,
            color: categoryColors[item.category],
          }}
        >
          {categoryLabels[item.category]}
        </span>
      ) : '-',
    },
    {
      key: 'seasonId',
      header: '시즌',
      width: '160px',
      render: (item) => <span style={{ whiteSpace: 'nowrap' }}>{getSeasonName(item.seasonId)}</span>,
    },
    {
      key: 'imageUrl',
      header: '이미지',
      width: '80px',
      render: (item) => item.imageUrl ? (
        <ImageIcon size={16} style={{ color: 'var(--primary)' }} />
      ) : (
        <span style={{ color: 'var(--text-tertiary)' }}>-</span>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Clock size={24} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>타임라인 관리</h1>
            <p className={styles.subtitle}>시즌별 주요 사건 및 이벤트 기록</p>
          </div>
        </div>
        <button onClick={openAddModal} className={styles.addButton}>
          <Plus size={18} />
          이벤트 추가
        </button>
      </header>

      <DataTable
        data={events}
        columns={columns}
        onEdit={openEditModal}
        onDelete={handleDelete}
        searchPlaceholder="이벤트 제목으로 검색..."
        isLoading={isLoading}
      />

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && editingEvent && (
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
              style={{ maxWidth: '600px' }}
            >
              <div className={styles.modalHeader}>
                <h2>{isNew ? '타임라인 이벤트 추가' : '타임라인 이벤트 수정'}</h2>
                <button onClick={closeModal} className={styles.closeButton}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>
                {/* 제목 */}
                <div className={styles.formGroup}>
                  <label>
                    <Sparkles size={14} style={{ marginRight: '0.25rem' }} />
                    제목 *
                  </label>
                  <input
                    type="text"
                    value={editingEvent.title || ''}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, title: e.target.value })
                    }
                    className={styles.input}
                    placeholder="이벤트 제목을 입력하세요"
                  />
                </div>

                {/* 날짜 & 카테고리 */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>
                      <Calendar size={14} style={{ marginRight: '0.25rem' }} />
                      날짜 *
                    </label>
                    <input
                      type="date"
                      value={editingEvent.eventDate?.split('T')[0] || ''}
                      onChange={(e) =>
                        setEditingEvent({ ...editingEvent, eventDate: e.target.value })
                      }
                      className={styles.input}
                    />
                    {editingEvent.eventDate && isFutureDate(editingEvent.eventDate) && (
                      <span className={styles.helperText} style={{ color: '#71717a' }}>
                        📅 예정된 이벤트로 등록됩니다
                      </span>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label>
                      <Tag size={14} style={{ marginRight: '0.25rem' }} />
                      카테고리
                    </label>
                    <select
                      value={editingEvent.category || ''}
                      onChange={(e) =>
                        setEditingEvent({
                          ...editingEvent,
                          category: e.target.value as TimelineCategory || null,
                        })
                      }
                      className={styles.select}
                    >
                      <option value="">선택 안함</option>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 시즌 */}
                <div className={styles.formGroup}>
                  <label>시즌</label>
                  <select
                    value={editingEvent.seasonId || ''}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        seasonId: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className={styles.select}
                  >
                    <option value="">시즌 선택 안함</option>
                    {seasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 이미지 URL */}
                <div className={styles.formGroup}>
                  <label>
                    <ImageIcon size={14} style={{ marginRight: '0.25rem' }} />
                    이미지 URL (선택)
                  </label>
                  <input
                    type="url"
                    value={editingEvent.imageUrl || ''}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, imageUrl: e.target.value || null })
                    }
                    className={styles.input}
                    placeholder="https://example.com/image.jpg"
                  />
                  {editingEvent.imageUrl && (
                    <div className={styles.imagePreview}>
                      <img
                        src={editingEvent.imageUrl}
                        alt="미리보기"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* 설명 */}
                <div className={styles.formGroup}>
                  <label>설명</label>
                  <textarea
                    value={editingEvent.description || ''}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, description: e.target.value })
                    }
                    className={styles.textarea}
                    placeholder="이벤트에 대한 설명을 입력하세요..."
                    rows={4}
                  />
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
    </div>
  )
}
