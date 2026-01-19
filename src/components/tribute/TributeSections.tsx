'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Heart,
  Play,
  Film,
  Crown,
  Video,
  ImageIcon,
  Download,
  Trophy,
  MessageSquare,
  Send,
  User,
  Loader2,
} from 'lucide-react'
import type { HallOfFameHonor } from '@/lib/mock'
import { formatAmount } from '@/lib/utils/format'
import { useGuestbook } from '@/lib/hooks'
import { useAuthContext } from '@/lib/context'
import VipSignatureGallery from './VipSignatureGallery'
import styles from './TributeSections.module.css'

interface TributeSectionsProps {
  honor: HallOfFameHonor
  allHonors: HallOfFameHonor[]
}

export default function TributeSections({ honor, allHonors }: TributeSectionsProps) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const { user, profile } = useAuthContext()
  const router = useRouter()

  // 본인 또는 관리자인지 체크
  const isOwner =
    user?.id === honor.donorId ||
    profile?.role === 'admin' ||
    profile?.role === 'superadmin'

  // 잠긴 시그니처 클릭 시 안내
  const handleLockedClick = () => {
    // 추후 로그인 유도 또는 안내 모달 표시 가능
    console.log('VIP 전용 콘텐츠입니다.')
  }

  return (
    <div className={styles.container}>
      {/* Thank You Message */}
      {honor.tributeMessage && (
        <TributeMessageSection
          donorName={honor.donorName}
          message={honor.tributeMessage}
        />
      )}

      {/* Exclusive Video */}
      {honor.tributeVideoUrl && (
        <TributeVideoSection
          donorName={honor.donorName}
          videoUrl={honor.tributeVideoUrl}
          isPlaying={isVideoPlaying}
          onPlay={() => setIsVideoPlaying(true)}
        />
      )}

      {/* Member Videos */}
      <TributeMemberVideosSection memberVideos={honor.memberVideos} />

      {/* Photo Gallery */}
      <TributeGallerySection
        images={honor.tributeImages}
        legacyImage={honor.tributeImageUrl}
      />

      {/* VIP Signatures - Luxury Gallery */}
      <VipSignatureGallery
        donorName={honor.donorName}
        signatures={honor.exclusiveSignatures}
        isOwner={isOwner}
        onLockedClick={handleLockedClick}
      />

      {/* Guestbook Section */}
      <TributeGuestbookSection donorName={honor.donorName} tributeUserId={honor.donorId} />

      {/* Hall of Fame History */}
      {allHonors.length > 1 && (
        <TributeHistorySection honors={allHonors} />
      )}
    </div>
  )
}

// Message Section
function TributeMessageSection({ donorName, message }: { donorName: string; message: string }) {
  return (
    <motion.section
      className={styles.section}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className={styles.sectionHeader}>
        <Heart size={20} />
        <h2>TO. {donorName}</h2>
      </div>
      <div className={styles.messageCard}>
        <p>{message}</p>
      </div>
    </motion.section>
  )
}

