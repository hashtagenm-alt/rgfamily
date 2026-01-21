'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Crown, ChevronDown, ChevronRight, Plus, Loader2, Play } from 'lucide-react'
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

const INITIAL_DISPLAY_COUNT = 4

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

  // 이미지/텍스트와 영상 분리
  const { photoMessages, videoMessages } = useMemo(() => {
    const photos = messages.filter(m => m.message_type !== 'video')
    const videos = messages.filter(m => m.message_type === 'video')
    return { photoMessages: photos, videoMessages: videos }
  }, [messages])

  const displayedPhotoMessages = showAll ? photoMessages : photoMessages.slice(0, INITIAL_DISPLAY_COUNT)
  const hasMorePhotos = photoMessages.length > INITIAL_DISPLAY_COUNT

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
        <div className={styles.vipOnlyWrapper}>
          <div className={styles.sectionHeader}>
            <div className={styles.vipOnlyBadge}>
              <Crown size={14} />
              <span>VIP ONLY</span>
            </div>
            <h2 className={styles.sectionTitle}>BJ 감사 콘텐츠</h2>
            <div className={styles.sectionDivider} />
          </div>
          <div className={styles.loading}>
            <Loader2 size={24} className={styles.spinner} />
            <span>콘텐츠를 불러오는 중...</span>
          </div>
        </div>
      </section>
    )
  }

  // 메시지가 없는 경우
  if (messages.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.vipOnlyWrapper}>
          <div className={styles.sectionHeader}>
            <div className={styles.vipOnlyBadge}>
              <Crown size={14} />
              <span>VIP ONLY</span>
            </div>
            <h2 className={styles.sectionTitle}>BJ 감사 콘텐츠</h2>
            <div className={styles.sectionDivider} />
            {isBjMember && (
              <button className={styles.writeBtn} onClick={() => setShowForm(true)}>
                <Plus size={16} />
                <span>등록</span>
              </button>
            )}
          </div>

          {/* 플레이스홀더 그리드 */}
          <div className={styles.placeholderGrid}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.placeholderItem}>
                <div className={styles.placeholderThumb}>
                  <Crown size={24} />
                </div>
              </div>
            ))}
          </div>
          <p className={styles.placeholderText}>
            {isBjMember ? 'VIP님께 감사 콘텐츠를 남겨보세요' : 'BJ 멤버들의 감사 콘텐츠가 여기에 표시됩니다'}
          </p>
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
      {/* BJ 감사 콘텐츠 (사진/텍스트) - 6열 그리드 */}
      <div className={styles.vipOnlyWrapper}>
        <div className={styles.sectionHeader}>
          <div className={styles.vipOnlyBadge}>
            <Crown size={14} />
            <span>VIP ONLY</span>
          </div>
          <h2 className={styles.sectionTitle}>BJ 감사 콘텐츠</h2>
          {photoMessages.length > 0 && (
            <span className={styles.messageCount}>{photoMessages.length}개</span>
          )}
          <div className={styles.sectionDivider} />

          {/* 전체보기 링크 */}
          {hasMorePhotos && (
            <button className={styles.viewAllBtn} onClick={() => setShowAll(!showAll)}>
              <span>전체보기</span>
              <ChevronRight size={16} />
            </button>
          )}

          {/* BJ용 작성 버튼 */}
          {isBjMember && (
            <button className={styles.writeBtn} onClick={() => setShowForm(true)}>
              <Plus size={16} />
              <span>등록</span>
            </button>
          )}
        </div>

        {/* 6열 그리드 */}
        {photoMessages.length > 0 ? (
          <>
            <div className={styles.contentGrid}>
              {displayedPhotoMessages.map((message) => (
                <BjMessageCard
                  key={message.id}
                  message={message}
                  onClick={() => handleCardClick(message)}
                />
              ))}
            </div>

            {/* 접기 버튼 */}
            {showAll && hasMorePhotos && (
              <button className={styles.showLessBtn} onClick={() => setShowAll(false)}>
                <span>접기</span>
                <ChevronDown size={18} className={styles.rotated} />
              </button>
            )}
          </>
        ) : (
          <div className={styles.emptyState}>
            <Crown size={32} className={styles.emptyIcon} />
            <p className={styles.emptyText}>아직 BJ 감사 콘텐츠가 없습니다</p>
          </div>
        )}
      </div>

      {/* 멤버 감사 영상 섹션 */}
      {videoMessages.length > 0 && (
        <div className={styles.videoSection}>
          <div className={styles.videoHeader}>
            <Play size={18} className={styles.videoIcon} />
            <h3 className={styles.videoTitle}>멤버 감사 영상</h3>
            <span className={styles.videoCount}>{videoMessages.length}개</span>
          </div>
          <div className={styles.videoList}>
            {videoMessages.map((video) => (
              <div
                key={video.id}
                className={styles.videoItem}
                onClick={() => handleCardClick(video)}
              >
                <div className={styles.videoThumb}>
                  <Play size={24} />
                </div>
                <div className={styles.videoInfo}>
                  <span className={styles.videoUnit}>VIDEO</span>
                  <span className={styles.videoBjName}>{video.bj_member?.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
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
