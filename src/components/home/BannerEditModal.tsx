'use client'

/**
 * 배너 편집 모달
 *
 * Hero 배너 추가/수정/삭제용 모달
 * 이미지 파일 업로드 지원
 */

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Upload, X, ImageIcon } from 'lucide-react'
import {
  AdminEditModal,
  FormField,
  FormInput,
  FormCheckbox,
} from '@/components/admin/inline'
import { createBanner, updateBanner, deleteBanner } from '@/lib/actions/banners'
import type { Banner } from '@/types/database'
import styles from './BannerEditModal.module.css'

interface BannerEditModalProps {
  isOpen: boolean
  banner: Banner | null // null이면 추가 모드
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

export default function BannerEditModal({
  isOpen,
  banner,
  onClose,
  onSaved,
  onDeleted,
}: BannerEditModalProps) {
  const isNew = !banner
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 폼 상태
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [displayOrder, setDisplayOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // 초기화
  useEffect(() => {
    if (!isOpen) return

    if (banner) {
      setTitle(banner.title || '')
      setImageUrl(banner.image_url)
      setLinkUrl(banner.link_url || '')
      setDisplayOrder(banner.display_order)
      setIsActive(banner.is_active)
      setPreviewUrl(banner.image_url)
    } else {
      // 새 배너 기본값
      setTitle('')
      setImageUrl('')
      setLinkUrl('')
      setDisplayOrder(0)
      setIsActive(true)
      setPreviewUrl(null)
    }
  }, [banner, isOpen])

  // 파일 선택 핸들러
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }

    // 파일 크기 검증 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    // 미리보기 생성
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // 업로드
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'banners')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '업로드 실패')
      }

      setImageUrl(data.url)
    } catch (error) {
      alert(error instanceof Error ? error.message : '업로드에 실패했습니다.')
      setPreviewUrl(imageUrl || null) // 실패 시 원래 이미지로 복원
    } finally {
      setIsUploading(false)
    }
  }

  // 이미지 제거
  const handleRemoveImage = () => {
    setImageUrl('')
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 저장
  const handleSave = async () => {
    if (!imageUrl.trim()) {
      alert('이미지 URL을 입력해주세요.')
      return
    }

    setIsLoading(true)

    const data = {
      title: title.trim() || null,
      image_url: imageUrl.trim(),
      link_url: linkUrl.trim() || null,
      display_order: displayOrder,
      is_active: isActive,
    }

    const result = isNew
      ? await createBanner(data)
      : await updateBanner(banner!.id, data)

    setIsLoading(false)

    if (result.error) {
      alert(result.error)
    } else {
      onSaved()
    }
  }

  // 삭제
  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    setIsDeleting(true)
    const result = await deleteBanner(banner!.id)
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
      title={isNew ? '배너 추가' : '배너 수정'}
      isNew={isNew}
      isLoading={isLoading}
      isDeleting={isDeleting}
      onClose={onClose}
      onSave={handleSave}
      onDelete={handleDelete}
    >
      {/* 제목 */}
      <FormField label="제목">
        <FormInput
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="배너 제목 (선택)"
          maxLength={100}
        />
      </FormField>

      {/* 이미지 업로드 */}
      <FormField label="배너 이미지" required>
        <div className={styles.imageUpload}>
          {previewUrl ? (
            <div className={styles.previewWrapper}>
              <Image
                src={previewUrl}
                alt="배너 미리보기"
                fill
                className={styles.previewImage}
              />
              <button
                type="button"
                className={styles.removeBtn}
                onClick={handleRemoveImage}
                disabled={isUploading}
              >
                <X size={16} />
              </button>
              {isUploading && (
                <div className={styles.uploadingOverlay}>
                  <div className={styles.spinner} />
                  <span>업로드 중...</span>
                </div>
              )}
            </div>
          ) : (
            <label className={styles.uploadArea}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className={styles.fileInput}
                disabled={isUploading}
              />
              <div className={styles.uploadContent}>
                {isUploading ? (
                  <>
                    <div className={styles.spinner} />
                    <span>업로드 중...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon size={32} />
                    <span>이미지 선택</span>
                    <span className={styles.uploadHint}>클릭하여 파일 선택 (최대 10MB)</span>
                  </>
                )}
              </div>
            </label>
          )}
        </div>
      </FormField>

      {/* 링크 URL */}
      <FormField label="링크 URL">
        <FormInput
          type="text"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="클릭 시 이동할 URL (선택)"
        />
      </FormField>

      {/* 표시 순서 */}
      <FormField label="표시 순서">
        <FormInput
          type="number"
          value={displayOrder}
          onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
          min={0}
        />
      </FormField>

      {/* 활성화 */}
      <FormCheckbox
        label="활성화 (체크 해제 시 배너가 표시되지 않습니다)"
        checked={isActive}
        onChange={setIsActive}
      />
    </AdminEditModal>
  )
}
