'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, Film, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import styles from './VideoUpload.module.css'

interface CloudflareUploadResult {
  uid: string
  thumbnailUrl: string | null
  duration: number
}

interface CloudflareVideoUploadProps {
  onUploadComplete: (result: CloudflareUploadResult) => void
  onError?: (error: string) => void
  maxSize?: number // MB 단위
  disabled?: boolean
}

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error'

export default function CloudflareVideoUpload({
  onUploadComplete,
  onError,
  maxSize = 30000, // 30GB (Cloudflare 최대)
  disabled = false,
}: CloudflareVideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingProgress, setProcessingProgress] = useState('')
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      return '지원하지 않는 파일 형식입니다. (MP4, WebM, MOV, AVI만 가능)'
    }
    if (file.size > maxSize * 1024 * 1024) {
      return `파일 크기가 ${maxSize}MB를 초과합니다.`
    }
    return null
  }

  const pollVideoStatus = async (uid: string): Promise<CloudflareUploadResult> => {
    const maxAttempts = 120 // 최대 10분 (5초 간격)
    let attempts = 0

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000))
      attempts++

      const res = await fetch(`/api/cloudflare-stream/${uid}`)
      if (!res.ok) continue

      const data = await res.json()

      if (data.status?.state === 'ready') {
        return {
          uid,
          thumbnailUrl: data.thumbnail || null,
          duration: data.duration || 0,
        }
      }

      if (data.status?.state === 'error') {
        throw new Error(data.status.errorReasonText || '영상 처리 중 오류가 발생했습니다.')
      }

      setProcessingProgress(data.status?.pctComplete || '0')
    }

    throw new Error('영상 처리 시간이 초과되었습니다. 나중에 다시 확인해주세요.')
  }

  const uploadFile = async (file: File) => {
    setIsUploading(true)
    setUploadStatus('uploading')
    setUploadProgress(0)
    setErrorMessage(null)

    try {
      // 1. Direct Creator Upload URL 발급
      const urlRes = await fetch('/api/cloudflare-stream/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: file.name }),
      })

      if (!urlRes.ok) {
        const err = await urlRes.json()
        throw new Error(err.error || '업로드 URL 발급 실패')
      }

      const { uploadURL, uid } = await urlRes.json()

      // 2. Cloudflare에 직접 업로드 (XHR로 진행률 추적)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const formData = new FormData()
        formData.append('file', file)

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100)
            setUploadProgress(pct)
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`업로드 실패 (${xhr.status})`))
          }
        })

        xhr.addEventListener('error', () => reject(new Error('네트워크 오류')))
        xhr.addEventListener('abort', () => reject(new Error('업로드 취소')))

        xhr.open('POST', uploadURL)
        xhr.send(formData)
      })

      // 3. 처리 상태 폴링
      setUploadStatus('processing')
      setProcessingProgress('0')

      const result = await pollVideoStatus(uid)

      // 4. 완료
      setUploadStatus('success')
      onUploadComplete(result)
    } catch (err) {
      setUploadStatus('error')
      const message = err instanceof Error ? err.message : '업로드에 실패했습니다.'
      setErrorMessage(message)
      onError?.(message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFile = useCallback((file: File) => {
    const error = validateFile(file)
    if (error) {
      setErrorMessage(error)
      setUploadStatus('error')
      onError?.(error)
      return
    }

    setSelectedFile(file)
    setErrorMessage(null)
    uploadFile(file)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxSize, onError])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    if (disabled || isUploading) return
    const files = e.dataTransfer.files
    if (files.length > 0) handleFile(files[0])
  }, [disabled, isUploading, handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && !isUploading) setIsDragActive(true)
  }, [disabled, isUploading])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }, [])

  const handleClick = () => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) handleFile(files[0])
    e.target.value = ''
  }

  const handleReset = () => {
    setSelectedFile(null)
    setUploadStatus('idle')
    setUploadProgress(0)
    setProcessingProgress('')
    setErrorMessage(null)
  }

  return (
    <div className={styles.container}>
      {uploadStatus === 'idle' && (
        <div
          className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''} ${disabled ? styles.dropzoneDisabled : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <Upload size={32} className={styles.icon} />
          <p className={styles.text}>
            영상 파일을 드래그하거나 <strong>클릭</strong>하여 업로드
          </p>
          <p className={styles.hint}>
            MP4, WebM, MOV, AVI • Cloudflare Stream
          </p>
        </div>
      )}

      {uploadStatus === 'uploading' && selectedFile && (
        <div className={styles.uploadingState}>
          <Film size={32} className={styles.icon} />
          <p className={styles.fileName}>{selectedFile.name}</p>
          <p className={styles.fileSize}>{formatFileSize(selectedFile.size)}</p>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className={styles.progressText}>{uploadProgress}% 업로드 중...</p>
        </div>
      )}

      {uploadStatus === 'processing' && selectedFile && (
        <div className={styles.uploadingState}>
          <Loader2 size={32} className={`${styles.icon} ${styles.spinning}`} />
          <p className={styles.fileName}>{selectedFile.name}</p>
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
      )}

      {uploadStatus === 'success' && selectedFile && (
        <div className={styles.successState}>
          <CheckCircle size={32} className={styles.successIcon} />
          <p className={styles.fileName}>{selectedFile.name}</p>
          <p className={styles.successText}>업로드 완료!</p>
          <button onClick={handleReset} className={styles.resetBtn}>
            다른 파일 선택
          </button>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className={styles.errorState}>
          <AlertCircle size={32} className={styles.errorIcon} />
          <p className={styles.errorText}>{errorMessage}</p>
          <button onClick={handleReset} className={styles.resetBtn}>
            다시 시도
          </button>
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
