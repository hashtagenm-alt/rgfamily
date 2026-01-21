'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, ChevronDown, ChevronRight, Plus, Loader2 } from 'lucide-react'
import { useVipMessages } from '@/lib/hooks'
import { useAuthContext } from '@/lib/context'
import VipMessageCard from './VipMessageCard'
import VipMessageForm from './VipMessageForm'
import type { VipMessageWithAuthor } from '@/lib/actions/vip-messages'
import styles from './VipMessageSection.module.css'

interface VipMessageSectionProps {
  vipProfileId: string
  vipNickname: string
  vipAvatarUrl?: string | null
}

const INITIAL_DISPLAY_COUNT = 6

export default function VipMessageSection({
  vipProfileId,
  vipNickname,
  vipAvatarUrl,
}: VipMessageSectionProps) {
  const { profile } = useAuthContext()
  const {
    messages,
    isLoading,
    submitMessage,
    deleteMessage,
    toggleVisibility,
    canWrite,
  } = useVipMessages(vipProfileId)

  const [showAll, setShowAll] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const displayedMessages = showAll ? messages : messages.slice(0, INITIAL_DISPLAY_COUNT)
  const hasMore = messages.length > INITIAL_DISPLAY_COUNT

  // 소유자 여부 확인
  const isOwner = profile?.id === vipProfileId

  const handleSubmitMessage = async (data: {
    messageType: 'text' | 'image' | 'video'
    contentText?: string
    contentUrl?: string
    isPublic?: boolean
  }) => {
    return await submitMessage({
      vipProfileId,
      messageType: data.messageType,
      contentText: data.contentText,
      contentUrl: data.contentUrl,
      isPublic: data.isPublic,
    })
  }

  const handleToggleVisibility = async (messageId: number) => {
    await toggleVisibility(messageId)
  }

  const handleDeleteMessage = async (messageId: number) => {
    await deleteMessage(messageId)
  }

  // 로딩 중
  if (isLoading) {
    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Heart size={20} className={styles.headerIcon} />
          <h2 className={styles.sectionTitle}>FROM RG FAMILY</h2>
          <div className={styles.sectionDivider} />
        </div>
        <div className={styles.loading}>
          <Loader2 size={24} className={styles.spinner} />
          <span>메시지를 불러오는 중...</span>
        </div>
      </section>
    )
  }

  // 메시지가 없는 경우
  if (messages.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Heart size={20} className={styles.headerIcon} />
          <h2 className={styles.sectionTitle}>FROM RG FAMILY</h2>
          <div className={styles.sectionDivider} />
          {canWrite && (
            <button className={styles.writeBtn} onClick={() => setShowForm(true)}>
              <Plus size={16} />
              <span>메시지 작성</span>
            </button>
          )}
        </div>

        {/* 플레이스홀더 카드 */}
        <div className={styles.placeholderRow}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.placeholderCard}>
              <div className={styles.placeholderAvatar}>
                <Heart size={20} />
              </div>
              <div className={styles.placeholderContent}>
                <div className={styles.placeholderLine} style={{ width: '60%' }} />
                <div className={styles.placeholderLine} style={{ width: '80%' }} />
                <div className={styles.placeholderLine} style={{ width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
        <p className={styles.placeholderText}>
          {canWrite ? 'VIP님의 첫 번째 메시지를 남겨보세요' : '아직 등록된 메시지가 없습니다'}
        </p>

        {/* VIP 작성 폼 모달 */}
        {canWrite && (
          <VipMessageForm
            isOpen={showForm}
            onClose={() => setShowForm(false)}
            onSubmit={handleSubmitMessage}
            vipInfo={{
              nickname: vipNickname,
              avatarUrl: vipAvatarUrl || null,
            }}
          />
        )}
      </section>
    )
  }

  return (
    <motion.section
      className={styles.section}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6 }}
    >
      {/* 섹션 헤더 */}
      <div className={styles.sectionHeader}>
        <Heart size={20} className={styles.headerIcon} />
        <h2 className={styles.sectionTitle}>FROM RG FAMILY</h2>
        <span className={styles.messageCount}>{messages.length}개</span>
        <div className={styles.sectionDivider} />

        {/* VIP 작성 버튼 */}
        {canWrite && (
          <button className={styles.writeBtn} onClick={() => setShowForm(true)}>
            <Plus size={16} />
            <span>메시지 작성</span>
          </button>
        )}
      </div>

      {/* 메시지 가로 스크롤 */}
      <div className={styles.messagesRow}>
        {displayedMessages.map((message) => (
          <VipMessageCard
            key={message.id}
            message={message}
            isOwner={isOwner}
            onToggleVisibility={handleToggleVisibility}
            onDelete={handleDeleteMessage}
          />
        ))}
      </div>

      {/* 더 보기 버튼 */}
      {hasMore && !showAll && (
        <button className={styles.showMoreBtn} onClick={() => setShowAll(true)}>
          <span>더 보기 ({messages.length - INITIAL_DISPLAY_COUNT}개 더)</span>
          <ChevronRight size={18} />
        </button>
      )}

      {/* 접기 버튼 */}
      {showAll && hasMore && (
        <button className={styles.showLessBtn} onClick={() => setShowAll(false)}>
          <span>접기</span>
          <ChevronDown size={18} className={styles.rotated} />
        </button>
      )}

      {/* VIP 작성 폼 모달 */}
      {canWrite && (
        <VipMessageForm
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmitMessage}
          vipInfo={{
            nickname: vipNickname,
            avatarUrl: vipAvatarUrl || null,
          }}
        />
      )}
    </motion.section>
  )
}
