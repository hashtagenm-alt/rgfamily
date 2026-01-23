'use client'

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageSquare, ImageIcon, Video, Send, Loader2, Globe, Lock, Upload, Trash2 } from 'lucide-react'
import styles from './BjMessageForm.module.css'

interface BjMessageFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    messageType: 'text' | 'image' | 'video'
    contentText?: string
    contentUrl?: string
    isPublic?: boolean
  }) => Promise<boolean>
  bjMemberInfo?: {
    name: string
    imageUrl: string | null
  }
  vipNickname: string
}

type MessageType = 'text' | 'image' | 'video'

export default function BjMessageForm({
  isOpen,
  onClose,
  onSubmit,
  bjMemberInfo,
  vipNickname,
}: BjMessageFormProps) {
  const [messageType, setMessageType] = useState<MessageType>('text')
  const [contentText, setContentText] = useState('')
  const [contentUrl, setContentUrl] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 이미지 업로드 관련 상태
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = useCallback(() => {
    setMessageType('text')
    setContentText('')
    setContentUrl('')
    setIsPublic(true)
    setError(null)
    setIsUploading(false)
    setUploadProgress(0)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // 파일 업로드 핸들러
  const handleFileUpload = async (file: File) => {
    if (!file) return

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.')
      return
    }

    // 파일 크기 검증 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('파일 크기는 10MB 이하여야 합니다.')
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
    resetForm()
    onClose()
  }, [resetForm, onClose])

  const validateForm = (): boolean => {
    setError(null)

    if (messageType === 'text') {
      if (!contentText.trim()) {
        setError('메시지를 입력해주세요.')
        return false
      }
      if (contentText.length > 1000) {
        setError('메시지는 1000자 이하로 작성해주세요.')
        return false
      }
    }

    if (messageType === 'image') {
      if (!contentUrl.trim()) {
        setError('이미지를 업로드해주세요.')
        return false
      }
    }

    if (messageType === 'video') {
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
        messageType,
        contentText: contentText.trim() || undefined,
        contentUrl: contentUrl.trim() || undefined,
        isPublic,
      })

      if (success) {
        handleClose()
      } else {
        setError('메시지 전송에 실패했습니다. 다시 시도해주세요.')
      }
    } catch (err) {
      setError('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const tabs: { type: MessageType; icon: typeof MessageSquare; label: string }[] = [
    { type: 'text', icon: MessageSquare, label: '텍스트' },
    { type: 'image', icon: ImageIcon, label: '사진' },
    { type: 'video', icon: Video, label: '영상' },
  ]

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
            {/* 닫기 버튼 */}
            <button className={styles.closeBtn} onClick={handleClose}>
              <X size={20} />
            </button>

            {/* 헤더 */}
            <div className={styles.header}>
              <div className={styles.bjProfile}>
                {bjMemberInfo?.imageUrl ? (
                  <Image
                    src={bjMemberInfo.imageUrl}
                    alt={bjMemberInfo.name}
                    width={48}
                    height={48}
                    className={styles.bjAvatar}
                  />
                ) : (
                  <div className={styles.bjAvatarPlaceholder}>
                    {(bjMemberInfo?.name || 'BJ').charAt(0)}
                  </div>
                )}
                <div className={styles.headerText}>
                  <h2 className={styles.title}>감사 메시지 작성</h2>
                  <p className={styles.subtitle}>
                    <span className={styles.vipName}>{vipNickname}</span>님에게 감사 인사를 남겨주세요
                  </p>
                </div>
              </div>
            </div>

            {/* 타입 탭 */}
            <div className={styles.tabs}>
              {tabs.map((tab) => (
                <button
                  key={tab.type}
                  className={`${styles.tab} ${messageType === tab.type ? styles.activeTab : ''}`}
                  onClick={() => {
                    setMessageType(tab.type)
                    // 탭 변경 시 URL과 미리보기 초기화
                    setContentUrl('')
                    setPreviewUrl(null)
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                  disabled={isSubmitting || isUploading}
                >
                  <tab.icon size={18} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* 폼 콘텐츠 */}
            <div className={styles.content}>
              {/* 텍스트 메시지 */}
              {messageType === 'text' && (
                <div className={styles.inputGroup}>
                  <label className={styles.label}>메시지</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="VIP님에게 전할 감사 메시지를 작성해주세요..."
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

              {/* 이미지 */}
              {messageType === 'image' && (
                <>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>이미지 파일</label>

                    {/* 미리보기 또는 업로드 영역 */}
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
                            <span className={styles.uploadHint}>JPG, PNG, GIF, WEBP (최대 10MB)</span>
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

              {/* 영상 */}
              {messageType === 'video' && (
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

              {/* 공개/비공개 설정 */}
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
                    : `${vipNickname}님과 나만 이 메시지를 볼 수 있습니다`}
                </span>
              </div>

              {/* 에러 메시지 */}
              {error && <p className={styles.error}>{error}</p>}
            </div>

            {/* 액션 버튼 */}
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
                    <span>전송 중...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>메시지 보내기</span>
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
