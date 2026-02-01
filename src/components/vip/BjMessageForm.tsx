'use client'

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ImageIcon, Video, Send, Loader2, Globe, Lock, Upload, Trash2, Link as LinkIcon, Film } from 'lucide-react'
import * as tus from 'tus-js-client'
import { getStreamThumbnailUrl } from '@/lib/cloudflare'
import styles from './BjMessageForm.module.css'

interface BjMember {
  id: number
  name: string
  imageUrl: string | null
}

interface BjMessageFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    messageType: 'image' | 'video'
    contentText?: string
    contentUrl?: string
    isPublic?: boolean
    selectedMemberId?: number
  }) => Promise<boolean>
  bjMemberInfo?: {
    name: string
    imageUrl: string | null
  }
  vipNickname: string
  isAdminMode?: boolean  // 어드민 모드 (멤버 선택 필요)
  bjMembers?: BjMember[]  // 어드민용 멤버 목록
}

type MessageType = 'image' | 'video'

export default function BjMessageForm({
  isOpen,
  onClose,
  onSubmit,
  bjMemberInfo,
  vipNickname,
  isAdminMode = false,
  bjMembers = [],
}: BjMessageFormProps) {
  const [messageType, setMessageType] = useState<MessageType>('image')
  const [contentText, setContentText] = useState('')
  const [contentUrl, setContentUrl] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 파일 업로드 관련 상태
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [videoUploadMode, setVideoUploadMode] = useState<'file' | 'url'>('file')
  const [videoProcessingStatus, setVideoProcessingStatus] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle')
  const [cloudflareUid, setCloudflareUid] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // 어드민용 멤버 선택 상태
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
  const selectedMember = bjMembers.find(m => m.id === selectedMemberId)

  const resetForm = useCallback(() => {
    setMessageType('image')
    setContentText('')
    setContentUrl('')
    setIsPublic(true)
    setError(null)
    setIsUploading(false)
    setUploadProgress(0)
    setPreviewUrl(null)
    setSelectedMemberId(null)
    setVideoUploadMode('file')
    setVideoProcessingStatus('idle')
    setCloudflareUid(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (videoInputRef.current) {
      videoInputRef.current.value = ''
    }
  }, [])

  // 파일 업로드 핸들러
  const handleFileUpload = async (file: File, type: 'image' | 'video' = 'image') => {
    if (!file) return

    // 파일 타입 검증
    if (type === 'image' && !file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.')
      return
    }

    if (type === 'video' && !file.type.startsWith('video/')) {
      setError('영상 파일만 업로드할 수 있습니다.')
      return
    }


    setIsUploading(true)
    setError(null)
    setUploadProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', type === 'video' ? 'bj-videos' : 'bj-messages')

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
      handleFileUpload(file, 'image')
    }
  }

  // Cloudflare Stream 영상 업로드 핸들러
  const handleVideoFileUpload = async (file: File) => {
    if (!file) return

    if (!file.type.startsWith('video/')) {
      setError('영상 파일만 업로드할 수 있습니다.')
      return
    }


    setIsUploading(true)
    setError(null)
    setUploadProgress(0)
    setVideoProcessingStatus('uploading')

    try {
      // 1. Direct Upload URL 발급 (파일 크기 전달)
      const urlRes = await fetch('/api/cloudflare-stream/bj-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: file.name, fileSize: file.size }),
      })

      if (!urlRes.ok) {
        const err = await urlRes.json()
        throw new Error(err.error || '업로드 URL 발급 실패')
      }

      const uploadData = await urlRes.json()
      let videoUid: string

      if (uploadData.useTus) {
        // TUS 프로토콜 업로드 (200MB 이상)
        videoUid = await new Promise<string>((resolve, reject) => {
          const upload = new tus.Upload(file, {
            endpoint: uploadData.uploadURL,
            headers: uploadData.tusHeaders,
            chunkSize: 50 * 1024 * 1024, // 50MB 청크
            retryDelays: [0, 1000, 3000, 5000],
            metadata: {
              name: file.name,
              filetype: file.type,
              maxDurationSeconds: String(uploadData.maxDurationSeconds),
              ...uploadData.meta,
            },
            onError: (error) => {
              console.error('TUS upload error:', error)
              reject(new Error(error.message || '업로드 실패'))
            },
            onProgress: (bytesUploaded, bytesTotal) => {
              const pct = Math.round((bytesUploaded / bytesTotal) * 100)
              setUploadProgress(pct)
            },
            onSuccess: () => {
              // TUS 업로드 완료 시 URL에서 UID 추출
              const uploadUrl = upload.url
              if (uploadUrl) {
                // URL 형식: https://api.cloudflare.com/.../stream/{uid}
                const uid = uploadUrl.split('/').pop() || ''
                resolve(uid)
              } else {
                reject(new Error('업로드 UID를 찾을 수 없습니다'))
              }
            },
          })

          upload.start()
        })
      } else {
        // 기본 업로드 (200MB 미만)
        videoUid = uploadData.uid

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
          xhr.addEventListener('abort', () => reject(new Error('업로드 취소')))

          xhr.open('POST', uploadData.uploadURL)
          xhr.send(formData)
        })
      }

      // 처리 상태 폴링
      setVideoProcessingStatus('processing')
      setUploadProgress(100)

      const maxAttempts = 120 // 최대 10분 (5초 간격) - 큰 파일 대비
      let attempts = 0

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000))
        attempts++

        const res = await fetch(`/api/cloudflare-stream/${videoUid}`)
        if (!res.ok) continue

        const data = await res.json()

        if (data.status?.state === 'ready') {
          // 업로드 완료
          setCloudflareUid(videoUid)
          const thumbnailUrl = getStreamThumbnailUrl(videoUid, { width: 320, height: 180, fit: 'crop' })
          setPreviewUrl(thumbnailUrl)
          // Cloudflare Stream URL 형식으로 저장
          setContentUrl(`cloudflare:${videoUid}`)
          setVideoProcessingStatus('done')
          break
        }

        if (data.status?.state === 'error') {
          throw new Error(data.status.errorReasonText || '영상 처리 중 오류가 발생했습니다.')
        }
      }

      if (attempts >= maxAttempts) {
        throw new Error('영상 처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다.')
      setVideoProcessingStatus('idle')
      setCloudflareUid(null)
      setPreviewUrl(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleVideoFileUpload(file)
    }
  }

  const handleRemoveImage = () => {
    setContentUrl('')
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveVideo = () => {
    setContentUrl('')
    setPreviewUrl(null)
    setCloudflareUid(null)
    setVideoProcessingStatus('idle')
    if (videoInputRef.current) {
      videoInputRef.current.value = ''
    }
  }

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])

  const validateForm = (): boolean => {
    setError(null)

    // 어드민 모드일 때 멤버 선택 확인
    if (isAdminMode && !selectedMemberId) {
      setError('등록할 멤버를 선택해주세요.')
      return false
    }

    if (messageType === 'image') {
      if (!contentUrl.trim()) {
        setError('이미지를 업로드해주세요.')
        return false
      }
    }

    if (messageType === 'video') {
      if (!contentUrl.trim()) {
        setError(videoUploadMode === 'file' ? '영상 파일을 업로드해주세요.' : '영상 URL을 입력해주세요.')
        return false
      }

      // URL 모드일 때만 YouTube 검증
      if (videoUploadMode === 'url') {
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
        selectedMemberId: selectedMemberId || undefined,
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

  const tabs: { type: MessageType; icon: typeof ImageIcon; label: string }[] = [
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
                {isAdminMode ? (
                  // 어드민 모드: 멤버 선택
                  selectedMember?.imageUrl ? (
                    <Image
                      src={selectedMember.imageUrl}
                      alt={selectedMember.name}
                      width={48}
                      height={48}
                      className={styles.bjAvatar}
                    />
                  ) : (
                    <div className={styles.bjAvatarPlaceholder}>
                      {selectedMember?.name?.charAt(0) || '?'}
                    </div>
                  )
                ) : bjMemberInfo?.imageUrl ? (
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

            {/* 어드민 모드: 멤버 선택 버튼 그리드 */}
            {isAdminMode && (
              <div className={styles.memberSelect}>
                <label className={styles.label}>등록할 멤버 선택</label>
                <div className={styles.memberGrid}>
                  {bjMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className={`${styles.memberBtn} ${selectedMemberId === member.id ? styles.memberBtnActive : ''}`}
                      onClick={() => setSelectedMemberId(member.id)}
                      disabled={isSubmitting || isUploading}
                    >
                      {member.imageUrl ? (
                        <Image
                          src={member.imageUrl}
                          alt={member.name}
                          width={28}
                          height={28}
                          className={styles.memberBtnAvatar}
                        />
                      ) : (
                        <div className={styles.memberBtnAvatarPlaceholder}>
                          {member.name.charAt(0)}
                        </div>
                      )}
                      <span className={styles.memberBtnName}>{member.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

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

              {/* 영상 */}
              {messageType === 'video' && (
                <>
                  {/* 파일/URL 모드 토글 */}
                  <div className={styles.videoModeToggle}>
                    <button
                      type="button"
                      className={`${styles.modeBtn} ${videoUploadMode === 'file' ? styles.activeModeBtn : ''}`}
                      onClick={() => {
                        setVideoUploadMode('file')
                        setContentUrl('')
                        setPreviewUrl(null)
                        setCloudflareUid(null)
                        setVideoProcessingStatus('idle')
                      }}
                      disabled={isSubmitting || isUploading}
                    >
                      <Upload size={16} />
                      <span>파일 업로드</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.modeBtn} ${videoUploadMode === 'url' ? styles.activeModeBtn : ''}`}
                      onClick={() => {
                        setVideoUploadMode('url')
                        setContentUrl('')
                        setPreviewUrl(null)
                        setCloudflareUid(null)
                        setVideoProcessingStatus('idle')
                      }}
                      disabled={isSubmitting || isUploading}
                    >
                      <LinkIcon size={16} />
                      <span>YouTube URL</span>
                    </button>
                  </div>

                  {/* 파일 업로드 모드 */}
                  {videoUploadMode === 'file' && (
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>영상 파일</label>

                      {previewUrl && videoProcessingStatus === 'done' ? (
                        <div className={styles.videoPreviewWrapper}>
                          <div className={styles.videoThumbnail}>
                            <Image
                              src={previewUrl}
                              alt="영상 썸네일"
                              width={320}
                              height={180}
                              className={styles.thumbnailImage}
                              unoptimized
                            />
                            <div className={styles.videoPlayIcon}>
                              <Film size={32} />
                            </div>
                          </div>
                          <div className={styles.videoInfo}>
                            <span className={styles.videoStatus}>업로드 완료</span>
                          </div>
                          <button
                            type="button"
                            className={styles.removeImageBtn}
                            onClick={handleRemoveVideo}
                            disabled={isSubmitting}
                          >
                            <Trash2 size={16} />
                            <span>삭제</span>
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`${styles.uploadArea} ${isUploading ? styles.uploading : ''}`}
                          onClick={() => !isUploading && videoInputRef.current?.click()}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 size={32} className={styles.spinner} />
                              <span className={styles.uploadText}>
                                {videoProcessingStatus === 'uploading' && `업로드 중... ${uploadProgress}%`}
                                {videoProcessingStatus === 'processing' && '영상 처리 중...'}
                              </span>
                              <div className={styles.progressBar}>
                                <div
                                  className={styles.progressFill}
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                              {videoProcessingStatus === 'processing' && (
                                <span className={styles.uploadHint}>Cloudflare에서 처리 중입니다</span>
                              )}
                            </>
                          ) : (
                            <>
                              <Video size={32} />
                              <span className={styles.uploadText}>클릭하여 영상 선택</span>
                              <span className={styles.uploadHint}>MP4, WebM, MOV</span>
                            </>
                          )}
                        </div>
                      )}

                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        onChange={handleVideoFileChange}
                        className={styles.hiddenInput}
                        disabled={isSubmitting || isUploading}
                      />
                    </div>
                  )}

                  {/* YouTube URL 모드 */}
                  {videoUploadMode === 'url' && (
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>YouTube URL</label>
                      <input
                        type="url"
                        className={styles.input}
                        placeholder="https://youtube.com/watch?v=... 또는 https://youtu.be/..."
                        value={contentUrl}
                        onChange={(e) => setContentUrl(e.target.value)}
                        disabled={isSubmitting || isUploading}
                      />
                      <span className={styles.hint}>
                        YouTube 영상 링크를 입력하세요
                      </span>
                    </div>
                  )}

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
