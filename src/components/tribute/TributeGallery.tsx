'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Images, X, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import type { TributeGalleryImage, TributeTheme } from '@/types/common'
import styles from './TributeGallery.module.css'

interface TributeGalleryProps {
  images: TributeGalleryImage[]
  theme: TributeTheme
}

export default function TributeGallery({ images, theme }: TributeGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const openLightbox = (index: number) => {
    setSelectedIndex(index)
  }

  const closeLightbox = () => {
    setSelectedIndex(null)
  }

  const goToPrev = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === 0 ? images.length - 1 : selectedIndex - 1)
    }
  }

  const goToNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === images.length - 1 ? 0 : selectedIndex + 1)
    }
  }

  return (
    <section className={`${styles.section} ${styles[theme]}`}>
      <div className={styles.container}>
        {/* Header */}
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.iconWrapper}>
            <Images size={24} />
          </div>
          <h2 className={styles.title}>Exclusive Gallery</h2>
          <p className={styles.subtitle}>{images.length} exclusive photos</p>
        </motion.div>

        {/* Grid */}
        <div className={styles.grid}>
          {images.map((image, index) => (
            <motion.div
              key={image.id}
              className={styles.item}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              onClick={() => openLightbox(index)}
            >
              <div className={styles.imageWrapper}>
                <Image
                  src={image.url}
                  alt={image.title}
                  fill
                  className={styles.image}
                />
                <div className={styles.overlay}>
                  <span className={styles.overlayTitle}>{image.title}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            className={styles.lightbox}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
          >
            <button className={styles.closeBtn} onClick={closeLightbox}>
              <X size={24} />
            </button>

            <button
              className={`${styles.navBtn} ${styles.prevBtn}`}
              onClick={(e) => {
                e.stopPropagation()
                goToPrev()
              }}
            >
              <ChevronLeft size={32} />
            </button>

            <motion.div
              className={styles.lightboxContent}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.lightboxImageWrapper}>
                <Image
                  src={images[selectedIndex].url}
                  alt={images[selectedIndex].title}
                  fill
                  className={styles.lightboxImage}
                />
              </div>
              <div className={styles.lightboxInfo}>
                <h3 className={styles.lightboxTitle}>{images[selectedIndex].title}</h3>
                {images[selectedIndex].description && (
                  <p className={styles.lightboxDesc}>{images[selectedIndex].description}</p>
                )}
                <span className={styles.lightboxCounter}>
                  {selectedIndex + 1} / {images.length}
                </span>
              </div>
            </motion.div>

            <button
              className={`${styles.navBtn} ${styles.nextBtn}`}
              onClick={(e) => {
                e.stopPropagation()
                goToNext()
              }}
            >
              <ChevronRight size={32} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
