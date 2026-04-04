'use client'

import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import VimeoVideoUpload from '@/components/admin/VimeoVideoUpload'
import {
  getNextPartNumber,
  addVodPart,
} from '@/lib/actions/media'
import styles from '../../shared.module.css'
import { Media } from './types'

interface AddPartModalProps {
  addPartTarget: Media
  expandedVodId: number | null
  onClose: () => void
  onSuccess: () => void
  onExpandVod: (id: number) => void
  fetchVodParts: (parentId: number) => void
  alertHandler: { showSuccess: (msg: string) => void; showError: (msg: string) => void }
}

export default function AddPartModal({
  addPartTarget,
  expandedVodId,
  onClose,
  onSuccess,
  onExpandVod,
  fetchVodParts,
  alertHandler,
}: AddPartModalProps) {
  return (
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
          <h2>파트 추가 — {addPartTarget.title}</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            다음 파트 영상을 업로드하면 자동으로 저장됩니다.
          </p>

          <VimeoVideoUpload
            onUploadComplete={async (vimeoId) => {
              // 현재 파트 수 조회하여 다음 part_number 계산
              const nextPartResult = await getNextPartNumber(addPartTarget.id)
              if (nextPartResult.error) {
                alertHandler.showError('파트 번호 조회에 실패했습니다: ' + nextPartResult.error)
                return
              }

              const nextPartNumber = nextPartResult.data!
              const partTitle = `${addPartTarget.title} (Part ${nextPartNumber})`

              // 새 파트 DB 삽입 + total_parts 업데이트 (서버 액션)
              const addResult = await addVodPart({
                parentId: addPartTarget.id,
                title: partTitle,
                description: addPartTarget.description || '',
                vimeoId,
                thumbnailUrl: '',
                unit: addPartTarget.unit,
                isPublished: addPartTarget.isPublished,
                partNumber: nextPartNumber,
                currentTotalParts: addPartTarget.totalParts,
                duration: null,
              })

              if (addResult.error) {
                alertHandler.showError('파트 저장에 실패했습니다: ' + addResult.error)
                return
              }

              alertHandler.showSuccess(`Part ${nextPartNumber} 업로드 완료!`)
              onClose()
              onSuccess()
              // 파트 목록도 새로고침
              if (expandedVodId === addPartTarget.id) {
                fetchVodParts(addPartTarget.id)
              } else {
                onExpandVod(addPartTarget.id)
              }
            }}
            onError={(error) => alertHandler.showError(error)}
          />
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.cancelButton}>
            닫기
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
