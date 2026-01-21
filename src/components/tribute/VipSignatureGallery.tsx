'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, X, Lock, Sparkles, Crown, Star } from 'lucide-react'
import type { HallOfFameHonor } from '@/lib/mock'
import styles from './VipSignatureGallery.module.css'

interface VipSignatureGalleryProps {
  donorName: string
  signatures?: HallOfFameHonor['exclusiveSignatures']
  isOwner?: boolean // VIP 본인 또는 관리자인지
  onLockedClick?: () => void // 잠긴 상태 클릭 시 콜백
}

export default function VipSignatureGallery({
  donorName,
  signatures,
  isOwner = false,
  onLockedClick,
}: VipSignatureGalleryProps) {
  type TributeSignature = NonNullable<typeof signatures>[number]
  const [selectedSig, setSelectedSig] = useState<TributeSignature | null>(null)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const handleSigClick = useCallback((sig: NonNullable<typeof signatures>[number]) => {
    if (!isOwner) {
      onLockedClick?.()
      return
    }
    setSelectedSig(sig)
    setIsLightboxOpen(true)
  }, [isOwner, onLockedClick])

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false)
    setSelectedSig(null)
  }, [])

  if (!signatures || signatures.length === 0) {
    return (
      <motion.section
        className={styles.emptyGallery}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className={styles.emptyContent}>
          <div className={styles.emptyIcon}>
            <Sparkles size={32} />
          </div>
          <h3>VIP 전용 시그니처</h3>
          <p>아직 등록된 시그니처가 없습니다</p>
          <span className={styles.adminHint}>관리자가 전용 시그니처를 업로드할 수 있습니다</span>
        </div>
      </motion.section>
    )
  }

  return (
    <>
      <motion.section
        className={styles.gallerySection}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Luxury Header */}
        <div className={styles.galleryHeader}>
          <div className={styles.headerAccent} />
          <div className={styles.headerContent}>
            <div className={styles.headerBadge}>
              <Crown size={14} />
              <span>VIP EXCLUSIVE</span>
            </div>
            <h2 className={styles.headerTitle}>
              Signature Collection
            </h2>
            <p className={styles.headerSubtitle}>
              {donorName}님을 위한 프리미엄 시그니처 컬렉션
            </p>
          </div>
          <div className={styles.headerDecor}>
            <Star size={12} className={styles.decorStar1} />
            <Star size={8} className={styles.decorStar2} />
            <Star size={10} className={styles.decorStar3} />
          </div>
        </div>

        {/* Gallery Grid - Masonry Style */}
        <div className={styles.galleryGrid}>
          {signatures.map((sig, index) => (
            <motion.div
              key={sig.id}
              className={`${styles.galleryItem} ${!isOwner ? styles.locked : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.3 }}
              onClick={() => handleSigClick(sig)}
            >
              {/* Thumbnail */}
              <div className={styles.itemThumbnail}>
                {sig.thumbnailUrl ? (
                  <Image
                    src={sig.thumbnailUrl}
                    alt={sig.memberName}
                    fill
                    className={styles.thumbnailImage}
                  />
                ) : (
                  <div className={styles.thumbnailPlaceholder}>
                    <Play size={32} />
                  </div>
                )}

                {/* Overlay */}
                <div className={styles.itemOverlay}>
                  {isOwner ? (
                    <div className={styles.playButton}>
                      <Play size={24} fill="currentColor" />
                    </div>
                  ) : (
                    <div className={styles.lockOverlay}>
                      <Lock size={24} />
                      <span>VIP 전용</span>
                    </div>
                  )}
                </div>

                {/* Blur for non-owners */}
                {!isOwner && <div className={styles.blurOverlay} />}

                {/* Gradient */}
                <div className={styles.itemGradient} />
              </div>

              {/* Info */}
              <div className={styles.itemInfo}>
                <span className={styles.memberName}>{sig.memberName}</span>
                <span className={styles.sigLabel}>Exclusive Signature</span>
              </div>

              {/* Corner Accent */}
              <div className={styles.cornerAccent} />
            </motion.div>
          ))}
        </div>

        {/* Non-VIP Notice */}
        {!isOwner && (
          <motion.div
            className={styles.lockedNotice}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Lock size={16} />
            <span>VIP 본인만 전용 시그니처를 감상할 수 있습니다</span>
          </motion.div>
        )}
      </motion.section>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && selectedSig && isOwner && (
          <motion.div
            className={styles.lightbox}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
          >
            <motion.div
              className={styles.lightboxContent}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className={styles.lightboxClose} onClick={closeLightbox}>
                <X size={24} />
              </button>

              <div className={styles.lightboxHeader}>
                <Crown size={16} />
                <span>{selectedSig.memberName}</span>
              </div>

              <div className={styles.lightboxMedia}>
                {selectedSig.videoUrl ? (
                  <video
                    src={selectedSig.videoUrl}
                    controls
                    autoPlay
                    className={styles.lightboxVideo}
                  />
                ) : selectedSig.thumbnailUrl ? (
                  <Image
                    src={selectedSig.thumbnailUrl}
                    alt={selectedSig.memberName}
                    fill
                    className={styles.lightboxImage}
                  />
                ) : (
                  <div className={styles.lightboxPlaceholder}>
                    <Play size={48} />
                    <p>미디어를 불러올 수 없습니다</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
