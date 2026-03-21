'use client'

import { Upload } from 'lucide-react'
import styles from '../VideoUpload.module.css'

interface UploadDropzoneProps {
  isDragActive: boolean
  disabled: boolean
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onClick: () => void
}

export function UploadDropzone({
  isDragActive,
  disabled,
  onDrop,
  onDragOver,
  onDragLeave,
  onClick,
}: UploadDropzoneProps) {
  return (
    <div
      className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''} ${disabled ? styles.dropzoneDisabled : ''}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={onClick}
    >
      <Upload size={32} className={styles.icon} />
      <p className={styles.text}>
        영상 파일을 드래그하거나 <strong>클릭</strong>하여 업로드
      </p>
      <p className={styles.hint}>
        MP4, WebM, MOV, AVI • Cloudflare Stream
      </p>
    </div>
  )
}
