'use client'

import { useState, useEffect, useCallback } from 'react'
import { Building, Plus, List, GitBranch } from 'lucide-react'
import { DataTable, OrgTreeView } from '@/components/admin'
import { useAdminCRUD, useAlert } from '@/lib/hooks'
import { getProfilesForLinking, prepareOrgMemberDelete, updateOrganizationOrder } from '@/lib/actions/organization'
import { logger } from '@/lib/utils/logger'
import styles from '../shared.module.css'
import { MemberModal, getMemberColumns } from './_components'
import type { OrgMember, Profile, SocialLinks, ProfileInfo, ViewMode } from './_components'

export default function OrganizationPage() {
  const alertHandler = useAlert()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeUnit, setActiveUnit] = useState<'excel' | 'crew'>('excel')
  const [localMembers, setLocalMembers] = useState<OrgMember[]>([])
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  // Fetch profiles for linking
  const fetchProfiles = useCallback(async () => {
    const result = await getProfilesForLinking()
    if (result.data) {
      setProfiles(result.data)
    }
  }, [])

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
      const result = await prepareOrgMemberDelete(item.id)
      if (result.error) {
        throw new Error(result.error)
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
      const orderUpdates = updatedItems.map((member) => ({
        id: member.id,
        position_order: member.positionOrder,
      }))

      const result = await updateOrganizationOrder(orderUpdates)

      if (result.error) {
        logger.dbError('update', 'organization', result.error)
        await refetch()
      }
    } catch (error) {
      logger.dbError('update', 'organization', error)
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

  const columns = getMemberColumns()

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* View Mode Toggle */}
          <div className={styles.tabButtons}>
            <button
              onClick={() => setViewMode('table')}
              className={`${styles.tabButton} ${viewMode === 'table' ? styles.active : ''}`}
              title="테이블 보기"
            >
              <List size={16} />
              테이블
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`${styles.tabButton} ${viewMode === 'tree' ? styles.active : ''}`}
              title="트리 보기"
            >
              <GitBranch size={16} />
              트리
            </button>
          </div>
          <button onClick={openAddModal} className={styles.addButton}>
            <Plus size={18} />
            멤버 추가
          </button>
        </div>
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

      {/* Table or Tree View */}
      {viewMode === 'table' ? (
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
      ) : (
        <OrgTreeView
          members={filteredMembers}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />
      )}

      {/* Modal */}
      <MemberModal
        isOpen={isModalOpen}
        isNew={isNew}
        member={editingMember}
        profiles={profiles}
        onMemberChange={(updated) => setEditingMember(updated as Partial<OrgMember>)}
        onClose={closeModal}
        onSave={handleSave}
      />
    </div>
  )
}
