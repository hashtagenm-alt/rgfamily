'use client'

import { motion } from 'framer-motion'
import { Crown, Star, User } from 'lucide-react'
import Link from 'next/link'
import type { HallOfFameHonor } from '@/lib/mock'
import styles from './TributePageHero.module.css'

interface TributePageHeroProps {
  honor: HallOfFameHonor
}

function getRankTheme(rank?: number) {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return 'default'
}

export default function TributePageHero({ honor }: TributePageHeroProps) {
  const isSeasonTop3 = honor.honorType === 'season_top3'
  const badgeText = isSeasonTop3
    ? `${honor.seasonName} TOP ${honor.rank}`
    : 'LEGENDARY SUPPORTER'
  const theme = getRankTheme(honor.rank)

  return (
    <div className={`${styles.hero} ${styles[theme]}`}>
      <motion.div
        className={styles.heroContent}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className={styles.vipBadge}>
          {isSeasonTop3 ? <Crown size={20} /> : <Star size={20} />}
          <span>{badgeText}</span>
        </div>
        <h1 className={styles.heroTitle}>{honor.donorName}</h1>

        {/* VIP 개인 페이지 링크 */}
        <Link href={`/ranking/vip/${honor.donorId}`} className={styles.vipPageLink}>
          <User size={16} />
          <span>VIP 개인 페이지</span>
        </Link>
      </motion.div>

      <div className={styles.heroDecoration}>
        <div className={styles.glow} />
        <Star className={styles.star1} size={24} />
        <Star className={styles.star2} size={16} />
        <Star className={styles.star3} size={20} />
      </div>
    </div>
  )
}
