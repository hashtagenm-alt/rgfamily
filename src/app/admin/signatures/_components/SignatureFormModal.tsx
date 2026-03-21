'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Hash } from 'lucide-react'
import { ImageUpload } from '@/components/admin'
import styles from '../../shared.module.css'
import type { SignatureUI } from './types'

interface SignatureFormModalProps {
  isOpen: boolean
  isNew: boolean
  editingSignature: Partial<SignatureUI> | null
  onClose: () => void
  onSave: () => void
  onChange: (updated: Partial<SignatureUI>) => void
}

export default function SignatureFormModal({
  isOpen,
  isNew,
  editingSignature,
  onClose,
  onSave,
  onChange,
}: SignatureFormModalProps) {
  return (
    <AnimatePresence>
      {isOpen && editingSignature && (
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
          >
            <div className={styles.modalHeader}>
              <h2>{isNew ? '시그 추가' : '시그 수정'}</h2>
              <button onClick={onClose} className={styles.closeButton}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>
                    <Hash size={14} style={{ marginRight: '4px' }} />
                    시그 번호
                  </label>
                  <input
                    type="number"
                    value={editingSignature.sigNumber || ''}
                    onChange={(e) =>
                      onChange({ ...editingSignature, sigNumber: parseInt(e.target.value) || 0 })
                    }
                    className={styles.input}
                    placeholder="1"
                    min={1}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>부서</label>
                  <div className={styles.typeSelector}>
                    <button
                      type="button"
                      onClick={() => onChange({ ...editingSignature, unit: 'excel' })}
                      className={`${styles.typeButton} ${editingSignature.unit === 'excel' ? styles.active : ''}`}
                    >
                      엑셀부
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange({ ...editingSignature, unit: 'crew' })}
                      className={`${styles.typeButton} ${editingSignature.unit === 'crew' ? styles.active : ''}`}
                    >
                      크루부
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>시그 제목</label>
                <input
                  type="text"
                  value={editingSignature.title || ''}
                  onChange={(e) =>
                    onChange({ ...editingSignature, title: e.target.value })
                  }
                  className={styles.input}
                  placeholder="예: valkyries"
                />
              </div>

              <div className={styles.formGroup}>
                <label>썸네일 이미지</label>
                <ImageUpload
                  value={editingSignature.thumbnailUrl || ''}
                  onChange={(url) =>
                    onChange({ ...editingSignature, thumbnailUrl: url || '' })
                  }
                  folder="signatures"
                />
              </div>

              <div className={styles.formGroup}>
                <label>설명 (선택)</label>
                <textarea
                  value={editingSignature.description || ''}
                  onChange={(e) =>
                    onChange({ ...editingSignature, description: e.target.value })
                  }
                  className={styles.textarea}
                  placeholder="시그에 대한 설명..."
                  rows={3}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={onClose} className={styles.cancelButton}>
                취소
              </button>
              <button onClick={onSave} className={styles.saveButton}>
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
