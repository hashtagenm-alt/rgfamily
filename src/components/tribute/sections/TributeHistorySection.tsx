'use client'

import { motion } from 'framer-motion'
import { Trophy, Star } from 'lucide-react'
import type { HallOfFameHonor } from '@/lib/mock'
import styles from '../TributeSections.module.css'

interface TributeHistorySectionProps {
  honors: HallOfFameHonor[]
}

export default function TributeHistorySection({ honors }: TributeHistorySectionProps) {
  return (
    <motion.section
      className={styles.section}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className={styles.sectionHeader}>
        <Trophy size={20} />
        <h2>명예의 전당 기록</h2>
      </div>
      {honors.length === 0 ? (
        <div className={styles.emptySection}>
          <div className={styles.emptySectionContent}>
            <Star size={40} />
            <h3>아직 등록된 기록이 없습니다</h3>
            <p>시즌 랭킹에서 TOP 3에 오르면 기록이 표시됩니다</p>
          </div>
        </div>
      ) : (
        <div className={styles.historyList}>
          {honors.map((honor) => (
            <div key={honor.id} className={styles.historyItem}>
              <span className={styles.historyDate}>
                {honor.honorType === 'season_top3'
                  ? `${honor.seasonName} TOP ${honor.rank}`
                  : honor.episodeName}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.section>
  )
}
