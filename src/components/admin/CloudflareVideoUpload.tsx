'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, Film, AlertCircle, CheckCircle, Loader2, Image as ImageIcon, Check, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import * as tus from 'tus-js-client'
import { getStreamThumbnailUrl } from '@/lib/cloudflare'
import styles from './VideoUpload.module.css'

interface CloudflareUploadResult {
  uid: string
  thumbnailUrl: string | null
  thumbnailTime: string | null // 선택된 썸네일 시간 (예: "5s")
  duration: number
}

interface CloudflareVideoUploadProps {
  onUploadComplete: (result: CloudflareUploadResult) => void
  onError?: (error: string) => void
  maxSize?: number // MB 단위
  disabled?: boolean
  /** 썸네일 선택 건너뛰기 (기본 썸네일 사용) */
  skipThumbnailSelection?: boolean
}

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']

// 썸네일 생성 시간대 (영상 길이 비율)
const THUMBNAIL_TIME_RATIOS = [0, 0.1, 0.25, 0.5, 0.75, 0.9]

// 1GB 이상 파일은 TUS 사용 (청크 업로드)
const TUS_THRESHOLD = 1 * 1024 * 1024 * 1024 // 1GB

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'selecting_thumbnail' | 'success' | 'error'

export default function CloudflareVideoUpload({
  onUploadComplete,
  onError,
  maxSize = 30000, // 30GB (Cloudflare 최대)
  disabled = false,
  skipThumbnailSelection = false,
}: CloudflareVideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingProgress, setProcessingProgress] = useState('')
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // 썸네일 선택 관련 상태
  const [videoUid, setVideoUid] = useState<string | null>(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [thumbnailOptions, setThumbnailOptions] = useState<Array<{ time: string; url: string }>>([])
  const [selectedThumbnailIndex, setSelectedThumbnailIndex] = useState<number>(2) // 기본: 25% 위치
  const [thumbnailLoadErrors, setThumbnailLoadErrors] = useState<Set<number>>(new Set())

  // TUS 업로드 관련
  const tusUploadRef = useRef<tus.Upload | null>(null)
  const [isTusUpload, setIsTusUpload] = useState(false)
  const [canResume, setCanResume] = useState(false)

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
    return null
  }

  const pollVideoStatus = async (uid: string): Promise<{ uid: string; duration: number }> => {
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

  // 썸네일 옵션 생성
  const generateThumbnailOptions = (uid: string, duration: number) => {
    const options = THUMBNAIL_TIME_RATIOS.map((ratio) => {
      const seconds = Math.floor(duration * ratio)
      const timeStr = `${seconds}s`
      return {
        time: timeStr,
        url: getStreamThumbnailUrl(uid, { time: timeStr, width: 320, height: 180, fit: 'crop' }),
      }
    })
    return options
  }

  // 썸네일 선택 완료 핸들러
  const handleThumbnailSelect = () => {
    if (!videoUid || thumbnailOptions.length === 0) return

    const selected = thumbnailOptions[selectedThumbnailIndex]
    const thumbnailUrl = getStreamThumbnailUrl(videoUid, { time: selected.time, width: 640, height: 360, fit: 'crop' })

    setUploadStatus('success')
    onUploadComplete({
      uid: videoUid,
      thumbnailUrl,
      thumbnailTime: selected.time,
      duration: videoDuration,
    })
  }

  // 썸네일 선택 건너뛰기 (기본 썸네일 사용)
  const handleSkipThumbnailSelection = () => {
    if (!videoUid) return

    const defaultThumbnailUrl = getStreamThumbnailUrl(videoUid, { width: 640, height: 360, fit: 'crop' })

    setUploadStatus('success')
    onUploadComplete({
      uid: videoUid,
      thumbnailUrl: defaultThumbnailUrl,
      thumbnailTime: null,
      duration: videoDuration,
    })
  }

  // TUS 업로드 (대용량 파일용 - 청크 업로드, 이어받기 지원)
  const uploadWithTus = async (file: File): Promise<string> => {
    setIsTusUpload(true)

    // 1. TUS 업로드 URL 발급
    const urlRes = await fetch('/api/cloudflare-stream/tus-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadLength: file.size,
        filename: file.name,
      }),
    })

    if (!urlRes.ok) {
      const err = await urlRes.json()
      throw new Error(err.error || 'TUS 업로드 URL 발급 실패')
    }

    const { uploadURL, uid } = await urlRes.json()

    // 2. TUS 클라이언트로 업로드
    return new Promise((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: uploadURL,
        uploadUrl: uploadURL, // 이미 발급받은 URL 사용
        retryDelays: [0, 1000, 3000, 5000, 10000], // 재시도 딜레이
        chunkSize: 50 * 1024 * 1024, // 50MB 청크
        metadata: {
          filename: file.name,
          filetype: file.type,
        },
        onError: (error) => {
          console.error('TUS upload error:', error)
          setCanResume(true) // 실패 시 이어받기 가능
          reject(new Error(`업로드 실패: ${error.message || '네트워크 오류'}`))
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const pct = Math.round((bytesUploaded / bytesTotal) * 100)
          setUploadProgress(pct)
        },
        onSuccess: () => {
          tusUploadRef.current = null
          setCanResume(false)
          resolve(uid)
        },
      })

      tusUploadRef.current = upload

      // 이전 업로드가 있으면 이어받기 시도
      upload.findPreviousUploads().then((previousUploads) => {
        if (previousUploads.length > 0) {
          upload.resumeFromPreviousUpload(previousUploads[0])
        }
        upload.start()
      })
    })
  }

  // 일반 업로드 (작은 파일용)
  const uploadWithXhr = async (file: File): Promise<string> => {
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

    return uid
  }

  // 업로드 이어받기
  const handleResumeUpload = () => {
    if (tusUploadRef.current) {
      setErrorMessage(null)
      setUploadStatus('uploading')
      setCanResume(false)
      tusUploadRef.current.start()
    }
  }

  const uploadFile = async (file: File) => {
    setIsUploading(true)
    setUploadStatus('uploading')
    setUploadProgress(0)
    setErrorMessage(null)
    setIsTusUpload(file.size >= TUS_THRESHOLD)

    try {
      // 파일 크기에 따라 업로드 방식 선택
      const uid = file.size >= TUS_THRESHOLD
        ? await uploadWithTus(file)
        : await uploadWithXhr(file)

      // 처리 상태 폴링
      setUploadStatus('processing')
      setProcessingProgress('0')

      const result = await pollVideoStatus(uid)

      // 썸네일 선택 단계 또는 바로 완료
      setVideoUid(result.uid)
      setVideoDuration(result.duration)

      if (skipThumbnailSelection) {
        // 썸네일 선택 건너뛰기
        const defaultThumbnailUrl = getStreamThumbnailUrl(result.uid, { width: 640, height: 360, fit: 'crop' })
        setUploadStatus('success')
        onUploadComplete({
          uid: result.uid,
          thumbnailUrl: defaultThumbnailUrl,
          thumbnailTime: null,
          duration: result.duration,
        })
      } else {
        // 썸네일 옵션 생성 및 선택 단계로 전환
        const options = generateThumbnailOptions(result.uid, result.duration)
        setThumbnailOptions(options)
        setSelectedThumbnailIndex(2) // 기본: 25% 위치 선택
        setThumbnailLoadErrors(new Set())
        setUploadStatus('selecting_thumbnail')
      }
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
    // TUS 업로드 취소
    if (tusUploadRef.current) {
      tusUploadRef.current.abort()
      tusUploadRef.current = null
    }
    setSelectedFile(null)
    setUploadStatus('idle')
    setUploadProgress(0)
    setProcessingProgress('')
    setErrorMessage(null)
    // 썸네일 관련 상태 초기화
    setVideoUid(null)
    setVideoDuration(0)
    setThumbnailOptions([])
    setSelectedThumbnailIndex(2)
    setThumbnailLoadErrors(new Set())
    // TUS 관련 상태 초기화
    setIsTusUpload(false)
    setCanResume(false)
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
          <p className={styles.fileSize}>
            {formatFileSize(selectedFile.size)}
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

      {uploadStatus === 'selecting_thumbnail' && selectedFile && (
        <div className={styles.thumbnailSelectState}>
          <div className={styles.thumbnailHeader}>
            <ImageIcon size={20} />
            <span>썸네일 선택</span>
          </div>
          <p className={styles.thumbnailHint}>
            영상에서 사용할 대표 이미지를 선택하세요
          </p>

          <div className={styles.thumbnailGrid}>
            {thumbnailOptions.map((option, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedThumbnailIndex(index)}
                className={`${styles.thumbnailItem} ${selectedThumbnailIndex === index ? styles.thumbnailSelected : ''}`}
              >
                {thumbnailLoadErrors.has(index) ? (
                  <div className={styles.thumbnailPlaceholder}>
                    <Film size={24} />
                    <span>{option.time}</span>
                  </div>
                ) : (
                  <Image
                    src={option.url}
                    alt={`썸네일 ${option.time}`}
                    width={160}
                    height={90}
                    className={styles.thumbnailImage}
                    onError={() => {
                      setThumbnailLoadErrors((prev) => new Set(prev).add(index))
                    }}
                    unoptimized
                  />
                )}
                {selectedThumbnailIndex === index && (
                  <div className={styles.thumbnailCheck}>
                    <Check size={16} />
                  </div>
                )}
                <span className={styles.thumbnailTime}>{option.time}</span>
              </button>
            ))}
          </div>

          <div className={styles.thumbnailActions}>
            <button
              type="button"
              onClick={handleSkipThumbnailSelection}
              className={styles.resetBtn}
            >
              기본 썸네일 사용
            </button>
            <button
              type="button"
              onClick={handleThumbnailSelect}
              className={styles.selectBtn}
            >
              <Check size={16} />
              선택 완료
            </button>
          </div>
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
          <div className={styles.errorActions}>
            {canResume && (
              <button onClick={handleResumeUpload} className={styles.selectBtn}>
                <RefreshCw size={16} />
                이어서 업로드
              </button>
            )}
            <button onClick={handleReset} className={styles.resetBtn}>
              {canResume ? '처음부터 다시' : '다시 시도'}
            </button>
          </div>
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
