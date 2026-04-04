'use client'

import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import styles from '../../shared.module.css'
import { getEmbedUrl } from './types'

interface MediaPreviewModalProps {
  previewUrl: string
  previewVimeoId: string | null
  onClose: () => void
}

export default function MediaPreviewModal({
  previewUrl,
  previewVimeoId,
  onClose,
}: MediaPreviewModalProps) {
  return (
    <motion.div
      className={styles.modalOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '800px',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <div className={styles.modalHeader}>
          <h2>영상 미리보기</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>
        <div style={{ position: 'relative', paddingBottom: '56.25%' }}>
          <iframe
            src={getEmbedUrl(previewUrl, previewVimeoId)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      </motion.div>
    </motion.div>
  )
}
