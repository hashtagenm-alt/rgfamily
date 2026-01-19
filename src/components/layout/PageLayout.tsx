'use client'

import { ReactNode } from 'react'
import SideBanner from './SideBanner'
import styles from './PageLayout.module.css'

interface PageLayoutProps {
  children: ReactNode
  /** 사이드 배너 표시 여부 (기본: true) */
  showSideBanners?: boolean
  /** 전체 너비 사용 (배너 없이) */
  fullWidth?: boolean
  /** 추가 클래스명 */
  className?: string
}

/**
 * PageLayout - 사이드 배너를 포함한 페이지 레이아웃
 *
 * 구조:
 * [Left Banner] [Main Content] [Right Banner]
 *
 * - 데스크톱: 양쪽 사이드 배너 영역
 * - 모바일 (900px 이하): 배너 숨김, 전체 너비 사용
 */
export default function PageLayout({
  children,
  showSideBanners = true,
  fullWidth = false,
  className = '',
}: PageLayoutProps) {
  if (fullWidth || !showSideBanners) {
    return (
      <div className={`${styles.wrapper} ${styles.fullWidth} ${className}`}>
        <main className={styles.mainFull}>{children}</main>
      </div>
    )
  }

  return (
    <div className={`${styles.wrapper} ${className}`}>
      {/* Left Banner Area */}
      <aside className={styles.sidebarLeft}>
        <SideBanner />
      </aside>

      {/* Main Content */}
      <main className={styles.main}>{children}</main>

      {/* Right Banner Area */}
      <aside className={styles.sidebarRight}>
        <SideBanner />
      </aside>
    </div>
  )
}
