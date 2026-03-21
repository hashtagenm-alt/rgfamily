import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Loader2, X, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import type { RankingEntry } from './types'
import styles from '../../shared.module.css'
import pageStyles from '../page.module.css'

interface AvatarUploadModalProps {
  avatarEntry: RankingEntry | null
  isUploading: boolean
  onClose: () => void
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function AvatarUploadModal({
  avatarEntry,
  isUploading,
  onClose,
  onUpload,
}: AvatarUploadModalProps) {
  return (
    <AnimatePresence>
      {avatarEntry && avatarEntry.profile && (
        <motion.div
          className={styles.modalOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={`${styles.modal} ${pageStyles.avatarModal}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>아바타 업로드: {avatarEntry.profile.nickname}</h2>
              <button
                className={styles.closeButton}
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={pageStyles.currentAvatar}>
                {avatarEntry.profile.avatar_url ? (
                  <Image
                    src={avatarEntry.profile.avatar_url}
                    alt={avatarEntry.profile.nickname}
                    width={200}
                    height={200}
                    className={pageStyles.largeAvatar}
                  />
                ) : (
                  <div className={pageStyles.largeAvatarPlaceholder}>
                    <User size={60} />
                  </div>
                )}
              </div>

              <div className={pageStyles.uploadArea}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onUpload}
                  disabled={isUploading}
                  id="avatar-upload"
                  className={pageStyles.fileInput}
                />
                <label htmlFor="avatar-upload" className={pageStyles.uploadLabel}>
                  {isUploading ? (
                    <>
                      <Loader2 size={24} className={pageStyles.spinner} />
                      <span>업로드 중...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon size={24} />
                      <span>이미지 선택</span>
                      <span className={pageStyles.uploadHint}>800x800 고해상도로 저장됩니다</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={onClose}
              >
                닫기
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
