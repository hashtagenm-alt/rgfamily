'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, X, Film, AlertCircle, CheckCircle } from 'lucide-react'
import { useSupabaseContext } from '@/lib/context'
import styles from './VideoUpload.module.css'

interface VideoUploadProps {
  onUploadComplete: (url: string) => void
  onError?: (error: string) => void
  maxSize?: number // MB 단위
  disabled?: boolean
  bucketName?: string
  folderPath?: string
}

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']

export default function VideoUpload({
  onUploadComplete,
  onError,
  maxSize = 100, // 기본 100MB
  disabled = false,
  bucketName = 'videos',
  folderPath = 'signature-videos',
}: VideoUploadProps) {
  const supabase = useSupabaseContext()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      return '지원하지 않는 파일 형식입니다. (MP4, WebM, MOV, AVI만 가능)'
    }
    return null
  }

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true)
    setUploadStatus('uploading')
    setUploadProgress(0)
    setErrorMessage(null)

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'mp4'
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`
    const filePath = `${folderPath}/${fileName}`

    try {
      // 시뮬레이션된 진행 상태 (Supabase는 실제 progress를 제공하지 않음)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      const { error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      clearInterval(progressInterval)

      if (error) {
        throw error
      }

      setUploadProgress(100)

      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath)

      setUploadStatus('success')
      onUploadComplete(urlData.publicUrl)
    } catch (err) {
      setUploadStatus('error')
      const message = err instanceof Error ? err.message : '업로드에 실패했습니다.'
      setErrorMessage(message)
      onError?.(message)
    } finally {
      setIsUploading(false)
    }
  }, [supabase, bucketName, folderPath, onUploadComplete, onError])

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
  }, [maxSize, onError, uploadFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)

    if (disabled || isUploading) return

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [disabled, isUploading, handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && !isUploading) {
      setIsDragActive(true)
    }
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
    if (files && files.length > 0) {
      handleFile(files[0])
    }
    e.target.value = ''
  }

  const handleReset = () => {
    setSelectedFile(null)
    setUploadStatus('idle')
    setUploadProgress(0)
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
            MP4, WebM, MOV, AVI
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
