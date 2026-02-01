'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageSquare, ImageIcon, Video, Save, Loader2, Globe, Lock, Upload, Trash2 } from 'lucide-react'
import type { BjMessageWithMember } from '@/lib/actions/bj-messages'
import styles from './BjMessageForm.module.css'

interface BjMessageEditModalProps {
  isOpen: boolean
  message: BjMessageWithMember
  onClose: () => void
  onSubmit: (data: {
    contentText?: string
    contentUrl?: string
    isPublic?: boolean
  }) => Promise<boolean>
}

export default function BjMessageEditModal({
  isOpen,
  message,
  onClose,
  onSubmit,
}: BjMessageEditModalProps) {
  const [contentText, setContentText] = useState(message.content_text || '')
  const [contentUrl, setContentUrl] = useState(message.content_url || '')
  const [isPublic, setIsPublic] = useState(message.is_public)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Image upload states
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(message.content_url || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize form values when message changes
  useEffect(() => {
    setContentText(message.content_text || '')
    setContentUrl(message.content_url || '')
    setIsPublic(message.is_public)
    setPreviewUrl(message.message_type === 'image' ? (message.content_url || null) : null)
    setError(null)
  }, [message])

  const handleFileUpload = async (file: File) => {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.')
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'bj-messages')

      setUploadProgress(30)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      setUploadProgress(80)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '업로드에 실패했습니다.')
      }

      const data = await response.json()
      setContentUrl(data.url)
      setPreviewUrl(data.url)
      setUploadProgress(100)
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다.')
      setPreviewUrl(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleRemoveImage = () => {
    setContentUrl('')
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = useCallback(() => {
    setError(null)
    onClose()
  }, [onClose])

  const validateForm = (): boolean => {
    setError(null)

    if (message.message_type === 'text') {
      if (!contentText.trim()) {
        setError('메시지를 입력해주세요.')
        return false
      }
      if (contentText.length > 1000) {
        setError('메시지는 1000자 이하로 작성해주세요.')
        return false
      }
    }

    if (message.message_type === 'image') {
      if (!contentUrl.trim()) {
        setError('이미지를 업로드해주세요.')
        return false
      }
    }

    if (message.message_type === 'video') {
      if (!contentUrl.trim()) {
        setError('영상 URL을 입력해주세요.')
        return false
      }

      try {
        const parsedUrl = new URL(contentUrl)
        const isYouTube = parsedUrl.hostname.includes('youtube.com') || parsedUrl.hostname.includes('youtu.be')

        if (!isYouTube) {
          setError('영상은 YouTube 링크만 지원합니다.')
          return false
        }
      } catch {
        setError('올바른 URL 형식이 아닙니다.')
        return false
      }
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const success = await onSubmit({
        contentText: contentText.trim() || undefined,
        contentUrl: contentUrl.trim() || undefined,
        isPublic,
      })

      if (success) {
        handleClose()
      } else {
        setError('수정에 실패했습니다. 다시 시도해주세요.')
      }
    } catch {
      setError('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTypeIcon = () => {
    switch (message.message_type) {
      case 'image':
        return <ImageIcon size={18} />
      case 'video':
        return <Video size={18} />
      default:
        return <MessageSquare size={18} />
    }
  }

  const getTypeLabel = () => {
    switch (message.message_type) {
      case 'image':
        return '사진'
      case 'video':
        return '영상'
      default:
        return '텍스트'
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className={styles.modal}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.closeBtn} onClick={handleClose}>
              <X size={20} />
            </button>

            <div className={styles.header}>
              <div className={styles.bjProfile}>
                {message.bj_member?.image_url ? (
                  <Image
                    src={message.bj_member.image_url}
                    alt={message.bj_member.name || 'BJ'}
                    width={48}
                    height={48}
                    className={styles.bjAvatar}
                  />
                ) : (
                  <div className={styles.bjAvatarPlaceholder}>
                    {(message.bj_member?.name || 'BJ').charAt(0)}
                  </div>
                )}
                <div className={styles.headerText}>
                  <h2 className={styles.title}>메시지 수정</h2>
                  <p className={styles.subtitle}>
                    <span className={styles.typeBadgeSmall}>
                      {getTypeIcon()}
                      {getTypeLabel()}
                    </span>
                    메시지
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.content}>
              {/* Text message */}
              {message.message_type === 'text' && (
                <div className={styles.inputGroup}>
                  <label className={styles.label}>메시지</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="메시지 내용을 입력하세요..."
                    value={contentText}
                    onChange={(e) => setContentText(e.target.value)}
                    maxLength={1000}
                    disabled={isSubmitting || isUploading}
                  />
                  <span className={styles.charCount}>
                    {contentText.length} / 1000
                  </span>
                </div>
              )}

              {/* Image message */}
              {message.message_type === 'image' && (
                <>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>이미지</label>

                    {previewUrl ? (
                      <div className={styles.imagePreviewWrapper}>
                        <Image
                          src={previewUrl}
                          alt="업로드된 이미지"
                          width={400}
                          height={300}
                          className={styles.imagePreview}
                          style={{ objectFit: 'contain' }}
                        />
                        <button
                          type="button"
                          className={styles.removeImageBtn}
                          onClick={handleRemoveImage}
                          disabled={isSubmitting}
                        >
                          <Trash2 size={16} />
                          <span>삭제</span>
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`${styles.uploadArea} ${isUploading ? styles.uploading : ''}`}
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 size={32} className={styles.spinner} />
                            <span className={styles.uploadText}>업로드 중... {uploadProgress}%</span>
                            <div className={styles.progressBar}>
                              <div
                                className={styles.progressFill}
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <Upload size={32} />
                            <span className={styles.uploadText}>클릭하여 이미지 선택</span>
                            <span className={styles.uploadHint}>JPG, PNG, GIF, WEBP</span>
                          </>
                        )}
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleFileChange}
                      className={styles.hiddenInput}
                      disabled={isSubmitting || isUploading}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>함께 전할 메시지 (선택)</label>
                    <textarea
                      className={styles.textareaSmall}
                      placeholder="이미지와 함께 전할 짧은 메시지..."
                      value={contentText}
                      onChange={(e) => setContentText(e.target.value)}
                      maxLength={500}
                      disabled={isSubmitting || isUploading}
                    />
                  </div>
                </>
              )}

              {/* Video message */}
              {message.message_type === 'video' && (
                <>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>영상 URL</label>
                    <input
                      type="url"
                      className={styles.input}
                      placeholder="https://youtube.com/watch?v=... 또는 https://youtu.be/..."
                      value={contentUrl}
                      onChange={(e) => setContentUrl(e.target.value)}
                      disabled={isSubmitting || isUploading}
                    />
                    <span className={styles.hint}>
                      YouTube 영상 링크만 지원합니다
                    </span>
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>함께 전할 메시지 (선택)</label>
                    <textarea
                      className={styles.textareaSmall}
                      placeholder="영상과 함께 전할 짧은 메시지..."
                      value={contentText}
                      onChange={(e) => setContentText(e.target.value)}
                      maxLength={500}
                      disabled={isSubmitting || isUploading}
                    />
                  </div>
                </>
              )}

              {/* Visibility toggle */}
              <div className={styles.visibilityToggle}>
                <label className={styles.label}>공개 설정</label>
                <div className={styles.toggleButtons}>
                  <button
                    type="button"
                    className={`${styles.toggleBtn} ${isPublic ? styles.activeToggle : ''}`}
                    onClick={() => setIsPublic(true)}
                    disabled={isSubmitting}
                  >
                    <Globe size={16} />
                    <span>공개</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.toggleBtn} ${!isPublic ? styles.activeToggle : ''}`}
                    onClick={() => setIsPublic(false)}
                    disabled={isSubmitting}
                  >
                    <Lock size={16} />
                    <span>비공개</span>
                  </button>
                </div>
                <span className={styles.visibilityHint}>
                  {isPublic
                    ? '모든 VIP 회원이 이 메시지를 볼 수 있습니다'
                    : '해당 VIP님과 나만 이 메시지를 볼 수 있습니다'}
                </span>
              </div>

              {error && <p className={styles.error}>{error}</p>}
            </div>

            <div className={styles.actions}>
              <button
                className={styles.cancelBtn}
                onClick={handleClose}
                disabled={isSubmitting || isUploading}
              >
                취소
              </button>
              <button
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={isSubmitting || isUploading}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className={styles.spinner} />
                    <span>저장 중...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>수정 완료</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
