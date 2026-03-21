'use client'

import { Film, Loader2 } from 'lucide-react'
import { formatFileSize } from './useCloudflareUpload'
import styles from '../VideoUpload.module.css'

interface UploadProgressProps {
  file: File
  uploadProgress: number
  isTusUpload: boolean
}

export function UploadProgress({ file, uploadProgress, isTusUpload }: UploadProgressProps) {
  return (
    <div className={styles.uploadingState}>
      <Film size={32} className={styles.icon} />
      <p className={styles.fileName}>{file.name}</p>
      <p className={styles.fileSize}>
        {formatFileSize(file.size)}
        {isTusUpload && <span className={styles.tusLabel}> • 청크 업로드</span>}
      </p>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${uploadProgress}%` }}
        />
      </div>
      <p className={styles.progressText}>
        {uploadProgress}% 업로드 중...
        {isTusUpload && ' (끊겨도 이어받기 가능)'}
      </p>
    </div>
  )
}

interface ProcessingProgressProps {
  file: File
  processingProgress: string
}

export function ProcessingProgress({ file, processingProgress }: ProcessingProgressProps) {
  return (
    <div className={styles.uploadingState}>
      <Loader2 size={32} className={`${styles.icon} ${styles.spinning}`} />
      <p className={styles.fileName}>{file.name}</p>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${processingProgress}%` }}
        />
      </div>
      <p className={styles.progressText}>
        Cloudflare에서 영상 처리 중... {processingProgress}%
      </p>
    </div>
  )
}
