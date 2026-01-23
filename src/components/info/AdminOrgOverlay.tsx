'use client'

/**
 * 조직도 관리자 오버레이
 *
 * 관리자일 때 멤버 편집 기능 제공
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { useAuthContext } from '@/lib/context/AuthContext'
import MemberQuickEditModal from './MemberQuickEditModal'
import type { OrganizationRecord } from '@/types/organization'
import styles from './AdminOrgOverlay.module.css'

interface AdminOrgOverlayProps {
  editingMember: OrganizationRecord | null
  isModalOpen: boolean
  onModalClose: () => void
  onMembersChanged: () => void
}

export default function AdminOrgOverlay({
  editingMember,
  isModalOpen,
  onModalClose,
  onMembersChanged,
}: AdminOrgOverlayProps) {
  const { isAdmin } = useAuthContext()

  // 관리자 아니면 렌더링 안 함
  if (!isAdmin()) return null

  const handleSaved = () => {
    onModalClose()
    onMembersChanged()
  }

  const handleDeleted = () => {
    onModalClose()
    onMembersChanged()
  }

  return (
    <>
      {/* 플로팅 추가 버튼 - 관리자 페이지로 이동 */}
      <Link href="/admin/organization" className={styles.floatingAddBtn}>
        <motion.span
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className={styles.fabIcon}
        >
          <Plus size={24} />
        </motion.span>
      </Link>

      {/* 빠른 편집 모달 */}
      <MemberQuickEditModal
        isOpen={isModalOpen}
        member={editingMember}
        onClose={onModalClose}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </>
  )
}

/**
 * 멤버 카드 관리자 편집 상태 관리 훅
 */
export function useAdminOrgEdit(onMembersChanged: () => void) {
  const { isAdmin } = useAuthContext()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<OrganizationRecord | null>(null)

  const handleMemberClick = (member: OrganizationRecord | null) => {
    // 관리자이고 멤버가 있으면 편집 모달 열기
    if (isAdmin() && member) {
      setEditingMember(member)
      setIsModalOpen(true)
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingMember(null)
  }

  return {
    isAdmin: isAdmin(),
    editingMember,
    isModalOpen,
    handleMemberClick,
    handleModalClose,
  }
}
