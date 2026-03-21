'use client'

import Image from 'next/image'
import { Upload, Loader2, Trash2 } from 'lucide-react'
import styles from './BjMessageForm.module.css'

interface BjMessageImageSectionProps {
  previewUrl: string | null
  isUploading: boolean
  uploadProgress: number
  contentText: string
  isSubmitting: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: () => void
  onContentTextChange: (value: string) => void
}

export default function BjMessageImageSection({
  previewUrl,
  isUploading,
  uploadProgress,
  contentText,
  isSubmitting,
  fileInputRef,
  onFileChange,
  onRemoveImage,
  onContentTextChange,
}: BjMessageImageSectionProps) {
  return (
    <>
      <div className={styles.inputGroup}>
        <label className={styles.label}>이미지 파일</label>

        {previewUrl ? (
          <div className={styles.imagePreviewWrapper}>
            <Image
              src={previewUrl}
              alt="업로드된 이미지"
              width={400}
              height={300}
              className={styles.imagePreview}
              style={{ objectFit: 'contain' }}
            />
            <button
              type="button"
              className={styles.removeImageBtn}
              onClick={onRemoveImage}
              disabled={isSubmitting}
            >
              <Trash2 size={16} />
              <span>삭제</span>
            </button>
          </div>
        ) : (
          <div
            className={`${styles.uploadArea} ${isUploading ? styles.uploading : ''}`}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            {isUploading ? (
              <>
                <Loader2 size={32} className={styles.spinner} />
                <span className={styles.uploadText}>업로드 중... {uploadProgress}%</span>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <Upload size={32} />
                <span className={styles.uploadText}>클릭하여 이미지 선택</span>
                <span className={styles.uploadHint}>JPG, PNG, GIF, WEBP</span>
              </>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={onFileChange}
          className={styles.hiddenInput}
          disabled={isSubmitting || isUploading}
        />
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>함께 전할 메시지 (선택)</label>
        <textarea
          className={styles.textareaSmall}
          placeholder="이미지와 함께 전할 짧은 메시지..."
          value={contentText}
          onChange={(e) => onContentTextChange(e.target.value)}
          maxLength={500}
          disabled={isSubmitting || isUploading}
        />
      </div>
    </>
  )
}
