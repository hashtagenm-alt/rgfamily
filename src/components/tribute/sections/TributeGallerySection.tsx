'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { ImageIcon, Download } from 'lucide-react'
import styles from '../TributeSections.module.css'

interface TributeGallerySectionProps {
  images?: string[]
  legacyImage?: string
}

export default function TributeGallerySection({
  images,
  legacyImage,
}: TributeGallerySectionProps) {
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
