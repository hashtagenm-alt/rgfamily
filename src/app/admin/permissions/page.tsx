'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Shield,
  Search,
  User,
  Crown,
  Users,
  Lock,
  CheckCircle,
  XCircle,
  Loader2,
  Edit,
  Save,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import DataTable, { type Column } from '@/components/admin/DataTable'
import { useSupabaseContext, useAuthContext } from '@/lib/context'
import styles from './page.module.css'
import sharedStyles from '../shared.module.css'

interface UserPermission {
  id: string
  nickname: string
  email: string | null
  role: string
  is_secret_page_allowed: boolean
  total_donation: number
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: '최고 관리자',
  admin: '관리자',
  moderator: '운영진',
  bj: 'BJ',
  vip: 'VIP',
  member: '일반 회원',
}

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'var(--color-error)',
  admin: 'var(--color-primary)',
  moderator: 'var(--color-info)',
  bj: 'var(--live-color)',
  vip: 'var(--metallic-gold)',
  member: 'var(--text-muted)',
}

export default function AdminPermissionsPage() {
  const supabase = useSupabaseContext()
  const { profile: currentProfile } = useAuthContext()
  const [users, setUsers] = useState<UserPermission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [editingUser, setEditingUser] = useState<UserPermission | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [isSecretPageAllowed, setIsSecretPageAllowed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 데이터 로드
  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, nickname, email, role, total_donation')
        .order('total_donation', { ascending: false })

      if (fetchError) throw fetchError

      const usersData: UserPermission[] = (data || []).map((p) => ({
        id: p.id,
        nickname: p.nickname,
        email: p.email || null,
        role: p.role || 'member',
        is_secret_page_allowed: (p.role === 'vip' && p.total_donation >= 5000000) || ['admin', 'superadmin'].includes(p.role),
        total_donation: p.total_donation || 0,
      }))
      setUsers(usersData)
    } catch (err) {
      console.error('회원 로드 실패:', err)
      setError('회원 정보를 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  const filteredUsers = useMemo(() => {
    let filtered = users

    if (filterRole !== 'all') {
      filtered = filtered.filter((user) => user.role === filterRole)
    }

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (user) =>
          user.nickname?.toLowerCase().includes(lowerCaseSearchTerm) ||
          user.email?.toLowerCase().includes(lowerCaseSearchTerm)
      )
    }
    return filtered
  }, [users, filterRole, searchTerm])

  const handleEditClick = (user: UserPermission) => {
    setEditingUser(user)
    setSelectedRole(user.role)
    setIsSecretPageAllowed(user.is_secret_page_allowed)
  }

  const handleSave = async () => {
    if (!editingUser) return
    setIsSaving(true)

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: selectedRole })
        .eq('id', editingUser.id)

      if (updateError) throw updateError

      // 로컬 상태 업데이트
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, role: selectedRole, is_secret_page_allowed: isSecretPageAllowed }
            : u
        )
      )
      setEditingUser(null)
    } catch (err) {
      console.error('권한 업데이트 실패:', err)
      alert('권한 업데이트에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const columns: Column<UserPermission>[] = useMemo(
    () => [
      {
        key: 'nickname',
        header: '닉네임',
        sortable: true,
        render: (user) => (
          <div className={styles.userCell}>
            <div className={styles.avatarPlaceholder}>
              <User size={16} />
            </div>
            <span>{user.nickname || 'N/A'}</span>
          </div>
        ),
      },
      {
        key: 'email',
        header: '이메일',
        sortable: true,
        render: (user) => (
          <span className={sharedStyles.messageCell}>{user.email || '-'}</span>
        ),
      },
      {
        key: 'role',
        header: '역할',
        sortable: true,
        render: (user) => (
          <span
            className={sharedStyles.badge}
            style={{
              backgroundColor: (ROLE_COLORS[user.role] || 'var(--text-muted)') + '20',
              color: ROLE_COLORS[user.role] || 'var(--text-muted)',
            }}
          >
            {ROLE_LABELS[user.role] || user.role}
          </span>
        ),
      },
      {
        key: 'is_secret_page_allowed',
        header: 'Secret Page',
        sortable: false,
        render: (user) =>
          user.is_secret_page_allowed ? (
            <CheckCircle size={18} className={styles.successIcon} />
          ) : (
            <XCircle size={18} className={styles.dangerIcon} />
          ),
      },
      {
        key: 'total_donation',
        header: '총 후원',
        sortable: true,
        render: (user) => (
          <span>{user.total_donation.toLocaleString()} ♥</span>
        ),
      },
      {
        key: 'actions',
        header: '관리',
        sortable: false,
        render: (user) => (
          <button
            className={sharedStyles.addButton}
            onClick={() => handleEditClick(user)}
            disabled={
              currentProfile?.role !== 'superadmin' &&
              user.role === 'superadmin'
            }
          >
            <Edit size={16} />
            <span>수정</span>
          </button>
        ),
      },
    ],
    [currentProfile?.role]
  )

  // 통계
  const totalUsers = users.length
  const superadmins = users.filter((u) => u.role === 'superadmin').length
  const admins = users.filter((u) => u.role === 'admin').length
  const moderators = users.filter((u) => u.role === 'moderator').length
  const bjs = users.filter((u) => u.role === 'bj').length
  const vips = users.filter((u) => u.role === 'vip').length
  const regularUsers = users.filter((u) => u.role === 'member').length
  const secretPageUsers = users.filter((u) => u.is_secret_page_allowed).length

  return (
    <div className={sharedStyles.page}>
      <div className={sharedStyles.header}>
        <div className={sharedStyles.headerLeft}>
          <Shield size={24} className={sharedStyles.headerIcon} />
          <div>
            <h1 className={sharedStyles.title}>권한 관리</h1>
            <p className={sharedStyles.subtitle}>
              회원들의 역할과 접근 권한을 관리합니다.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <Users size={20} />
          <span>전체 회원</span>
          <strong>{totalUsers}</strong>
        </div>
        <div className={styles.statCard}>
          <Crown size={20} style={{ color: ROLE_COLORS.vip }} />
          <span>VIP 회원</span>
          <strong>{vips}</strong>
        </div>
        <div className={styles.statCard}>
          <Lock size={20} style={{ color: ROLE_COLORS.superadmin }} />
          <span>Secret Page 접근</span>
          <strong>{secretPageUsers}</strong>
        </div>
        <div className={styles.statCard}>
          <Shield size={20} style={{ color: ROLE_COLORS.admin }} />
          <span>관리자 계정</span>
          <strong>{superadmins + admins + moderators}</strong>
        </div>
      </div>

      {/* Filters and Search */}
      <div className={styles.filterContainer}>
        <div className={styles.roleFilters}>
          <button
            className={`${styles.filterButton} ${filterRole === 'all' ? styles.active : ''}`}
            onClick={() => setFilterRole('all')}
          >
            전체 ({totalUsers})
          </button>
          <button
            className={`${styles.filterButton} ${filterRole === 'superadmin' ? styles.active : ''}`}
            onClick={() => setFilterRole('superadmin')}
          >
            최고 관리자 ({superadmins})
          </button>
          <button
            className={`${styles.filterButton} ${filterRole === 'admin' ? styles.active : ''}`}
            onClick={() => setFilterRole('admin')}
          >
            관리자 ({admins})
          </button>
          <button
            className={`${styles.filterButton} ${filterRole === 'moderator' ? styles.active : ''}`}
            onClick={() => setFilterRole('moderator')}
          >
            운영진 ({moderators})
          </button>
          <button
            className={`${styles.filterButton} ${filterRole === 'bj' ? styles.active : ''}`}
            onClick={() => setFilterRole('bj')}
          >
            BJ ({bjs})
          </button>
          <button
            className={`${styles.filterButton} ${filterRole === 'vip' ? styles.active : ''}`}
            onClick={() => setFilterRole('vip')}
          >
            VIP ({vips})
          </button>
          <button
            className={`${styles.filterButton} ${filterRole === 'member' ? styles.active : ''}`}
            onClick={() => setFilterRole('member')}
          >
            일반 회원 ({regularUsers})
          </button>
        </div>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="닉네임 또는 이메일 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className={styles.clearSearch}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className={sharedStyles.loadingWrapper}>
          <Loader2 size={32} className={sharedStyles.spinner} />
          <span>회원 정보를 불러오는 중...</span>
        </div>
      ) : error ? (
        <div className={sharedStyles.errorWrapper}>
          <span>오류: {error}</span>
        </div>
      ) : (
        <DataTable
          data={filteredUsers}
          columns={columns}
        />
      )}

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <motion.div
            className={sharedStyles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingUser(null)}
          >
            <motion.div
              className={sharedStyles.modal}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={sharedStyles.modalHeader}>
                <h2>회원 권한 수정: {editingUser.nickname}</h2>
                <button
                  className={sharedStyles.closeButton}
                  onClick={() => setEditingUser(null)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className={sharedStyles.modalBody}>
                <div className={sharedStyles.formGroup}>
                  <label htmlFor="role">역할</label>
                  <select
                    id="role"
                    className={sharedStyles.select}
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    disabled={
                      currentProfile?.role !== 'superadmin' &&
                      editingUser.role === 'superadmin'
                    }
                  >
                    {Object.entries(ROLE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={sharedStyles.formGroup}>
                  <label className={sharedStyles.checkboxLabel}>
                    <input
                      type="checkbox"
                      className={sharedStyles.checkbox}
                      checked={isSecretPageAllowed}
                      onChange={(e) => setIsSecretPageAllowed(e.target.checked)}
                      disabled={
                        currentProfile?.role !== 'superadmin' &&
                        editingUser.role === 'superadmin'
                      }
                    />
                    Secret Page 접근 허용
                  </label>
                  <p className={sharedStyles.hint}>
                    VIP 랭킹 1~3위 또는 특정 조건의 회원에게 부여되는
                    개인 헌정 페이지 접근 권한입니다.
                  </p>
                </div>
              </div>
              <div className={sharedStyles.modalFooter}>
                <button
                  className={sharedStyles.cancelButton}
                  onClick={() => setEditingUser(null)}
                >
                  취소
                </button>
                <button
                  className={sharedStyles.saveButton}
                  onClick={handleSave}
                  disabled={
                    isSaving ||
                    (selectedRole === editingUser.role &&
                      isSecretPageAllowed === editingUser.is_secret_page_allowed) ||
                    (currentProfile?.role !== 'superadmin' &&
                      editingUser.role === 'superadmin')
                  }
                >
                  {isSaving ? <Loader2 size={16} className={sharedStyles.spinner} /> : <Save size={16} />}
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
