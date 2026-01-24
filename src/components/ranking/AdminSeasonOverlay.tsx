'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Pencil } from 'lucide-react'
import { useAuthContext } from '@/lib/context/AuthContext'
import SeasonEditModal from './SeasonEditModal'
import type { Season } from '@/types/database'
import styles from './AdminSeasonOverlay.module.css'

interface AdminSeasonOverlayProps {
  onSeasonCreated: () => void
  onSeasonUpdated: () => void
  onSeasonDeleted: () => void
}

export default function AdminSeasonOverlay({
  onSeasonCreated,
  onSeasonUpdated,
  onSeasonDeleted,
}: AdminSeasonOverlayProps) {
  const { isAdmin } = useAuthContext()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSeason, setEditingSeason] = useState<Season | null>(null)

  // 관리자 아니면 렌더링 안 함
  if (!isAdmin()) return null

  const handleAddClick = () => {
    setEditingSeason(null)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingSeason(null)
  }

  const handleSaved = () => {
    setIsModalOpen(false)
    if (editingSeason) {
      onSeasonUpdated()
    } else {
      onSeasonCreated()
    }
    setEditingSeason(null)
  }

  const handleDeleted = () => {
    setIsModalOpen(false)
    setEditingSeason(null)
    onSeasonDeleted()
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
        title="시즌 추가"
      >
        <Plus size={24} />
      </motion.button>

      {/* 편집 모달 */}
      <SeasonEditModal
        isOpen={isModalOpen}
        season={editingSeason}
        onClose={handleModalClose}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </>
  )
}

// 시즌 카드 편집 버튼용 훅
export function useAdminSeasonEdit() {
  const { isAdmin } = useAuthContext()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSeason, setEditingSeason] = useState<Season | null>(null)

  const openEditModal = (season: Season) => {
    if (!isAdmin()) return
    setEditingSeason(season)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingSeason(null)
  }

  return {
    isAdmin: isAdmin(),
    isModalOpen,
    editingSeason,
    openEditModal,
    closeModal,
    setIsModalOpen,
    setEditingSeason,
  }
}

// 인라인 편집 버튼 컴포넌트
interface SeasonEditButtonProps {
  season: Season
  onEdit: (season: Season) => void
  className?: string
}

export function SeasonEditButton({ season, onEdit, className }: SeasonEditButtonProps) {
  const { isAdmin } = useAuthContext()

  if (!isAdmin()) return null

  return (
    <button
      className={`${styles.editBtn} ${className || ''}`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onEdit(season)
      }}
      title="수정"
    >
      <Pencil size={14} />
    </button>
  )
}
