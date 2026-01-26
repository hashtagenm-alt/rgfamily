'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, ImageIcon, Video, Play, ExternalLink, Lock, Crown, Sparkles, Pencil, Trash2, MoreVertical } from 'lucide-react'
import type { BjMessageWithMember } from '@/lib/actions/bj-messages'
import { getYouTubeThumbnail } from '@/lib/utils/youtube'
import styles from './BjMessageCard.module.css'

interface BjMessageCardProps {
  message: BjMessageWithMember
  onClick?: () => void
  canEdit?: boolean
  onEdit?: (message: BjMessageWithMember) => void
  onDelete?: (messageId: number) => void
}

export default function BjMessageCard({ message, onClick, canEdit, onEdit, onDelete }: BjMessageCardProps) {
  const [imageError, setImageError] = useState(false)
  const [showActions, setShowActions] = useState(false)

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
  // - BJ 이름/프로필만 표시
  // - 사진: 블러 처리된 VIP 전용 표시
  // - 영상: 썸네일 + VIP 전용 오버레이
  // - 텍스트: VIP 전용 메시지 표시
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
            <motion.span
              className={styles.vipBadge}
              title="VIP 전용 콘텐츠"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Crown size={12} />
              <span>VIP</span>
            </motion.span>
          </div>
        </div>

        {/* 프리미엄 잠금 콘텐츠 영역 */}
        <div className={styles.premiumLockedContent}>
          {/* 배경 패턴 */}
          <div className={styles.lockedPattern} />

          {/* 콘텐츠 타입별 아이콘 */}
          <div className={styles.lockedIconWrapper}>
            <motion.div
              className={styles.lockedIconGlow}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {message.message_type === 'image' && <ImageIcon size={32} className={styles.lockedTypeIcon} />}
            {message.message_type === 'video' && (
              <div className={styles.videoIconStack}>
                <Video size={32} className={styles.lockedTypeIcon} />
                <Play size={16} className={styles.lockedPlayMini} />
              </div>
            )}
            {message.message_type === 'text' && <MessageSquare size={32} className={styles.lockedTypeIcon} />}
          </div>

          {/* VIP 전용 라벨 */}
          <div className={styles.vipOnlyLabel}>
            <Sparkles size={14} className={styles.sparkleIcon} />
            <span>VIP 전용 {getTypeLabel()}</span>
          </div>

          {/* 영상인 경우 썸네일 미리보기 (흐리게) */}
          {message.message_type === 'video' && message.content_url && getYouTubeThumbnail(message.content_url) && (
            <div className={styles.videoThumbnailPreview}>
              <Image
                src={getYouTubeThumbnail(message.content_url)!}
                alt="영상 미리보기"
                fill
                className={styles.blurredThumbnail}
              />
            </div>
          )}
        </div>
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
        <div className={styles.headerRight}>
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

          {/* 수정/삭제 액션 버튼 */}
          {canEdit && (
            <div className={styles.actionWrapper}>
              <button
                className={styles.actionToggle}
                onClick={(e) => {
                  e.stopPropagation()
                  setShowActions(!showActions)
                }}
                title="더보기"
              >
                <MoreVertical size={16} />
              </button>

              <AnimatePresence>
                {showActions && (
                  <motion.div
                    className={styles.actionMenu}
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    transition={{ duration: 0.15 }}
                  >
                    <button
                      className={styles.actionBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowActions(false)
                        onEdit?.(message)
                      }}
                    >
                      <Pencil size={14} />
                      <span>수정</span>
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowActions(false)
                        onDelete?.(message.id)
                      }}
                    >
                      <Trash2 size={14} />
                      <span>삭제</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
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
