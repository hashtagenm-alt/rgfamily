'use client'

import { motion } from 'framer-motion'
import { Play, Video } from 'lucide-react'
import type { HallOfFameHonor } from '@/types/tribute'
import styles from '../TributeSections.module.css'

interface TributeMemberVideosSectionProps {
  memberVideos?: HallOfFameHonor['memberVideos']
}

export default function TributeMemberVideosSection({
  memberVideos,
}: TributeMemberVideosSectionProps) {
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
