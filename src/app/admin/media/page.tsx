'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Film, Plus, X, Save, ExternalLink, Play, Star, Image as ImageIcon, Cloud } from 'lucide-react'
import { DataTable, Column, VideoUpload } from '@/components/admin'
import CloudflareVideoUpload from '@/components/admin/CloudflareVideoUpload'
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

export default function MediaPage() {
  const supabase = useSupabaseContext()
  const alertHandler = useAlert()
  const [activeType, setActiveType] = useState<ContentType>('shorts')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewCloudflareUid, setPreviewCloudflareUid] = useState<string | null>(null)
  const [uploadMode, setUploadMode] = useState<'url' | 'cloudflare' | 'upload'>('cloudflare')

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
      width: '100px',
      render: (item) => (
        <div
          style={{
            width: '80px',
            height: '45px',
            borderRadius: '4px',
            overflow: 'hidden',
            background: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--card-border)',
          }}
        >
          {item.thumbnailUrl ? (
            <Image
              src={item.thumbnailUrl}
              alt={item.title}
              width={80}
              height={45}
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <ImageIcon size={20} style={{ color: 'var(--text-tertiary)' }} />
          )}
        </div>
      ),
    },
    {
      key: 'title',
      header: '제목',
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
        searchPlaceholder="제목으로 검색..."
        isLoading={isLoading}
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
                    <button
                      type="button"
                      onClick={() => setUploadMode('upload')}
                      className={`${styles.typeButton} ${uploadMode === 'upload' ? styles.active : ''}`}
                    >
                      Storage 업로드
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

                  {uploadMode === 'upload' && (
                    <VideoUpload
                      onUploadComplete={(url) => {
                        setEditingMedia({ ...editingMedia, videoUrl: url, cloudflareUid: null })
                      }}
                      onError={(error) => alertHandler.showError(error)}
                      bucketName="videos"
                      folderPath={editingMedia.contentType === 'shorts' ? 'shorts' : 'vod'}
                    />
                  )}

                  {editingMedia.cloudflareUid && (
                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#f6821f', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Cloud size={14} />
                      Cloudflare Stream: {editingMedia.cloudflareUid.slice(0, 12)}...
                    </div>
                  )}

                  {editingMedia.videoUrl && !editingMedia.cloudflareUid && uploadMode !== 'url' && (
                    <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-tertiary)' }}>
                      업로드 완료: {editingMedia.videoUrl.split('/').pop()}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label>썸네일 URL (선택)</label>
                  <input
                    type="text"
                    value={editingMedia.thumbnailUrl || ''}
                    onChange={(e) =>
                      setEditingMedia({ ...editingMedia, thumbnailUrl: e.target.value })
                    }
                    className={styles.input}
                    placeholder="https://... (Cloudflare 업로드 시 자동 생성)"
                  />
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
