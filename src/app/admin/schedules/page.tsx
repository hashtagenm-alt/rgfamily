'use client'

import { useState, useEffect, useCallback } from 'react'
import { CalendarDays, Plus } from 'lucide-react'
import { DataTable, Column } from '@/components/admin'
import ScheduleEditModal from '@/components/schedule/ScheduleEditModal'
import { getSchedules } from '@/lib/actions/schedules'
import type { Schedule } from '@/types/database'
import styles from '../shared.module.css'

type EventType = 'broadcast' | 'collab' | 'event' | 'notice' | '休'

const eventTypeLabels: Record<EventType, string> = {
  broadcast: '방송',
  collab: '콜라보',
  event: '이벤트',
  notice: '공지',
  '休': '휴방',
}

const eventTypeColors: Record<EventType, string> = {
  broadcast: 'rgba(196, 30, 127, 0.15)',
  collab: 'rgba(96, 165, 250, 0.15)',
  event: 'rgba(59, 130, 246, 0.15)',
  notice: 'rgba(234, 179, 8, 0.15)',
  '休': 'rgba(148, 163, 184, 0.15)',
}

interface ScheduleItem {
  id: number
  title: string
  description: string
  startDatetime: string
  endDatetime: string | null
  eventType: EventType
  unit: 'excel' | 'crew' | null
  isAllDay: boolean
  createdAt: string
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)

  const fetchSchedules = useCallback(async () => {
    setIsLoading(true)
    const result = await getSchedules()
    if (result.data) {
      setSchedules(
        result.data.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description || '',
          startDatetime: s.start_datetime,
          endDatetime: s.end_datetime,
          eventType: s.event_type as EventType,
          unit: s.unit,
          isAllDay: s.is_all_day,
          createdAt: s.created_at,
        }))
      )
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  const handleAddClick = () => {
    setEditingSchedule(null)
    setIsModalOpen(true)
  }

  const handleEditClick = (item: ScheduleItem) => {
    // ScheduleEditModal이 기대하는 Schedule 타입으로 변환
    const schedule: Schedule = {
      id: item.id,
      title: item.title,
      description: item.description || null,
      start_datetime: item.startDatetime,
      end_datetime: item.endDatetime,
      event_type: item.eventType,
      unit: item.unit,
      is_all_day: item.isAllDay,
      color: null,
      location: null,
      created_by: null,
      created_at: item.createdAt,
    }
    setEditingSchedule(schedule)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingSchedule(null)
  }

  const handleSaved = () => {
    setIsModalOpen(false)
    setEditingSchedule(null)
    fetchSchedules()
  }

  const handleDeleted = () => {
    setIsModalOpen(false)
    setEditingSchedule(null)
    fetchSchedules()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const columns: Column<ScheduleItem>[] = [
    { key: 'title', header: '제목' },
    {
      key: 'eventType',
      header: '유형',
      width: '100px',
      render: (item) => (
        <span
          className={styles.badge}
          style={{ background: eventTypeColors[item.eventType], color: 'var(--color-text)' }}
        >
          {eventTypeLabels[item.eventType]}
        </span>
      ),
    },
    {
      key: 'unit',
      header: '대상',
      width: '100px',
      render: (item) => (
        <span className={`${styles.badge} ${item.unit === 'excel' ? styles.badgeExcel : item.unit === 'crew' ? styles.badgeCrew : ''}`}>
          {item.unit === null ? '전체' : item.unit === 'excel' ? '엑셀부' : '크루부'}
        </span>
      ),
    },
    {
      key: 'startDatetime',
      header: '날짜',
      width: '150px',
      render: (item) => formatDate(item.startDatetime),
    },
    {
      key: 'startDatetime',
      header: '시간',
      width: '100px',
      render: (item) => (item.isAllDay ? '종일' : formatTime(item.startDatetime)),
    },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <CalendarDays size={24} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>일정 관리</h1>
            <p className={styles.subtitle}>방송/이벤트/공지 일정 관리</p>
          </div>
        </div>
        <button onClick={handleAddClick} className={styles.addButton}>
          <Plus size={18} />
          일정 추가
        </button>
      </header>

      <DataTable
        data={schedules}
        columns={columns}
        onEdit={handleEditClick}
        searchPlaceholder="일정 제목으로 검색..."
        isLoading={isLoading}
      />

      {/* ScheduleEditModal 사용 */}
      <ScheduleEditModal
        isOpen={isModalOpen}
        event={editingSchedule}
        defaultDate={null}
        onClose={handleModalClose}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </div>
  )
}
