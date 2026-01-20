'use client'

import { motion } from 'framer-motion'
import { History, MessageCircle } from 'lucide-react'
import type { TributeDonation, TributeTheme } from '@/types/common'
import styles from './TributeDonationTimeline.module.css'

// Local helper functions
const formatAmountShort = (amount: number): string => {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억`;
  }
  if (amount >= 10000) {
    return `${Math.floor(amount / 10000).toLocaleString()}만`;
  }
  return amount.toLocaleString();
};

interface FormatDateOptions {
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
}

const formatDate = (dateStr: string, options?: FormatDateOptions): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', options);
};

interface TributeDonationTimelineProps {
  donations: TributeDonation[]
  theme: TributeTheme
}

export default function TributeDonationTimeline({
  donations,
  theme,
}: TributeDonationTimelineProps) {
  const formatDonationDate = (dateStr: string) => {
    return formatDate(dateStr, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0)

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
            <History size={24} />
          </div>
          <h2 className={styles.title}>Donation History</h2>
        </motion.div>

        {/* Timeline */}
        <div className={styles.timeline}>
          {donations.map((donation, index) => (
            <motion.div
              key={donation.id}
              className={styles.timelineItem}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className={styles.timelineLine}>
                <div className={styles.timelineDot} />
              </div>

              <div className={styles.timelineContent}>
                <div className={styles.timelineHeader}>
                  <span className={styles.date}>{formatDonationDate(donation.createdAt)}</span>
                </div>

                {donation.message && (
                  <div className={styles.message}>
                    <MessageCircle size={14} className={styles.messageIcon} />
                    <p>{donation.message}</p>
                  </div>
                )}

                <span className={styles.season}>{donation.seasonName}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
