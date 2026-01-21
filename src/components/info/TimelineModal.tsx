'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, X } from 'lucide-react'
import Image from 'next/image'
import { CATEGORY_LABELS, getCategoryColor } from '@/lib/hooks/useTimelineData'
import { formatDate } from '@/lib/utils/format'
import type { TimelineItem } from '@/types/common'
import styles from './Timeline.module.css'

interface TimelineModalProps {
  event: TimelineItem | null
  onClose: () => void
}

export default function TimelineModal({ event, onClose }: TimelineModalProps) {
  return (
    <AnimatePresence>
      {event && (
        <motion.div
          className={styles.modalOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.modalContent}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.modalClose} onClick={onClose}>
              <X size={24} />
            </button>

            {/* Modal Image */}
            {event.imageUrl && (
              <div className={styles.modalImageWrapper}>
                <Image
                  src={event.imageUrl}
                  alt={event.title}
                  fill
                  className={styles.modalImage}
                />
              </div>
            )}

            {/* Modal Info */}
            <div className={styles.modalInfo}>
              {/* Date & Category */}
              <div className={styles.modalMeta}>
                <div className={styles.modalDate}>
                  <Calendar size={16} />
                  {formatDate(event.eventDate)}
                </div>
                {event.category && (
                  <span
                    className={styles.modalCategory}
                    style={{
                      backgroundColor: `${getCategoryColor(event.category)}20`,
                      color: getCategoryColor(event.category),
                    }}
                  >
                    {CATEGORY_LABELS[event.category] || event.category}
                  </span>
                )}
                {event.seasonName && (
                  <span className={styles.modalSeason}>{event.seasonName}</span>
                )}
              </div>

              {/* Title */}
              <h2 className={styles.modalTitle}>{event.title}</h2>

              {/* Description */}
              {event.description && (
                <p className={styles.modalDescription}>{event.description}</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
