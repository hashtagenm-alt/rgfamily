'use client'

import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import styles from '../VideoUpload.module.css'

interface UploadSuccessProps {
  fileName: string
  onReset: () => void
}

export function UploadSuccess({ fileName, onReset }: UploadSuccessProps) {
  return (
    <div className={styles.successState}>
      <CheckCircle size={32} className={styles.successIcon} />
      <p className={styles.fileName}>{fileName}</p>
      <p className={styles.successText}>업로드 완료!</p>
      <button onClick={onReset} className={styles.resetBtn}>
        다른 파일 선택
      </button>
    </div>
  )
}

interface UploadErrorProps {
  errorMessage: string | null
  canResume: boolean
  onResume: () => void
  onReset: () => void
}

export function UploadError({ errorMessage, canResume, onResume, onReset }: UploadErrorProps) {
  return (
    <div className={styles.errorState}>
      <AlertCircle size={32} className={styles.errorIcon} />
      <p className={styles.errorText}>{errorMessage}</p>
      <div className={styles.errorActions}>
        {canResume && (
          <button onClick={onResume} className={styles.selectBtn}>
            <RefreshCw size={16} />
            이어서 업로드
          </button>
        )}
        <button onClick={onReset} className={styles.resetBtn}>
          {canResume ? '처음부터 다시' : '다시 시도'}
        </button>
      </div>
    </div>
  )
}
