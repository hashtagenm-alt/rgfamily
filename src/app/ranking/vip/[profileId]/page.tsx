'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crown, ArrowLeft, ImageIcon,
  Trophy, Star, Edit3, Info,
  ChevronLeft, ChevronRight, X, Upload, Plus
} from 'lucide-react'
import Footer from '@/components/Footer'
import { BjThankYouSection, VipMessageSection } from '@/components/vip'
import { useAuthContext } from '@/lib/context'
import { useVipStatus, useVipProfileData } from '@/lib/hooks'
import styles from './page.module.css'

export default function VipProfilePage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = use(params)
  const { user, profile, isLoading: authLoading } = useAuthContext()
  const { isVip, isLoading: vipLoading } = useVipStatus()
  const { data: vipData, isLoading: dataLoading, error } = useVipProfileData(profileId)

  const [showGate, setShowGate] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [bioText, setBioText] = useState('')

  // 접근 권한 체크
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'
  const isOwner = user?.id === profileId

  // VIP 전용 콘텐츠 접근 권한 (VIP/본인/관리자만)
  // 페이지 자체는 누구나 볼 수 있음
  const hasFullAccess = isVip || isOwner || isAdmin

  // 인증 로딩도 전체 로딩에 포함하여 플리커링 방지
  const isLoading = authLoading || vipLoading || dataLoading

  // 1.8초 후 자동으로 게이트 열림 (고급스러운 진입 효과)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowGate(false)
    }, 1800)
    return () => clearTimeout(timer)
  }, [])

  // 모달 네비게이션
  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (selectedImageIndex !== null && vipData) {
      setSelectedImageIndex(
        selectedImageIndex === 0 ? vipData.images.length - 1 : selectedImageIndex - 1
      )
    }
  }

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (selectedImageIndex !== null && vipData) {
      setSelectedImageIndex(
        selectedImageIndex === vipData.images.length - 1 ? 0 : selectedImageIndex + 1
      )
    }
  }

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImageIndex === null) return
      if (e.key === 'ArrowLeft') handlePrevImage(e as unknown as React.MouseEvent)
      if (e.key === 'ArrowRight') handleNextImage(e as unknown as React.MouseEvent)
      if (e.key === 'Escape') setSelectedImageIndex(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedImageIndex, vipData])

  // 로딩 중
  if (isLoading) {
    return (
      <div className={styles.main}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>VIP 정보를 불러오는 중...</span>
        </div>
        <Footer />
      </div>
    )
  }

  // 에러
  if (error || !vipData) {
    return (
      <div className={styles.main}>
        <div className={styles.empty}>
          <Crown size={48} />
          <p>{error || 'VIP 정보를 찾을 수 없습니다'}</p>
          <Link href="/ranking" className={styles.backLink}>
            <ArrowLeft size={18} />
            <span>후원 랭킹으로 돌아가기</span>
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) return { border: '1px solid #ffd700', color: '#ffd700' }
    if (rank === 2) return { border: '1px solid #c0c0c0', color: '#c0c0c0' }
    if (rank === 3) return { border: '1px solid #cd7f32', color: '#cd7f32' }
    return { border: '1px solid rgba(212, 175, 55, 0.3)', color: '#d4af37' }
  }

  const getRankLabel = (rank: number) => {
    if (rank === 1) return 'FIRST PLACE'
    if (rank === 2) return 'SECOND PLACE'
    if (rank === 3) return 'THIRD PLACE'
    return `RANK ${rank}`
  }

  const rankStyle = getRankBadgeStyle(vipData.rank)

  // 컨텐츠 렌더링 - 레이아웃은 모두에게 보이고, 개별 콘텐츠별 접근 제어
  const renderContent = () => {
    return (
      <>
        {/* 1. VIP 메시지 보드 - FROM RG FAMILY (VIP 본인의 글 게시) */}
        <VipMessageSection
          vipProfileId={profileId}
          vipNickname={vipData.nickname}
          vipAvatarUrl={vipData.avatarUrl}
        />

        {/* 2. VIP 전용 시그니처 갤러리 - 4개 그리드 */}
        <motion.section
          className={styles.gallerySection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className={styles.sectionHeader}>
            <ImageIcon size={18} />
            <h2>VIP 시그니처</h2>
            <div className={styles.sectionDivider} />
          </div>
          <div className={styles.galleryGrid}>
            {/* 실제 이미지 표시 */}
            {vipData.images.slice(0, 4).map((img, index) => (
              <motion.div
                key={img.id}
                className={styles.galleryItem}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.08, duration: 0.4 }}
                onClick={() => setSelectedImageIndex(index)}
              >
                <Image
                  src={img.imageUrl}
                  alt={img.title || `VIP 시그니처 ${index + 1}`}
                  fill
                  className={styles.galleryImage}
                />
                {img.title && <span className={styles.galleryTitle}>{img.title}</span>}
              </motion.div>
            ))}
            {/* 빈 슬롯 플레이스홀더 (4개까지 채우기) */}
            {Array.from({ length: Math.max(0, 4 - vipData.images.length) }).map((_, i) => (
              <motion.div
                key={`placeholder-${i}`}
                className={isAdmin ? styles.uploadPlaceholder : styles.placeholderItem}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + (vipData.images.length + i) * 0.08, duration: 0.4 }}
              >
                {isAdmin ? (
                  <>
                    <Plus size={24} className={styles.uploadIcon} />
                    <span>추가</span>
                  </>
                ) : (
                  <>
                    <ImageIcon size={20} className={styles.placeholderIcon} />
                    <span>시그니처</span>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* 3. BJ 감사 콘텐츠 섹션 - 맨 아래 */}
        <BjThankYouSection
          vipProfileId={profileId}
          vipNickname={vipData.nickname}
          hasFullAccess={hasFullAccess}
        />
      </>
    )
  }

  return (
    <div className={styles.main}>
      {/* Entrance Gate Animation - 럭셔리 진입 효과 */}
      <AnimatePresence>
        {showGate && (
          <motion.div
            className={styles.gateOverlay}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            onClick={() => setShowGate(false)}
          >
            {/* 배경 글로우 효과 */}
            <motion.div
              className={styles.gateGlow}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 0.6 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
            {/* 크라운 아이콘 */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -20 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className={styles.gateIcon}
            >
              <Crown size={56} strokeWidth={1} />
            </motion.div>
            {/* 닉네임 */}
            <motion.div
              initial={{ opacity: 0, y: 30, letterSpacing: '20px' }}
              animate={{ opacity: 1, y: 0, letterSpacing: '12px' }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.5, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
              className={styles.gateText}
            >
              {vipData.nickname}
            </motion.div>
            {/* VIP LOUNGE 서브텍스트 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 0.6, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className={styles.gateSubtext}
            >
              VIP LOUNGE
            </motion.div>
            {/* 장식 라인 */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ scaleX: 0 }}
              transition={{ delay: 1.0, duration: 0.4 }}
              className={styles.gateLine}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className={styles.pageNav}>
        <Link href="/ranking" className={styles.backBtn}>
          <ArrowLeft size={18} />
          <span>RANKING</span>
        </Link>
        <div className={styles.navTitle}>
          <Crown size={16} />
          <span>VIP PROFILE</span>
        </div>
        <div className={styles.navActions}>
          <Link href="/ranking" className={styles.navBtn}>
            <Trophy size={16} />
            <span>RANKING</span>
          </Link>
        </div>
      </nav>

      {/* Hero - 컴팩트 카드 형태 */}
      <motion.div
        className={styles.hero}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.heroHeader}>
          <Crown size={18} className={styles.heroHeaderIcon} />
          <span>VIP LOUNGE</span>
        </div>
        <div className={styles.heroContent}>
          {/* 프로필 이미지 */}
          <motion.div
            className={styles.heroProfile}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            {vipData.avatarUrl ? (
              <Image
                src={vipData.avatarUrl}
                alt={vipData.nickname}
                width={120}
                height={120}
                className={styles.heroProfileImage}
              />
            ) : (
              <div className={styles.heroProfilePlaceholder}>
                <Crown size={40} />
              </div>
            )}
          </motion.div>

          {/* 정보 영역 */}
          <div className={styles.heroInfo}>
            <div className={styles.heroTitleRow}>
              <motion.h1
                className={styles.heroTitle}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                {vipData.nickname}
              </motion.h1>
              <motion.button
                className={styles.infoBtn}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                title="VIP 정보"
              >
                <Info size={16} />
              </motion.button>
            </div>
            <motion.div
              className={styles.heroMeta}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className={styles.rankBadge} style={rankStyle}>
                <Crown size={12} />
                #{vipData.rank}
              </span>
              <span className={styles.metaDivider}>·</span>
              {vipData.seasonName && (
                <span className={styles.seasonTag}>{vipData.seasonName}</span>
              )}
            </motion.div>

            {/* VIP 소개글 */}
            <motion.div
              className={styles.heroBio}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {isEditingBio ? (
                <div className={styles.bioEditForm}>
                  <textarea
                    className={styles.bioTextarea}
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    placeholder="나를 소개해주세요..."
                    maxLength={200}
                    autoFocus
                  />
                  <div className={styles.bioEditActions}>
                    <span className={styles.bioCharCount}>{bioText.length}/200</span>
                    <button
                      className={styles.bioCancelBtn}
                      onClick={() => {
                        setIsEditingBio(false)
                        setBioText('')
                      }}
                    >
                      취소
                    </button>
                    <button className={styles.bioSaveBtn}>저장</button>
                  </div>
                </div>
              ) : bioText ? (
                <div className={styles.bioContent}>
                  <p className={styles.bioText}>{bioText}</p>
                  {isOwner && (
                    <button
                      className={styles.bioEditBtn}
                      onClick={() => setIsEditingBio(true)}
                    >
                      <Edit3 size={14} />
                    </button>
                  )}
                </div>
              ) : isOwner ? (
                <button
                  className={styles.bioPlaceholderBtn}
                  onClick={() => setIsEditingBio(true)}
                >
                  <Edit3 size={14} />
                  <span>소개글을 작성해보세요</span>
                </button>
              ) : (
                <p className={styles.bioEmpty}>아직 소개글이 없습니다</p>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className={styles.container}>
        {renderContent()}
      </div>

      {/* Image Modal - Fullscreen Gallery */}
      <AnimatePresence>
        {selectedImageIndex !== null && vipData.images[selectedImageIndex] && (
          <motion.div
            className={styles.imageModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImageIndex(null)}
          >
            <motion.div
              className={styles.imageModalContent}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={vipData.images[selectedImageIndex].imageUrl}
                alt={vipData.images[selectedImageIndex].title || '갤러리 이미지'}
                fill
                className={styles.modalImage}
              />
            </motion.div>

            {/* Modal Controls */}
            <button
              className={styles.modalClose}
              onClick={() => setSelectedImageIndex(null)}
            >
              <X size={20} />
            </button>

            {vipData.images.length > 1 && (
              <>
                <button
                  className={`${styles.modalNav} ${styles.modalNavPrev}`}
                  onClick={handlePrevImage}
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  className={`${styles.modalNav} ${styles.modalNavNext}`}
                  onClick={handleNextImage}
                >
                  <ChevronRight size={24} />
                </button>
                <div className={styles.modalCounter}>
                  {selectedImageIndex + 1} / {vipData.images.length}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  )
}
