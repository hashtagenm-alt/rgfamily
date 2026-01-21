'use client'

import { motion } from 'framer-motion'
import { Crown, Medal, Award, User } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { RankingItem } from '@/types/common'
import GaugeBar from './GaugeBar'
import styles from './RankingCard.module.css'

interface RankingCardProps {
  item: RankingItem
  maxAmount: number
  index: number
}

export default function RankingCard({ item, maxAmount, index }: RankingCardProps) {
  const getRankIcon = () => {
    if (item.rank === 1) return <Crown size={24} />
    if (item.rank === 2) return <Medal size={24} />
    if (item.rank === 3) return <Award size={24} />
    return null
  }

  const getRankClass = () => {
    if (item.rank === 1) return styles.gold
    if (item.rank === 2) return styles.silver
    if (item.rank === 3) return styles.bronze
    return ''
  }

  const getLinkRankClass = () => {
    if (item.rank === 1) return styles.rank1
    if (item.rank === 2) return styles.rank2
    if (item.rank === 3) return styles.rank3
    return ''
  }

  const CardContent = (
    <motion.div
      className={`${styles.card} ${getRankClass()}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -8 }}
    >
      {/* Rank Badge */}
      <div className={styles.rankBadge}>
        {getRankIcon()}
        <span>{item.rank}</span>
      </div>

      {/* Avatar */}
      <div className={styles.avatar}>
        {item.avatarUrl ? (
          <Image
            src={item.avatarUrl}
            alt={item.donorName}
            fill
            className={styles.avatarImage}
          />
        ) : (
          <User size={32} />
        )}
      </div>

      {/* Info */}
      <div className={styles.info}>
        <h3 className={styles.name}>{item.donorName}</h3>
      </div>

      {/* Gauge Bar */}
      <div className={styles.gaugeWrapper}>
        <GaugeBar
          value={item.totalAmount}
          maxValue={maxAmount}
          rank={item.rank}
          size="lg"
        />
      </div>

      {/* Decorations */}
      {item.rank <= 3 && (
        <div className={styles.decoration}>
          <div className={styles.glow} />
          <div className={styles.particles}>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className={styles.particle}
                animate={{
                  y: [-10, 10],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )

  // Top 3 표시 (링크 비활성화)
  if (item.rank <= 3) {
    return (
      <div className={`${styles.link} ${getLinkRankClass()}`}>
        {CardContent}
      </div>
    )
  }

  return CardContent
}
