'use client'

/**
 * 타임라인 관리자 오버레이
 *
 * 관리자일 때 타임라인 이벤트 추가/편집 기능 제공
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useAuthContext } from '@/lib/context/AuthContext'
import TimelineEditModal from './TimelineEditModal'
import type { TimelineEvent } from '@/types/database'
import styles from './AdminTimelineOverlay.module.css'

interface AdminTimelineOverlayProps {
  onEventsChanged: () => void
}

export default function AdminTimelineOverlay({
  onEventsChanged,
}: AdminTimelineOverlayProps) {
  const { isAdmin } = useAuthContext()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null)

  // 관리자 아니면 렌더링 안 함
  if (!isAdmin()) return null

  const handleAddClick = () => {
    setEditingEvent(null)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingEvent(null)
  }

  const handleSaved = () => {
    setIsModalOpen(false)
    setEditingEvent(null)
    onEventsChanged()
  }

  const handleDeleted = () => {
    setIsModalOpen(false)
    setEditingEvent(null)
    onEventsChanged()
  }

  return (
    <>
      {/* 플로팅 추가 버튼 */}
      <motion.button
        className={styles.floatingAddBtn}
        onClick={handleAddClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        title="이벤트 추가"
      >
        <Plus size={24} />
      </motion.button>

      {/* 편집 모달 */}
      <TimelineEditModal
        isOpen={isModalOpen}
        event={editingEvent}
        onClose={handleModalClose}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </>
  )
}

/**
 * 타임라인 이벤트 관리자 편집 훅
 */
export function useAdminTimelineEdit(onEventsChanged: () => void) {
  const { isAdmin } = useAuthContext()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null)

  const openEditModal = (event: TimelineEvent) => {
    if (!isAdmin()) return
    setEditingEvent(event)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingEvent(null)
  }

  const handleSaved = () => {
    setIsModalOpen(false)
    setEditingEvent(null)
    onEventsChanged()
  }

  const handleDeleted = () => {
    setIsModalOpen(false)
    setEditingEvent(null)
    onEventsChanged()
  }

  return {
    isAdmin: isAdmin(),
    isModalOpen,
    editingEvent,
    openEditModal,
    closeModal,
    handleSaved,
    handleDeleted,
  }
}