// Video Section
function TributeVideoSection({
  donorName,
  videoUrl,
  isPlaying,
  onPlay,
}: {
  donorName: string
  videoUrl: string
  isPlaying: boolean
  onPlay: () => void
}) {
  return (
    <motion.section
      className={styles.section}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <div className={styles.sectionHeader}>
        <Film size={20} />
        <h2>EXCLUSIVE VIDEO</h2>
      </div>
      <div className={styles.videoWrapper}>
        <div className={styles.videoInner}>
          <div className={styles.video} onClick={onPlay}>
            {isPlaying ? (
              <video
                src={videoUrl}
                controls
                autoPlay
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <>
                <div className={styles.videoBadge}>
                  <Crown size={12} />
                  TRIBUTE
                </div>
                <button className={styles.playBtn}>
                  <Play size={32} />
                </button>
                <span className={styles.videoLabel}>{donorName} 헌정 영상</span>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  )
}

// Member Videos Section
function TributeMemberVideosSection({
  memberVideos,
}: {
  memberVideos?: HallOfFameHonor['memberVideos']
}) {
  if (memberVideos && memberVideos.length > 0) {
    return (
      <motion.section
        className={styles.section}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className={styles.sectionHeader}>
          <Play size={20} />
          <h2>멤버 감사 영상</h2>
        </div>
        <div className={styles.videosGrid}>
          {memberVideos.map((video) => (
            <div key={video.id} className={styles.videoCard}>
              <div className={styles.videoThumbnail}>
                <div className={styles.videoPlaceholder}>
                  <Play size={32} />
                </div>
                <div className={styles.unitBadge} data-unit={video.memberUnit}>
                  {video.memberUnit === 'excel' ? 'EXCEL' : 'CREW'}
                </div>
              </div>
              <div className={styles.videoInfo}>
                <h3>{video.memberName}</h3>
                <p>{video.message}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>
    )
  }

  return (
    <motion.section
      className={styles.emptySection}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className={styles.emptySectionContent}>
        <Video size={32} />
        <h3>멤버 감사 영상</h3>
        <p>아직 등록된 감사 영상이 없습니다</p>
        <span className={styles.adminHint}>Admin에서 영상을 업로드할 수 있습니다</span>
      </div>
    </motion.section>
  )
}

// Gallery Section
function TributeGallerySection({
  images,
  legacyImage,
}: {
  images?: string[]
  legacyImage?: string
}) {
  const hasImages = images && images.length > 0
  const hasLegacy = legacyImage && !hasImages

  if (hasImages) {
    return (
      <motion.section
        className={styles.section}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className={styles.sectionHeader}>
          <ImageIcon size={20} />
          <h2>감사 포토</h2>
        </div>
        <div className={styles.galleryGrid}>
          {images.map((imageUrl, index) => (
            <a key={index} href={imageUrl} download className={styles.galleryCard}>
              <Image
                src={imageUrl}
                alt={`Tribute Photo ${index + 1}`}
                fill
                className={styles.galleryImage}
                unoptimized
              />
              <div className={styles.galleryOverlay}>
                <Download size={20} />
              </div>
            </a>
          ))}
        </div>
      </motion.section>
    )
  }

  if (hasLegacy) {
    return (
      <motion.section
        className={styles.section}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className={styles.sectionHeader}>
          <ImageIcon size={20} />
          <h2>감사 포토</h2>
        </div>
        <div className={styles.galleryGrid}>
          <a href={legacyImage} download className={styles.galleryCard}>
            <Image
              src={legacyImage}
              alt="Exclusive Signature"
              fill
              className={styles.galleryImage}
              unoptimized
            />
            <div className={styles.galleryOverlay}>
              <Download size={20} />
            </div>
          </a>
        </div>
      </motion.section>
    )
  }

  return (
    <motion.section
      className={styles.emptySection}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <div className={styles.emptySectionContent}>
        <ImageIcon size={32} />
        <h3>감사 포토</h3>
        <p>아직 등록된 감사 사진이 없습니다</p>
        <span className={styles.adminHint}>Admin에서 이미지를 업로드할 수 있습니다</span>
      </div>
    </motion.section>
  )
}

// Guestbook Section
function TributeGuestbookSection({
  donorName,
  tributeUserId,
}: {
  donorName: string
  tributeUserId: string
}) {
  const [inputValue, setInputValue] = useState('')
  const {
    entries,
    isLoading,
    error,
    submitEntry,
    isSubmitting,
    canWrite,
  } = useGuestbook({ tributeUserId })

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
  }

  // 메시지 제출
  const handleSubmit = async () => {
    if (!inputValue.trim() || isSubmitting) return

    const success = await submitEntry(inputValue)
    if (success) {
      setInputValue('')
    }
  }

  // Enter 키 제출
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <motion.section
      className={styles.guestbookSection}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      <div className={styles.sectionHeader}>
        <MessageSquare size={20} />
        <h2>{donorName}님의 방명록</h2>
        <span className={styles.entryCount}>{entries.length}개의 메시지</span>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className={styles.guestbookLoading}>
          <Loader2 size={24} className={styles.spinner} />
          <span>방명록을 불러오는 중...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className={styles.guestbookError}>
          <span>{error}</span>
        </div>
      )}

      {/* Guestbook Entries */}
      {!isLoading && (
        <div className={styles.guestbookList}>
          {entries.length === 0 ? (
            <div className={styles.guestbookEmpty}>
              <MessageSquare size={32} />
              <p>아직 방명록이 없습니다.</p>
              <span>첫 번째 축하 메시지를 남겨주세요!</span>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className={styles.guestbookEntry}>
                <div
                  className={`${styles.guestbookAvatar} ${entry.is_member ? styles.memberAvatar : ''}`}
                  data-unit={entry.author_unit}
                >
                  <User size={16} />
                </div>
                <div className={styles.guestbookContent}>
                  <div className={styles.guestbookMeta}>
                    <span className={styles.guestbookAuthor}>
                      {entry.author_name}
                      {entry.is_member && (
                        <span className={styles.memberBadge} data-unit={entry.author_unit}>
                          {entry.author_unit === 'excel' ? 'EXCEL' : entry.author_unit === 'crew' ? 'CREW' : 'MEMBER'}
                        </span>
                      )}
                    </span>
                    <span className={styles.guestbookDate}>{formatDate(entry.created_at)}</span>
                  </div>
                  <p className={styles.guestbookMessage}>{entry.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Guestbook Input */}
      <div className={styles.guestbookInputWrapper}>
        <div className={styles.guestbookInput}>
          <input
            type="text"
            placeholder={canWrite ? '축하 메시지를 남겨주세요...' : '로그인 후 작성할 수 있습니다'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!canWrite || isSubmitting}
            maxLength={500}
          />
          <button
            className={styles.guestbookSendBtn}
            onClick={handleSubmit}
            disabled={!canWrite || isSubmitting || !inputValue.trim()}
          >
            {isSubmitting ? (
              <Loader2 size={18} className={styles.spinner} />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
        {!canWrite && (
          <span className={styles.guestbookHint}>
            로그인 후 메시지를 남길 수 있습니다
          </span>
        )}
        {canWrite && inputValue.length > 0 && (
          <span className={styles.guestbookCharCount}>
            {inputValue.length}/500
          </span>
        )}
      </div>
    </motion.section>
  )
}

// History Section
function TributeHistorySection({ honors }: { honors: HallOfFameHonor[] }) {
  return (
    <motion.section
      className={styles.section}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className={styles.sectionHeader}>
        <Trophy size={20} />
        <h2>명예의 전당 기록</h2>
      </div>
      <div className={styles.historyList}>
        {honors.map((honor) => (
          <div key={honor.id} className={styles.historyItem}>
            <span className={styles.historyDate}>
              {honor.honorType === 'season_top3'
                ? `${honor.seasonName} TOP ${honor.rank}`
                : honor.episodeName}
            </span>
            <span className={styles.historyAmount}>{formatAmount(honor.amount)}</span>
          </div>
        ))}
      </div>
    </motion.section>
  )
}
