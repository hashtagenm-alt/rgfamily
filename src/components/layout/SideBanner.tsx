'use client'

import styles from './SideBanner.module.css'

/**
 * SideBanner - 그라데이션 웰컴 배너
 */
export default function SideBanner() {
  return (
    <div className={styles.container}>
      <div className={styles.banner}>
        <div className={styles.content}>
          <span className={styles.welcome}>WELCOME TO</span>
          <div className={styles.logo}>
            <span className={styles.rg}>RG</span>
            <span className={styles.family}>FAMILY</span>
          </div>
          <span className={styles.tagline}>Official Fan Community</span>
        </div>
        <div className={styles.decoration}>
          <div className={styles.circle1} />
          <div className={styles.circle2} />
          <div className={styles.circle3} />
        </div>
      </div>
    </div>
  )
}
