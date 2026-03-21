'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Save } from 'lucide-react'
import type { SeasonRankingUI, TotalRankingUI } from './types'
import styles from '../../shared.module.css'

interface RankingEditModalProps {
  isOpen: boolean
  editingItem: SeasonRankingUI | TotalRankingUI | null
  editType: 'season' | 'total'
  isLoading: boolean
  onClose: () => void
  onSave: () => void
  onItemChange: (item: SeasonRankingUI | TotalRankingUI) => void
}

export function RankingEditModal({
  isOpen,
  editingItem,
  editType,
  isLoading,
  onClose,
  onSave,
  onItemChange,
}: RankingEditModalProps) {
  return (
    <AnimatePresence>
      {isOpen && editingItem && (
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
              <h2>랭킹 수정</h2>
              <button onClick={onClose} className={styles.closeButton}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>순위</label>
                  <input
                    type="number"
                    value={editingItem.rank}
                    onChange={(e) =>
                      onItemChange({ ...editingItem, rank: parseInt(e.target.value) || 0 })
                    }
                    className={styles.input}
                    min={1}
                    max={50}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>닉네임</label>
                  <input
                    type="text"
                    value={editingItem.donorName}
                    onChange={(e) =>
                      onItemChange({ ...editingItem, donorName: e.target.value })
                    }
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>총 하트</label>
                <input
                  type="number"
                  value={editingItem.totalAmount}
                  onChange={(e) =>
                    onItemChange({ ...editingItem, totalAmount: parseInt(e.target.value) || 0 })
                  }
                  className={styles.input}
                  min={0}
                />
              </div>

              {editType === 'season' && 'donationCount' in editingItem && (
                <div className={styles.formGroup}>
                  <label>건수</label>
                  <input
                    type="number"
                    value={(editingItem as SeasonRankingUI).donationCount}
                    onChange={(e) =>
                      onItemChange({
                        ...editingItem,
                        donationCount: parseInt(e.target.value) || 0,
                      } as SeasonRankingUI)
                    }
                    className={styles.input}
                    min={0}
                  />
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button onClick={onClose} className={styles.cancelButton}>
                취소
              </button>
              <button onClick={onSave} className={styles.saveButton} disabled={isLoading}>
                <Save size={16} />
                저장
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
