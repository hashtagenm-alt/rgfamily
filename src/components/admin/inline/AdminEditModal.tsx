'use client'

/**
 * 관리자 편집 모달 래퍼 컴포넌트
 *
 * 공통 모달 UI를 제공하며, children으로 폼 내용을 받음
 * ScheduleEditModal 패턴을 일반화
 */

import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, Loader2 } from 'lucide-react'
import styles from './AdminEditModal.module.css'

interface AdminEditModalProps {
  isOpen: boolean
  title: string
  isNew: boolean
  isLoading?: boolean
  isDeleting?: boolean
  onClose: () => void
  onSave: () => void
  onDelete?: () => void
  children: ReactNode
  showDelete?: boolean
  saveLabel?: string
  maxWidth?: number
}

export default function AdminEditModal({
  isOpen,
  title,
  isNew,
  isLoading = false,
  isDeleting = false,
  onClose,
  onSave,
  onDelete,
  children,
  showDelete = true,
  saveLabel = '저장',
  maxWidth = 480,
}: AdminEditModalProps) {
  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleOverlayClick}
      >
        <motion.div
          className={styles.modal}
          style={{ maxWidth }}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.header}>
            <h2 className={styles.headerTitle}>{title}</h2>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              disabled={isLoading || isDeleting}
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {children}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            {showDelete && !isNew && onDelete && (
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={onDelete}
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
                onClick={onSave}
                disabled={isLoading || isDeleting}
              >
                {isLoading ? (
                  <Loader2 size={16} className={styles.spinner} />
                ) : (
                  saveLabel
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * 폼 필드 컴포넌트들
 */
interface FormFieldProps {
  label: string
  required?: boolean
  children: ReactNode
}

export function FormField({ label, required, children }: FormFieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      {children}
    </div>
  )
}

type FormInputProps = React.InputHTMLAttributes<HTMLInputElement>

export function FormInput(props: FormInputProps) {
  return <input className={styles.input} {...props} />
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode
}

export function FormSelect({ children, ...props }: FormSelectProps) {
  return (
    <select className={styles.select} {...props}>
      {children}
    </select>
  )
}

type FormTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export function FormTextarea(props: FormTextareaProps) {
  return <textarea className={styles.textarea} {...props} />
}

interface FormCheckboxProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function FormCheckbox({ label, checked, onChange }: FormCheckboxProps) {
  return (
    <div className={styles.checkboxField}>
      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={styles.checkbox}
        />
        <span>{label}</span>
      </label>
    </div>
  )
}
