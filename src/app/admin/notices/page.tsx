'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Megaphone, Plus, X, Save, Pin } from 'lucide-react'
import { DataTable, Column } from '@/components/admin'
import { RichEditor } from '@/components/ui'
import { useAdminCRUD, useAlert, useImageUpload } from '@/lib/hooks'
import styles from '../shared.module.css'

interface Notice {
  id: number
  title: string
  content: string
  category: 'official' | 'excel' | 'crew'
  isPinned: boolean
  createdAt: string
}

export default function NoticesPage() {
  const alertHandler = useAlert()

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
  } = useAdminCRUD<Notice>({
    tableName: 'notices',
    defaultItem: {
      title: '',
      content: '',
      category: 'official',
      isPinned: false,
    },
    orderBy: { column: 'created_at', ascending: false },
    fromDbFormat: (row) => ({
      id: row.id as number,
      title: row.title as string,
      content: (row.content as string) || '',
      category: row.category as 'official' | 'excel' | 'crew',
      isPinned: row.is_pinned as boolean,
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
        isLoading={isLoading}
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
