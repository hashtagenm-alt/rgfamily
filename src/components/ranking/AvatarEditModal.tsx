'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, Loader2, User, Link as LinkIcon } from 'lucide-react'
import Image from 'next/image'
import { updateProfileByAdmin } from '@/lib/actions/profiles'
import styles from './AvatarEditModal.module.css'

interface AvatarEditModalProps {
  isOpen: boolean
  onClose: () => void
  profileId: string
  profileName: string
  currentAvatarUrl: string | null
  onSaved: () => void
}

export default function AvatarEditModal({
  isOpen,
  onClose,
  profileId,
  profileName,
  currentAvatarUrl,
  onSaved,
}: AvatarEditModalProps) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl || '')
  const [previewUrl, setPreviewUrl] = useState(currentAvatarUrl || '')
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'url' | 'upload'>('url')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('파일 크기는 5MB 이하여야 합니다.')
      return
    }

    // 이미지 타입 체크
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'avatars')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('업로드 실패')

      const { url } = await res.json()
      setAvatarUrl(url)
      setPreviewUrl(url)
    } catch (err) {
      console.error('업로드 오류:', err)
      setError('이미지 업로드에 실패했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleUrlChange = (url: string) => {
    setAvatarUrl(url)
    setPreviewUrl(url)
    setError(null)
  }

  const handleSave = async () => {
    if (!profileId) return

    setIsSaving(true)
    setError(null)

    try {
      const result = await updateProfileByAdmin(profileId, {
        avatar_url: avatarUrl || null,
      })

      if (result.error) {
        throw new Error(result.error)
      }

      onSaved()
      onClose()
    } catch (err) {
      console.error('저장 오류:', err)
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
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
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.header}>
            <h3 className={styles.title}>프로필 사진 변경</h3>
            <button onClick={onClose} className={styles.closeBtn}>
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {/* 대상 정보 */}
            <div className={styles.targetInfo}>
              <span className={styles.targetLabel}>대상:</span>
              <span className={styles.targetName}>{profileName}</span>
            </div>

            {/* 현재 아바타 미리보기 */}
            <div className={styles.previewSection}>
              <div className={styles.previewWrapper}>
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt={profileName}
                    fill
                    className={styles.previewImage}
                    onError={() => setPreviewUrl('')}
                  />
                ) : (
                  <div className={styles.previewPlaceholder}>
                    <User size={40} />
                  </div>
                )}
              </div>
            </div>

            {/* 모드 선택 */}
            <div className={styles.modeToggle}>
              <button
                className={`${styles.modeBtn} ${mode === 'url' ? styles.active : ''}`}
                onClick={() => setMode('url')}
              >
                <LinkIcon size={14} />
                URL 입력
              </button>
              <button
                className={`${styles.modeBtn} ${mode === 'upload' ? styles.active : ''}`}
                onClick={() => setMode('upload')}
              >
                <Upload size={14} />
                파일 업로드
              </button>
            </div>

            {/* URL 입력 */}
            {mode === 'url' && (
              <div className={styles.inputGroup}>
                <label className={styles.label}>이미지 URL</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className={styles.input}
                />
              </div>
            )}

            {/* 파일 업로드 */}
            {mode === 'upload' && (
              <div className={styles.uploadSection}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className={styles.fileInput}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={styles.uploadBtn}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={16} className={styles.spinner} />
                      업로드 중...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      이미지 선택
                    </>
                  )}
                </button>
                <p className={styles.uploadHint}>최대 5MB, JPG/PNG/GIF</p>
              </div>
            )}

            {/* 에러 메시지 */}
            {error && <p className={styles.error}>{error}</p>}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <button onClick={onClose} className={styles.cancelBtn}>
              취소
            </button>
            <button
              onClick={handleSave}
              className={styles.saveBtn}
              disabled={isSaving || isUploading}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
