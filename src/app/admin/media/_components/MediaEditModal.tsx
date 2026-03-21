'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Save, Cloud } from 'lucide-react'
import CloudflareVideoUpload from '@/components/admin/CloudflareVideoUpload'
import styles from '../../shared.module.css'
import { Media } from './types'
import MediaThumbnailSection from './MediaThumbnailSection'

interface MediaEditModalProps {
  isNew: boolean
  editingMedia: Partial<Media>
  setEditingMedia: React.Dispatch<React.SetStateAction<Partial<Media> | null>>
  onClose: () => void
  onSave: () => void
  alertHandler: { showSuccess: (msg: string) => void; showError: (msg: string) => void }
}

export default function MediaEditModal({
  isNew,
  editingMedia,
  setEditingMedia,
  onClose,
  onSave,
  alertHandler,
}: MediaEditModalProps) {
  const [uploadMode, setUploadMode] = useState<'url' | 'cloudflare'>('cloudflare')

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
          <h2>{isNew ? '미디어 추가' : '미디어 수정'}</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>제목</label>
            <input
              type="text"
              value={editingMedia.title || ''}
              onChange={(e) =>
                setEditingMedia({ ...editingMedia, title: e.target.value })
              }
              className={styles.input}
              placeholder="영상 제목을 입력하세요"
            />
          </div>

          <div className={styles.formGroup}>
            <label>콘텐츠 유형</label>
            <div className={styles.typeSelector}>
              <button
                type="button"
                onClick={() => setEditingMedia({ ...editingMedia, contentType: 'shorts' })}
                className={`${styles.typeButton} ${editingMedia.contentType === 'shorts' ? styles.active : ''}`}
              >
                숏폼
              </button>
              <button
                type="button"
                onClick={() => setEditingMedia({ ...editingMedia, contentType: 'vod' })}
                className={`${styles.typeButton} ${editingMedia.contentType === 'vod' ? styles.active : ''}`}
              >
                VOD
              </button>
            </div>
          </div>

          {/* 총 파트 수 - VOD 신규 생성 시에만 표시 */}
          {editingMedia.contentType === 'vod' && isNew && (
            <div className={styles.formGroup}>
              <label>총 파트 수</label>
              <input
                type="number"
                min={1}
                max={20}
                value={editingMedia.totalParts || 1}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(20, parseInt(e.target.value) || 1))
                  setEditingMedia({ ...editingMedia, totalParts: val })
                }}
                className={styles.input}
                style={{ width: '120px' }}
              />
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                {(editingMedia.totalParts || 1) <= 1
                  ? '단일 영상으로 등록됩니다.'
                  : `멀티파트 VOD — 지금 업로드하는 영상이 Part 1이 됩니다. 나머지 파트는 저장 후 "추가" 버튼으로 업로드하세요.`}
              </p>
            </div>
          )}

          <div className={styles.formGroup}>
            <label>부서</label>
            <div className={styles.typeSelector}>
              <button
                type="button"
                onClick={() => setEditingMedia({ ...editingMedia, unit: 'excel' })}
                className={`${styles.typeButton} ${editingMedia.unit === 'excel' ? styles.active : ''}`}
              >
                엑셀부
              </button>
              <button
                type="button"
                onClick={() => setEditingMedia({ ...editingMedia, unit: 'crew' })}
                className={`${styles.typeButton} ${editingMedia.unit === 'crew' ? styles.active : ''}`}
              >
                크루부
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>영상</label>
            <div className={styles.typeSelector} style={{ marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => setUploadMode('cloudflare')}
                className={`${styles.typeButton} ${uploadMode === 'cloudflare' ? styles.active : ''}`}
              >
                Cloudflare 업로드
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                className={`${styles.typeButton} ${uploadMode === 'url' ? styles.active : ''}`}
              >
                URL 입력
              </button>
            </div>

            {uploadMode === 'cloudflare' && (
              <CloudflareVideoUpload
                onUploadComplete={({ uid, thumbnailUrl, duration }) => {
                  setEditingMedia({
                    ...editingMedia,
                    cloudflareUid: uid,
                    videoUrl: `https://iframe.videodelivery.net/${uid}`,
                    thumbnailUrl: thumbnailUrl || editingMedia.thumbnailUrl,
                    duration: duration || null,
                  })
                }}
                onError={(error) => alertHandler.showError(error)}
              />
            )}

            {uploadMode === 'url' && (
              <input
                type="text"
                value={editingMedia.videoUrl || ''}
                onChange={(e) =>
                  setEditingMedia({ ...editingMedia, videoUrl: e.target.value, cloudflareUid: null })
                }
                className={styles.input}
                placeholder="https://youtube.com/..."
              />
            )}

            {editingMedia.cloudflareUid && (
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#f6821f', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Cloud size={14} />
                Cloudflare Stream: {editingMedia.cloudflareUid.slice(0, 12)}...
              </div>
            )}

          </div>

          <MediaThumbnailSection
            editingMedia={editingMedia}
            setEditingMedia={setEditingMedia}
          />

          <div className={styles.formGroup}>
            <label>설명 (선택)</label>
            <textarea
              value={editingMedia.description || ''}
              onChange={(e) =>
                setEditingMedia({ ...editingMedia, description: e.target.value })
              }
              className={styles.textarea}
              placeholder="영상에 대한 설명..."
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={editingMedia.isPublished || false}
                onChange={(e) =>
                  setEditingMedia({ ...editingMedia, isPublished: e.target.checked })
                }
                className={styles.checkbox}
              />
              공개
            </label>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={editingMedia.isFeatured || false}
                onChange={(e) =>
                  setEditingMedia({ ...editingMedia, isFeatured: e.target.checked })
                }
                className={styles.checkbox}
              />
              추천 콘텐츠로 설정
            </label>
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
  )
}
