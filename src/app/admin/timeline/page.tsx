'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Plus, X, Save, Calendar, Image as ImageIcon, Sparkles, Tag, Zap, Loader2 } from 'lucide-react'
import { DataTable, Column } from '@/components/admin'
import { useAdminCRUD, useAlert } from '@/lib/hooks'
import { useSeasons, useSupabaseContext } from '@/lib/context'
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
  const supabase = useSupabaseContext()
  const [seasons, setSeasons] = useState<Season[]>([])

  // 빠른 추가 모드
  const [quickAddMode, setQuickAddMode] = useState(false)
  const [quickAddData, setQuickAddData] = useState({ title: '', eventDate: new Date().toISOString().split('T')[0] })
  const [isQuickAdding, setIsQuickAdding] = useState(false)

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
    refetch,
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

  // 인라인 편집 핸들러
  const handleInlineEdit = useCallback(async (id: string | number, field: string, value: unknown) => {
    // DB 필드명 매핑
    const dbFieldMap: Record<string, string> = {
      title: 'title',
      eventDate: 'event_date',
      category: 'category',
      seasonId: 'season_id',
    }
    const dbField = dbFieldMap[field] || field

    // 값 변환
    let dbValue = value
    if (field === 'seasonId') {
      dbValue = value === '' || value === null ? null : parseInt(String(value), 10)
    }
    if (field === 'category' && value === '') {
      dbValue = null
    }

    const { error } = await supabase
      .from('timeline_events')
      .update({ [dbField]: dbValue })
      .eq('id', id)

    if (error) {
      console.error('인라인 수정 실패:', error)
      alertHandler.showError('수정에 실패했습니다.', '오류')
      return
    }

    alertHandler.showSuccess('수정되었습니다.')
    refetch()
  }, [supabase, alertHandler, refetch])

  // 빠른 추가 토글
  const toggleQuickAddMode = useCallback(() => {
    if (!quickAddMode) {
      setQuickAddData({ title: '', eventDate: new Date().toISOString().split('T')[0] })
    }
    setQuickAddMode(!quickAddMode)
  }, [quickAddMode])

  // 빠른 추가 핸들러
  const handleQuickAdd = useCallback(async () => {
    if (!quickAddData.title.trim()) {
      alertHandler.showWarning('제목을 입력해주세요.', '입력 오류')
      return
    }

    setIsQuickAdding(true)
    try {
      const { error } = await supabase.from('timeline_events').insert({
        event_date: quickAddData.eventDate,
        title: quickAddData.title.trim(),
        description: null,
        image_url: null,
        category: 'event',
        season_id: null,
      })

      if (error) {
        console.error('빠른 추가 실패:', error)
        alertHandler.showError('추가에 실패했습니다.', '오류')
        return
      }

      alertHandler.showSuccess(`"${quickAddData.title}" 추가됨`)
      refetch()

      // 폼 초기화 (연속 추가 가능)
      setQuickAddData({ title: '', eventDate: quickAddData.eventDate })
    } finally {
      setIsQuickAdding(false)
    }
  }, [supabase, quickAddData, alertHandler, refetch])

  // 빠른 추가 키보드 핸들러
  const handleQuickAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleQuickAdd()
    } else if (e.key === 'Escape') {
      setQuickAddMode(false)
    }
  }

  // 시즌 옵션 (인라인 select용)
  const seasonOptions = [
    { value: '', label: '-' },
    ...seasons.map(s => ({ value: String(s.id), label: s.name }))
  ]

  // 카테고리 옵션 (인라인 select용)
  const categoryOptions = [
    { value: '', label: '-' },
    ...Object.entries(categoryLabels).map(([key, label]) => ({ value: key, label }))
  ]

  const columns: Column<TimelineEvent>[] = [
    {
      key: 'eventDate',
      header: '날짜',
      width: '180px',
      editable: true,
      editType: 'date',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
          <span>{formatDate(item.eventDate)}</span>
          {isFutureDate(item.eventDate) && (
            <span className={styles.upcomingBadge}>예정</span>
          )}
        </div>
      ),
    },
    {
      key: 'title',
      header: '제목',
      editable: true,
      editType: 'text',
    },
    {
      key: 'category',
      header: '카테고리',
      width: '120px',
      editable: true,
      editType: 'select',
      selectOptions: categoryOptions,
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
      width: '180px',
      editable: true,
      editType: 'select',
      selectOptions: seasonOptions,
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={toggleQuickAddMode}
            className={styles.addButton}
            style={{
              background: quickAddMode ? 'var(--primary)' : 'transparent',
              border: '1px solid var(--primary)',
              color: quickAddMode ? 'white' : 'var(--primary)',
            }}
          >
            <Zap size={18} />
            빠른 추가
          </button>
          <button onClick={openAddModal} className={styles.addButton}>
            <Plus size={18} />
            이벤트 추가
          </button>
        </div>
      </header>

      {/* 빠른 추가 폼 */}
      <AnimatePresence>
        {quickAddMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: 'var(--card-bg)',
              border: '2px dashed var(--primary)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={16} style={{ color: 'var(--primary)' }} />
                <input
                  type="date"
                  value={quickAddData.eventDate}
                  onChange={(e) => setQuickAddData(prev => ({ ...prev, eventDate: e.target.value }))}
                  onKeyDown={handleQuickAddKeyDown}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--card-border)',
                    borderRadius: '4px',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
              <input
                type="text"
                value={quickAddData.title}
                onChange={(e) => setQuickAddData(prev => ({ ...prev, title: e.target.value }))}
                onKeyDown={handleQuickAddKeyDown}
                placeholder="이벤트 제목 입력 후 Enter..."
                autoFocus
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid var(--card-border)',
                  borderRadius: '4px',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              />
              <button
                onClick={handleQuickAdd}
                disabled={isQuickAdding || !quickAddData.title.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  opacity: isQuickAdding || !quickAddData.title.trim() ? 0.6 : 1,
                }}
              >
                {isQuickAdding ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
                추가
              </button>
              <button
                onClick={() => setQuickAddMode(false)}
                style={{
                  padding: '8px',
                  background: 'transparent',
                  border: '1px solid var(--card-border)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                <X size={16} />
              </button>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              Enter: 추가 · Escape: 닫기 · 연속 추가 가능
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <DataTable
        data={events}
        columns={columns}
        onEdit={openEditModal}
        onDelete={handleDelete}
        onInlineEdit={handleInlineEdit}
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
