'use client'

/**
 * 공지사항 인라인 관리 액션
 *
 * 공지 목록에서 호버 시 표시되는 관리자 액션 버튼
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Pin, PinOff, Trash2, Loader2 } from 'lucide-react'
import { useAuthContext } from '@/lib/context/AuthContext'
import { toggleNoticePinned, deleteNotice } from '@/lib/actions/notices'
import styles from './AdminNoticeActions.module.css'

interface AdminNoticeActionsProps {
  noticeId: number
  isPinned: boolean
  onUpdated: () => void
}

export default function AdminNoticeActions({
  noticeId,
  isPinned,
  onUpdated,
}: AdminNoticeActionsProps) {
  const { isAdmin } = useAuthContext()
  const router = useRouter()
  const [isTogglingPin, setIsTogglingPin] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 관리자 아니면 렌더링 안 함
  if (!isAdmin()) return null

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    router.push(`/notice/write?id=${noticeId}`)
  }

  const handleTogglePin = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsTogglingPin(true)
    const result = await toggleNoticePinned(noticeId, !isPinned)
    setIsTogglingPin(false)

    if (result.error) {
      alert(result.error)
    } else {
      onUpdated()
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('정말 삭제하시겠습니까?\n삭제된 공지는 복구할 수 없습니다.')) {
      return
    }

    setIsDeleting(true)
    const result = await deleteNotice(noticeId)
    setIsDeleting(false)

    if (result.error) {
      alert(result.error)
    } else {
      onUpdated()
    }
  }

  return (
    <div className={styles.actions}>
      {/* 수정 */}
      <button
        type="button"
        className={styles.actionBtn}
        onClick={handleEdit}
        title="수정"
      >
        <Pencil size={14} />
      </button>

      {/* 고정/해제 */}
      <button
        type="button"
        className={`${styles.actionBtn} ${isPinned ? styles.pinned : ''}`}
        onClick={handleTogglePin}
        disabled={isTogglingPin}
        title={isPinned ? '고정 해제' : '고정'}
      >
        {isTogglingPin ? (
          <Loader2 size={14} className={styles.spinner} />
        ) : isPinned ? (
          <PinOff size={14} />
        ) : (
          <Pin size={14} />
        )}
      </button>

      {/* 삭제 */}
      <button
        type="button"
        className={`${styles.actionBtn} ${styles.danger}`}
        onClick={handleDelete}
        disabled={isDeleting}
        title="삭제"
      >
        {isDeleting ? (
          <Loader2 size={14} className={styles.spinner} />
        ) : (
          <Trash2 size={14} />
        )}
      </button>
    </div>
  )
}
