'use client'

import { motion } from 'framer-motion'
import { Film, Crown, Play, Video } from 'lucide-react'
import styles from '../TributeSections.module.css'

interface TributeVideoSectionProps {
  donorName: string
  videoUrl?: string
  isPlaying: boolean
  onPlay: () => void
}

export default function TributeVideoSection({
  donorName,
  videoUrl,
  isPlaying,
  onPlay,
}: TributeVideoSectionProps) {
  // 영상 URL이 없는 경우
  if (!videoUrl) {
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
        <div className={styles.emptySection}>
          <div className={styles.emptySectionContent}>
            <Video size={40} />
            <h3>헌정 영상 준비 중</h3>
            <p>{donorName}님을 위한 특별한 영상이 곧 공개됩니다</p>
          </div>
        </div>
      </motion.section>
    )
  }

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
