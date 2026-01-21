'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crown, ArrowLeft, ImageIcon,
  Trophy, Star,
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

  // 접근 권한 체크
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'
  const isOwner = user?.id === profileId

  // VIP 전용 콘텐츠 접근 권한 (VIP/본인/관리자만)
  // 페이지 자체는 누구나 볼 수 있음
  const hasFullAccess = isVip || isOwner || isAdmin

  // 인증 로딩도 전체 로딩에 포함하여 플리커링 방지
  const isLoading = authLoading || vipLoading || dataLoading

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
        {/* 1. VIP 전용 시그니처 갤러리 - 모든 사용자에게 공개 */}
        <motion.section
          className={styles.gallerySection}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className={styles.sectionHeader}>
            <ImageIcon size={20} />
            <h2>VIP 전용 시그니처</h2>
            <div className={styles.sectionDivider} />
          </div>
          {vipData.images.length > 0 ? (
            <div className={styles.galleryGrid}>
              {vipData.images.map((img, index) => (
                <motion.div
                  key={img.id}
                  className={styles.galleryItem}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.08, duration: 0.4 }}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <Image
                    src={img.imageUrl}
                    alt={img.title || `VIP 시그니처 ${index + 1}`}
                    fill
                    className={styles.galleryImage}
                  />
                  {img.title && <span className={styles.galleryTitle}>{img.title}</span>}
                  {index === 0 && vipData.images.length > 1 && (
                    <span className={styles.galleryCount}>{vipData.images.length}</span>
                  )}
                </motion.div>
              ))}
              {/* 관리자에게만 추가 업로드 버튼 표시 */}
              {isAdmin && (
                <motion.div
                  className={styles.uploadPlaceholder}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + vipData.images.length * 0.08, duration: 0.4 }}
                >
                  <Plus size={28} className={styles.uploadIcon} />
                  <span>시그니처 추가</span>
                  <span className={styles.uploadHint}>클릭하여 업로드</span>
                </motion.div>
              )}
            </div>
          ) : isAdmin ? (
            /* 관리자: 업로드 가능한 플레이스홀더 */
            <div className={styles.uploadGrid}>
              {[1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className={styles.uploadPlaceholder}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                >
                  {i === 1 ? (
                    <>
                      <Upload size={28} className={styles.uploadIcon} />
                      <span>시그니처 업로드</span>
                      <span className={styles.uploadHint}>이미지 파일을 선택하세요</span>
                    </>
                  ) : (
                    <>
                      <Plus size={24} className={styles.uploadIconSmall} />
                      <span>추가 {i}</span>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            /* 일반 사용자: 기본 플레이스홀더 */
            <div className={styles.placeholderGrid}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={styles.placeholderItem}>
                  <ImageIcon size={24} className={styles.placeholderIcon} />
                  <span>시그니처 {i}</span>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* 2. VIP 메시지 보드 - 모든 사용자에게 표시 (VIP 본인의 글 게시) */}
        <VipMessageSection
          vipProfileId={profileId}
          vipNickname={vipData.nickname}
          vipAvatarUrl={vipData.avatarUrl}
        />

        {/* 3. BJ 감사 메시지 섹션 - 모든 사용자에게 표시
            BJ들이 VIP에게 남기는 감사 메시지 (사진/글/영상 업로드 가능)
            개별 메시지의 접근 권한은 BjMessageCard에서 처리:
            - BJ 프로필/이름: 모두 볼 수 있음
            - 이미지: VIP/해당 BJ만 실제 사진, 그 외 잠금 플레이스홀더
            - 영상: VIP/해당 BJ만 재생 가능, 그 외 썸네일만 */}
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
