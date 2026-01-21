'use client'

/**
 * 명예의 전당 페이지
 *
 * 시즌별 포디움 달성 기록을 표시합니다.
 * 한 번이라도 포디움에 올랐던 사람은 영구 기록됩니다.
 */

import Link from 'next/link'
import { Crown, ArrowLeft } from 'lucide-react'
import { PageLayout } from '@/components/layout'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { HallOfFame } from '@/components/ranking'
import styles from './page.module.css'

export default function HallOfFamePage() {
  return (
    <PageLayout>
      <main className={styles.main}>
        <Navbar />

        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroGlow} />
          <div className={styles.heroContent}>
            <div className={styles.heroTitleRow}>
              <Crown className={styles.heroCrown} size={36} />
              <h1 className={styles.heroTitle}>명예의 전당</h1>
            </div>
            <p className={styles.heroSubtitle}>
              직급전에서 포디움(1~3위)에 올랐던 영광의 순간들을 기록합니다
            </p>

            {/* Back Link */}
            <div className={styles.heroLinks}>
              <Link href="/ranking" className={styles.backLink}>
                <ArrowLeft size={16} />
                <span>전체 랭킹으로</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className={styles.container}>
          <HallOfFame />
        </div>

        <Footer />
      </main>
    </PageLayout>
  )
}
