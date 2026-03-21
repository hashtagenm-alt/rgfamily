'use client'

import { useState, useCallback, useRef } from 'react'
import { getStreamThumbnailUrl } from '@/lib/cloudflare'
import { uploadVideoToStream } from './uploadVideoToStream'

export type MessageType = 'image' | 'video'
export type VideoUploadMode = 'file' | 'url'
export type VideoProcessingStatus = 'idle' | 'uploading' | 'processing' | 'done'

export interface BjMember {
  id: number
  name: string
  imageUrl: string | null
}

export interface BjMessageFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    messageType: 'image' | 'video'
    contentText?: string
    contentUrl?: string
    isPublic?: boolean
    selectedMemberId?: number
  }) => Promise<boolean>
  bjMemberInfo?: {
    name: string
    imageUrl: string | null
  }
  vipNickname: string
  isAdminMode?: boolean
  bjMembers?: BjMember[]
}

export function useBjMessageForm({
  onClose,
  onSubmit,
  isAdminMode = false,
  bjMembers = [],
}: Pick<BjMessageFormProps, 'onClose' | 'onSubmit' | 'isAdminMode' | 'bjMembers'>) {
  const [messageType, setMessageType] = useState<MessageType>('image')
  const [contentText, setContentText] = useState('')
  const [contentUrl, setContentUrl] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // File upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [videoUploadMode, setVideoUploadMode] = useState<VideoUploadMode>('file')
  const [videoProcessingStatus, setVideoProcessingStatus] = useState<VideoProcessingStatus>('idle')
  const [cloudflareUid, setCloudflareUid] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Admin member selection
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
  const selectedMember = bjMembers.find(m => m.id === selectedMemberId)

  const resetForm = useCallback(() => {
    setMessageType('image')
    setContentText('')
    setContentUrl('')
    setIsPublic(true)
    setError(null)
    setIsUploading(false)
    setUploadProgress(0)
    setPreviewUrl(null)
    setSelectedMemberId(null)
    setVideoUploadMode('file')
    setVideoProcessingStatus('idle')
    setCloudflareUid(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (videoInputRef.current) {
      videoInputRef.current.value = ''
    }
  }, [])

  const handleFileUpload = async (file: File, type: 'image' | 'video' = 'image') => {
    if (!file) return

    if (type === 'image' && !file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.')
      return
    }

    if (type === 'video' && !file.type.startsWith('video/')) {
      setError('영상 파일만 업로드할 수 있습니다.')
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', type === 'video' ? 'bj-videos' : 'bj-messages')

      setUploadProgress(30)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      setUploadProgress(80)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '업로드에 실패했습니다.')
      }

      const data = await response.json()
      setContentUrl(data.url)
      setPreviewUrl(data.url)
      setUploadProgress(100)
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다.')
      setPreviewUrl(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file, 'image')
    }
  }

  const handleVideoFileUpload = async (file: File) => {
    if (!file) return

    if (!file.type.startsWith('video/')) {
      setError('영상 파일만 업로드할 수 있습니다.')
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)
    setVideoProcessingStatus('uploading')

    try {
      const videoUid = await uploadVideoToStream(file, {
        onProgress: (pct) => setUploadProgress(pct),
        onProcessing: () => setVideoProcessingStatus('processing'),
      })

      setCloudflareUid(videoUid)
      const thumbnailUrl = getStreamThumbnailUrl(videoUid, { width: 320, height: 180, fit: 'crop' })
      setPreviewUrl(thumbnailUrl)
      setContentUrl(`cloudflare:${videoUid}`)
      setVideoProcessingStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다.')
      setVideoProcessingStatus('idle')
      setCloudflareUid(null)
      setPreviewUrl(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleVideoFileUpload(file)
    }
  }

  const handleRemoveImage = () => {
    setContentUrl('')
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveVideo = () => {
    setContentUrl('')
    setPreviewUrl(null)
    setCloudflareUid(null)
    setVideoProcessingStatus('idle')
    if (videoInputRef.current) {
      videoInputRef.current.value = ''
    }
  }

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])

  const validateForm = (): boolean => {
    setError(null)

    if (isAdminMode && !selectedMemberId) {
      setError('등록할 멤버를 선택해주세요.')
      return false
    }

    if (messageType === 'image') {
      if (!contentUrl.trim()) {
        setError('이미지를 업로드해주세요.')
        return false
      }
    }

    if (messageType === 'video') {
      if (!contentUrl.trim()) {
        setError(videoUploadMode === 'file' ? '영상 파일을 업로드해주세요.' : '영상 URL을 입력해주세요.')
        return false
      }

      if (videoUploadMode === 'url') {
        try {
          const parsedUrl = new URL(contentUrl)
          const isYouTube = parsedUrl.hostname.includes('youtube.com') || parsedUrl.hostname.includes('youtu.be')

          if (!isYouTube) {
            setError('영상은 YouTube 링크만 지원합니다.')
            return false
          }
        } catch {
          setError('올바른 URL 형식이 아닙니다.')
          return false
        }
      }
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const success = await onSubmit({
        messageType,
        contentText: contentText.trim() || undefined,
        contentUrl: contentUrl.trim() || undefined,
        isPublic,
        selectedMemberId: selectedMemberId || undefined,
      })

      if (success) {
        handleClose()
      } else {
        setError('메시지 전송에 실패했습니다. 다시 시도해주세요.')
      }
    } catch {
      setError('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTabChange = (type: MessageType) => {
    setMessageType(type)
    setContentUrl('')
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleVideoModeChange = (mode: VideoUploadMode) => {
    setVideoUploadMode(mode)
    setContentUrl('')
    setPreviewUrl(null)
    setCloudflareUid(null)
    setVideoProcessingStatus('idle')
  }

  return {
    // State
    messageType,
    contentText,
    contentUrl,
    isPublic,
    isSubmitting,
    error,
    isUploading,
    uploadProgress,
    previewUrl,
    videoUploadMode,
    videoProcessingStatus,
    cloudflareUid,
    selectedMemberId,
    selectedMember,

    // Refs
    fileInputRef,
    videoInputRef,

    // Setters
    setContentText,
    setContentUrl,
    setIsPublic,
    setSelectedMemberId,

    // Handlers
    handleFileChange,
    handleVideoFileChange,
    handleRemoveImage,
    handleRemoveVideo,
    handleClose,
    handleSubmit,
    handleTabChange,
    handleVideoModeChange,
  }
}
