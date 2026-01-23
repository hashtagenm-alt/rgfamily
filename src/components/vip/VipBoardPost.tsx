'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  ImageIcon,
  Video,
  Play,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  MoreVertical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { VipMessageWithAuthor } from '@/lib/actions/vip-messages'
import { getYouTubeThumbnail } from '@/lib/utils/youtube'
import VipBoardComments from './VipBoardComments'
import styles from './VipBoardPost.module.css'

interface VipBoardPostProps {
  message: VipMessageWithAuthor
  isOwner?: boolean
  vipNickname: string
  onToggleVisibility?: (messageId: number) => void
  onDelete?: (messageId: number) => void
  onCommentCountChange?: () => void
}

export default function VipBoardPost({
  message,
  isOwner = false,
  vipNickname,
  onToggleVisibility,
  onDelete,
  onCommentCountChange,
}: VipBoardPostProps) {
  const [imageError, setImageError] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showComments, setShowComments] = useState(false)

  // 비공개 콘텐츠 열람 불가 여부
  const isLocked = !message.canViewContent

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
        return '텍스트'
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
    if (confirm('정말 이 게시글을 삭제하시겠습니까?')) {
      onDelete?.(message.id)
    }
  }

  const commentCount = message.comment_count || 0

  // 잠금 콘텐츠 렌더링
  if (isLocked) {
    return (
      <div className={`${styles.post} ${styles.lockedPost}`}>
        {/* 헤더 */}
        <div className={styles.header}>
          <div className={styles.profile}>
            {message.author?.avatar_url ? (
              <Image
                src={message.author.avatar_url}
                alt={message.author.nickname || vipNickname}
                width={44}
                height={44}
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {(message.author?.nickname || vipNickname).charAt(0)}
              </div>
            )}
            <div className={styles.info}>
              <span className={styles.name}>{message.author?.nickname || vipNickname}</span>
              <span className={styles.date}>{formatDate(message.created_at)}</span>
            </div>
          </div>
          <div className={styles.badges}>
            <span className={styles.lockedBadge} title="비공개 게시글">
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
          <Lock size={32} className={styles.lockIcon} />
          <span className={styles.lockText}>VIP 전용 콘텐츠입니다</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className={styles.post}
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
              alt={message.author.nickname || vipNickname}
              width={44}
              height={44}
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {(message.author?.nickname || vipNickname).charAt(0)}
            </div>
          )}
          <div className={styles.info}>
            <span className={styles.name}>{message.author?.nickname || vipNickname}</span>
            <span className={styles.date}>{formatDate(message.created_at)}</span>
          </div>
        </div>
        <div className={styles.badges}>
          {message.is_private_for_viewer && (
            <span className={styles.privateBadge} title="비공개 게시글">
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
            alt="게시글 이미지"
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
                <Play size={36} />
              </div>
            </>
          ) : (
            <div className={styles.videoPlaceholder}>
              <Video size={28} />
              <span>영상 보기</span>
            </div>
          )}
        </div>
      )}

      {/* 텍스트 콘텐츠 */}
      {message.content_text && (
        <p className={styles.contentText}>{message.content_text}</p>
      )}

      {/* 댓글 영역 토글 버튼 */}
      <button
        className={styles.commentToggle}
        onClick={() => setShowComments(!showComments)}
      >
        <MessageSquare size={16} />
        <span>
          {commentCount > 0
            ? `댓글 ${commentCount}개`
            : '댓글 작성하기'}
        </span>
        {showComments ? (
          <ChevronUp size={16} />
        ) : (
          <ChevronDown size={16} />
        )}
      </button>

      {/* 댓글 영역 */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <VipBoardComments
              messageId={message.id}
              vipNickname={vipNickname}
              onCommentCountChange={onCommentCountChange}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
