'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useAuthContext } from '@/lib/context/AuthContext'
import ScheduleEditModal from './ScheduleEditModal'
import type { Schedule } from '@/types/database'
import styles from './AdminScheduleOverlay.module.css'

interface AdminScheduleOverlayProps {
  selectedDate: Date | null
  onEventCreated: () => void
  onEventUpdated: () => void
  onEventDeleted: () => void
}

export default function AdminScheduleOverlay({
  selectedDate,
  onEventCreated,
  onEventUpdated,
  onEventDeleted,
}: AdminScheduleOverlayProps) {
  const { isAdmin } = useAuthContext()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Schedule | null>(null)

  // 관리자 아니면 렌더링 안 함
  if (!isAdmin()) return null

  const handleAddClick = () => {
    setEditingEvent(null)
    setIsModalOpen(true)
  }

  const handleEditEvent = (event: Schedule) => {
    setEditingEvent(event)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingEvent(null)
  }

  const handleSaved = () => {
    setIsModalOpen(false)
    setEditingEvent(null)
    if (editingEvent) {
      onEventUpdated()
    } else {
      onEventCreated()
    }
  }

  const handleDeleted = () => {
    setIsModalOpen(false)
    setEditingEvent(null)
    onEventDeleted()
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
        title="일정 추가"
      >
        <Plus size={24} />
      </motion.button>

      {/* 편집 모달 */}
      <ScheduleEditModal
        isOpen={isModalOpen}
        event={editingEvent}
        defaultDate={selectedDate}
        onClose={handleModalClose}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </>
  )
}

// Event Detail Modal에서 수정 버튼 클릭 시 사용할 훅
export function useAdminScheduleEdit() {
  const { isAdmin } = useAuthContext()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Schedule | null>(null)

  const openEditModal = (event: Schedule) => {
    if (!isAdmin()) return
    setEditingEvent(event)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingEvent(null)
  }

  return {
    isAdmin: isAdmin(),
    isModalOpen,
    editingEvent,
    openEditModal,
    closeModal,
    setIsModalOpen,
    setEditingEvent,
  }
}
