'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Upload, Loader2, Clock } from 'lucide-react'
import { Menu, ActionIcon } from '@mantine/core'
import { getStreamThumbnailUrl } from '@/lib/cloudflare'
import { updateMediaThumbnail } from '@/lib/actions/media'
import { logger } from '@/lib/utils/logger'
import { Media, THUMBNAIL_TIME_OPTIONS } from './types'

interface ThumbnailCellManagerProps {
  alertHandler: { showSuccess: (msg: string) => void; showError: (msg: string) => void }
  refetch: () => void
  children: (helpers: {
    thumbnailInputRef: React.RefObject<HTMLInputElement | null>
    thumbnailUploadingId: number | null
    handleThumbnailClick: (mediaId: number, e: React.MouseEvent) => void
    handleCloudflareThumbailTimeChange: (mediaId: number, cloudflareUid: string, time: string) => void
    handleThumbnailFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  }) => React.ReactNode
}

export function ThumbnailCellManager({
  alertHandler,
  refetch,
  children,
}: ThumbnailCellManagerProps) {
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const [thumbnailUploadingId, setThumbnailUploadingId] = useState<number | null>(null)
  const [thumbnailTargetId, setThumbnailTargetId] = useState<number | null>(null)

  const handleThumbnailClick = (mediaId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setThumbnailTargetId(mediaId)
    thumbnailInputRef.current?.click()
  }

  const handleThumbnailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !thumbnailTargetId) return

    setThumbnailUploadingId(thumbnailTargetId)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'media-thumbnails')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '업로드 실패')
      }

      const updateResult = await updateMediaThumbnail(thumbnailTargetId, data.url)

      if (updateResult.error) {
        throw new Error('저장 실패')
      }

      alertHandler.showSuccess('썸네일이 변경되었습니다.')
      refetch()
    } catch (err) {
      alertHandler.showError(err instanceof Error ? err.message : '업로드 실패')
    } finally {
      setThumbnailUploadingId(null)
      setThumbnailTargetId(null)
      if (thumbnailInputRef.current) {
        thumbnailInputRef.current.value = ''
      }
    }
  }

  const handleCloudflareThumbailTimeChange = async (mediaId: number, cloudflareUid: string, time: string) => {
    const thumbnailUrl = getStreamThumbnailUrl(cloudflareUid, {
      time,
      width: 720,
      height: 1280,
      fit: 'crop',
    })

    const result = await updateMediaThumbnail(mediaId, thumbnailUrl)

    if (result.error) {
      logger.dbError('update', 'media_content', result.error)
      alertHandler.showError('변경에 실패했습니다.')
      return
    }

    alertHandler.showSuccess(`썸네일이 ${time} 시점으로 변경되었습니다.`)
    refetch()
  }

  return (
    <>
      {children({
        thumbnailInputRef,
        thumbnailUploadingId,
        handleThumbnailClick,
        handleCloudflareThumbailTimeChange,
        handleThumbnailFileChange,
      })}
    </>
  )
}

interface ThumbnailCellProps {
  item: Media
  thumbnailUploadingId: number | null
  onThumbnailClick: (mediaId: number, e: React.MouseEvent) => void
  onTimeChange: (mediaId: number, cloudflareUid: string, time: string) => void
}

export default function ThumbnailCell({
  item,
  thumbnailUploadingId,
  onThumbnailClick,
  onTimeChange,
}: ThumbnailCellProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div
        onClick={(e) => onThumbnailClick(item.id, e)}
        style={{
          width: '80px',
          height: '45px',
          borderRadius: '4px',
          overflow: 'hidden',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px dashed transparent',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary)'
          e.currentTarget.style.opacity = '0.8'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'transparent'
          e.currentTarget.style.opacity = '1'
        }}
        title="클릭하여 썸네일 변경"
      >
        {thumbnailUploadingId === item.id ? (
          <Loader2 size={20} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        ) : item.thumbnailUrl ? (
          <>
            <Image
              src={item.thumbnailUrl}
              alt={item.title}
              width={80}
              height={45}
              style={{ objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
            >
              <Upload size={16} style={{ color: 'white' }} />
            </div>
          </>
        ) : (
          <Upload size={20} style={{ color: 'var(--text-tertiary)' }} />
        )}
      </div>
      {item.cloudflareUid && (
        <Menu shadow="md" width={140}>
          <Menu.Target>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={(e) => e.stopPropagation()}
              title="썸네일 시간 선택"
            >
              <Clock size={14} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>썸네일 시점</Menu.Label>
            {THUMBNAIL_TIME_OPTIONS.map((opt) => (
              <Menu.Item
                key={opt.value}
                onClick={() => onTimeChange(item.id, item.cloudflareUid!, opt.value)}
              >
                {opt.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      )}
    </div>
  )
}
