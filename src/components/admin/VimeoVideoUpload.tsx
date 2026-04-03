'use client'

import { useRef, useState } from 'react'
import styles from './VideoUpload.module.css'
import { uploadToVimeo } from './vimeo-upload/upload-vimeo'

export interface VimeoVideoUploadProps {
  onUploadComplete: (vimeoId: string) => void
  onError: (msg: string) => void
  disabled?: boolean
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']

export default function VimeoVideoUpload({
  onUploadComplete,
  onError,
  disabled = false,
}: VimeoVideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isDragActive, setIsDragActive] = useState(false)

  const handleFile = async (file: File) => {
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      const msg = '지원하지 않는 파일 형식입니다. MP4, MOV, AVI, WebM만 가능합니다.'
      setErrorMessage(msg)
      setUploadStatus('error')
      onError(msg)
      return
    }

    setSelectedFile(file)
    setUploadStatus('uploading')
    setUploadProgress(0)

    try {
      const vimeoId = await uploadToVimeo(file, file.name, (pct) => {
        setUploadProgress(pct)
      })
      setUploadStatus('success')
      onUploadComplete(vimeoId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다'
      setErrorMessage(msg)
      setUploadStatus('error')
      onError(msg)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragActive(true)
  }

  const handleDragLeave = () => setIsDragActive(false)

  const handleClick = () => {
    if (!disabled) fileInputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleReset = () => {
    setUploadStatus('idle')
    setUploadProgress(0)
    setSelectedFile(null)
    setErrorMessage('')
  }

  return (
    <div className={styles.container}>
      {uploadStatus === 'idle' && (
        <div
          className={[
            styles.dropzone,
            isDragActive ? styles.dropzoneActive : '',
            disabled ? styles.dropzoneDisabled : '',
          ].join(' ')}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <svg className={styles.icon} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className={styles.text}>
            <strong>클릭하거나 파일을 드래그</strong>하여 업로드
          </p>
          <span className={styles.hint}>MP4, MOV, AVI, WebM 지원 · Vimeo 업로드</span>
        </div>
      )}

      {uploadStatus === 'uploading' && selectedFile && (
        <div className={styles.uploadingState}>
          <p className={styles.fileName}>{selectedFile.name}</p>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${uploadProgress}%` }} />
          </div>
          <span className={styles.progressText}>업로드 중... {uploadProgress}%</span>
        </div>
      )}

      {uploadStatus === 'success' && selectedFile && (
        <div className={styles.successState}>
          <svg className={styles.successIcon} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          <p className={styles.successText}>업로드 완료!</p>
          <p className={styles.fileName}>{selectedFile.name}</p>
          <button className={styles.resetBtn} onClick={handleReset}>다른 파일 업로드</button>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className={styles.errorState}>
          <svg className={styles.errorIcon} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p className={styles.errorText}>{errorMessage}</p>
          <button className={styles.resetBtn} onClick={handleReset}>다시 시도</button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_VIDEO_TYPES.join(',')}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}
