'use client'

import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Calendar, Image as ImageIcon, Sparkles, Tag } from 'lucide-react'
import { useAlert } from '@/lib/hooks'
import { createTimelineEvent, updateTimelineEvent } from '@/lib/actions/timeline'
import type { Season } from '@/types/database'
import { type TimelineEventUI, type TimelineCategory, categoryLabels, isFutureDate } from './types'
import styles from '../../shared.module.css'

interface TimelineEventModalProps {
  isOpen: boolean
  isNew: boolean
  editingEvent: Partial<TimelineEventUI> | null
  seasons: Season[]
  onClose: () => void
  onEventChange: (event: Partial<TimelineEventUI>) => void
  onSaved: () => void
}

export function TimelineEventModal({
  isOpen,
  isNew,
  editingEvent,
  seasons,
  onClose,
  onEventChange,
  onSaved,
}: TimelineEventModalProps) {
  const alertHandler = useAlert()

  const handleSave = useCallback(async () => {
    if (!editingEvent) return

    if (!editingEvent.title) {
      alertHandler.showWarning('이벤트 제목을 입력해주세요.', '입력 오류')
      return
    }
    if (!editingEvent.eventDate) {
      alertHandler.showWarning('이벤트 날짜를 선택해주세요.', '입력 오류')
      return
    }

    const dbData = {
      event_date: editingEvent.eventDate,
      title: editingEvent.title,
      description: editingEvent.description || null,
      image_url: editingEvent.imageUrl || null,
      category: editingEvent.category,
      season_id: editingEvent.seasonId,
    }

    if (isNew) {
      const result = await createTimelineEvent(dbData)
      if (result.error) {
        alertHandler.showError(result.error, '오류')
        return
      }
      alertHandler.showSuccess('이벤트가 추가되었습니다.')
    } else {
      const result = await updateTimelineEvent(editingEvent.id!, dbData)
      if (result.error) {
        alertHandler.showError(result.error, '오류')
        return
      }
      alertHandler.showSuccess('이벤트가 수정되었습니다.')
    }

    onClose()
    onSaved()
  }, [editingEvent, isNew, alertHandler, onClose, onSaved])

  return (
    <AnimatePresence>
      {isOpen && editingEvent && (
        <motion.div
          className={styles.modalOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
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
              <button onClick={onClose} className={styles.closeButton}>
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
                    onEventChange({ ...editingEvent, title: e.target.value })
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
                      onEventChange({ ...editingEvent, eventDate: e.target.value })
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
                      onEventChange({
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
                    onEventChange({
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
                    onEventChange({ ...editingEvent, imageUrl: e.target.value || null })
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
                    onEventChange({ ...editingEvent, description: e.target.value })
                  }
                  className={styles.textarea}
                  placeholder="이벤트에 대한 설명을 입력하세요..."
                  rows={4}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={onClose} className={styles.cancelButton}>
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
  )
}
