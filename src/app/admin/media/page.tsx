'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Film, Plus, X, Save, ExternalLink, Play, Star, Image as ImageIcon, Cloud, Upload, Loader2, Clock } from 'lucide-react'
import { DataTable, Column, ImageUpload } from '@/components/admin'
import { Menu, ActionIcon } from '@mantine/core'
import CloudflareVideoUpload from '@/components/admin/CloudflareVideoUpload'
import { getStreamThumbnailUrl } from '@/lib/cloudflare'
import { useAdminCRUD, useAlert } from '@/lib/hooks'
import { useSupabaseContext } from '@/lib/context'
import styles from '../shared.module.css'

type ContentType = 'shorts' | 'vod'

interface Media {
  id: number
  title: string
  description: string
  contentType: ContentType
  videoUrl: string
  thumbnailUrl: string
  cloudflareUid: string | null
  unit: 'excel' | 'crew' | null
  isFeatured: boolean
  createdAt: string
}

// Cloudflare 썸네일 시간 옵션 (초 단위)
const THUMBNAIL_TIME_OPTIONS = [
  { value: '0s', label: '시작 (0초)' },
  { value: '5s', label: '5초' },
  { value: '10s', label: '10초' },
  { value: '15s', label: '15초' },
  { value: '30s', label: '30초' },
  { value: '60s', label: '1분' },
  { value: '120s', label: '2분' },
  { value: '300s', label: '5분' },
]

