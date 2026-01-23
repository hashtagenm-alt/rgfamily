'use client'

/**
 * 관리자 인라인 편집 상태 관리 훅
 *
 * Schedule 페이지의 useAdminScheduleEdit 패턴을 일반화
 */

import { useState, useCallback } from 'react'
import { useAuthContext } from '@/lib/context/AuthContext'

interface UseAdminInlineEditOptions<T> {
  onCreated?: () => void
  onUpdated?: () => void
  onDeleted?: () => void
}

interface UseAdminInlineEditReturn<T> {
  // 권한 체크
  isAdmin: boolean

  // 모달 상태
  isModalOpen: boolean
  editingItem: T | null
  isNew: boolean

  // 모달 제어
  openCreateModal: () => void
  openEditModal: (item: T) => void
  closeModal: () => void

  // 이벤트 핸들러
  handleSaved: () => void
  handleDeleted: () => void

  // 상태 업데이트
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  setEditingItem: React.Dispatch<React.SetStateAction<T | null>>
}

export function useAdminInlineEdit<T>(
  options: UseAdminInlineEditOptions<T> = {}
): UseAdminInlineEditReturn<T> {
  const { isAdmin: checkAdmin } = useAuthContext()
  const isAdmin = checkAdmin()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<T | null>(null)

  const openCreateModal = useCallback(() => {
    if (!isAdmin) return
    setEditingItem(null)
    setIsModalOpen(true)
  }, [isAdmin])

  const openEditModal = useCallback((item: T) => {
    if (!isAdmin) return
    setEditingItem(item)
    setIsModalOpen(true)
  }, [isAdmin])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setEditingItem(null)
  }, [])

  const handleSaved = useCallback(() => {
    setIsModalOpen(false)
    if (editingItem) {
      options.onUpdated?.()
    } else {
      options.onCreated?.()
    }
    setEditingItem(null)
  }, [editingItem, options])

  const handleDeleted = useCallback(() => {
    setIsModalOpen(false)
    setEditingItem(null)
    options.onDeleted?.()
  }, [options])

  return {
    isAdmin,
    isModalOpen,
    editingItem,
    isNew: !editingItem,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSaved,
    handleDeleted,
    setIsModalOpen,
    setEditingItem,
  }
}
