'use client'

import { useState, useCallback, useRef } from 'react'
import type * as tus from 'tus-js-client'
import { getStreamThumbnailUrl } from '@/lib/cloudflare'
import type { CloudflareUploadResult, UploadStatus, ThumbnailOption } from './types'
import { ACCEPTED_VIDEO_TYPES, THUMBNAIL_TIME_RATIOS, TUS_THRESHOLD } from './types'
import {
  uploadWithTus,
  uploadWithXhr,
  pollVideoStatus,
  formatFileSize,
} from './upload-strategies'

export { formatFileSize }

interface UseCloudflareUploadOptions {
  onUploadComplete: (result: CloudflareUploadResult) => void
  onError?: (error: string) => void
  maxSize?: number
  skipThumbnailSelection?: boolean
}

export function useCloudflareUpload({
  onUploadComplete,
  onError,
  skipThumbnailSelection = false,
}: UseCloudflareUploadOptions) {
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
  const [thumbnailOptions, setThumbnailOptions] = useState<ThumbnailOption[]>([])
  const [selectedThumbnailIndex, setSelectedThumbnailIndex] = useState<number>(2)
  const [thumbnailLoadErrors, setThumbnailLoadErrors] = useState<Set<number>>(new Set())

  // TUS 업로드 관련
  const tusUploadRef = useRef<tus.Upload | null>(null)
  const [isTusUpload, setIsTusUpload] = useState(false)
  const [canResume, setCanResume] = useState(false)

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      return '지원하지 않는 파일 형식입니다. (MP4, WebM, MOV, AVI만 가능)'
    }
    return null
  }

  const generateThumbnailOptions = (uid: string, duration: number): ThumbnailOption[] => {
    return THUMBNAIL_TIME_RATIOS.map((ratio) => {
      const seconds = Math.floor(duration * ratio)
      const timeStr = `${seconds}s`
      return {
        time: timeStr,
        url: getStreamThumbnailUrl(uid, { time: timeStr, width: 320, height: 180, fit: 'crop' }),
      }
    })
  }

  const handleThumbnailSelect = () => {
    if (!videoUid || thumbnailOptions.length === 0) return
    const selected = thumbnailOptions[selectedThumbnailIndex]
    const thumbnailUrl = getStreamThumbnailUrl(videoUid, { time: selected.time, width: 640, height: 360, fit: 'crop' })
    setUploadStatus('success')
    onUploadComplete({ uid: videoUid, thumbnailUrl, thumbnailTime: selected.time, duration: videoDuration })
  }

  const handleSkipThumbnailSelection = () => {
    if (!videoUid) return
    const defaultThumbnailUrl = getStreamThumbnailUrl(videoUid, { width: 640, height: 360, fit: 'crop' })
    setUploadStatus('success')
    onUploadComplete({ uid: videoUid, thumbnailUrl: defaultThumbnailUrl, thumbnailTime: null, duration: videoDuration })
  }

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

    const callbacks = { setUploadProgress, setCanResume, tusUploadRef }

    try {
      const uid = file.size >= TUS_THRESHOLD
        ? await uploadWithTus(file, callbacks)
        : await uploadWithXhr(file, callbacks)

      setUploadStatus('processing')
      setProcessingProgress('0')

      const result = await pollVideoStatus(uid, setProcessingProgress)

      setVideoUid(result.uid)
      setVideoDuration(result.duration)

      if (skipThumbnailSelection) {
        const defaultThumbnailUrl = getStreamThumbnailUrl(result.uid, { width: 640, height: 360, fit: 'crop' })
        setUploadStatus('success')
        onUploadComplete({ uid: result.uid, thumbnailUrl: defaultThumbnailUrl, thumbnailTime: null, duration: result.duration })
      } else {
        const options = generateThumbnailOptions(result.uid, result.duration)
        setThumbnailOptions(options)
        setSelectedThumbnailIndex(2)
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
  }, [onError])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    if (isUploading) return
    const files = e.dataTransfer.files
    if (files.length > 0) handleFile(files[0])
  }, [isUploading, handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!isUploading) setIsDragActive(true)
  }, [isUploading])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }, [])

  const handleClick = () => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) handleFile(files[0])
    e.target.value = ''
  }

  const handleReset = () => {
    if (tusUploadRef.current) {
      tusUploadRef.current.abort()
      tusUploadRef.current = null
    }
    setSelectedFile(null)
    setUploadStatus('idle')
    setUploadProgress(0)
    setProcessingProgress('')
    setErrorMessage(null)
    setVideoUid(null)
    setVideoDuration(0)
    setThumbnailOptions([])
    setSelectedThumbnailIndex(2)
    setThumbnailLoadErrors(new Set())
    setIsTusUpload(false)
    setCanResume(false)
  }

  return {
    fileInputRef,
    isDragActive,
    isUploading,
    uploadProgress,
    processingProgress,
    uploadStatus,
    errorMessage,
    selectedFile,
    isTusUpload,
    canResume,
    thumbnailOptions,
    selectedThumbnailIndex,
    setSelectedThumbnailIndex,
    thumbnailLoadErrors,
    setThumbnailLoadErrors,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleClick,
    handleInputChange,
    handleReset,
    handleResumeUpload,
    handleThumbnailSelect,
    handleSkipThumbnailSelection,
  }
}
