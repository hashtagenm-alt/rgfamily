'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, Loader2, Save, Calendar, Clock } from 'lucide-react'
import { createSchedule, updateSchedule, deleteSchedule } from '@/lib/actions/schedules'
import { useScheduleEventTypes } from '@/lib/hooks'
import type { Schedule } from '@/types/database'
import styles from './ScheduleEditModal.module.css'

type Unit = 'excel' | 'crew' | null

interface ScheduleEditModalProps {
  isOpen: boolean
  event: Schedule | null  // null이면 추가 모드
  defaultDate: Date | null
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

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

// date input용 포맷 (종일 모드)
function formatDateOnly(date: Date | string): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function ScheduleEditModal({
  isOpen,
  event,
  defaultDate,
  onClose,
  onSaved,
  onDeleted,
}: ScheduleEditModalProps) {
  const { activeTypes, getByCode } = useScheduleEventTypes()
  const isNew = !event
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 폼 상태
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState<string>('broadcast')
  const [unit, setUnit] = useState<Unit>(null)
  const [startDatetime, setStartDatetime] = useState('')
  const [endDatetime, setEndDatetime] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [description, setDescription] = useState('')

  // ESC 키로 모달 닫기
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // 초기화
  useEffect(() => {
    if (!isOpen) return

    if (event) {
      setTitle(event.title)
      setEventType(event.event_type)
      setUnit(event.unit)
      setStartDatetime(event.is_all_day
        ? formatDateOnly(event.start_datetime)
        : formatDatetimeLocal(event.start_datetime))
      setEndDatetime(event.end_datetime
        ? (event.is_all_day
            ? formatDateOnly(event.end_datetime)
            : formatDatetimeLocal(event.end_datetime))
        : '')
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
      // 기본 종료 시간: 시작 + 2시간
      const endWithTime = new Date(dateWithTime)
      endWithTime.setHours(22, 0, 0, 0)
      setEndDatetime(formatDatetimeLocal(endWithTime))
      setIsAllDay(false)
      setDescription('')
    }
  }, [event, defaultDate, isOpen])

  // 종일 토글 시 datetime 포맷 변환
  const handleAllDayChange = (checked: boolean) => {
    setIsAllDay(checked)
    if (checked) {
      // datetime → date 변환
      if (startDatetime) setStartDatetime(formatDateOnly(startDatetime))
      if (endDatetime) setEndDatetime(formatDateOnly(endDatetime))
    } else {
      // date → datetime 변환 (기본 시간 추가)
      if (startDatetime) {
        const d = new Date(startDatetime)
        d.setHours(20, 0, 0, 0)
        setStartDatetime(formatDatetimeLocal(d))
      }
      if (endDatetime) {
        const d = new Date(endDatetime)
        d.setHours(22, 0, 0, 0)
        setEndDatetime(formatDatetimeLocal(d))
      }
    }
  }

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

    // 종료 시간이 시작 시간보다 이전인지 체크
    if (endDatetime && new Date(endDatetime) < new Date(startDatetime)) {
      alert('종료 일시가 시작 일시보다 이전입니다.')
      return
    }

    setIsLoading(true)

    const selectedType = getByCode(eventType)

    // 종일 모드일 때 시간 설정
    let startIso: string
    let endIso: string | null = null

    if (isAllDay) {
      // 종일: 해당 날짜의 00:00:00으로 설정
      const startDate = new Date(startDatetime)
      startDate.setHours(0, 0, 0, 0)
      startIso = startDate.toISOString()

      if (endDatetime) {
        const endDate = new Date(endDatetime)
        endDate.setHours(23, 59, 59, 999)
        endIso = endDate.toISOString()
      }
    } else {
      startIso = new Date(startDatetime).toISOString()
      endIso = endDatetime ? new Date(endDatetime).toISOString() : null
    }

    const data = {
      title: title.trim(),
      event_type: eventType as 'broadcast' | 'collab' | 'event' | 'notice' | '休',
      unit,
      start_datetime: startIso,
      end_datetime: endIso,
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
              <label className={styles.label}>제목</label>
              <input
                type="text"
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="일정 제목을 입력하세요"
                maxLength={100}
              />
            </div>

            {/* 유형 & 대상 */}
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>유형</label>
                <div className={styles.typeButtons}>
                  {activeTypes.map((type) => (
                    <button
                      key={type.code}
                      type="button"
                      className={`${styles.typeButton} ${eventType === type.code ? styles.typeButtonActive : ''}`}
                      style={{
                        '--type-color': type.color || '#888888',
                      } as React.CSSProperties}
                      onClick={() => setEventType(type.code)}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.fieldSmall}>
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
            </div>

            {/* 날짜/시간 섹션 */}
            <div className={styles.datetimeSection}>
              <div className={styles.datetimeHeader}>
                <div className={styles.datetimeLabel}>
                  <Calendar size={16} />
                  <span>일시</span>
                </div>
                <label className={styles.allDayToggle}>
                  <input
                    type="checkbox"
                    checked={isAllDay}
                    onChange={(e) => handleAllDayChange(e.target.checked)}
                  />
                  <span className={styles.toggleSwitch} />
                  <span className={styles.toggleText}>종일</span>
                </label>
              </div>

              <div className={styles.datetimeInputs}>
                <div className={styles.datetimeField}>
                  <label className={styles.datetimeFieldLabel}>시작</label>
                  <div className={styles.inputWrapper}>
                    <Clock size={14} className={styles.inputIcon} />
                    <input
                      type={isAllDay ? 'date' : 'datetime-local'}
                      className={styles.datetimeInput}
                      value={startDatetime}
                      onChange={(e) => setStartDatetime(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.datetimeArrow}>→</div>

                <div className={styles.datetimeField}>
                  <label className={styles.datetimeFieldLabel}>종료</label>
                  <div className={styles.inputWrapper}>
                    <Clock size={14} className={styles.inputIcon} />
                    <input
                      type={isAllDay ? 'date' : 'datetime-local'}
                      className={styles.datetimeInput}
                      value={endDatetime}
                      onChange={(e) => setEndDatetime(e.target.value)}
                      min={startDatetime}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 설명 */}
            <div className={styles.field}>
              <label className={styles.label}>설명 (선택)</label>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="일정에 대한 추가 설명..."
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
                  <>
                    <Save size={16} />
                    <span>{isNew ? '추가' : '저장'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
