'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Plus, Loader2, ChevronDown } from 'lucide-react'
import { useVipMessages } from '@/lib/hooks'
import { useAuthContext } from '@/lib/context'
import VipBoardPost from './VipBoardPost'
import VipMessageForm from './VipMessageForm'
import styles from './VipBoardSection.module.css'

interface VipBoardSectionProps {
  vipProfileId: string
  vipNickname: string
  vipAvatarUrl?: string | null
}

export default function VipBoardSection({
  vipProfileId,
  vipNickname,
  vipAvatarUrl,
}: VipBoardSectionProps) {
  const { profile } = useAuthContext()
  const {
    messages,
    isLoading,
    hasMore,
    total,
    submitMessage,
    deleteMessage,
    toggleVisibility,
    loadMore,
    canWrite,
    refetch,
  } = useVipMessages(vipProfileId, {
    paginated: true,
    limit: 5,
    includeCommentCount: true,
  })

  const [showForm, setShowForm] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // 소유자 여부 확인
  const isOwner = profile?.id === vipProfileId

  const handleSubmitMessage = async (data: {
    messageType: 'text' | 'image' | 'video'
    contentText?: string
    contentUrl?: string
    isPublic?: boolean
  }) => {
    const result = await submitMessage({
      vipProfileId,
      messageType: data.messageType,
      contentText: data.contentText,
      contentUrl: data.contentUrl,
      isPublic: data.isPublic,
    })
    if (result) {
      setShowForm(false)
    }
    return result
  }

  const handleLoadMore = async () => {
    setIsLoadingMore(true)
    await loadMore()
    setIsLoadingMore(false)
  }

  const handleCommentCountChange = () => {
    // 댓글 수 변경 시 전체 새로고침
    refetch()
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
          <span>게시글을 불러오는 중...</span>
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
              <span>새 글 작성</span>
            </button>
          )}
        </div>

        <div className={styles.emptyState}>
          <Heart size={40} className={styles.emptyIcon} />
          <p className={styles.emptyText}>
            {canWrite
              ? 'VIP님의 첫 번째 게시글을 작성해보세요'
              : '아직 등록된 게시글이 없습니다'}
          </p>
          {canWrite && (
            <button className={styles.writeFirstBtn} onClick={() => setShowForm(true)}>
              <Plus size={16} />
              <span>첫 게시글 작성하기</span>
            </button>
          )}
        </div>

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
        <span className={styles.messageCount}>{total}개</span>
        <div className={styles.sectionDivider} />

        {/* VIP 작성 버튼 */}
        {canWrite && (
          <button className={styles.writeBtn} onClick={() => setShowForm(true)}>
            <Plus size={16} />
            <span>새 글 작성</span>
          </button>
        )}
      </div>

      {/* 게시글 피드 (세로 정렬) */}
      <div className={styles.postFeed}>
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
          >
            <VipBoardPost
              message={message}
              isOwner={isOwner}
              vipNickname={vipNickname}
              onToggleVisibility={toggleVisibility}
              onDelete={deleteMessage}
              onCommentCountChange={handleCommentCountChange}
            />
          </motion.div>
        ))}
      </div>

      {/* 더 불러오기 버튼 */}
      {hasMore && (
        <button
          className={styles.loadMoreBtn}
          onClick={handleLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? (
            <>
              <Loader2 size={16} className={styles.spinner} />
              <span>불러오는 중...</span>
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              <span>더 보기</span>
            </>
          )}
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
