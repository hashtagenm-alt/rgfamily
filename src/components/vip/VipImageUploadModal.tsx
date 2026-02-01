'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Upload, Image as ImageIcon, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { createVipImage, deleteVipImage } from '@/lib/actions/vip-rewards'
import styles from './VipImageUploadModal.module.css'

interface VipImageUploadModalProps {
  isOpen: boolean
  rewardId: number
  onClose: () => void
  onUploaded: () => void
  existingImages?: Array<{
    id: number
    imageUrl: string
    title?: string | null
  }>
  onImageDeleted?: () => void
}

export default function VipImageUploadModal({
  isOpen,
  rewardId,
  onClose,
  onUploaded,
  existingImages = [],
  onImageDeleted,
}: VipImageUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // 허용되는 이미지 타입
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 이미지 파일 체크 (GIF 포함)
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('JPG, PNG, GIF, WEBP 파일만 업로드할 수 있습니다.')
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  // 업로드 핸들러
  const handleUpload = async () => {
    if (!selectedFile) {
      alert('이미지를 선택해주세요.')
      return
    }

    setIsUploading(true)

    try {
      // 파일 업로드 API 호출
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('folder', 'vip-signatures')

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        throw new Error('파일 업로드에 실패했습니다.')
      }

      const { url } = await uploadRes.json()

      // VIP 이미지 레코드 생성
      const result = await createVipImage({
        reward_id: rewardId,
        image_url: url,
        title: title.trim() || null,
        order_index: existingImages.length,
      })

      if (result.error) {
        throw new Error(result.error)
      }

      // 초기화 및 닫기
      resetForm()
      onUploaded()
    } catch (error) {
      alert(error instanceof Error ? error.message : '업로드에 실패했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  // 이미지 삭제 핸들러
  const handleDelete = async (imageId: number) => {
    if (!confirm('이 이미지를 삭제하시겠습니까?')) return

    setDeletingId(imageId)

    try {
      const result = await deleteVipImage(imageId)

      if (result.error) {
        throw new Error(result.error)
      }

      onImageDeleted?.()
    } catch (error) {
      alert(error instanceof Error ? error.message : '삭제에 실패했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  // 폼 초기화
  const resetForm = () => {
    setTitle('')
    setPreviewUrl(null)
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 모달 닫기
  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className={styles.modal}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.header}>
            <h2 className={styles.headerTitle}>VIP 시그니처 관리</h2>
            <button className={styles.closeBtn} onClick={handleClose}>
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div className={styles.existingImages}>
                <label className={styles.label}>현재 이미지</label>
                <div className={styles.imageGrid}>
                  {existingImages.map((img) => (
                    <div key={img.id} className={styles.imageItem}>
                      <Image
                        src={img.imageUrl}
                        alt={img.title || 'VIP 시그니처'}
                        width={80}
                        height={80}
                        className={styles.thumbnail}
                        unoptimized
                      />
                      <button
                        className={styles.deleteImageBtn}
                        onClick={() => handleDelete(img.id)}
                        disabled={deletingId === img.id}
                        title="삭제"
                      >
                        {deletingId === img.id ? (
                          <Loader2 size={12} className={styles.spinner} />
                        ) : (
                          <Trash2 size={12} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Section */}
            <div className={styles.uploadSection}>
              <label className={styles.label}>새 이미지 추가</label>

              {/* Preview or Upload Area */}
              {previewUrl ? (
                <div className={styles.previewArea}>
                  <Image
                    src={previewUrl}
                    alt="미리보기"
                    width={200}
                    height={200}
                    className={styles.previewImage}
                    unoptimized={selectedFile?.type === 'image/gif'}
                  />
                  <button
                    className={styles.removePreviewBtn}
                    onClick={resetForm}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div
                  className={styles.uploadArea}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={32} />
                  <span>이미지를 선택하세요</span>
                  <span className={styles.uploadHint}>JPG/PNG/GIF/WEBP</span>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className={styles.fileInput}
              />

              {/* Title Input */}
              {previewUrl && (
                <div className={styles.field}>
                  <label className={styles.label}>제목 (선택)</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="이미지 제목을 입력하세요"
                    maxLength={50}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleClose}
              disabled={isUploading}
            >
              닫기
            </button>
            {previewUrl && (
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    <span>업로드 중...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon size={16} />
                    <span>업로드</span>
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
