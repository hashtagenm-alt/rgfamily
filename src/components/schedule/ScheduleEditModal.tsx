'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, Loader2 } from 'lucide-react'
import { createSchedule, updateSchedule, deleteSchedule } from '@/lib/actions/schedules'
import type { Schedule } from '@/types/database'
import styles from './ScheduleEditModal.module.css'

type EventType = 'broadcast' | 'collab' | 'event' | 'notice' | '休'
type Unit = 'excel' | 'crew' | null

interface ScheduleEditModalProps {
  isOpen: boolean
  event: Schedule | null  // null이면 추가 모드
  defaultDate: Date | null
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

const EVENT_TYPES: { value: EventType; label: string; color: string }[] = [
  { value: 'broadcast', label: '방송', color: '#7f9b88' },
  { value: 'collab', label: '콜라보', color: '#8a94a6' },
  { value: 'event', label: '이벤트', color: '#c89b6b' },
  { value: 'notice', label: '공지', color: '#b8a07a' },
  { value: '休', label: '휴방', color: '#8b94a5' },
]

const UNIT_OPTIONS: { value: Unit; label: string }[] = [
  { value: null, label: '전체' },
  { value: 'excel', label: '엑셀부' },
  { value: 'crew', label: '크루부' },
]

// datetime-local input에 사용할 포맷
function formatDatetimeLocal(date: Date | string, defaultTime?: string): string {
  const d = new Date(date)
  if (defaultTime && isNaN(d.getTime())) {
    const now = new Date()
    const [hours, minutes] = defaultTime.split(':')
    now.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    return formatDatetimeLocal(now)
  }

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export default function ScheduleEditModal({
  isOpen,
  event,
  defaultDate,
  onClose,
  onSaved,
  onDeleted,
}: ScheduleEditModalProps) {
  const isNew = !event
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 폼 상태
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState<EventType>('broadcast')
  const [unit, setUnit] = useState<Unit>(null)
  const [startDatetime, setStartDatetime] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [description, setDescription] = useState('')

  // 초기화
  useEffect(() => {
    if (!isOpen) return

    if (event) {
      setTitle(event.title)
      setEventType(event.event_type)
      setUnit(event.unit)
      setStartDatetime(formatDatetimeLocal(event.start_datetime))
      setIsAllDay(event.is_all_day)
      setDescription(event.description || '')
    } else {
      // 새 이벤트 기본값
      setTitle('')
      setEventType('broadcast')
      setUnit(null)
      const baseDate = defaultDate || new Date()
      // 기본 시간 20:00
      const dateWithTime = new Date(baseDate)
      dateWithTime.setHours(20, 0, 0, 0)
      setStartDatetime(formatDatetimeLocal(dateWithTime))
      setIsAllDay(false)
      setDescription('')
    }
  }, [event, defaultDate, isOpen])

  // 저장
  const handleSave = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.')
      return
    }

    if (!startDatetime) {
      alert('시작 일시를 입력해주세요.')
      return
    }

    setIsLoading(true)

    const selectedType = EVENT_TYPES.find(t => t.value === eventType)
    const data = {
      title: title.trim(),
      event_type: eventType,
      unit,
      start_datetime: new Date(startDatetime).toISOString(),
      is_all_day: isAllDay,
      description: description.trim() || null,
      color: selectedType?.color || null,
    }

    const result = isNew
      ? await createSchedule(data)
      : await updateSchedule(event!.id, data)

    setIsLoading(false)

    if (result.error) {
      alert(result.error)
    } else {
      onSaved()
    }
  }

  // 삭제
  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    setIsDeleting(true)
    const result = await deleteSchedule(event!.id)
    setIsDeleting(false)

    if (result.error) {
      alert(result.error)
    } else {
      onDeleted()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.modal}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.header}>
            <h2 className={styles.headerTitle}>
              {isNew ? '일정 추가' : '일정 수정'}
            </h2>
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {/* 제목 */}
            <div className={styles.field}>
              <label className={styles.label}>
                제목 <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="일정 제목을 입력하세요"
                maxLength={100}
              />
            </div>

            {/* 유형 */}
            <div className={styles.field}>
              <label className={styles.label}>
                유형 <span className={styles.required}>*</span>
              </label>
              <div className={styles.typeButtons}>
                {EVENT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    className={`${styles.typeButton} ${eventType === type.value ? styles.typeButtonActive : ''}`}
                    style={{
                      '--type-color': type.color,
                    } as React.CSSProperties}
                    onClick={() => setEventType(type.value)}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 대상 */}
            <div className={styles.field}>
              <label className={styles.label}>대상</label>
              <select
                className={styles.select}
                value={unit || ''}
                onChange={(e) => setUnit(e.target.value as Unit || null)}
              >
                {UNIT_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value || ''}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 시작 일시 */}
            <div className={styles.field}>
              <label className={styles.label}>
                시작 일시 <span className={styles.required}>*</span>
              </label>
              <input
                type="datetime-local"
                className={styles.input}
                value={startDatetime}
                onChange={(e) => setStartDatetime(e.target.value)}
              />
            </div>

            {/* 종일 */}
            <div className={styles.checkboxField}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className={styles.checkbox}
                />
                <span>종일</span>
              </label>
            </div>

            {/* 설명 */}
            <div className={styles.field}>
              <label className={styles.label}>설명</label>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="일정에 대한 설명을 입력하세요 (선택)"
                rows={3}
              />
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            {!isNew && (
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={handleDelete}
                disabled={isDeleting || isLoading}
              >
                {isDeleting ? (
                  <Loader2 size={16} className={styles.spinner} />
                ) : (
                  <Trash2 size={16} />
                )}
                <span>삭제</span>
              </button>
            )}
            <div className={styles.footerRight}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onClose}
                disabled={isLoading || isDeleting}
              >
                취소
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={isLoading || isDeleting}
              >
                {isLoading ? (
                  <Loader2 size={16} className={styles.spinner} />
                ) : (
                  '저장'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
