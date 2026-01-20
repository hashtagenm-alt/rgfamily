'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Crown } from 'lucide-react'
import styles from './TributeGate.module.css'

interface TributeGateProps {
  isVisible: boolean
  donorName: string
  rank?: number
  onClose: () => void
}

function getRankTheme(rank?: number) {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return 'default'
}

export default function TributeGate({ isVisible, donorName, rank, onClose }: TributeGateProps) {
  const theme = getRankTheme(rank)

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`${styles.gateOverlay} ${styles[theme]}`}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
          transition={{ duration: 0.8 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={styles.gateIcon}
          >
            <Crown size={80} strokeWidth={1} />
          </motion.div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ delay: 0.2 }}
            className={styles.gateText}
          >
            {donorName}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.4 }}
            className={styles.gateSubtext}
          >
            TRIBUTE PAGE
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
