'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { MessageSquare, ImageIcon, Video, Play, ExternalLink, Lock } from 'lucide-react'
import type { BjMessageWithMember } from '@/lib/actions/bj-messages'
import { getYouTubeThumbnail } from '@/lib/utils/youtube'
import styles from './BjMessageCard.module.css'

interface BjMessageCardProps {
  message: BjMessageWithMember
  onClick?: () => void
}

export default function BjMessageCard({ message, onClick }: BjMessageCardProps) {
  const [imageError, setImageError] = useState(false)

  // 비공개 콘텐츠 열람 불가 여부
  const isLocked = !message.canViewContent

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getTypeIcon = () => {
    switch (message.message_type) {
      case 'image':
        return <ImageIcon size={14} />
      case 'video':
        return <Video size={14} />
      default:
        return <MessageSquare size={14} />
    }
  }

  const getTypeLabel = () => {
    switch (message.message_type) {
      case 'image':
        return '사진'
      case 'video':
        return '영상'
      default:
        return '메시지'
    }
  }

  // 미디어 잠금 콘텐츠 렌더링 (canViewContent가 false인 경우)
  // - 텍스트는 항상 표시
  // - 사진: 블러 처리
  // - 영상: 썸네일만 표시, 재생 불가
  if (isLocked) {
    return (
      <motion.div
        className={`${styles.card} ${styles.lockedCard}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* BJ 프로필 (항상 표시) */}
        <div className={styles.header}>
          <div className={styles.bjProfile}>
            {message.bj_member?.image_url ? (
              <Image
                src={message.bj_member.image_url}
                alt={message.bj_member.name || 'BJ'}
                width={40}
                height={40}
                className={styles.bjAvatar}
              />
            ) : (
              <div className={styles.bjAvatarPlaceholder}>
                {(message.bj_member?.name || 'BJ').charAt(0)}
              </div>
            )}
            <div className={styles.bjInfo}>
              <span className={styles.bjName}>{message.bj_member?.name || 'BJ'}</span>
              <span className={styles.messageDate}>{formatDate(message.created_at)}</span>
            </div>
          </div>
          <div className={styles.badges}>
            <span className={styles.lockedBadge} title="VIP 전용 콘텐츠">
              <Lock size={12} />
            </span>
            <span className={styles.typeBadge}>
              {getTypeIcon()}
              <span>{getTypeLabel()}</span>
            </span>
          </div>
        </div>

        {/* 미디어 잠금 영역 (사진/영상만) */}
        {(message.message_type === 'image' || message.message_type === 'video') && (
          <div className={styles.lockedContent}>
            {/* 이미지: 블러 처리된 플레이스홀더 */}
            {message.message_type === 'image' && (
              <div className={styles.lockedMediaContainer}>
                <div className={styles.lockedMediaBlur}>
                  <ImageIcon size={40} className={styles.lockedPlaceholderIcon} />
                </div>
                {/* 잠금 오버레이 */}
                <div className={styles.lockOverlay}>
                  <Lock size={28} className={styles.lockIcon} />
                  <span className={styles.lockText}>VIP 전용 사진</span>
                </div>
              </div>
            )}

            {/* 영상: 썸네일 + 재생 불가 표시 */}
            {message.message_type === 'video' && (
              <div className={styles.lockedMediaContainer}>
                {message.content_url && getYouTubeThumbnail(message.content_url) ? (
                  <>
                    <Image
                      src={getYouTubeThumbnail(message.content_url)!}
                      alt="영상 썸네일"
                      fill
                      className={styles.lockedMediaImage}
                    />
                    {/* 영상 재생 아이콘 (비활성) */}
                    <div className={styles.videoThumbnailOverlay}>
                      <Play size={40} className={styles.videoPlayIcon} />
                    </div>
                  </>
                ) : (
                  <div className={styles.lockedVideoPlaceholder}>
                    <Video size={40} className={styles.lockedPlaceholderIcon} />
                    <Play size={24} className={styles.lockedPlayIcon} />
                  </div>
                )}
                {/* 잠금 오버레이 */}
                <div className={styles.lockOverlay}>
                  <Lock size={28} className={styles.lockIcon} />
                  <span className={styles.lockText}>VIP 전용 영상</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 텍스트 메시지는 항상 표시 */}
        {message.content_text && (
          <p className={styles.messageText}>{message.content_text}</p>
        )}
      </motion.div>
    )
  }

  // 일반 콘텐츠 렌더링 (공개 또는 권한 있음)
  return (
    <motion.div
      className={styles.card}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* BJ 프로필 */}
      <div className={styles.header}>
        <div className={styles.bjProfile}>
          {message.bj_member?.image_url ? (
            <Image
              src={message.bj_member.image_url}
              alt={message.bj_member.name || 'BJ'}
              width={40}
              height={40}
              className={styles.bjAvatar}
            />
          ) : (
            <div className={styles.bjAvatarPlaceholder}>
              {(message.bj_member?.name || 'BJ').charAt(0)}
            </div>
          )}
          <div className={styles.bjInfo}>
            <span className={styles.bjName}>{message.bj_member?.name || 'BJ'}</span>
            <span className={styles.messageDate}>{formatDate(message.created_at)}</span>
          </div>
        </div>
        <div className={styles.badges}>
          {message.is_private_for_viewer && (
            <span className={styles.privateBadge} title="비공개 메시지">
              <Lock size={12} />
            </span>
          )}
          <span className={styles.typeBadge}>
            {getTypeIcon()}
            <span>{getTypeLabel()}</span>
          </span>
        </div>
      </div>

      {/* 미디어 콘텐츠 */}
      {message.message_type === 'image' && message.content_url && !imageError && (
        <div className={styles.mediaContainer}>
          <Image
            src={message.content_url}
            alt="감사 이미지"
            fill
            className={styles.mediaImage}
            onError={() => setImageError(true)}
          />
        </div>
      )}

      {message.message_type === 'video' && message.content_url && (
        <div className={styles.mediaContainer}>
          {getYouTubeThumbnail(message.content_url) ? (
            <>
              <Image
                src={getYouTubeThumbnail(message.content_url)!}
                alt="영상 썸네일"
                fill
                className={styles.mediaImage}
              />
              <div className={styles.videoOverlay}>
                <Play size={32} />
              </div>
            </>
          ) : (
            <div className={styles.videoPlaceholder}>
              <ExternalLink size={24} />
              <span>영상 보기</span>
            </div>
          )}
        </div>
      )}

      {/* 텍스트 메시지 */}
      {message.content_text && (
        <p className={styles.messageText}>{message.content_text}</p>
      )}
    </motion.div>
  )
}
