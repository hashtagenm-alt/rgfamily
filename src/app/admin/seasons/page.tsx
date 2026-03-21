'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Plus, X, Save } from 'lucide-react'
import { DataTable, Column } from '@/components/admin'
import { useAdminCRUD, useAlert } from '@/lib/hooks'
import { deactivateOtherSeasons } from '@/lib/actions/seasons'
import styles from '../shared.module.css'

interface Season {
  id: number
  name: string
  startDate: string
  endDate: string | null
  isActive: boolean
  createdAt: string
}

export default function SeasonsPage() {
  const alertHandler = useAlert()

  const {
    items: seasons,
    isLoading,
    isModalOpen,
    isNew,
    editingItem: editingSeason,
    setEditingItem: setEditingSeason,
    openAddModal,
    openEditModal,
    closeModal,
    handleSave,
    handleDelete,
  } = useAdminCRUD<Season>({
    tableName: 'seasons',
    defaultItem: {
      name: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      isActive: false,
    },
    orderBy: { column: 'start_date', ascending: false },
    fromDbFormat: (row) => ({
      id: row.id as number,
      name: row.name as string,
      startDate: row.start_date as string,
      endDate: row.end_date as string | null,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as string,
    }),
    toDbFormat: (item) => ({
      name: item.name,
      start_date: item.startDate,
      end_date: item.endDate,
      is_active: item.isActive,
    }),
    validate: (item) => {
      if (!item.name) return '시즌 이름을 입력해주세요.'
      return null
    },
    beforeSave: async (item, _isNew) => {
      // 활성화 시 다른 시즌 비활성화
      if (item.isActive) {
        const result = await deactivateOtherSeasons(item.id || 0)
        if (result.error) throw new Error(result.error)
      }
    },
    deleteConfirmMessage: '정말 삭제하시겠습니까?\n\n관련된 모든 데이터가 함께 삭제됩니다.',
    alertHandler,
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const columns: Column<Season>[] = [
    { key: 'name', header: '시즌명', width: '200px' },
    {
      key: 'startDate',
      header: '시작일',
      width: '160px',
      render: (item) => <span style={{ whiteSpace: 'nowrap' }}>{formatDate(item.startDate)}</span>,
    },
    {
      key: 'endDate',
      header: '종료일',
      width: '160px',
      render: (item) => <span style={{ whiteSpace: 'nowrap' }}>{item.endDate ? formatDate(item.endDate) : '-'}</span>,
    },
    {
      key: 'isActive',
      header: '상태',
      width: '100px',
      render: (item) => (
        <span className={`${styles.statusBadge} ${item.isActive ? styles.active : styles.inactive}`}>
          {item.isActive ? '진행중' : '종료'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: '생성일',
      width: '160px',
      render: (item) => <span style={{ whiteSpace: 'nowrap' }}>{formatDate(item.createdAt)}</span>,
    },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Calendar size={24} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>시즌 관리</h1>
            <p className={styles.subtitle}>후원 시즌 관리</p>
          </div>
        </div>
        <button onClick={openAddModal} className={styles.addButton}>
          <Plus size={18} />
          시즌 추가
        </button>
      </header>

      <DataTable
        data={seasons}
        columns={columns}
        onEdit={openEditModal}
        onDelete={handleDelete}
        searchPlaceholder="시즌명으로 검색..."
        isLoading={isLoading}
      />

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && editingSeason && (
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
            >
              <div className={styles.modalHeader}>
                <h2>{isNew ? '시즌 추가' : '시즌 수정'}</h2>
                <button onClick={closeModal} className={styles.closeButton}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>시즌명</label>
                  <input
                    type="text"
                    value={editingSeason.name || ''}
                    onChange={(e) =>
                      setEditingSeason({ ...editingSeason, name: e.target.value })
                    }
                    className={styles.input}
                    placeholder="예: 2024년 1분기"
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>시작일</label>
                    <input
                      type="date"
                      value={editingSeason.startDate || ''}
                      onChange={(e) =>
                        setEditingSeason({ ...editingSeason, startDate: e.target.value })
                      }
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>종료일</label>
                    <input
                      type="date"
                      value={editingSeason.endDate || ''}
                      onChange={(e) =>
                        setEditingSeason({ ...editingSeason, endDate: e.target.value || null })
                      }
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={editingSeason.isActive || false}
                      onChange={(e) =>
                        setEditingSeason({ ...editingSeason, isActive: e.target.checked })
                      }
                      className={styles.checkbox}
                    />
                    <span>활성 시즌으로 설정</span>
                  </label>
                  <p className={styles.hint}>활성화 시 다른 시즌은 자동으로 비활성화됩니다.</p>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button onClick={closeModal} className={styles.cancelButton}>
                  취소
                </button>
                <button onClick={handleSave} className={styles.saveButton}>
                  <Save size={16} />
                  {isNew ? '추가' : '저장'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
