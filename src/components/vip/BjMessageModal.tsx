'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, MessageSquare, ImageIcon, Video, Heart } from 'lucide-react'
import type { BjMessageWithMember } from '@/lib/actions/bj-messages'
import { getYouTubeEmbedUrl, isYouTubeUrl } from '@/lib/utils/youtube'
import styles from './BjMessageModal.module.css'

interface BjMessageModalProps {
  message: BjMessageWithMember | null
  isOpen: boolean
  onClose: () => void
}

export default function BjMessageModal({ message, isOpen, onClose }: BjMessageModalProps) {
  const [imageError, setImageError] = useState(false)

  if (!message) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getTypeIcon = () => {
    switch (message.message_type) {
      case 'image':
        return <ImageIcon size={16} />
      case 'video':
        return <Video size={16} />
      default:
        return <MessageSquare size={16} />
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
          onClick={onClose}
        >
          <motion.div
            className={styles.modal}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={20} />
            </button>

            {/* 헤더 */}
            <div className={styles.header}>
              <div className={styles.bjProfile}>
                {message.bj_member?.image_url ? (
                  <Image
                    src={message.bj_member.image_url}
                    alt={message.bj_member.name || 'BJ'}
                    width={56}
                    height={56}
                    className={styles.bjAvatar}
                  />
                ) : (
                  <div className={styles.bjAvatarPlaceholder}>
                    {(message.bj_member?.name || 'BJ').charAt(0)}
                  </div>
                )}
                <div className={styles.bjInfo}>
                  <span className={styles.bjName}>{message.bj_member?.name || 'BJ'}</span>
                  <div className={styles.metaInfo}>
                    <span className={styles.typeBadge}>
                      {getTypeIcon()}
                      <span>
                        {message.message_type === 'image'
                          ? '사진'
                          : message.message_type === 'video'
                            ? '영상'
                            : '메시지'}
                      </span>
                    </span>
                    <span className={styles.date}>{formatDate(message.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 콘텐츠 */}
            <div className={styles.content}>
              {/* 이미지 */}
              {message.message_type === 'image' && message.content_url && !imageError && (
                <div className={styles.imageContainer}>
                  <Image
                    src={message.content_url}
                    alt="감사 이미지"
                    fill
                    className={styles.image}
                    onError={() => setImageError(true)}
                  />
                </div>
              )}

              {/* 영상 */}
              {message.message_type === 'video' && message.content_url && (
                <div className={styles.videoContainer}>
                  {isYouTubeUrl(message.content_url) && getYouTubeEmbedUrl(message.content_url) ? (
                    <iframe
                      src={getYouTubeEmbedUrl(message.content_url)!}
                      title="감사 영상"
                      className={styles.videoEmbed}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <a
                      href={message.content_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.videoLink}
                    >
                      <ExternalLink size={24} />
                      <span>영상 열기</span>
                      <span className={styles.videoUrl}>{message.content_url}</span>
                    </a>
                  )}
                </div>
              )}

              {/* 텍스트 메시지 */}
              {message.content_text && (
                <div className={styles.messageBox}>
                  <Heart size={18} className={styles.heartIcon} />
                  <p className={styles.messageText}>{message.content_text}</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
