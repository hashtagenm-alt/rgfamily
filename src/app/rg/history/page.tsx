import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Timeline from '@/components/info/Timeline'
import styles from './page.module.css'

export const metadata = {
  title: '타임라인 | RG FAMILY',
  description: 'RG FAMILY 시즌별 콘텐츠 일정',
}

export default function TimelinePage() {
  return (
    <div className={styles.main}>
      <Navbar />
      <div className={styles.hero}>
        <span className={styles.heroBadge}>CHRONICLES</span>
        <h1 className={styles.title}>타임라인</h1>
      </div>
      <Timeline />
      <Footer />
    </div>
  )
}
