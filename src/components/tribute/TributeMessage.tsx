'use client'

import { motion } from 'framer-motion'
import { MessageSquareHeart, Pen } from 'lucide-react'
import Image from 'next/image'
import type { TributeTheme } from '@/types/common'
import styles from './TributeMessage.module.css'

interface TributeMessageProps {
  message: string
  signature?: string | null
  theme: TributeTheme
  streamerName?: string
}

export default function TributeMessage({
  message,
  signature,
  theme,
  streamerName = '나노',
}: TributeMessageProps) {
  const paragraphs = message.split('\n\n')

  return (
    <motion.section
      className={`${styles.section} ${styles[theme]}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6 }}
    >
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <MessageSquareHeart size={24} />
        </div>
        <h2 className={styles.title}>Personal Message</h2>
        <p className={styles.subtitle}>from {streamerName}</p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardGlow} />
        <div className={styles.content}>
          {paragraphs.map((paragraph, index) => (
            <p key={index} className={styles.paragraph}>
              {paragraph}
            </p>
          ))}
        </div>

        {signature && (
          <div className={styles.signatureSection}>
            <div className={styles.signatureDivider}>
              <Pen size={14} />
            </div>
            <div className={styles.signature}>
              <Image
                src={signature}
                alt={`${streamerName} signature`}
                width={200}
                height={60}
                className={styles.signatureImage}
              />
            </div>
          </div>
        )}
      </div>
    </motion.section>
  )
}
