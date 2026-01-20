'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageSquare, ImageIcon, Video, Send, Loader2, Globe, Lock, Crown } from 'lucide-react'
import styles from './VipMessageForm.module.css'

interface VipMessageFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    messageType: 'text' | 'image' | 'video'
    contentText?: string
    contentUrl?: string
    isPublic?: boolean
  }) => Promise<boolean>
  vipInfo?: {
    nickname: string
    avatarUrl: string | null
  }
}

type MessageType = 'text' | 'image' | 'video'

export default function VipMessageForm({
  isOpen,
  onClose,
  onSubmit,
  vipInfo,
}: VipMessageFormProps) {
  const [messageType, setMessageType] = useState<MessageType>('text')
  const [contentText, setContentText] = useState('')
  const [contentUrl, setContentUrl] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setMessageType('text')
    setContentText('')
    setContentUrl('')
    setIsPublic(true)
    setError(null)
  }, [])

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

    if (messageType === 'image' || messageType === 'video') {
      if (!contentUrl.trim()) {
        setError(messageType === 'image' ? '이미지 URL을 입력해주세요.' : '영상 URL을 입력해주세요.')
        return false
      }

      try {
        const parsedUrl = new URL(contentUrl)

        if (messageType === 'image') {
          const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
          const path = parsedUrl.pathname.toLowerCase()
          const isImageHost = ['imgur.com', 'i.imgur.com', 'drive.google.com', 'postimg.cc'].some(
            host => parsedUrl.hostname.includes(host)
          )
          const hasImageExtension = validImageExtensions.some(ext => path.endsWith(ext))

          if (!hasImageExtension && !isImageHost) {
            setError('지원하는 이미지 형식: jpg, png, gif, webp 또는 Imgur/Google Drive 링크')
            return false
          }
        }

        if (messageType === 'video') {
          const isYouTube = parsedUrl.hostname.includes('youtube.com') || parsedUrl.hostname.includes('youtu.be')

          if (!isYouTube) {
            setError('영상은 YouTube 링크만 지원합니다.')
            return false
          }
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
        setError('메시지 등록에 실패했습니다. 다시 시도해주세요.')
      }
    } catch {
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
              <div className={styles.vipProfile}>
                {vipInfo?.avatarUrl ? (
                  <Image
                    src={vipInfo.avatarUrl}
                    alt={vipInfo.nickname}
                    width={48}
                    height={48}
                    className={styles.vipAvatar}
                    unoptimized
                  />
                ) : (
                  <div className={styles.vipAvatarPlaceholder}>
                    <Crown size={24} />
                  </div>
                )}
                <div className={styles.headerText}>
                  <h2 className={styles.title}>VIP 메시지 작성</h2>
                  <p className={styles.subtitle}>
                    나만의 페이지에 메시지를 남겨보세요
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
                  onClick={() => setMessageType(tab.type)}
                  disabled={isSubmitting}
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
                    placeholder="VIP 페이지에 남길 메시지를 작성해주세요..."
                    value={contentText}
                    onChange={(e) => setContentText(e.target.value)}
                    maxLength={1000}
                    disabled={isSubmitting}
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
                    <label className={styles.label}>이미지 URL</label>
                    <input
                      type="url"
                      className={styles.input}
                      placeholder="https://example.com/image.jpg"
                      value={contentUrl}
                      onChange={(e) => setContentUrl(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <span className={styles.hint}>
                      직접 업로드하거나 외부 이미지 URL을 입력해주세요
                    </span>
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>함께 전할 메시지 (선택)</label>
                    <textarea
                      className={styles.textareaSmall}
                      placeholder="이미지와 함께 전할 짧은 메시지..."
                      value={contentText}
                      onChange={(e) => setContentText(e.target.value)}
                      maxLength={500}
                      disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
                    : '나만 이 메시지를 볼 수 있습니다'}
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
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={isSubmitting}
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
