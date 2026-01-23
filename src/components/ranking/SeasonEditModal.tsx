'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, Loader2, Zap } from 'lucide-react'
import { createSeason, updateSeason, deleteSeason, setActiveSeason } from '@/lib/actions/seasons'
import type { Season } from '@/types/database'
import styles from './SeasonEditModal.module.css'

interface SeasonEditModalProps {
  isOpen: boolean
  season: Season | null  // null이면 추가 모드
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

// date input에 사용할 포맷
function formatDateInput(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function SeasonEditModal({
  isOpen,
  season,
  onClose,
  onSaved,
  onDeleted,
}: SeasonEditModalProps) {
  const isNew = !season
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSettingActive, setIsSettingActive] = useState(false)

  // 폼 상태
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isActive, setIsActive] = useState(false)

  // 초기화
  useEffect(() => {
    if (!isOpen) return

    if (season) {
      setName(season.name)
      setStartDate(formatDateInput(season.start_date))
      setEndDate(formatDateInput(season.end_date))
      setIsActive(season.is_active)
    } else {
      // 새 시즌 기본값
      setName('')
      const today = new Date()
      setStartDate(formatDateInput(today.toISOString()))
      setEndDate('')
      setIsActive(false)
    }
  }, [season, isOpen])

  // 저장
  const handleSave = async () => {
    if (!name.trim()) {
      alert('시즌 이름을 입력해주세요.')
      return
    }

    if (!startDate) {
      alert('시작일을 입력해주세요.')
      return
    }

    setIsLoading(true)

    const data = {
      name: name.trim(),
      start_date: startDate,
      end_date: endDate || null,
      is_active: isActive,
    }

    const result = isNew
      ? await createSeason(data)
      : await updateSeason(season!.id, data)

    setIsLoading(false)

    if (result.error) {
      alert(result.error)
    } else {
      onSaved()
    }
  }

  // 삭제
  const handleDelete = async () => {
    if (!confirm('정말 이 시즌을 삭제하시겠습니까? 관련된 에피소드와 후원 데이터가 삭제될 수 있습니다.')) return

    setIsDeleting(true)
    const result = await deleteSeason(season!.id)
    setIsDeleting(false)

    if (result.error) {
      alert(result.error)
    } else {
      onDeleted()
    }
  }

  // 활성 시즌 설정
  const handleSetActive = async () => {
    if (!season) return
    if (!confirm('이 시즌을 현재 활성 시즌으로 설정하시겠습니까? 다른 시즌은 비활성화됩니다.')) return

    setIsSettingActive(true)
    const result = await setActiveSeason(season.id)
    setIsSettingActive(false)

    if (result.error) {
      alert(result.error)
    } else {
      onSaved()
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
              {isNew ? '시즌 추가' : '시즌 수정'}
            </h2>
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {/* 시즌 이름 */}
            <div className={styles.field}>
              <label className={styles.label}>
                시즌 이름 <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 시즌 1, 2024 상반기"
                maxLength={50}
              />
            </div>

            {/* 시작일 */}
            <div className={styles.field}>
              <label className={styles.label}>
                시작일 <span className={styles.required}>*</span>
              </label>
              <input
                type="date"
                className={styles.input}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* 종료일 */}
            <div className={styles.field}>
              <label className={styles.label}>종료일</label>
              <input
                type="date"
                className={styles.input}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="진행 중이면 비워두세요"
              />
              <span className={styles.hint}>진행 중인 시즌은 비워두세요</span>
            </div>

            {/* 활성 상태 버튼 (수정 모드에서만) */}
            {!isNew && !season?.is_active && (
              <div className={styles.activeToggle}>
                <button
                  type="button"
                  className={styles.setActiveBtn}
                  onClick={handleSetActive}
                  disabled={isSettingActive || isLoading || isDeleting}
                >
                  {isSettingActive ? (
                    <Loader2 size={16} className={styles.spinner} />
                  ) : (
                    <Zap size={16} />
                  )}
                  <span>현재 활성 시즌으로 설정</span>
                </button>
              </div>
            )}

            {/* 이미 활성 상태인 경우 표시 */}
            {!isNew && season?.is_active && (
              <div className={styles.activeStatus}>
                <Zap size={14} />
                <span>현재 활성 시즌</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            {!isNew && (
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={handleDelete}
                disabled={isDeleting || isLoading || isSettingActive}
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
                disabled={isLoading || isDeleting || isSettingActive}
              >
                취소
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={isLoading || isDeleting || isSettingActive}
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
