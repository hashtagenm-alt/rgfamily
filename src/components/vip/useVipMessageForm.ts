'use client'

import { useState, useCallback, useRef } from 'react'
import { getStreamThumbnailUrl } from '@/lib/cloudflare'

export type MessageType = 'image' | 'video'
export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error'

export interface VipMessageFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    messageType: 'image' | 'video'
    contentText?: string
    contentUrl?: string
    isPublic?: boolean
  }) => Promise<boolean>
  vipInfo?: {
    nickname: string
    avatarUrl: string | null
  }
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

export const ACCEPTED_IMAGE_TYPES_STR = ACCEPTED_IMAGE_TYPES.join(',')
export const ACCEPTED_VIDEO_TYPES_STR = ACCEPTED_VIDEO_TYPES.join(',')

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function useVipMessageForm({
  onClose,
  onSubmit,
}: Pick<VipMessageFormProps, 'onClose' | 'onSubmit'>) {
  const [messageType, setMessageType] = useState<MessageType>('image')
  const [contentText, setContentText] = useState('')
  const [contentUrl, setContentUrl] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // File upload state
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragActive, setIsDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = useCallback(() => {
    setMessageType('image')
    setContentText('')
    setContentUrl('')
    setIsPublic(true)
    setError(null)
    setUploadStatus('idle')
    setUploadProgress(0)
    setSelectedFile(null)
    setPreviewUrl(null)
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])

  const validateFile = (file: File, type: MessageType): string | null => {
    if (type === 'image') {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        return '지원하지 않는 이미지 형식입니다. (JPG, PNG, GIF, WEBP만 가능)'
      }
    } else {
      if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
        return '지원하지 않는 영상 형식입니다. (MP4, WebM, MOV만 가능)'
      }
    }
    return null
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'vip-messages')

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || '이미지 업로드 실패')
    }

    return result.url
  }

  const uploadVideo = async (file: File): Promise<string | null> => {
    // 1. Upload URL 발급
    const urlRes = await fetch('/api/vip/video-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: file.name, maxDurationSeconds: 300 }),
    })

    if (!urlRes.ok) {
      const err = await urlRes.json()
      throw new Error(err.error || '업로드 URL 발급 실패')
    }

    const { uploadURL, uid } = await urlRes.json()

    // 2. Cloudflare에 직접 업로드
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const fd = new FormData()
      fd.append('file', file)

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
      xhr.open('POST', uploadURL)
      xhr.send(fd)
    })

    // 3. 영상 처리 대기 (최대 3분)
    setUploadStatus('processing')
    const maxAttempts = 36 // 5초 간격 x 36 = 3분
    let attempts = 0

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000))
      attempts++

      const res = await fetch(`/api/cloudflare-stream/${uid}`)
      if (!res.ok) continue

      const data = await res.json()

      if (data.status?.state === 'ready') {
        return getStreamThumbnailUrl(uid, { width: 640, height: 360, fit: 'crop' })
          ? `cloudflare:${uid}`
          : null
      }

      if (data.status?.state === 'error') {
        throw new Error(data.status.errorReasonText || '영상 처리 중 오류')
      }
    }

    throw new Error('영상 처리 시간 초과')
  }

  const handleFile = useCallback(async (file: File) => {
    const validationError = validateFile(file, messageType)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setSelectedFile(file)
    setUploadStatus('uploading')
    setUploadProgress(0)

    // 이미지 프리뷰 생성
    if (messageType === 'image') {
      const reader = new FileReader()
      reader.onload = (e) => setPreviewUrl(e.target?.result as string)
      reader.readAsDataURL(file)
    }

    try {
      let url: string | null = null

      if (messageType === 'image') {
        url = await uploadImage(file)
      } else {
        url = await uploadVideo(file)
      }

      if (url) {
        setContentUrl(url)
        setUploadStatus('success')
      } else {
        throw new Error('업로드 결과를 받지 못했습니다.')
      }
    } catch (err) {
      setUploadStatus('error')
      setError(err instanceof Error ? err.message : '업로드 실패')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageType])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    if (uploadStatus === 'uploading' || uploadStatus === 'processing') return

    const files = e.dataTransfer.files
    if (files.length > 0) handleFile(files[0])
  }, [uploadStatus, handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (uploadStatus !== 'uploading' && uploadStatus !== 'processing') {
      setIsDragActive(true)
    }
  }, [uploadStatus])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) handleFile(files[0])
    e.target.value = ''
  }

  const handleResetUpload = () => {
    setUploadStatus('idle')
    setUploadProgress(0)
    setSelectedFile(null)
    setPreviewUrl(null)
    setContentUrl('')
    setError(null)
  }

  const handleSubmit = async () => {
    if (!contentUrl) {
      setError(messageType === 'image' ? '이미지를 업로드해주세요.' : '영상을 업로드해주세요.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const success = await onSubmit({
        messageType,
        contentText: contentText.trim() || undefined,
        contentUrl,
        isPublic,
      })

      if (success) {
        handleClose()
      } else {
        setError('메시지 등록에 실패했습니다. 다시 시도해주세요.')
      }
    } catch {
      setError('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTypeChange = (type: MessageType) => {
    if (uploadStatus === 'uploading' || uploadStatus === 'processing') return
    setMessageType(type)
    handleResetUpload()
  }

  return {
    messageType, contentText, contentUrl, isPublic, isSubmitting, error,
    uploadStatus, uploadProgress, isDragActive, selectedFile, previewUrl,
    fileInputRef,
    setContentText, setIsPublic,
    handleClose, handleDrop, handleDragOver, handleDragLeave,
    handleInputChange, handleResetUpload, handleSubmit, handleTypeChange,
  }
}
