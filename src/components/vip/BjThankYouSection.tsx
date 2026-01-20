'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, ChevronDown, Plus, Loader2 } from 'lucide-react'
import { useBjMessages, useBjMemberStatus } from '@/lib/hooks'
import BjMessageCard from './BjMessageCard'
import BjMessageModal from './BjMessageModal'
import BjMessageForm from './BjMessageForm'
import type { BjMessageWithMember } from '@/lib/actions/bj-messages'
import styles from './BjThankYouSection.module.css'

interface BjThankYouSectionProps {
  vipProfileId: string
  vipNickname: string
  hasFullAccess?: boolean  // 비공개 콘텐츠 전체 접근 권한
}

const INITIAL_DISPLAY_COUNT = 6

export default function BjThankYouSection({
  vipProfileId,
  vipNickname,
  hasFullAccess = false,
}: BjThankYouSectionProps) {
  const { messages, isLoading, submitMessage } = useBjMessages(vipProfileId)
  const { isBjMember, bjMemberId, bjMemberInfo, isLoading: bjLoading } = useBjMemberStatus()

  const [selectedMessage, setSelectedMessage] = useState<BjMessageWithMember | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const displayedMessages = showAll ? messages : messages.slice(0, INITIAL_DISPLAY_COUNT)
  const hasMore = messages.length > INITIAL_DISPLAY_COUNT

  const handleCardClick = (message: BjMessageWithMember) => {
    // 잠금된 메시지(canViewContent가 false)는 모달을 열지 않음
    if (!message.canViewContent) return
    setSelectedMessage(message)
  }

  const handleSubmitMessage = async (data: {
    messageType: 'text' | 'image' | 'video'
    contentText?: string
    contentUrl?: string
    isPublic?: boolean
  }) => {
    if (!bjMemberId) return false

    return await submitMessage({
      vipProfileId,
      bjMemberId,
      messageType: data.messageType,
      contentText: data.contentText,
      contentUrl: data.contentUrl,
      isPublic: data.isPublic,
    })
  }

  // 로딩 중
  if (isLoading || bjLoading) {
    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Heart size={20} className={styles.headerIcon} />
          <h2 className={styles.sectionTitle}>BJ 감사 메시지</h2>
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
          <h2 className={styles.sectionTitle}>BJ 감사 메시지</h2>
          <div className={styles.sectionDivider} />
        </div>

        <div className={styles.emptyState}>
          <Heart size={40} className={styles.emptyIcon} />
          <p className={styles.emptyText}>아직 BJ 감사 메시지가 없습니다</p>
          {isBjMember && (
            <button className={styles.writeFirstBtn} onClick={() => setShowForm(true)}>
              <Plus size={18} />
              <span>첫 번째 메시지 작성하기</span>
            </button>
          )}
        </div>

        {/* BJ용 작성 폼 모달 */}
        {isBjMember && bjMemberInfo && (
          <BjMessageForm
            isOpen={showForm}
            onClose={() => setShowForm(false)}
            onSubmit={handleSubmitMessage}
            bjMemberInfo={{
              name: bjMemberInfo.name,
              imageUrl: bjMemberInfo.imageUrl,
            }}
            vipNickname={vipNickname}
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
      transition={{ delay: 0.5, duration: 0.6 }}
    >
      {/* 섹션 헤더 */}
      <div className={styles.sectionHeader}>
        <Heart size={20} className={styles.headerIcon} />
        <h2 className={styles.sectionTitle}>BJ 감사 메시지</h2>
        <span className={styles.messageCount}>{messages.length}개</span>
        <div className={styles.sectionDivider} />

        {/* BJ용 작성 버튼 */}
        {isBjMember && (
          <button className={styles.writeBtn} onClick={() => setShowForm(true)}>
            <Plus size={16} />
            <span>메시지 작성</span>
          </button>
        )}
      </div>

      {/* 메시지 그리드 */}
      <div className={styles.messagesGrid}>
        {displayedMessages.map((message, index) => (
          <BjMessageCard
            key={message.id}
            message={message}
            onClick={() => handleCardClick(message)}
          />
        ))}
      </div>

      {/* 더 보기 버튼 */}
      {hasMore && !showAll && (
        <button className={styles.showMoreBtn} onClick={() => setShowAll(true)}>
          <span>더 보기 ({messages.length - INITIAL_DISPLAY_COUNT}개 더)</span>
          <ChevronDown size={18} />
        </button>
      )}

      {/* 접기 버튼 */}
      {showAll && hasMore && (
        <button className={styles.showLessBtn} onClick={() => setShowAll(false)}>
          <span>접기</span>
          <ChevronDown size={18} className={styles.rotated} />
        </button>
      )}

      {/* 메시지 상세 모달 */}
      <BjMessageModal
        message={selectedMessage}
        isOpen={!!selectedMessage}
        onClose={() => setSelectedMessage(null)}
      />

      {/* BJ용 작성 폼 모달 */}
      {isBjMember && bjMemberInfo && (
        <BjMessageForm
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmitMessage}
          bjMemberInfo={{
            name: bjMemberInfo.name,
            imageUrl: bjMemberInfo.imageUrl,
          }}
          vipNickname={vipNickname}
        />
      )}
    </motion.section>
  )
}
