'use client'

import { ReactNode } from 'react'
import styles from './PageLayout.module.css'

interface PageLayoutProps {
  children: ReactNode
  /** 추가 클래스명 */
  className?: string
}

/**
 * PageLayout - 메인 콘텐츠 레이아웃
 *
 * 사이드 배너 없이 전체 너비 사용
 */
export default function PageLayout({
  children,
  className = '',
}: PageLayoutProps) {
  return (
    <div className={`${styles.wrapper} ${styles.fullWidth} ${className}`}>
      <main className={styles.mainFull}>{children}</main>
    </div>
  )
}
