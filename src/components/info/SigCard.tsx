'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play } from 'lucide-react'
import Image from 'next/image'
import { useLazyLoad } from '@/lib/hooks'
import type { SignatureData } from './SigGallery'
import styles from './SigCard.module.css'

interface SigCardProps {
  signature: SignatureData
  onClick: () => void
}

export default function SigCard({ signature, onClick }: SigCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Lazy loading with IntersectionObserver
  const { ref, hasLoaded: isInView } = useLazyLoad<HTMLDivElement>({
    rootMargin: '200px',
    triggerOnce: true,
  })

  return (
    <motion.div
      ref={ref}
      className={styles.card}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Thumbnail - Square aspect ratio with Lazy Loading */}
      <div className={styles.thumbnail}>
        {/* Facade Placeholder - 이미지 로드 전까지 표시 */}
        {(!isInView || !imageLoaded) && !imageError && (
          <div className={styles.facadePlaceholder}>
            <span className={styles.facadeNumber}>{signature.sigNumber}</span>
          </div>
        )}

        {/* 실제 이미지 - IntersectionObserver가 감지한 후에만 로드 */}
        {isInView && !imageError && signature.thumbnailUrl && (
          <Image
            src={signature.thumbnailUrl}
            alt={signature.title}
            fill
            className={`${styles.image} ${imageLoaded ? styles.imageLoaded : styles.imageLoading}`}
            onError={() => setImageError(true)}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
            sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, 16vw"
          />
        )}

        {/* Error Placeholder */}
        {(imageError || !signature.thumbnailUrl) && (
          <div className={styles.placeholder}>
            <span className={styles.placeholderNumber}>{signature.sigNumber}</span>
          </div>
        )}

        {/* Play Button - always visible, positioned bottom-right */}
        <motion.div
          className={styles.playButton}
          animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
        >
          <Play size={14} fill="white" />
        </motion.div>

        {/* Hover Overlay */}
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />
      </div>

      {/* Info - Minimal */}
      <div className={styles.info}>
        <span className={styles.title}>{signature.title}</span>
      </div>
    </motion.div>
  )
}
