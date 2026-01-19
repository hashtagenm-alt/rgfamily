'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building, Plus, X, Save, Radio, Link as LinkIcon, User } from 'lucide-react'
import Image from 'next/image'
import { DataTable, Column, ImageUpload } from '@/components/admin'
import { useAdminCRUD, useAlert } from '@/lib/hooks'
import { useSupabaseContext } from '@/lib/context'
import styles from '../shared.module.css'

interface SocialLinks {
  pandatv?: string
  youtube?: string
  instagram?: string
}

interface ProfileInfo {
  mbti?: string
  bloodType?: string
  height?: number
  weight?: number
  birthday?: string
}

interface OrgMember {
  id: number
  profileId: string | null
  name: string
  unit: 'excel' | 'crew'
  role: string
  positionOrder: number
  parentId: number | null
  socialLinks: SocialLinks | null
  profileInfo: ProfileInfo | null
  imageUrl: string | null
  isLive: boolean
}

interface Profile {
  id: string
  nickname: string
}

export default function OrganizationPage() {
  const supabase = useSupabaseContext()
  const alertHandler = useAlert()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeUnit, setActiveUnit] = useState<'excel' | 'crew'>('excel')
  const [localMembers, setLocalMembers] = useState<OrgMember[]>([])
  const [isSavingOrder, setIsSavingOrder] = useState(false)

  // Fetch profiles for linking
  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, nickname')
      .order('nickname')
    setProfiles(data || [])
  }, [supabase])

  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  const {
    items: members,
    isLoading,
    isModalOpen,
    isNew,
    editingItem: editingMember,
    setEditingItem: setEditingMember,
    openAddModal: baseOpenAddModal,
    openEditModal,
    closeModal,
    handleSave,
    handleDelete,
    refetch,
  } = useAdminCRUD<OrgMember>({
    tableName: 'organization',
    defaultItem: {
      profileId: null,
      name: '',
      unit: activeUnit,
      role: '',
      positionOrder: 0,
      parentId: null,
      socialLinks: null,
      profileInfo: null,
      imageUrl: null,
      isLive: false,
    },
    orderBy: { column: 'position_order', ascending: true },
    fromDbFormat: (row) => ({
      id: row.id as number,
      profileId: row.profile_id as string | null,
      name: row.name as string,
      unit: row.unit as 'excel' | 'crew',
      role: row.role as string,
      positionOrder: row.position_order as number,
      parentId: row.parent_id as number | null,
      socialLinks: row.social_links as SocialLinks | null,
      profileInfo: row.profile_info as ProfileInfo | null,
      imageUrl: row.image_url as string | null,
      isLive: row.is_live as boolean,
    }),
    toDbFormat: (item) => ({
      name: item.name,
      role: item.role,
      unit: item.unit,
      profile_id: item.profileId,
      parent_id: item.parentId,
      position_order: item.positionOrder,
      social_links: item.socialLinks,
      profile_info: item.profileInfo,
      image_url: item.imageUrl,
    }),
    validate: (item) => {
      if (!item.name || !item.role) return '이름과 직책을 입력해주세요.'
      return null
    },
    beforeDelete: async (item) => {
      // 1. 자식 멤버들의 parent_id를 null로 변경 (self-referencing FK)
      const { error: parentError } = await supabase
        .from('organization')
        .update({ parent_id: null })
        .eq('parent_id', item.id)
      if (parentError) {
        throw new Error(`parent_id 업데이트 실패: ${parentError.message}`)
      }

      // 2. 연관된 live_status 레코드 삭제 (FK 제약 조건)
      const { error: liveError } = await supabase
        .from('live_status')
        .delete()
        .eq('member_id', item.id)
      if (liveError) {
        throw new Error(`live_status 삭제 실패: ${liveError.message}`)
      }
    },
    alertHandler,
  })

  // Sync local members with fetched members
  useEffect(() => {
    setLocalMembers(members)
  }, [members])

  const filteredMembers = localMembers.filter((m) => m.unit === activeUnit)

  // 드래그앤드롭 순서 변경 핸들러
  const handleReorder = async (reorderedItems: OrgMember[]) => {
    // Update position_order for all reordered items
    const updatedItems = reorderedItems.map((member, index) => ({
      ...member,
      positionOrder: index,
    }))

    // Update local state (merge with other unit's members)
    const otherUnitMembers = localMembers.filter((m) => m.unit !== activeUnit)
    setLocalMembers([...otherUnitMembers, ...updatedItems])

    // Save to database
    setIsSavingOrder(true)
    try {
      const updates = updatedItems.map((member) =>
        supabase
          .from('organization')
          .update({ position_order: member.positionOrder })
          .eq('id', member.id)
      )

      const results = await Promise.all(updates)
      const hasError = results.some((r) => r.error)

      if (hasError) {
        console.error('순서 저장 중 오류 발생')
        await refetch()
      }
    } catch (error) {
      console.error('순서 저장 실패:', error)
      await refetch()
    } finally {
      setIsSavingOrder(false)
    }
  }

  const openAddModal = () => {
    baseOpenAddModal()
    // Override unit with current activeUnit
    setEditingMember((prev) => prev ? { ...prev, unit: activeUnit, positionOrder: filteredMembers.length } : null)
  }

  const columns: Column<OrgMember>[] = [
    {
      key: 'positionOrder',
      header: '순서',
      width: '50px',
      sortable: false,
      render: (item) => item.positionOrder + 1,
    },
    {
      key: 'imageUrl',
      header: '사진',
      width: '60px',
      render: (item) => (
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: item.isLive ? '2px solid var(--live-color)' : '1px solid var(--border)',
          boxShadow: item.isLive ? '0 0 8px var(--live-glow)' : 'none',
        }}>
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              width={40}
              height={40}
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <User size={20} style={{ color: 'var(--text-tertiary)' }} />
          )}
        </div>
      ),
    },
    {
      key: 'name',
      header: '이름',
      width: '120px',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {item.isLive && (
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--live-color)',
              boxShadow: '0 0 8px var(--live-glow)',
              animation: 'pulse 2s infinite',
            }} title="LIVE" />
          )}
          {item.name}
        </div>
      ),
    },
    { key: 'role', header: '직책', width: '100px' },
    {
      key: 'socialLinks',
      header: 'PandaTV',
      render: (item) => item.socialLinks?.pandatv ? (
        <a
          href={`https://www.pandalive.co.kr/play/${item.socialLinks.pandatv}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
        >
          <LinkIcon size={14} />
          {item.socialLinks.pandatv}
        </a>
      ) : (
        <span style={{ color: 'var(--text-tertiary)' }}>-</span>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Building size={24} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>조직도 관리</h1>
            <p className={styles.subtitle}>RG 패밀리 조직도{isSavingOrder && ' (저장 중...)'}</p>
          </div>
        </div>
        <button onClick={openAddModal} className={styles.addButton}>
          <Plus size={18} />
          멤버 추가
        </button>
      </header>

      {/* Unit Tabs */}
      <div className={styles.typeSelector}>
        <button
          onClick={() => setActiveUnit('excel')}
          className={`${styles.typeButton} ${activeUnit === 'excel' ? styles.active : ''}`}
        >
          엑셀부
        </button>
        <button
          onClick={() => setActiveUnit('crew')}
          className={`${styles.typeButton} ${activeUnit === 'crew' ? styles.active : ''}`}
        >
          크루부
        </button>
      </div>

      <DataTable
        data={filteredMembers}
        columns={columns}
        onEdit={openEditModal}
        onDelete={handleDelete}
        searchPlaceholder="이름으로 검색..."
        isLoading={isLoading}
        draggable
        onReorder={handleReorder}
      />

      {/* Modal */}
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
                <h2>{isNew ? '멤버 추가' : '멤버 수정'}</h2>
                <button onClick={closeModal} className={styles.closeButton}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>
                {/* 프로필 이미지 */}
                <div className={styles.formGroup}>
                  <label>프로필 이미지</label>
                  <ImageUpload
                    value={editingMember.imageUrl ?? null}
                    onChange={(url) => setEditingMember({ ...editingMember, imageUrl: url })}
                    folder="members"
                    size={80}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>이름 *</label>
                  <input
                    type="text"
                    value={editingMember.name || ''}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, name: e.target.value })
                    }
                    className={styles.input}
                    placeholder="멤버 이름"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>직책 *</label>
                  <select
                    value={editingMember.role || ''}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, role: e.target.value })
                    }
                    className={styles.select}
                  >
                    <option value="">선택</option>
                    <option value="대표">대표</option>
                    <option value="멤버">멤버</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>부서</label>
                  <div className={styles.typeSelector}>
                    <button
                      type="button"
                      onClick={() => setEditingMember({ ...editingMember, unit: 'excel' })}
                      className={`${styles.typeButton} ${editingMember.unit === 'excel' ? styles.active : ''}`}
                    >
                      엑셀부
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingMember({ ...editingMember, unit: 'crew' })}
                      className={`${styles.typeButton} ${editingMember.unit === 'crew' ? styles.active : ''}`}
                    >
                      크루부
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>연결된 회원 (선택)</label>
                  <select
                    value={editingMember.profileId || ''}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, profileId: e.target.value || null })
                    }
                    className={styles.select}
                  >
                    <option value="">연결 안함</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nickname}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>순서</label>
                  <input
                    type="number"
                    value={editingMember.positionOrder ?? 0}
                    onChange={(e) =>
                      setEditingMember({
                        ...editingMember,
                        positionOrder: parseInt(e.target.value) || 0,
                      })
                    }
                    className={styles.input}
                    min={0}
                  />
                </div>

                {/* Profile Info */}
                <div className={styles.formGroup}>
                  <label style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'block' }}>프로필 정보</label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1rem',
                    padding: '1rem',
                    background: 'var(--surface)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                  }}>
                    <div className={styles.formGroup} style={{ margin: 0 }}>
                      <label>MBTI</label>
                      <input
                        type="text"
                        value={editingMember.profileInfo?.mbti || ''}
                        onChange={(e) =>
                          setEditingMember({
                            ...editingMember,
                            profileInfo: {
                              ...editingMember.profileInfo,
                              mbti: e.target.value.toUpperCase() || undefined,
                            },
                          })
                        }
                        className={styles.input}
                        placeholder="ENFP"
                        maxLength={4}
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                    <div className={styles.formGroup} style={{ margin: 0 }}>
                      <label>혈액형</label>
                      <select
                        value={editingMember.profileInfo?.bloodType || ''}
                        onChange={(e) =>
                          setEditingMember({
                            ...editingMember,
                            profileInfo: {
                              ...editingMember.profileInfo,
                              bloodType: e.target.value || undefined,
                            },
                          })
                        }
                        className={styles.select}
                      >
                        <option value="">선택</option>
                        <option value="A">A형</option>
                        <option value="B">B형</option>
                        <option value="O">O형</option>
                        <option value="AB">AB형</option>
                      </select>
                    </div>
                    <div className={styles.formGroup} style={{ margin: 0 }}>
                      <label>키 (cm)</label>
                      <input
                        type="number"
                        value={editingMember.profileInfo?.height || ''}
                        onChange={(e) =>
                          setEditingMember({
                            ...editingMember,
                            profileInfo: {
                              ...editingMember.profileInfo,
                              height: e.target.value ? parseInt(e.target.value) : undefined,
                            },
                          })
                        }
                        className={styles.input}
                        placeholder="170"
                        min={100}
                        max={250}
                      />
                    </div>
                    <div className={styles.formGroup} style={{ margin: 0 }}>
                      <label>몸무게 (kg)</label>
                      <input
                        type="number"
                        value={editingMember.profileInfo?.weight || ''}
                        onChange={(e) =>
                          setEditingMember({
                            ...editingMember,
                            profileInfo: {
                              ...editingMember.profileInfo,
                              weight: e.target.value ? parseInt(e.target.value) : undefined,
                            },
                          })
                        }
                        className={styles.input}
                        placeholder="65"
                        min={30}
                        max={200}
                      />
                    </div>
                    <div className={styles.formGroup} style={{ margin: 0, gridColumn: 'span 2' }}>
                      <label>생일</label>
                      <input
                        type="date"
                        value={editingMember.profileInfo?.birthday || ''}
                        onChange={(e) =>
                          setEditingMember({
                            ...editingMember,
                            profileInfo: {
                              ...editingMember.profileInfo,
                              birthday: e.target.value || undefined,
                            },
                          })
                        }
                        className={styles.input}
                      />
                    </div>
                  </div>
                </div>

                {/* Social Links */}
                <div className={styles.formGroup}>
                  <label>
                    <Radio size={14} style={{ marginRight: '0.25rem' }} />
                    PandaTV ID
                  </label>
                  <input
                    type="text"
                    value={editingMember.socialLinks?.pandatv || ''}
                    onChange={(e) =>
                      setEditingMember({
                        ...editingMember,
                        socialLinks: {
                          ...editingMember.socialLinks,
                          pandatv: e.target.value || undefined,
                        },
                      })
                    }
                    className={styles.input}
                    placeholder="hj042300"
                  />
                  <span className={styles.helperText} style={{ color: 'var(--text-tertiary)' }}>
                    팬더티비 아이디만 입력 (예: hj042300)
                  </span>
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
