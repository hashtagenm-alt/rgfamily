import { Bell } from 'lucide-react'
import styles from '../page.module.css'

export default function NoticeHero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <div className={styles.heroIcon}>
          <Bell size={32} />
        </div>
        <h1 className={styles.title}>공지사항</h1>
        <p className={styles.subtitle}>RG FAMILY 공식 공지 및 소식</p>
      </div>
    </section>
  )
}
