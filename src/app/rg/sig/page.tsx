import Link from 'next/link'
import { ArrowLeft, Users, Radio, FileText, Calendar } from 'lucide-react'
import Footer from '@/components/Footer'
import SigGallery from '@/components/info/SigGallery'
import styles from './page.module.css'

export const metadata = {
  title: '시그리스트 | RG FAMILY',
  description: 'RG FAMILY 멤버별 시그니처 리액션 모음',
}

export default function SigPage() {
  return (
    <div className={styles.main}>
      {/* Navigation */}
      <nav className={styles.pageNav}>
        <Link href="/" className={styles.backBtn}>
          <ArrowLeft size={18} />
          <span>홈</span>
        </Link>
        <div className={styles.navTabs}>
          <Link href="/rg/org" className={styles.navTab}>
            <Users size={16} />
            <span>조직도</span>
          </Link>
          <Link href="/rg/live" className={styles.navTab}>
            <Radio size={16} />
            <span>LIVE</span>
          </Link>
          <Link
            href="/rg/sig"
            className={`${styles.navTab} ${styles.active}`}
          >
            <FileText size={16} />
            <span>시그</span>
          </Link>
          <Link href="/rg/history" className={styles.navTab}>
            <Calendar size={16} />
            <span>연혁</span>
          </Link>
        </div>
      </nav>

      {/* Page Header */}
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>시그리스트</h1>
        <p className={styles.pageDesc}>RG Family 멤버별 시그니처 리액션 모음</p>
      </header>

      <SigGallery />
      <Footer />
    </div>
  )
}
