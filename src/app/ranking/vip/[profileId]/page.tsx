'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crown, ArrowLeft, Play, ImageIcon,
  Trophy, Star, MessageSquare, Video, Lock,
  ChevronLeft, ChevronRight, X
} from 'lucide-react'
import Footer from '@/components/Footer'
import { BjThankYouSection } from '@/components/vip'
import { useAuthContext } from '@/lib/context'
import { useVipStatus, useVipProfileData } from '@/lib/hooks'
import styles from './page.module.css'

export default function VipProfilePage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = use(params)
  const { user, profile } = useAuthContext()
  const { isVip, isLoading: vipLoading } = useVipStatus()
  const { data: vipData, isLoading: dataLoading, error } = useVipProfileData(profileId)

  const [showGate, setShowGate] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)

  // 접근 권한 체크
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'
  const isOwner = user?.id === profileId

  // VIP 페이지 자체는 로그인 회원 모두 열람 가능
  const isLoggedIn = !!user

  // 비공개 콘텐츠 전체 접근 권한 (VIP/본인/관리자)
  const hasFullAccess = isVip || isOwner || isAdmin

  const isLoading = vipLoading || dataLoading

  // 2.5초 후 자동으로 게이트 열림
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowGate(false)
    }, 2500)
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

  // 비로그인 상태
  if (!user) {
    return (
      <div className={styles.main}>
        <div className={styles.restrictedOverlay}>
          <div className={styles.restrictedBadge}>
            <Lock size={48} className={styles.restrictedIcon} />
            <span className={styles.restrictedText}>로그인 필요</span>
            <span className={styles.restrictedSubtext}>VIP 페이지는 로그인 후 이용 가능합니다</span>
            <Link href="/login" className={styles.restrictedButton}>
              로그인
            </Link>
          </div>
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
          <Link href="/ranking/vip" className={styles.backLink}>
            <ArrowLeft size={18} />
            <span>VIP 라운지로 돌아가기</span>
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

  // 컨텐츠 렌더링 (접근 권한에 따라 다름)
  const renderContent = () => {
    // 비로그인 사용자에게만 로그인 유도
    if (!isLoggedIn) {
      return (
        <div className={styles.restrictedOverlay}>
          <div className={styles.restrictedBadge}>
            <Lock size={48} className={styles.restrictedIcon} />
            <span className={styles.restrictedText}>로그인 필요</span>
            <span className={styles.restrictedSubtext}>VIP 페이지는 로그인 후 이용 가능합니다</span>
            <Link href="/login" className={styles.restrictedButton}>
              로그인
            </Link>
          </div>
        </div>
      )
    }

    // VIP 전용 콘텐츠(personalMessage, images)는 hasFullAccess 필요
    if (!hasFullAccess) {
      return (
        <>
          {/* VIP 전용 콘텐츠: 블러 처리 */}
          <div className={styles.restrictedOverlay}>
            <div className={styles.restrictedContent}>
              <section className={styles.messageSection}>
                <div className={styles.sectionHeader}>
                  <MessageSquare size={20} />
                  <h2>감사 메시지</h2>
                  <div className={styles.sectionDivider} />
                </div>
                <div className={styles.messageCard}>
                  <p>이 콘텐츠는 VIP 회원만 볼 수 있습니다. VIP 회원이 되시면 특별한 감사 메시지와 전용 시그니처를 확인하실 수 있습니다.</p>
                </div>
              </section>

              <section className={styles.gallerySection}>
                <div className={styles.sectionHeader}>
                  <ImageIcon size={20} />
                  <h2>VIP 전용 시그니처</h2>
                  <div className={styles.sectionDivider} />
                </div>
                <div className={styles.galleryGrid}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={styles.galleryItem} style={{ background: '#1a1a1a' }} />
                  ))}
                </div>
              </section>
            </div>

            <div className={styles.restrictedBadge}>
              <Lock size={48} className={styles.restrictedIcon} />
              <span className={styles.restrictedText}>VIP Exclusive</span>
              <span className={styles.restrictedSubtext}>VIP 회원만 열람할 수 있습니다</span>
              <Link href="/ranking" className={styles.restrictedButton}>
                VIP 되기
              </Link>
            </div>
          </div>

          {/* BJ 감사 메시지 섹션: 로그인 사용자에게 공개 (공개/비공개 분리 적용) */}
          <BjThankYouSection
            vipProfileId={profileId}
            vipNickname={vipData.nickname}
            hasFullAccess={false}
          />
        </>
      )
    }

    // 접근 권한이 있으면 실제 콘텐츠 표시
    return (
      <>
        {/* Personal Message */}
        {vipData.personalMessage && (
          <motion.section
            className={styles.messageSection}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className={styles.sectionHeader}>
              <MessageSquare size={20} />
              <h2>감사 메시지</h2>
              <div className={styles.sectionDivider} />
            </div>
            <div className={styles.messageCard}>
              <p>{vipData.personalMessage}</p>
            </div>
          </motion.section>
        )}

        {/* Dedication Video */}
        {vipData.dedicationVideoUrl && (
          <motion.section
            className={styles.videoSection}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className={styles.sectionHeader}>
              <Video size={20} />
              <h2>헌정 영상</h2>
              <div className={styles.sectionDivider} />
            </div>
            <div className={styles.videoContainer}>
              <a
                href={vipData.dedicationVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.videoLink}
              >
                <Play size={32} />
                <span>영상 보기</span>
              </a>
            </div>
          </motion.section>
        )}

        {/* Gallery Images - VIP 전용 시그니처 */}
        {vipData.images.length > 0 && (
          <motion.section
            className={styles.gallerySection}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div className={styles.sectionHeader}>
              <ImageIcon size={20} />
              <h2>VIP 전용 시그니처</h2>
              <div className={styles.sectionDivider} />
            </div>
            <div className={styles.galleryGrid}>
              {vipData.images.map((img, index) => (
                <motion.div
                  key={img.id}
                  className={styles.galleryItem}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.08, duration: 0.4 }}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <Image
                    src={img.imageUrl}
                    alt={img.title || `VIP 시그니처 ${index + 1}`}
                    fill
                    className={styles.galleryImage}
                    unoptimized
                  />
                  {img.title && <span className={styles.galleryTitle}>{img.title}</span>}
                  {index === 0 && vipData.images.length > 1 && (
                    <span className={styles.galleryCount}>{vipData.images.length}</span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* BJ 감사 메시지 섹션 */}
        <BjThankYouSection
          vipProfileId={profileId}
          vipNickname={vipData.nickname}
          hasFullAccess={true}
        />

        {/* Empty State */}
        {!vipData.personalMessage && !vipData.dedicationVideoUrl && vipData.images.length === 0 && (
          <motion.div
            className={styles.emptyContent}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Crown size={48} />
            <p>아직 등록된 VIP 콘텐츠가 없습니다</p>
          </motion.div>
        )}
      </>
    )
  }

  return (
    <div className={styles.main}>
      {/* Entrance Gate Animation */}
      <AnimatePresence>
        {showGate && (
          <motion.div
            className={styles.gateOverlay}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
            onClick={() => setShowGate(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 0.6 }}
              className={styles.gateIcon}
            >
              <Crown size={64} strokeWidth={1} />
            </motion.div>
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className={styles.gateText}
            >
              {vipData.nickname}
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.5 }}
              className={styles.gateSubtext}
            >
              VIP EXCLUSIVE
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 60 }}
              exit={{ width: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className={styles.gateLine}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className={styles.pageNav}>
        <Link href="/ranking/vip" className={styles.backBtn}>
          <ArrowLeft size={18} />
          <span>VIP LOUNGE</span>
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

      {/* Hero */}
      <motion.div
        className={styles.hero}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className={styles.heroContent}>
          <motion.div
            className={styles.rankBadge}
            style={rankStyle}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Crown size={14} />
            <span>{getRankLabel(vipData.rank)}</span>
          </motion.div>
          <motion.h1
            className={styles.heroTitle}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {vipData.nickname}
          </motion.h1>
          {vipData.seasonName && (
            <motion.div
              className={styles.heroSubtitle}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <span className={styles.seasonTag}>{vipData.seasonName}</span>
            </motion.div>
          )}
        </div>
        <div className={styles.heroDecoration}>
          <div className={styles.glow} />
          <Star className={styles.star1} size={20} />
          <Star className={styles.star2} size={14} />
          <Star className={styles.star3} size={18} />
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
                unoptimized
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