export default function MediaPage() {
  const supabase = useSupabaseContext()
  const alertHandler = useAlert()
  const [activeType, setActiveType] = useState<ContentType>('shorts')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewCloudflareUid, setPreviewCloudflareUid] = useState<string | null>(null)
  const [uploadMode, setUploadMode] = useState<'url' | 'cloudflare'>('cloudflare')
  const [thumbnailMode, setThumbnailMode] = useState<'auto' | 'upload' | 'time'>('auto')
  const [selectedThumbnailTime, setSelectedThumbnailTime] = useState('0s')
  const [thumbnailUploadingId, setThumbnailUploadingId] = useState<number | null>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const [thumbnailTargetId, setThumbnailTargetId] = useState<number | null>(null)

  const {
    items: allMediaList,
    isLoading,
    isModalOpen,
    isNew,
    editingItem: editingMedia,
    setEditingItem: setEditingMedia,
    openAddModal: baseOpenAddModal,
    openEditModal,
    closeModal,
    handleSave,
    handleDelete: baseHandleDelete,
    refetch,
  } = useAdminCRUD<Media>({
    tableName: 'media_content',
    defaultItem: {
      title: '',
      description: '',
      contentType: activeType,
      videoUrl: '',
      thumbnailUrl: '',
      cloudflareUid: null,
      unit: null,
      isFeatured: false,
    },
    orderBy: { column: 'created_at', ascending: false },
    fromDbFormat: (row) => ({
      id: row.id as number,
      title: row.title as string,
      description: (row.description as string) || '',
      contentType: row.content_type as ContentType,
      videoUrl: row.video_url as string,
      thumbnailUrl: (row.thumbnail_url as string) || '',
      cloudflareUid: (row.cloudflare_uid as string) || null,
      unit: row.unit as 'excel' | 'crew' | null,
      isFeatured: row.is_featured as boolean,
      createdAt: row.created_at as string,
    }),
    toDbFormat: (item) => ({
      title: item.title,
      description: item.description,
      content_type: item.contentType,
      video_url: item.videoUrl,
      thumbnail_url: item.thumbnailUrl,
      cloudflare_uid: item.cloudflareUid,
      unit: item.unit,
      is_featured: item.isFeatured,
    }),
    validate: (item) => {
      if (!item.title) return '제목을 입력해주세요.'
      if (!item.videoUrl && !item.cloudflareUid) return '영상을 업로드하거나 URL을 입력해주세요.'
      return null
    },
    alertHandler,
  })

  // 삭제 시 Cloudflare 영상도 함께 삭제
  const handleDelete = async (media: Media) => {
    if (media.cloudflareUid) {
      try {
        await fetch(`/api/cloudflare-stream/${media.cloudflareUid}`, { method: 'DELETE' })
      } catch (e) {
        console.error('Cloudflare 영상 삭제 실패:', e)
      }
    }
    baseHandleDelete(media)
  }

  // Toggle featured status
  const handleToggleFeatured = async (media: Media) => {
    const newFeatured = !media.isFeatured
    const { error } = await supabase
      .from('media_content')
      .update({ is_featured: newFeatured })
      .eq('id', media.id)

    if (error) {
      console.error('추천 상태 변경 실패:', error)
      alertHandler.showError('변경에 실패했습니다.')
    } else {
      alertHandler.showSuccess(newFeatured ? '추천 콘텐츠로 설정되었습니다.' : '추천 해제되었습니다.')
      refetch()
    }
  }

  // 인라인 편집 핸들러
  const handleInlineEdit = useCallback(async (id: string | number, field: string, value: unknown) => {
    const dbFieldMap: Record<string, string> = {
      title: 'title',
      thumbnailUrl: 'thumbnail_url',
    }
    const dbField = dbFieldMap[field] || field

    const { error } = await supabase
      .from('media_content')
      .update({ [dbField]: value })
      .eq('id', id)

    if (error) {
      console.error('인라인 수정 실패:', error)
      alertHandler.showError('수정에 실패했습니다.')
      return
    }

    alertHandler.showSuccess('수정되었습니다.')
    refetch()
  }, [supabase, alertHandler, refetch])

  // 인라인 썸네일 업로드 클릭 핸들러
  const handleThumbnailClick = (mediaId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setThumbnailTargetId(mediaId)
    thumbnailInputRef.current?.click()
  }

  // 인라인 썸네일 파일 업로드 핸들러
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

      // DB 업데이트
      const { error } = await supabase
        .from('media_content')
        .update({ thumbnail_url: data.url })
        .eq('id', thumbnailTargetId)

      if (error) {
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

  // Cloudflare 썸네일 시간 변경 핸들러
  const handleCloudflareThumbailTimeChange = async (mediaId: number, cloudflareUid: string, time: string) => {
    const thumbnailUrl = getStreamThumbnailUrl(cloudflareUid, {
      time,
      width: 640,
      height: 360,
      fit: 'crop',
    })

    const { error } = await supabase
      .from('media_content')
      .update({ thumbnail_url: thumbnailUrl })
      .eq('id', mediaId)

    if (error) {
      console.error('썸네일 시간 변경 실패:', error)
      alertHandler.showError('변경에 실패했습니다.')
      return
    }

    alertHandler.showSuccess(`썸네일이 ${time} 시점으로 변경되었습니다.`)
    refetch()
  }

  // Convert URL to embed URL (YouTube or Cloudflare)
  const getEmbedUrl = (url: string, cloudflareUid?: string | null) => {
    if (cloudflareUid) {
      return `https://iframe.videodelivery.net/${cloudflareUid}`
    }
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/)
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`
    }
    return url
  }

  // Filter by activeType
  const mediaList = allMediaList.filter((m) => m.contentType === activeType)

  // Refetch when activeType changes
  useEffect(() => {
    refetch()
  }, [activeType, refetch])

  const openAddModal = () => {
    baseOpenAddModal()
    setEditingMedia((prev) => prev ? { ...prev, contentType: activeType } : null)
  }

  const handlePreview = (media: Media) => {
    setPreviewCloudflareUid(media.cloudflareUid)
    setPreviewUrl(media.videoUrl)
  }

  const closePreview = () => {
    setPreviewUrl(null)
    setPreviewCloudflareUid(null)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const columns: Column<Media>[] = [
    {
      key: 'thumbnailUrl',
      header: '썸네일',
      width: '120px',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div
            onClick={(e) => handleThumbnailClick(item.id, e)}
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
          {/* Cloudflare 영상인 경우 시간 선택 버튼 */}
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
                    onClick={() => handleCloudflareThumbailTimeChange(item.id, item.cloudflareUid!, opt.value)}
                  >
                    {opt.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          )}
        </div>
      ),
    },
    {
      key: 'title',
      header: '제목',
      editable: true,
      editType: 'text',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>{item.title}</span>
          {item.cloudflareUid && (
            <span title="Cloudflare Stream"><Cloud size={14} style={{ color: '#f6821f' }} /></span>
          )}
          {item.isFeatured && (
            <Star size={14} style={{ color: 'var(--color-warning)', fill: 'var(--color-warning)' }} />
          )}
        </div>
      ),
    },
    {
      key: 'unit',
      header: '부서',
      width: '100px',
      render: (item) => item.unit ? (
        <span className={`${styles.badge} ${item.unit === 'excel' ? styles.badgeExcel : styles.badgeCrew}`}>
          {item.unit === 'excel' ? '엑셀부' : '크루부'}
        </span>
      ) : <span style={{ color: 'var(--text-tertiary)' }}>-</span>,
    },
    {
      key: 'isFeatured',
      header: '추천',
      width: '80px',
      render: (item) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleToggleFeatured(item)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            background: item.isFeatured ? 'var(--color-warning)' : 'transparent',
            border: item.isFeatured ? 'none' : '1px solid var(--card-border)',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
          title={item.isFeatured ? '추천 해제' : '추천 설정'}
        >
          <Star
            size={16}
            style={{
              color: item.isFeatured ? 'white' : 'var(--text-tertiary)',
              fill: item.isFeatured ? 'white' : 'none',
            }}
          />
        </button>
      ),
    },
    {
      key: 'videoUrl',
      header: '재생',
      width: '100px',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handlePreview(item)
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Play size={12} />
            재생
          </button>
          {!item.cloudflareUid && item.videoUrl && (
            <a
              href={item.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--text-tertiary)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: '등록일',
      width: '120px',
      render: (item) => formatDate(item.createdAt),
    },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Film size={24} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>미디어 관리</h1>
            <p className={styles.subtitle}>숏폼/VOD 콘텐츠 관리</p>
          </div>
        </div>
        <button onClick={openAddModal} className={styles.addButton}>
          <Plus size={18} />
          미디어 추가
        </button>
      </header>

      {/* Type Tabs */}
      <div className={styles.typeSelector}>
        <button
          onClick={() => setActiveType('shorts')}
          className={`${styles.typeButton} ${activeType === 'shorts' ? styles.active : ''}`}
        >
          숏폼
        </button>
        <button
          onClick={() => setActiveType('vod')}
          className={`${styles.typeButton} ${activeType === 'vod' ? styles.active : ''}`}
        >
          VOD
        </button>
      </div>

      <DataTable
        data={mediaList}
        columns={columns}
        onEdit={openEditModal}
        onDelete={handleDelete}
        onInlineEdit={handleInlineEdit}
        searchPlaceholder="제목으로 검색..."
        isLoading={isLoading}
      />

      {/* 인라인 썸네일 업로드용 숨김 input */}
      <input
        ref={thumbnailInputRef}
        type="file"
        accept="image/*"
        onChange={handleThumbnailFileChange}
        style={{ display: 'none' }}
      />

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && editingMedia && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className={styles.modal}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2>{isNew ? '미디어 추가' : '미디어 수정'}</h2>
                <button onClick={closeModal} className={styles.closeButton}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>제목</label>
                  <input
                    type="text"
                    value={editingMedia.title || ''}
                    onChange={(e) =>
                      setEditingMedia({ ...editingMedia, title: e.target.value })
                    }
                    className={styles.input}
                    placeholder="영상 제목을 입력하세요"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>콘텐츠 유형</label>
                  <div className={styles.typeSelector}>
                    <button
                      type="button"
                      onClick={() => setEditingMedia({ ...editingMedia, contentType: 'shorts' })}
                      className={`${styles.typeButton} ${editingMedia.contentType === 'shorts' ? styles.active : ''}`}
                    >
                      숏폼
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingMedia({ ...editingMedia, contentType: 'vod' })}
                      className={`${styles.typeButton} ${editingMedia.contentType === 'vod' ? styles.active : ''}`}
                    >
                      VOD
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>부서</label>
                  <div className={styles.typeSelector}>
                    <button
                      type="button"
                      onClick={() => setEditingMedia({ ...editingMedia, unit: 'excel' })}
                      className={`${styles.typeButton} ${editingMedia.unit === 'excel' ? styles.active : ''}`}
                    >
                      엑셀부
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingMedia({ ...editingMedia, unit: 'crew' })}
                      className={`${styles.typeButton} ${editingMedia.unit === 'crew' ? styles.active : ''}`}
                    >
                      크루부
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>영상</label>
                  <div className={styles.typeSelector} style={{ marginBottom: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setUploadMode('cloudflare')}
                      className={`${styles.typeButton} ${uploadMode === 'cloudflare' ? styles.active : ''}`}
                    >
                      Cloudflare 업로드
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('url')}
                      className={`${styles.typeButton} ${uploadMode === 'url' ? styles.active : ''}`}
                    >
                      URL 입력
                    </button>
                  </div>

                  {uploadMode === 'cloudflare' && (
                    <CloudflareVideoUpload
                      onUploadComplete={({ uid, thumbnailUrl, duration }) => {
                        setEditingMedia({
                          ...editingMedia,
                          cloudflareUid: uid,
                          videoUrl: `https://iframe.videodelivery.net/${uid}`,
                          thumbnailUrl: thumbnailUrl || editingMedia.thumbnailUrl,
                        })
                      }}
                      onError={(error) => alertHandler.showError(error)}
                    />
                  )}

                  {uploadMode === 'url' && (
                    <input
                      type="text"
                      value={editingMedia.videoUrl || ''}
                      onChange={(e) =>
                        setEditingMedia({ ...editingMedia, videoUrl: e.target.value, cloudflareUid: null })
                      }
                      className={styles.input}
                      placeholder="https://youtube.com/..."
                    />
                  )}

                  {editingMedia.cloudflareUid && (
                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#f6821f', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Cloud size={14} />
                      Cloudflare Stream: {editingMedia.cloudflareUid.slice(0, 12)}...
                    </div>
                  )}

                </div>

                <div className={styles.formGroup}>
                  <label>썸네일</label>
                  <div className={styles.typeSelector} style={{ marginBottom: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setThumbnailMode('auto')}
                      className={`${styles.typeButton} ${thumbnailMode === 'auto' ? styles.active : ''}`}
                    >
                      자동
                    </button>
                    <button
                      type="button"
                      onClick={() => setThumbnailMode('upload')}
                      className={`${styles.typeButton} ${thumbnailMode === 'upload' ? styles.active : ''}`}
                    >
                      이미지 업로드
                    </button>
                    {editingMedia.cloudflareUid && (
                      <button
                        type="button"
                        onClick={() => setThumbnailMode('time')}
                        className={`${styles.typeButton} ${thumbnailMode === 'time' ? styles.active : ''}`}
                      >
                        시간 선택
                      </button>
                    )}
                  </div>

                  {thumbnailMode === 'auto' && (
                    <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
                      Cloudflare 업로드 시 자동 생성됩니다.
                    </p>
                  )}

                  {thumbnailMode === 'upload' && (
                    <ImageUpload
                      value={editingMedia.thumbnailUrl || ''}
                      onChange={(url) =>
                        setEditingMedia({ ...editingMedia, thumbnailUrl: url || '' })
                      }
                      folder="media-thumbnails"
                    />
                  )}

                  {thumbnailMode === 'time' && editingMedia.cloudflareUid && (
                    <div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        영상에서 썸네일로 사용할 시점을 선택하세요.
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        {THUMBNAIL_TIME_OPTIONS.map((opt) => {
                          const thumbUrl = getStreamThumbnailUrl(editingMedia.cloudflareUid!, {
                            time: opt.value,
                            width: 160,
                            height: 90,
                            fit: 'crop',
                          })
                          const isSelected = editingMedia.thumbnailUrl?.includes(`time=${opt.value}`) ||
                            (opt.value === selectedThumbnailTime && !editingMedia.thumbnailUrl?.includes('time='))
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                const newThumbUrl = getStreamThumbnailUrl(editingMedia.cloudflareUid!, {
                                  time: opt.value,
                                  width: 640,
                                  height: 360,
                                  fit: 'crop',
                                })
                                setEditingMedia({ ...editingMedia, thumbnailUrl: newThumbUrl })
                                setSelectedThumbnailTime(opt.value)
                              }}
                              style={{
                                padding: 0,
                                border: isSelected ? '2px solid var(--primary)' : '2px solid var(--card-border)',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                background: 'var(--surface)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                            >
                              <div style={{ position: 'relative', aspectRatio: '16/9' }}>
                                <Image
                                  src={thumbUrl}
                                  alt={opt.label}
                                  fill
                                  style={{ objectFit: 'cover' }}
                                  unoptimized
                                />
                              </div>
                              <div style={{
                                padding: '4px',
                                fontSize: '11px',
                                fontWeight: isSelected ? 600 : 400,
                                color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                background: 'var(--card-bg)',
                              }}>
                                {opt.label}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* 현재 썸네일 미리보기 */}
                  {editingMedia.thumbnailUrl && thumbnailMode !== 'time' && (
                    <div style={{ marginTop: '12px' }}>
                      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>현재 썸네일:</p>
                      <div style={{ width: '160px', height: '90px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                        <Image
                          src={editingMedia.thumbnailUrl}
                          alt="썸네일 미리보기"
                          width={160}
                          height={90}
                          style={{ objectFit: 'cover' }}
                          unoptimized
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>설명 (선택)</label>
                  <textarea
                    value={editingMedia.description || ''}
                    onChange={(e) =>
                      setEditingMedia({ ...editingMedia, description: e.target.value })
                    }
                    className={styles.textarea}
                    placeholder="영상에 대한 설명..."
                    rows={3}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={editingMedia.isFeatured || false}
                      onChange={(e) =>
                        setEditingMedia({ ...editingMedia, isFeatured: e.target.checked })
                      }
                      className={styles.checkbox}
                    />
                    추천 콘텐츠로 설정
                  </label>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button onClick={closeModal} className={styles.cancelButton}>
                  취소
                </button>
                <button onClick={handleSave} className={styles.saveButton}>
                  <Save size={16} />
                  {isNew ? '추가' : '저장'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Preview Modal */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePreview}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '800px',
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '16px',
                overflow: 'hidden',
              }}
            >
              <div className={styles.modalHeader}>
                <h2>영상 미리보기</h2>
                <button onClick={closePreview} className={styles.closeButton}>
                  <X size={20} />
                </button>
              </div>
              <div style={{ position: 'relative', paddingBottom: '56.25%' }}>
                <iframe
                  src={getEmbedUrl(previewUrl, previewCloudflareUid)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
