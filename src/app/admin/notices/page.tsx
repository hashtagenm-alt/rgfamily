'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Megaphone, Plus, X, Save, Pin, GripVertical } from 'lucide-react'
import { DataTable, Column } from '@/components/admin'
import { RichEditor } from '@/components/ui'
import { useAdminCRUD, useAlert, useImageUpload } from '@/lib/hooks'
import { useSupabaseContext } from '@/lib/context'
import styles from '../shared.module.css'

interface Notice {
  id: number
  title: string
  content: string
  category: 'official' | 'excel' | 'crew'
  isPinned: boolean
  displayOrder: number | null
  createdAt: string
}

export default function NoticesPage() {
  const alertHandler = useAlert()
  const supabase = useSupabaseContext()
  const [isReordering, setIsReordering] = useState(false)

  // 이미지 업로드 훅
  const { uploadImage } = useImageUpload({
    folder: 'notices',
    onError: (msg) => alertHandler.showError(msg),
  })

  const {
    items: notices,
    isLoading,
    isModalOpen,
    isNew,
    editingItem: editingNotice,
    setEditingItem: setEditingNotice,
    openAddModal,
    openEditModal,
    closeModal,
    handleSave,
    handleDelete,
    refetch,
  } = useAdminCRUD<Notice>({
    tableName: 'notices',
    defaultItem: {
      title: '',
      content: '',
      category: 'official',
      isPinned: false,
      displayOrder: null,
    },
    // display_order 있는 항목 먼저, 그 다음 최신순
    orderBy: [
      { column: 'display_order', ascending: true, nullsFirst: false },
      { column: 'created_at', ascending: false },
    ],
    fromDbFormat: (row) => ({
      id: row.id as number,
      title: row.title as string,
      content: (row.content as string) || '',
      category: row.category as 'official' | 'excel' | 'crew',
      isPinned: row.is_pinned as boolean,
      displayOrder: row.display_order as number | null,
      createdAt: row.created_at as string,
    }),
    toDbFormat: (item) => ({
      title: item.title,
      content: item.content,
      category: item.category,
      is_pinned: item.isPinned,
    }),
    validate: (item) => {
      if (!item.title) return '제목을 입력해주세요.'
      return null
    },
    alertHandler,
  })

  // 드래그앤드롭 순서 변경 핸들러
  const handleReorder = async (reorderedItems: Notice[]) => {
    setIsReordering(true)
    try {
      // 순서 업데이트 (1부터 시작)
      const updates = reorderedItems.map((item, index) => ({
        id: item.id,
        display_order: index + 1,
      }))

      // 일괄 업데이트
      for (const update of updates) {
        const { error } = await supabase
          .from('notices')
          .update({ display_order: update.display_order })
          .eq('id', update.id)

        if (error) throw error
      }

      alertHandler.showSuccess('순서가 저장되었습니다.')
      refetch()
    } catch (error) {
      console.error('순서 저장 실패:', error)
      alertHandler.showError('순서 저장에 실패했습니다.')
      refetch() // 원래 순서로 복원
    } finally {
      setIsReordering(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const columns: Column<Notice>[] = [
    {
      key: 'isPinned',
      header: '',
      width: '40px',
      render: (item) =>
        item.isPinned ? <Pin size={16} style={{ color: 'var(--color-primary)' }} /> : null,
    },
    { key: 'title', header: '제목' },
    {
      key: 'createdAt',
      header: '작성일',
      width: '160px',
      render: (item) => <span style={{ whiteSpace: 'nowrap' }}>{formatDate(item.createdAt)}</span>,
    },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Megaphone size={24} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>공지사항 관리</h1>
            <p className={styles.subtitle}>공지사항 작성 및 관리</p>
          </div>
        </div>
        <button onClick={openAddModal} className={styles.addButton}>
          <Plus size={18} />
          공지 작성
        </button>
      </header>

      <DataTable
        data={notices}
        columns={columns}
        onEdit={openEditModal}
        onDelete={handleDelete}
        searchPlaceholder="제목으로 검색..."
        isLoading={isLoading || isReordering}
        draggable
        onReorder={handleReorder}
      />

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && editingNotice && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className={styles.modal}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '800px' }}
            >
              <div className={styles.modalHeader}>
                <h2>{isNew ? '공지 작성' : '공지 수정'}</h2>
                <button onClick={closeModal} className={styles.closeButton}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>제목</label>
                  <input
                    type="text"
                    value={editingNotice.title || ''}
                    onChange={(e) =>
                      setEditingNotice({ ...editingNotice, title: e.target.value })
                    }
                    className={styles.input}
                    placeholder="공지사항 제목을 입력하세요"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>내용</label>
                  <RichEditor
                    content={editingNotice.content || ''}
                    onChange={(content) =>
                      setEditingNotice({ ...editingNotice, content })
                    }
                    placeholder="공지사항 내용을 입력하세요..."
                    minHeight="250px"
                    onImageUpload={uploadImage}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={editingNotice.isPinned || false}
                      onChange={(e) =>
                        setEditingNotice({ ...editingNotice, isPinned: e.target.checked })
                      }
                      className={styles.checkbox}
                    />
                    <span>상단 고정</span>
                  </label>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button onClick={closeModal} className={styles.cancelButton}>
                  취소
                </button>
                <button onClick={handleSave} className={styles.saveButton}>
                  <Save size={16} />
                  {isNew ? '작성' : '저장'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
