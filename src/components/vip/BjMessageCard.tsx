'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { MessageSquare, ImageIcon, Video, Play, ExternalLink, Lock } from 'lucide-react'
import type { BjMessageWithMember } from '@/lib/actions/bj-messages'
import styles from './BjMessageCard.module.css'

interface BjMessageCardProps {
  message: BjMessageWithMember
  onClick?: () => void
}

export default function BjMessageCard({ message, onClick }: BjMessageCardProps) {
  const [imageError, setImageError] = useState(false)

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

  // YouTube 썸네일 추출
  const getYouTubeThumbnail = (url: string): string | null => {
    const match = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    )
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null
  }

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
              unoptimized
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
