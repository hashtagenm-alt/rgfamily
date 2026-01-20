'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  MessageSquare, ImageIcon, Video, Play, ExternalLink,
  Lock, Eye, EyeOff, Trash2, MoreVertical
} from 'lucide-react'
import type { VipMessageWithAuthor } from '@/lib/actions/vip-messages'
import { getYouTubeThumbnail } from '@/lib/utils/youtube'
import styles from './VipMessageCard.module.css'

interface VipMessageCardProps {
  message: VipMessageWithAuthor
  isOwner?: boolean
  onToggleVisibility?: (messageId: number) => void
  onDelete?: (messageId: number) => void
  onClick?: () => void
}

export default function VipMessageCard({
  message,
  isOwner = false,
  onToggleVisibility,
  onDelete,
  onClick,
}: VipMessageCardProps) {
  const [imageError, setImageError] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

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

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(!showMenu)
  }

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    onToggleVisibility?.(message.id)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    if (confirm('정말 이 메시지를 삭제하시겠습니까?')) {
      onDelete?.(message.id)
    }
  }

  // 잠금 콘텐츠 렌더링 (비공개 + 권한 없음)
  if (isLocked) {
    return (
      <motion.div
        className={`${styles.card} ${styles.lockedCard}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* 헤더 */}
        <div className={styles.header}>
          <div className={styles.profile}>
            {message.author?.avatar_url ? (
              <Image
                src={message.author.avatar_url}
                alt={message.author.nickname || 'VIP'}
                width={40}
                height={40}
                className={styles.avatar}
                unoptimized
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {(message.author?.nickname || 'VIP').charAt(0)}
              </div>
            )}
            <div className={styles.info}>
              <span className={styles.name}>{message.author?.nickname || 'VIP'}</span>
              <span className={styles.date}>{formatDate(message.created_at)}</span>
            </div>
          </div>
          <div className={styles.badges}>
            <span className={styles.lockedBadge} title="비공개 메시지">
              <Lock size={12} />
            </span>
            <span className={styles.typeBadge}>
              {getTypeIcon()}
              <span>{getTypeLabel()}</span>
            </span>
          </div>
        </div>

        {/* 잠금 콘텐츠 영역 */}
        <div className={styles.lockedContent}>
          {message.message_type === 'image' && (
            <div className={styles.lockedMediaContainer}>
              <div className={styles.lockedMediaBlur} />
            </div>
          )}

          {message.message_type === 'video' && message.content_url && (
            <div className={styles.lockedMediaContainer}>
              {getYouTubeThumbnail(message.content_url) ? (
                <Image
                  src={getYouTubeThumbnail(message.content_url)!}
                  alt="영상 썸네일"
                  fill
                  className={styles.lockedMediaImage}
                  unoptimized
                />
              ) : (
                <div className={styles.lockedMediaBlur} />
              )}
            </div>
          )}

          {message.message_type === 'text' && (
            <p className={styles.lockedText}>비공개 메시지입니다</p>
          )}

          {/* 잠금 오버레이 */}
          <div className={styles.lockOverlay}>
            <Lock size={28} className={styles.lockIcon} />
            <span className={styles.lockText}>VIP만 열람 가능</span>
          </div>
        </div>
      </motion.div>
    )
  }

  // 일반 콘텐츠 렌더링
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
      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.profile}>
          {message.author?.avatar_url ? (
            <Image
              src={message.author.avatar_url}
              alt={message.author.nickname || 'VIP'}
              width={40}
              height={40}
              className={styles.avatar}
              unoptimized
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {(message.author?.nickname || 'VIP').charAt(0)}
            </div>
          )}
          <div className={styles.info}>
            <span className={styles.name}>{message.author?.nickname || 'VIP'}</span>
            <span className={styles.date}>{formatDate(message.created_at)}</span>
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

          {/* 소유자 메뉴 */}
          {isOwner && (
            <div className={styles.menuContainer}>
              <button
                className={styles.menuBtn}
                onClick={handleMenuClick}
                aria-label="더보기"
              >
                <MoreVertical size={16} />
              </button>
              {showMenu && (
                <div className={styles.menu}>
                  <button onClick={handleToggleVisibility}>
                    {message.is_public ? (
                      <>
                        <EyeOff size={14} />
                        <span>비공개로 전환</span>
                      </>
                    ) : (
                      <>
                        <Eye size={14} />
                        <span>공개로 전환</span>
                      </>
                    )}
                  </button>
                  <button onClick={handleDelete} className={styles.deleteBtn}>
                    <Trash2 size={14} />
                    <span>삭제</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 미디어 콘텐츠 */}
      {message.message_type === 'image' && message.content_url && !imageError && (
        <div className={styles.mediaContainer}>
          <Image
            src={message.content_url}
            alt="VIP 이미지"
            fill
            className={styles.mediaImage}
            onError={() => setImageError(true)}
            unoptimized
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
                unoptimized
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
