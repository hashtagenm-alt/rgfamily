'use client'

/**
 * 타임라인 이벤트 편집 모달
 *
 * 타임라인 이벤트 추가/수정/삭제용 모달
 */

import { useState, useEffect } from 'react'
import {
  AdminEditModal,
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
} from '@/components/admin/inline'
import {
  createTimelineEvent,
  updateTimelineEvent,
  deleteTimelineEvent,
} from '@/lib/actions/timeline-actions'
import type { TimelineEvent } from '@/types/database'

interface TimelineEditModalProps {
  isOpen: boolean
  event: TimelineEvent | null // null이면 추가 모드
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

const CATEGORY_OPTIONS = [
  { value: '', label: '카테고리 선택' },
  { value: '방송', label: '방송' },
  { value: '이벤트', label: '이벤트' },
  { value: '콜라보', label: '콜라보' },
  { value: '직급전', label: '직급전' },
  { value: '기념일', label: '기념일' },
  { value: '기타', label: '기타' },
]

export default function TimelineEditModal({
  isOpen,
  event,
  onClose,
  onSaved,
  onDeleted,
}: TimelineEditModalProps) {
  const isNew = !event
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 폼 상태
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [orderIndex, setOrderIndex] = useState(0)

  // 초기화
  useEffect(() => {
    if (!isOpen) return

    if (event) {
      setTitle(event.title)
      setEventDate(event.event_date.split('T')[0]) // YYYY-MM-DD 형식
      setCategory(event.category || '')
      setDescription(event.description || '')
      setImageUrl(event.image_url || '')
      setOrderIndex(event.order_index)
    } else {
      // 새 이벤트 기본값
      setTitle('')
      setEventDate(new Date().toISOString().split('T')[0])
      setCategory('')
      setDescription('')
      setImageUrl('')
      setOrderIndex(0)
    }
  }, [event, isOpen])

  // 저장
  const handleSave = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.')
      return
    }

    if (!eventDate) {
      alert('날짜를 입력해주세요.')
      return
    }

    setIsLoading(true)

    const data = {
      title: title.trim(),
      event_date: eventDate,
      category: category || null,
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      order_index: orderIndex,
    }

    const result = isNew
      ? await createTimelineEvent(data)
      : await updateTimelineEvent(event!.id, data)

    setIsLoading(false)

    if (result.error) {
      alert(result.error)
    } else {
      onSaved()
    }
  }

  // 삭제
  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?\n삭제된 이벤트는 복구할 수 없습니다.')) {
      return
    }

    setIsDeleting(true)
    const result = await deleteTimelineEvent(event!.id)
    setIsDeleting(false)

    if (result.error) {
      alert(result.error)
    } else {
      onDeleted()
    }
  }

  return (
    <AdminEditModal
      isOpen={isOpen}
      title={isNew ? '타임라인 이벤트 추가' : '타임라인 이벤트 수정'}
      isNew={isNew}
      isLoading={isLoading}
      isDeleting={isDeleting}
      onClose={onClose}
      onSave={handleSave}
      onDelete={handleDelete}
    >
      {/* 제목 */}
      <FormField label="제목" required>
        <FormInput
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="이벤트 제목을 입력하세요"
          maxLength={200}
        />
      </FormField>

      {/* 날짜 */}
      <FormField label="날짜" required>
        <FormInput
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
        />
      </FormField>

      {/* 카테고리 */}
      <FormField label="카테고리">
        <FormSelect
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </FormSelect>
      </FormField>

      {/* 설명 */}
      <FormField label="설명">
        <FormTextarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="이벤트에 대한 설명을 입력하세요 (선택)"
          rows={3}
        />
      </FormField>

      {/* 이미지 URL */}
      <FormField label="이미지 URL">
        <FormInput
          type="text"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="/images/timeline/... 또는 https://..."
        />
      </FormField>

      {/* 표시 순서 */}
      <FormField label="표시 순서">
        <FormInput
          type="number"
          value={orderIndex}
          onChange={(e) => setOrderIndex(parseInt(e.target.value) || 0)}
          min={0}
        />
      </FormField>
    </AdminEditModal>
  )
}
