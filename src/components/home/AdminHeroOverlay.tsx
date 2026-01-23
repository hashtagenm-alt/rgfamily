'use client'

/**
 * Hero 배너 관리자 오버레이
 *
 * 관리자일 때 배너 추가/편집 기능 제공
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Pencil } from 'lucide-react'
import { useAuthContext } from '@/lib/context/AuthContext'
import BannerEditModal from './BannerEditModal'
import type { Banner } from '@/types/database'
import styles from './AdminHeroOverlay.module.css'

interface AdminHeroOverlayProps {
  currentBanner: Banner | null
  onBannersChanged: () => void
}

export default function AdminHeroOverlay({
  currentBanner,
  onBannersChanged,
}: AdminHeroOverlayProps) {
  const { isAdmin } = useAuthContext()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)

  // 관리자 아니면 렌더링 안 함
  if (!isAdmin()) return null

  const handleAddClick = () => {
    setEditingBanner(null)
    setIsModalOpen(true)
  }

  const handleEditClick = () => {
    if (currentBanner) {
      setEditingBanner(currentBanner)
      setIsModalOpen(true)
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingBanner(null)
  }

  const handleSaved = () => {
    setIsModalOpen(false)
    setEditingBanner(null)
    onBannersChanged()
  }

  const handleDeleted = () => {
    setIsModalOpen(false)
    setEditingBanner(null)
    onBannersChanged()
  }

  return (
    <>
      {/* 현재 배너 편집 버튼 (배너 위에 오버레이) */}
      {currentBanner && (
        <motion.button
          className={styles.editBannerBtn}
          onClick={handleEditClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          title="현재 배너 수정"
        >
          <Pencil size={16} />
          <span>수정</span>
        </motion.button>
      )}

      {/* 플로팅 추가 버튼 */}
      <motion.button
        className={styles.floatingAddBtn}
        onClick={handleAddClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        title="배너 추가"
      >
        <Plus size={24} />
      </motion.button>

      {/* 편집 모달 */}
      <BannerEditModal
        isOpen={isModalOpen}
        banner={editingBanner}
        onClose={handleModalClose}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </>
  )
}
