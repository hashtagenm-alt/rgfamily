'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  X,
  Save,
  Crown,
  Shield,
  Radio,
  UserCheck,
  ArrowUpDown,
  Search,
  Filter
} from 'lucide-react'
import { DataTable, Column } from '@/components/admin'
import { useAdminCRUD, useAlert } from '@/lib/hooks'
import { useSupabaseContext } from '@/lib/context'
import { formatAmount } from '@/lib/utils/format'
import styles from '../shared.module.css'

interface Member {
  id: string
  nickname: string
  email: string
  role: 'member' | 'vip' | 'bj' | 'moderator' | 'admin' | 'superadmin'
  unit: 'excel' | 'crew' | null
  totalDonation: number
  createdAt: string
}

type RoleFilter = 'all' | 'admin' | 'vip' | 'bj' | 'member'
type SortOption = 'created_at' | 'total_donation' | 'nickname'

const ROLE_LABELS: Record<string, string> = {
  superadmin: '최고관리자',
  admin: '관리자',
  moderator: '운영자',
  vip: 'VIP',
  bj: 'BJ',
  member: '회원',
}

const formatShortDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function MembersPage() {
  const supabase = useSupabaseContext()
  const alertHandler = useAlert()
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('created_at')
  const [isQuickChanging, setIsQuickChanging] = useState<string | null>(null)

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
    refetch,
  } = useAdminCRUD<Member>({
    tableName: 'profiles',
    defaultItem: {},
    orderBy: { column: sortBy, ascending: sortBy === 'nickname' },
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

  // 통계 계산
  const stats = useMemo(() => {
    const adminCount = members.filter(m => ['superadmin', 'admin', 'moderator'].includes(m.role)).length
    const vipCount = members.filter(m => m.role === 'vip').length
    const bjCount = members.filter(m => m.role === 'bj').length
    const memberCount = members.filter(m => m.role === 'member').length
    return { total: members.length, admin: adminCount, vip: vipCount, bj: bjCount, member: memberCount }
  }, [members])

  // 필터링된 멤버
  const filteredMembers = useMemo(() => {
    if (roleFilter === 'all') return members
    if (roleFilter === 'admin') return members.filter(m => ['superadmin', 'admin', 'moderator'].includes(m.role))
    return members.filter(m => m.role === roleFilter)
  }, [members, roleFilter])

  // 빠른 역할 변경
  const handleQuickRoleChange = useCallback(async (memberId: string, newRole: Member['role']) => {
    setIsQuickChanging(memberId)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error
      alertHandler.showSuccess(`역할이 ${ROLE_LABELS[newRole]}(으)로 변경되었습니다`)
      refetch()
    } catch (err) {
      alertHandler.showError('역할 변경에 실패했습니다')
    } finally {
      setIsQuickChanging(null)
    }
  }, [supabase, alertHandler, refetch])

  const getRoleBadge = (role: string) => {
    const roleStyles: Record<string, string> = {
      superadmin: styles.badgeSuperadmin,
      admin: styles.badgeAdmin,
      moderator: styles.badgeModerator,
      vip: styles.badgeVip,
      bj: styles.badgeBj,
      member: styles.badgeMember,
    }
    return (
      <span className={`${styles.badge} ${roleStyles[role] || ''}`}>
        {ROLE_LABELS[role] || role}
      </span>
    )
  }

  const getUnitBadge = (unit: 'excel' | 'crew' | null) => {
    if (!unit) return <span className={styles.badge}>-</span>
    return (
      <span className={`${styles.badge} ${unit === 'excel' ? styles.badgeExcel : styles.badgeCrew}`}>
        {unit === 'excel' ? '엑셀부' : '크루부'}
      </span>
    )
  }

  const columns: Column<Member>[] = [
    { key: 'nickname', header: '닉네임', width: '140px', sortable: true },
    { key: 'email', header: '이메일', sortable: true },
    {
      key: 'role',
      header: '역할',
      width: '150px',
      render: (item) => (
        <select
          value={item.role}
          onChange={(e) => handleQuickRoleChange(item.id, e.target.value as Member['role'])}
          disabled={isQuickChanging === item.id}
          className={styles.inlineSelect}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '0.8125rem',
            cursor: 'pointer',
            color: 'var(--text-primary)',
          }}
        >
          <option value="member">회원</option>
          <option value="vip">VIP</option>
          <option value="bj">BJ</option>
          <option value="moderator">운영자</option>
          <option value="admin">관리자</option>
          <option value="superadmin">최고관리자</option>
        </select>
      ),
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
      sortable: true,
      render: (item) => (
        <span className={styles.amountCell}>{formatAmount(item.totalDonation, '하트')}</span>
      ),
    },
    {
      key: 'createdAt',
      header: '가입일',
      width: '130px',
      sortable: true,
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
            <p className={styles.subtitle}>RG 패밀리 회원 목록 및 권한 관리</p>
          </div>
        </div>

        {/* 정렬 옵션 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowUpDown size={16} style={{ color: 'var(--text-tertiary)' }} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className={styles.select}
            style={{ width: 'auto', padding: '0.5rem 1rem' }}
          >
            <option value="created_at">가입일순</option>
            <option value="total_donation">후원순</option>
            <option value="nickname">이름순</option>
          </select>
        </div>
      </header>

      {/* 통계 카드 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div
          onClick={() => setRoleFilter('all')}
          style={{
            background: roleFilter === 'all' ? 'var(--primary)' : 'var(--card-bg)',
            border: `1px solid ${roleFilter === 'all' ? 'var(--primary)' : 'var(--card-border)'}`,
            borderRadius: '12px',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Users size={18} style={{ color: roleFilter === 'all' ? 'white' : 'var(--text-tertiary)' }} />
            <span style={{ fontSize: '0.8125rem', color: roleFilter === 'all' ? 'white' : 'var(--text-tertiary)' }}>전체</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: roleFilter === 'all' ? 'white' : 'var(--text-primary)' }}>
            {stats.total}
          </div>
        </div>

        <div
          onClick={() => setRoleFilter('admin')}
          style={{
            background: roleFilter === 'admin' ? 'var(--primary)' : 'var(--card-bg)',
            border: `1px solid ${roleFilter === 'admin' ? 'var(--primary)' : 'var(--card-border)'}`,
            borderRadius: '12px',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Shield size={18} style={{ color: roleFilter === 'admin' ? 'white' : 'var(--primary)' }} />
            <span style={{ fontSize: '0.8125rem', color: roleFilter === 'admin' ? 'white' : 'var(--text-tertiary)' }}>관리자</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: roleFilter === 'admin' ? 'white' : 'var(--text-primary)' }}>
            {stats.admin}
          </div>
        </div>

        <div
          onClick={() => setRoleFilter('vip')}
          style={{
            background: roleFilter === 'vip' ? 'var(--metallic-gold)' : 'var(--card-bg)',
            border: `1px solid ${roleFilter === 'vip' ? 'var(--metallic-gold)' : 'var(--card-border)'}`,
            borderRadius: '12px',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Crown size={18} style={{ color: roleFilter === 'vip' ? 'white' : 'var(--metallic-gold)' }} />
            <span style={{ fontSize: '0.8125rem', color: roleFilter === 'vip' ? 'white' : 'var(--text-tertiary)' }}>VIP</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: roleFilter === 'vip' ? 'white' : 'var(--text-primary)' }}>
            {stats.vip}
          </div>
        </div>

        <div
          onClick={() => setRoleFilter('bj')}
          style={{
            background: roleFilter === 'bj' ? 'var(--live-color)' : 'var(--card-bg)',
            border: `1px solid ${roleFilter === 'bj' ? 'var(--live-color)' : 'var(--card-border)'}`,
            borderRadius: '12px',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Radio size={18} style={{ color: roleFilter === 'bj' ? 'white' : 'var(--live-color)' }} />
            <span style={{ fontSize: '0.8125rem', color: roleFilter === 'bj' ? 'white' : 'var(--text-tertiary)' }}>BJ</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: roleFilter === 'bj' ? 'white' : 'var(--text-primary)' }}>
            {stats.bj}
          </div>
        </div>

        <div
          onClick={() => setRoleFilter('member')}
          style={{
            background: roleFilter === 'member' ? 'var(--surface)' : 'var(--card-bg)',
            border: `1px solid ${roleFilter === 'member' ? 'var(--text-tertiary)' : 'var(--card-border)'}`,
            borderRadius: '12px',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <UserCheck size={18} style={{ color: 'var(--text-tertiary)' }} />
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>일반회원</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {stats.member}
          </div>
        </div>
      </div>

      <DataTable
        data={filteredMembers}
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
                <h2>회원 정보 수정</h2>
                <button onClick={closeModal} className={styles.closeButton}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>
                {/* 회원 정보 요약 */}
                <div style={{
                  background: 'var(--surface)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>이메일</span>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{editingMember.email || '-'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>총 후원</span>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {formatAmount(editingMember.totalDonation || 0, '하트')}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>가입일</span>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      {editingMember.createdAt ? formatShortDate(editingMember.createdAt) : '-'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>현재 역할</span>
                    <div>{getRoleBadge(editingMember.role || 'member')}</div>
                  </div>
                </div>

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

                <div className={styles.formRow} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                      <option value="bj">BJ</option>
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

                {/* 역할 설명 */}
                <div style={{
                  background: 'var(--surface)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginTop: '0.5rem',
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>
                    역할별 권한 안내
                  </div>
                  <div style={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
                    <div><strong>최고관리자</strong>: 모든 권한 + 권한 관리</div>
                    <div><strong>관리자</strong>: 어드민 대부분 기능</div>
                    <div><strong>운영자</strong>: 배너, 공지, 일정, 게시글</div>
                    <div><strong>VIP</strong>: VIP 전용 페이지 접근</div>
                    <div><strong>BJ</strong>: BJ 전용 기능</div>
                    <div><strong>회원</strong>: 기본 접근</div>
                  </div>
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
