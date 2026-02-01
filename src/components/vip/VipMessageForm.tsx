'use client'

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ImageIcon,
  Video,
  Send,
  Loader2,
  Globe,
  Lock,
  Crown,
  Upload,
  Film,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { getStreamThumbnailUrl } from '@/lib/cloudflare'
import styles from './VipMessageForm.module.css'

interface VipMessageFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    messageType: 'image' | 'video'
    contentText?: string
    contentUrl?: string
    isPublic?: boolean
  }) => Promise<boolean>
  vipInfo?: {
    nickname: string
    avatarUrl: string | null
  }
}

type MessageType = 'image' | 'video'
type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const MAX_IMAGE_SIZE = 20 * 1024 * 1024 // 20MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024 // 500MB

export default function VipMessageForm({
  isOpen,
  onClose,
  onSubmit,
  vipInfo,
}: VipMessageFormProps) {
  const [messageType, setMessageType] = useState<MessageType>('image')
  const [contentText, setContentText] = useState('')
  const [contentUrl, setContentUrl] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 파일 업로드 상태
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragActive, setIsDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = useCallback(() => {
    setMessageType('image')
    setContentText('')
    setContentUrl('')
    setIsPublic(true)
    setError(null)
    setUploadStatus('idle')
    setUploadProgress(0)
    setSelectedFile(null)
    setPreviewUrl(null)
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])

  const validateFile = (file: File, type: MessageType): string | null => {
    if (type === 'image') {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        return '지원하지 않는 이미지 형식입니다. (JPG, PNG, GIF, WEBP만 가능)'
      }
      if (file.size > MAX_IMAGE_SIZE) {
        return '이미지 크기는 20MB 이하여야 합니다.'
      }
    } else {
      if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
        return '지원하지 않는 영상 형식입니다. (MP4, WebM, MOV만 가능)'
      }
      if (file.size > MAX_VIDEO_SIZE) {
        return '영상 크기는 500MB 이하여야 합니다.'
      }
    }
    return null
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'vip-messages')

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || '이미지 업로드 실패')
    }

    return result.url
  }

  const uploadVideo = async (file: File): Promise<string | null> => {
    // 1. Upload URL 발급
    const urlRes = await fetch('/api/vip/video-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: file.name, maxDurationSeconds: 300 }),
    })

    if (!urlRes.ok) {
      const err = await urlRes.json()
      throw new Error(err.error || '업로드 URL 발급 실패')
    }

    const { uploadURL, uid } = await urlRes.json()

    // 2. Cloudflare에 직접 업로드
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('file', file)

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100)
          setUploadProgress(pct)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`업로드 실패 (${xhr.status})`))
        }
      })

      xhr.addEventListener('error', () => reject(new Error('네트워크 오류')))
      xhr.open('POST', uploadURL)
      xhr.send(formData)
    })

    // 3. 영상 처리 대기 (최대 3분)
    setUploadStatus('processing')
    const maxAttempts = 36 // 5초 간격 x 36 = 3분
    let attempts = 0

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000))
      attempts++

      const res = await fetch(`/api/cloudflare-stream/${uid}`)
      if (!res.ok) continue

      const data = await res.json()

      if (data.status?.state === 'ready') {
        // 썸네일 URL 생성
        return getStreamThumbnailUrl(uid, { width: 640, height: 360, fit: 'crop' })
          ? `cloudflare:${uid}` // 특별한 형식으로 저장
          : null
      }

      if (data.status?.state === 'error') {
        throw new Error(data.status.errorReasonText || '영상 처리 중 오류')
      }
    }

    throw new Error('영상 처리 시간 초과')
  }

  const handleFile = useCallback(async (file: File) => {
    const validationError = validateFile(file, messageType)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setSelectedFile(file)
    setUploadStatus('uploading')
    setUploadProgress(0)

    // 이미지 프리뷰 생성
    if (messageType === 'image') {
      const reader = new FileReader()
      reader.onload = (e) => setPreviewUrl(e.target?.result as string)
      reader.readAsDataURL(file)
    }

    try {
      let url: string | null = null

      if (messageType === 'image') {
        url = await uploadImage(file)
      } else {
        url = await uploadVideo(file)
      }

      if (url) {
        setContentUrl(url)
        setUploadStatus('success')
      } else {
        throw new Error('업로드 결과를 받지 못했습니다.')
      }
    } catch (err) {
      setUploadStatus('error')
      setError(err instanceof Error ? err.message : '업로드 실패')
    }
  }, [messageType])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    if (uploadStatus === 'uploading' || uploadStatus === 'processing') return

    const files = e.dataTransfer.files
    if (files.length > 0) handleFile(files[0])
  }, [uploadStatus, handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (uploadStatus !== 'uploading' && uploadStatus !== 'processing') {
      setIsDragActive(true)
    }
  }, [uploadStatus])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) handleFile(files[0])
    e.target.value = ''
  }

  const handleResetUpload = () => {
    setUploadStatus('idle')
    setUploadProgress(0)
    setSelectedFile(null)
    setPreviewUrl(null)
    setContentUrl('')
    setError(null)
  }

  const handleSubmit = async () => {
    if (!contentUrl) {
      setError(messageType === 'image' ? '이미지를 업로드해주세요.' : '영상을 업로드해주세요.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const success = await onSubmit({
        messageType,
        contentText: contentText.trim() || undefined,
        contentUrl,
        isPublic,
      })

      if (success) {
        handleClose()
      } else {
        setError('메시지 등록에 실패했습니다. 다시 시도해주세요.')
      }
    } catch {
      setError('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTypeChange = (type: MessageType) => {
    if (uploadStatus === 'uploading' || uploadStatus === 'processing') return
    setMessageType(type)
    handleResetUpload()
  }

  const tabs: { type: MessageType; icon: typeof ImageIcon; label: string }[] = [
    { type: 'image', icon: ImageIcon, label: '사진' },
    { type: 'video', icon: Video, label: '영상' },
  ]

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
            {/* 닫기 버튼 */}
            <button className={styles.closeBtn} onClick={handleClose}>
              <X size={20} />
            </button>

            {/* 헤더 */}
            <div className={styles.header}>
              <div className={styles.vipProfile}>
                {vipInfo?.avatarUrl ? (
                  <Image
                    src={vipInfo.avatarUrl}
                    alt={vipInfo.nickname}
                    width={48}
                    height={48}
                    className={styles.vipAvatar}
                  />
                ) : (
                  <div className={styles.vipAvatarPlaceholder}>
                    <Crown size={24} />
                  </div>
                )}
                <div className={styles.headerText}>
                  <h2 className={styles.title}>VIP 메시지 작성</h2>
                  <p className={styles.subtitle}>
                    나만의 페이지에 사진 또는 영상을 남겨보세요
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
                  onClick={() => handleTypeChange(tab.type)}
                  disabled={isSubmitting || uploadStatus === 'uploading' || uploadStatus === 'processing'}
                >
                  <tab.icon size={18} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* 폼 콘텐츠 */}
            <div className={styles.content}>
              {/* 파일 업로드 영역 */}
              <div className={styles.uploadSection}>
                {uploadStatus === 'idle' && (
                  <div
                    className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={32} className={styles.dropzoneIcon} />
                    <p className={styles.dropzoneText}>
                      {messageType === 'image' ? '이미지' : '영상'} 파일을 드래그하거나{' '}
                      <strong>클릭</strong>하여 업로드
                    </p>
                    <p className={styles.dropzoneHint}>
                      {messageType === 'image'
                        ? 'JPG, PNG, GIF, WEBP • 최대 20MB'
                        : 'MP4, WebM, MOV • 최대 500MB • 최대 5분'}
                    </p>
                  </div>
                )}

                {uploadStatus === 'uploading' && selectedFile && (
                  <div className={styles.uploadingState}>
                    {messageType === 'image' ? (
                      <ImageIcon size={32} className={styles.uploadingIcon} />
                    ) : (
                      <Film size={32} className={styles.uploadingIcon} />
                    )}
                    <p className={styles.fileName}>{selectedFile.name}</p>
                    <p className={styles.fileSize}>{formatFileSize(selectedFile.size)}</p>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: messageType === 'image' ? '100%' : `${uploadProgress}%` }}
                      />
                    </div>
                    <p className={styles.progressText}>
                      {messageType === 'image' ? '업로드 중...' : `${uploadProgress}% 업로드 중...`}
                    </p>
                  </div>
                )}

                {uploadStatus === 'processing' && (
                  <div className={styles.uploadingState}>
                    <Loader2 size={32} className={`${styles.uploadingIcon} ${styles.spinning}`} />
                    <p className={styles.processingText}>영상 처리 중...</p>
                    <p className={styles.processingHint}>잠시만 기다려주세요</p>
                  </div>
                )}

                {uploadStatus === 'success' && (
                  <div className={styles.successState}>
                    {messageType === 'image' && previewUrl ? (
                      <div className={styles.imagePreview}>
                        <Image
                          src={previewUrl}
                          alt="업로드된 이미지"
                          fill
                          style={{ objectFit: 'contain' }}
                        />
                      </div>
                    ) : (
                      <div className={styles.videoSuccess}>
                        <CheckCircle size={32} className={styles.successIcon} />
                        <p>영상 업로드 완료!</p>
                      </div>
                    )}
                    <button onClick={handleResetUpload} className={styles.resetBtn}>
                      다른 파일 선택
                    </button>
                  </div>
                )}

                {uploadStatus === 'error' && (
                  <div className={styles.errorState}>
                    <AlertCircle size={32} className={styles.errorIcon} />
                    <p className={styles.errorText}>{error}</p>
                    <button onClick={handleResetUpload} className={styles.resetBtn}>
                      다시 시도
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={messageType === 'image' ? ACCEPTED_IMAGE_TYPES.join(',') : ACCEPTED_VIDEO_TYPES.join(',')}
                  onChange={handleInputChange}
                  style={{ display: 'none' }}
                />
              </div>

              {/* 함께 전할 메시지 */}
              {uploadStatus === 'success' && (
                <div className={styles.inputGroup}>
                  <label className={styles.label}>함께 전할 메시지 (선택)</label>
                  <textarea
                    className={styles.textareaSmall}
                    placeholder={`${messageType === 'image' ? '사진' : '영상'}과 함께 전할 짧은 메시지...`}
                    value={contentText}
                    onChange={(e) => setContentText(e.target.value)}
                    maxLength={500}
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {/* 공개/비공개 설정 */}
              {uploadStatus === 'success' && (
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
                      : '나만 이 메시지를 볼 수 있습니다'}
                  </span>
                </div>
              )}

              {/* 에러 메시지 */}
              {error && uploadStatus !== 'error' && <p className={styles.error}>{error}</p>}
            </div>

            {/* 액션 버튼 */}
            <div className={styles.actions}>
              <button
                className={styles.cancelBtn}
                onClick={handleClose}
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={isSubmitting || uploadStatus !== 'success'}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className={styles.spinner} />
                    <span>등록 중...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>메시지 등록</span>
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
