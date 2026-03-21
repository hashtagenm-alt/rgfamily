import Link from 'next/link'
import Image from 'next/image'
import { Pin, GripVertical, ImageIcon } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import AdminNoticeActions from '@/components/notice/AdminNoticeActions'
import { formatShortDate } from '@/lib/utils/format'
import { isNew } from './types'
import type { NoticeItem } from './types'
import styles from '../page.module.css'

interface SortableNoticeRowProps {
  notice: NoticeItem
  index: number
  showDragHandle: boolean
  fetchNotices: () => void
}

export default function SortableNoticeRow({
  notice,
  index,
  showDragHandle,
  fetchNotices,
}: SortableNoticeRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: notice.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.row} ${notice.isPinned ? styles.pinned : ''}`}
    >
      {/* 드래그 핸들 (관리자만) */}
      {showDragHandle && (
        <div
          className={styles.dragHandle}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </div>
      )}

      {/* Number / Badge */}
      <div className={styles.cellNumber}>
        {notice.isPinned ? (
          <span className={styles.pinnedBadge}>
            <Pin size={12} />
            공지
          </span>
        ) : (
          index + 1
        )}
      </div>

      {/* Thumbnail */}
      <Link href={`/notice/${notice.id}`} className={styles.cellThumbnail}>
        {notice.thumbnailUrl ? (
          <div className={styles.thumbnailWrapper}>
            <Image
              src={notice.thumbnailUrl}
              alt=""
              fill
              sizes="40px"
              className={styles.thumbnail}
            />
          </div>
        ) : (
          <div className={styles.thumbnailPlaceholder}>
            <ImageIcon size={14} />
          </div>
        )}
      </Link>

      {/* Category */}
      <Link href={`/notice/${notice.id}`} className={styles.cellCategory}>
        <span className={`${styles.categoryBadge} ${notice.isImportant ? styles.important : ''}`}>
          {notice.category}
        </span>
      </Link>

      {/* Title */}
      <Link href={`/notice/${notice.id}`} className={styles.cellTitle}>
        <h3 className={styles.postTitle}>{notice.title}</h3>
        {isNew(notice.createdAt) && (
          <span className={styles.newBadge}>N</span>
        )}
        {notice.isImportant && (
          <span className={styles.importantBadge}>중요</span>
        )}
      </Link>

      {/* Admin Actions */}
      <AdminNoticeActions
        noticeId={notice.id}
        isPinned={notice.isPinned}
        onUpdated={fetchNotices}
      />

      {/* Author */}
      <span className={styles.cellAuthor}>{notice.author}</span>

      {/* Date */}
      <span className={styles.cellDate}>
        {formatShortDate(notice.createdAt)}
      </span>

      {/* Views */}
      <span className={styles.cellViews}>
        {notice.viewCount.toLocaleString()}
      </span>
    </div>
  )
}
