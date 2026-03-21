import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import SortableNoticeRow from './SortableNoticeRow'
import type { NoticeItem } from './types'
import styles from '../page.module.css'

interface NoticeBoardProps {
  notices: NoticeItem[]
  isReordering: boolean
  showDragHandle: boolean
  fetchNotices: () => void
  onDragEnd: (event: DragEndEvent) => void
}

export default function NoticeBoard({
  notices,
  isReordering,
  showDragHandle,
  fetchNotices,
  onDragEnd,
}: NoticeBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <div className={`${styles.board} ${isReordering ? styles.reordering : ''}`}>
        {/* Table Header */}
        <div className={styles.tableHeader}>
          {showDragHandle && <span className={styles.colDrag}></span>}
          <span className={styles.colNumber}>번호</span>
          <span className={styles.colThumbnail}></span>
          <span className={styles.colCategory}>분류</span>
          <span className={styles.colTitle}>제목</span>
          <span className={styles.colAuthor}>작성자</span>
          <span className={styles.colDate}>작성일</span>
          <span className={styles.colViews}>조회</span>
        </div>

        <SortableContext
          items={notices.map(n => n.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={styles.tableBody}>
            {notices.map((notice, index) => (
              <SortableNoticeRow
                key={notice.id}
                notice={notice}
                index={index}
                showDragHandle={showDragHandle}
                fetchNotices={fetchNotices}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </DndContext>
  )
}
