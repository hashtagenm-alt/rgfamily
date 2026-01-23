'use client'

/**
 * 조직도 멤버 빠른 편집 모달
 *
 * 핵심 필드만 수정 가능 (이름, 역할, 라이브 상태, 직급)
 * 전체 편집은 /admin/organization에서
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import {
  AdminEditModal,
  FormField,
  FormInput,
  FormSelect,
  FormCheckbox,
} from '@/components/admin/inline'
import { updateOrganizationMember, deleteOrganizationMember, toggleLiveStatus } from '@/lib/actions/organization'
import type { OrganizationRecord } from '@/types/organization'
import styles from './MemberQuickEditModal.module.css'

interface MemberQuickEditModalProps {
  isOpen: boolean
  member: OrganizationRecord | null
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

const ROLE_OPTIONS = [
  { value: '대표', label: '대표' },
  { value: '부장', label: '부장' },
  { value: '팀장', label: '팀장' },
  { value: '멤버', label: '멤버' },
]

const RANK_OPTIONS = [
  { value: '', label: '없음' },
  { value: '여왕', label: '여왕' },
  { value: '왕', label: '왕' },
  { value: '귀족', label: '귀족' },
  { value: '기사', label: '기사' },
  { value: '집사', label: '집사' },
  { value: '하인', label: '하인' },
  { value: '노비', label: '노비' },
  { value: '노예', label: '노예' },
  { value: '쌉노예', label: '쌉노예' },
  { value: '쌉쌉노예', label: '쌉쌉노예' },
  { value: '쌉쌉쌉노예', label: '쌉쌉쌉노예' },
]

export default function MemberQuickEditModal({
  isOpen,
  member,
  onClose,
  onSaved,
  onDeleted,
}: MemberQuickEditModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 폼 상태
  const [name, setName] = useState('')
  const [role, setRole] = useState('멤버')
  const [currentRank, setCurrentRank] = useState('')
  const [isLive, setIsLive] = useState(false)
  const [isActive, setIsActive] = useState(true)

  // 초기화
  useEffect(() => {
    if (!isOpen || !member) return

    setName(member.name)
    setRole(member.role)
    setCurrentRank(member.current_rank || '')
    setIsLive(member.is_live)
    setIsActive(member.is_active)
  }, [member, isOpen])

  // 저장
  const handleSave = async () => {
    if (!member) return
    if (!name.trim()) {
      alert('이름을 입력해주세요.')
      return
    }

    setIsLoading(true)

    const data = {
      name: name.trim(),
      role,
      current_rank: currentRank || null,
      is_live: isLive,
      is_active: isActive,
    }

    const result = await updateOrganizationMember(member.id, data)

    setIsLoading(false)

    if (result.error) {
      alert(result.error)
    } else {
      onSaved()
    }
  }

  // 삭제
  const handleDelete = async () => {
    if (!member) return
    if (!confirm('정말 삭제하시겠습니까?\n삭제된 멤버는 복구할 수 없습니다.')) {
      return
    }

    setIsDeleting(true)
    const result = await deleteOrganizationMember(member.id)
    setIsDeleting(false)

    if (result.error) {
      alert(result.error)
    } else {
      onDeleted()
    }
  }

  // 라이브 토글 (빠른 토글)
  const handleToggleLive = async () => {
    if (!member) return
    const result = await toggleLiveStatus(member.id, !isLive)
    if (result.error) {
      alert(result.error)
    } else {
      setIsLive(!isLive)
    }
  }

  if (!member) return null

  return (
    <AdminEditModal
      isOpen={isOpen}
      title="멤버 빠른 편집"
      isNew={false}
      isLoading={isLoading}
      isDeleting={isDeleting}
      onClose={onClose}
      onSave={handleSave}
      onDelete={handleDelete}
      maxWidth={420}
    >
      {/* 이름 */}
      <FormField label="이름" required>
        <FormInput
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="멤버 이름"
          maxLength={50}
        />
      </FormField>

      {/* 역할 */}
      <FormField label="역할">
        <FormSelect
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </FormSelect>
      </FormField>

      {/* 직급전 직급 */}
      <FormField label="직급전 직급">
        <FormSelect
          value={currentRank}
          onChange={(e) => setCurrentRank(e.target.value)}
        >
          {RANK_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </FormSelect>
      </FormField>

      {/* 라이브 상태 - 빠른 토글 */}
      <div className={styles.liveToggle}>
        <FormCheckbox
          label="LIVE 방송 중"
          checked={isLive}
          onChange={handleToggleLive}
        />
        {isLive && (
          <span className={styles.liveBadge}>LIVE</span>
        )}
      </div>

      {/* 활성화 */}
      <FormCheckbox
        label="조직도에 표시"
        checked={isActive}
        onChange={setIsActive}
      />

      {/* 전체 편집 링크 */}
      <Link href={`/admin/organization`} className={styles.fullEditLink}>
        <span>이미지/소셜링크 등 전체 편집</span>
        <ExternalLink size={14} />
      </Link>
    </AdminEditModal>
  )
}
