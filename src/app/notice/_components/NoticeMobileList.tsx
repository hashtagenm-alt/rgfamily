import Link from 'next/link'
import Image from 'next/image'
import { Pin, Eye } from 'lucide-react'
import { formatShortDate } from '@/lib/utils/format'
import { isNew } from './types'
import type { NoticeItem } from './types'
import styles from '../page.module.css'

interface NoticeMobileListProps {
  pinnedNotices: NoticeItem[]
  normalNotices: NoticeItem[]
}

function MobileCard({ notice, isPinned }: { notice: NoticeItem; isPinned: boolean }) {
  return (
    <Link
      href={`/notice/${notice.id}`}
      className={`${styles.mobileCard} ${isPinned ? styles.mobilePinned : ''}`}
    >
      <div className={styles.mobileCardContent}>
        {notice.thumbnailUrl && (
          <div className={styles.mobileThumbnail}>
            <Image
              src={notice.thumbnailUrl}
              alt=""
              fill
              sizes="60px"
              className={styles.thumbnail}
            />
          </div>
        )}
        <div className={styles.mobileCardInfo}>
          <div className={styles.mobileHeader}>
            {isPinned && (
              <span className={styles.mobilePinnedBadge}>
                <Pin size={10} /> 공지
              </span>
            )}
            <span className={styles.mobileCategoryBadge}>{notice.category}</span>
            {isNew(notice.createdAt) && <span className={styles.newBadge}>N</span>}
            {isPinned && notice.isImportant && <span className={styles.importantBadge}>중요</span>}
          </div>
          <h3 className={styles.mobileTitle}>{notice.title}</h3>
          <div className={styles.mobileMeta}>
            <span>{notice.author}</span>
            <span className={styles.mobileDivider}>·</span>
            <span>{formatShortDate(notice.createdAt)}</span>
            <span className={styles.mobileDivider}>·</span>
            <span className={styles.mobileViews}>
              <Eye size={12} /> {notice.viewCount}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function NoticeMobileList({ pinnedNotices, normalNotices }: NoticeMobileListProps) {
  return (
    <div className={styles.mobileList}>
      {pinnedNotices.map((notice) => (
        <MobileCard key={notice.id} notice={notice} isPinned />
      ))}
      {normalNotices.map((notice) => (
        <MobileCard key={notice.id} notice={notice} isPinned={false} />
      ))}
    </div>
  )
}
