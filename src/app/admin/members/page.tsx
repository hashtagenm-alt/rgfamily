'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Users, X, Save } from 'lucide-react'
import { DataTable, Column } from '@/components/admin'
import { useAdminCRUD, useAlert } from '@/lib/hooks'
import { formatAmount } from '@/lib/utils/format'
import styles from '../shared.module.css'

interface Member {
  id: string
  nickname: string
  email: string
  role: 'member' | 'vip' | 'moderator' | 'admin' | 'superadmin'
  unit: 'excel' | 'crew' | null
  totalDonation: number
  createdAt: string
}

const formatShortDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function MembersPage() {
  const alertHandler = useAlert()

  const {
    items: members,
    isLoading,
    isModalOpen,
    editingItem: editingMember,
    setEditingItem: setEditingMember,
    openEditModal,
    closeModal,
    handleSave,
    handleDelete,
  } = useAdminCRUD<Member>({
    tableName: 'profiles',
    defaultItem: {},
    orderBy: { column: 'created_at', ascending: false },
    fromDbFormat: (row) => ({
      id: row.id as string,
      nickname: row.nickname as string,
      email: (row.email as string) || '',
      role: row.role as Member['role'],
      unit: row.unit as Member['unit'],
      totalDonation: row.total_donation as number,
      createdAt: row.created_at as string,
    }),
    toDbFormat: (item) => ({
      nickname: item.nickname,
      role: item.role,
      unit: item.unit,
    }),
    alertHandler,
  })

  const getRoleBadge = (role: string) => {
    const roleStyles: Record<string, string> = {
      superadmin: styles.badgeSuperadmin,
      admin: styles.badgeAdmin,
      moderator: styles.badgeModerator,
      member: styles.badgeMember,
    }
    const roleNames: Record<string, string> = {
      superadmin: '최고관리자',
      admin: '관리자',
      moderator: '운영자',
      member: '회원',
    }
    return (
      <span className={`${styles.badge} ${roleStyles[role] || ''}`}>
        {roleNames[role] || role}
      </span>
    )
  }

  const getUnitBadge = (unit: 'excel' | 'crew' | null) => {
    return (
      <span className={`${styles.badge} ${unit === 'excel' ? styles.badgeExcel : styles.badgeCrew}`}>
        {unit === 'excel' ? '엑셀부' : unit === 'crew' ? '크루부' : '-'}
      </span>
    )
  }

  const columns: Column<Member>[] = [
    { key: 'nickname', header: '닉네임', width: '150px' },
    { key: 'email', header: '이메일' },
    {
      key: 'role',
      header: '역할',
      width: '120px',
      render: (item) => getRoleBadge(item.role),
    },
    {
      key: 'unit',
      header: '부서',
      width: '100px',
      render: (item) => getUnitBadge(item.unit),
    },
    {
      key: 'totalDonation',
      header: '총 후원',
      width: '120px',
      render: (item) => (
        <span className={styles.amountCell}>{formatAmount(item.totalDonation, '하트')}</span>
      ),
    },
    {
      key: 'createdAt',
      header: '가입일',
      width: '140px',
      render: (item) => formatShortDate(item.createdAt),
    },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Users size={24} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>회원 관리</h1>
            <p className={styles.subtitle}>RG 패밀리 회원 목록</p>
          </div>
        </div>
      </header>

      <DataTable
        data={members}
        columns={columns}
        onEdit={openEditModal}
        onDelete={handleDelete}
        searchPlaceholder="닉네임 또는 이메일로 검색..."
        isLoading={isLoading}
      />

      {/* Edit Modal */}
      <AnimatePresence>
        {isModalOpen && editingMember && (
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
                <h2>회원 수정</h2>
                <button onClick={closeModal} className={styles.closeButton}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>닉네임</label>
                  <input
                    type="text"
                    value={editingMember.nickname || ''}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, nickname: e.target.value })
                    }
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>역할</label>
                  <select
                    value={editingMember.role || 'member'}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, role: e.target.value as Member['role'] })
                    }
                    className={styles.select}
                  >
                    <option value="member">회원</option>
                    <option value="vip">VIP</option>
                    <option value="moderator">운영자</option>
                    <option value="admin">관리자</option>
                    <option value="superadmin">최고관리자</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>부서</label>
                  <select
                    value={editingMember.unit || ''}
                    onChange={(e) =>
                      setEditingMember({
                        ...editingMember,
                        unit: e.target.value === '' ? null : (e.target.value as 'excel' | 'crew'),
                      })
                    }
                    className={styles.select}
                  >
                    <option value="">미지정</option>
                    <option value="excel">엑셀부</option>
                    <option value="crew">크루부</option>
                  </select>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button onClick={closeModal} className={styles.cancelButton}>
                  취소
                </button>
                <button onClick={handleSave} className={styles.saveButton}>
                  <Save size={16} />
                  저장
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
