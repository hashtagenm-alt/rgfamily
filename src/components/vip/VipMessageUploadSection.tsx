'use client'

import Image from 'next/image'
import {
  ImageIcon,
  Film,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import type { MessageType, UploadStatus } from './useVipMessageForm'
import { formatFileSize, ACCEPTED_IMAGE_TYPES_STR, ACCEPTED_VIDEO_TYPES_STR } from './useVipMessageForm'
import styles from './VipMessageForm.module.css'

interface VipMessageUploadSectionProps {
  messageType: MessageType
  uploadStatus: UploadStatus
  uploadProgress: number
  isDragActive: boolean
  selectedFile: File | null
  previewUrl: string | null
  error: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onResetUpload: () => void
}

export default function VipMessageUploadSection({
  messageType,
  uploadStatus,
  uploadProgress,
  isDragActive,
  selectedFile,
  previewUrl,
  error,
  fileInputRef,
  onDrop,
  onDragOver,
  onDragLeave,
  onInputChange,
  onResetUpload,
}: VipMessageUploadSectionProps) {
  return (
    <div className={styles.uploadSection}>
      {uploadStatus === 'idle' && (
        <div
          className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={32} className={styles.dropzoneIcon} />
          <p className={styles.dropzoneText}>
            {messageType === 'image' ? '이미지' : '영상'} 파일을 드래그하거나{' '}
            <strong>클릭</strong>하여 업로드
          </p>
          <p className={styles.dropzoneHint}>
            {messageType === 'image'
              ? 'JPG, PNG, GIF, WEBP'
              : 'MP4, WebM, MOV'}
          </p>
        </div>
      )}

      {uploadStatus === 'uploading' && selectedFile && (
        <div className={styles.uploadingState}>
          {messageType === 'image' ? (
            <ImageIcon size={32} className={styles.uploadingIcon} />
          ) : (
            <Film size={32} className={styles.uploadingIcon} />
          )}
          <p className={styles.fileName}>{selectedFile.name}</p>
          <p className={styles.fileSize}>{formatFileSize(selectedFile.size)}</p>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: messageType === 'image' ? '100%' : `${uploadProgress}%` }}
            />
          </div>
          <p className={styles.progressText}>
            {messageType === 'image' ? '업로드 중...' : `${uploadProgress}% 업로드 중...`}
          </p>
        </div>
      )}

      {uploadStatus === 'processing' && (
        <div className={styles.uploadingState}>
          <Loader2 size={32} className={`${styles.uploadingIcon} ${styles.spinning}`} />
          <p className={styles.processingText}>영상 처리 중...</p>
          <p className={styles.processingHint}>잠시만 기다려주세요</p>
        </div>
      )}

      {uploadStatus === 'success' && (
        <div className={styles.successState}>
          {messageType === 'image' && previewUrl ? (
            <div className={styles.imagePreview}>
              <Image
                src={previewUrl}
                alt="업로드된 이미지"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div className={styles.videoSuccess}>
              <CheckCircle size={32} className={styles.successIcon} />
              <p>영상 업로드 완료!</p>
            </div>
          )}
          <button onClick={onResetUpload} className={styles.resetBtn}>
            다른 파일 선택
          </button>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className={styles.errorState}>
          <AlertCircle size={32} className={styles.errorIcon} />
          <p className={styles.errorText}>{error}</p>
          <button onClick={onResetUpload} className={styles.resetBtn}>
            다시 시도
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={messageType === 'image' ? ACCEPTED_IMAGE_TYPES_STR : ACCEPTED_VIDEO_TYPES_STR}
        onChange={onInputChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}
