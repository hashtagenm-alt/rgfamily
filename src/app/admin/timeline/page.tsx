'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, Plus, Zap } from 'lucide-react'
import { DataTable } from '@/components/admin'
import { useAlert } from '@/lib/hooks'
import { useSeasons } from '@/lib/context'
import {
  getAllTimelineEvents,
  updateTimelineEvent,
  deleteTimelineEvent,
} from '@/lib/actions/timeline'
import type { Season } from '@/types/database'
import styles from '../shared.module.css'
import {
  type TimelineEventUI,
  fromDbFormat,
  defaultEvent,
  QuickAddForm,
  TimelineEventModal,
  useTimelineColumns,
} from './_components'

export default function TimelinePage() {
  const seasonsRepo = useSeasons()
  const alertHandler = useAlert()
  const [seasons, setSeasons] = useState<Season[]>([])

  // Data state
  const [events, setEvents] = useState<TimelineEventUI[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Partial<TimelineEventUI> | null>(null)

  // 빠른 추가 모드
  const [quickAddMode, setQuickAddMode] = useState(false)

  // Columns
  const columns = useTimelineColumns({ seasons })

  // 시즌 목록 로드
  useEffect(() => {
    const loadSeasons = async () => {
      const data = await seasonsRepo.findAll()
      setSeasons(data)
    }
    loadSeasons()
  }, [seasonsRepo])

  // 이벤트 목록 로드
  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getAllTimelineEvents()
      if (result.error) {
        alertHandler.showError(result.error, '오류')
        return
      }
      if (result.data) {
        setEvents(result.data.map(fromDbFormat))
      }
    } finally {
      setIsLoading(false)
    }
  }, [alertHandler])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Modal 열기/닫기
  const openAddModal = useCallback(() => {
    setEditingEvent({ ...defaultEvent } as Partial<TimelineEventUI>)
    setIsNew(true)
    setIsModalOpen(true)
  }, [])

  const openEditModal = useCallback((event: TimelineEventUI) => {
    setEditingEvent({ ...event })
    setIsNew(false)
    setIsModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setEditingEvent(null)
  }, [])

  // 삭제 핸들러
  const handleDelete = useCallback(async (event: TimelineEventUI) => {
    const result = await deleteTimelineEvent(event.id)
    if (result.error) {
      alertHandler.showError(result.error, '오류')
      return
    }
    alertHandler.showSuccess('이벤트가 삭제되었습니다.')
    fetchEvents()
  }, [alertHandler, fetchEvents])

  // 인라인 편집 핸들러
  const handleInlineEdit = useCallback(async (id: string | number, field: string, value: unknown) => {
    const dbFieldMap: Record<string, string> = {
      title: 'title',
      eventDate: 'event_date',
      category: 'category',
      seasonId: 'season_id',
    }
    const dbField = dbFieldMap[field] || field

    let dbValue = value
    if (field === 'seasonId') {
      dbValue = value === '' || value === null ? null : parseInt(String(value), 10)
    }
    if (field === 'category' && value === '') {
      dbValue = null
    }

    const result = await updateTimelineEvent(Number(id), { [dbField]: dbValue })

    if (result.error) {
      alertHandler.showError('수정에 실패했습니다.', '오류')
      return
    }

    alertHandler.showSuccess('수정되었습니다.')
    fetchEvents()
  }, [alertHandler, fetchEvents])

  // 빠른 추가 토글
  const toggleQuickAddMode = useCallback(() => {
    setQuickAddMode(prev => !prev)
  }, [])

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

      <QuickAddForm
        isOpen={quickAddMode}
        onClose={() => setQuickAddMode(false)}
        onEventAdded={fetchEvents}
      />

      <DataTable
        data={events}
        columns={columns}
        onEdit={openEditModal}
        onDelete={handleDelete}
        onInlineEdit={handleInlineEdit}
        searchPlaceholder="이벤트 제목으로 검색..."
        isLoading={isLoading}
      />

      <TimelineEventModal
        isOpen={isModalOpen}
        isNew={isNew}
        editingEvent={editingEvent}
        seasons={seasons}
        onClose={closeModal}
        onEventChange={setEditingEvent}
        onSaved={fetchEvents}
      />
    </div>
  )
}
