'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Film, Plus } from 'lucide-react'
import { useAdminCRUD, useAlert } from '@/lib/hooks'
import {
  updateChildPartsTotalParts,
  deleteMediaChildren,
  getAdminVodParts,
} from '@/lib/actions/media'
import { logger } from '@/lib/utils/logger'
import styles from '../shared.module.css'
import {
  MediaTable,
  VodPartsPanel,
  MediaEditModal,
  MediaPreviewModal,
  AddPartModal,
} from './_components'
import type { Media, ContentType } from './_components'

export default function MediaPage() {
  const alertHandler = useAlert()
  const [activeType, setActiveType] = useState<ContentType>('shorts')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewVimeoId, setPreviewVimeoId] = useState<string | null>(null)

  // 멀티파트 VOD 상태
  const [expandedVodId, setExpandedVodId] = useState<number | null>(null)
  const [vodParts, setVodParts] = useState<Media[]>([])
  const [loadingParts, setLoadingParts] = useState(false)
  const [addPartModalOpen, setAddPartModalOpen] = useState(false)
  const [addPartTarget, setAddPartTarget] = useState<Media | null>(null)

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
      vimeoId: null,
      unit: null,
      isFeatured: false,
      isPublished: false,
      parentId: null,
      partNumber: 1,
      totalParts: 1,
      duration: null,
    },
    orderBy: { column: 'created_at', ascending: false },
    fromDbFormat: (row) => ({
      id: row.id as number,
      title: row.title as string,
      description: (row.description as string) || '',
      contentType: row.content_type as ContentType,
      videoUrl: row.video_url as string,
      thumbnailUrl: (row.thumbnail_url as string) || '',
      vimeoId: (row.vimeo_id as string) || null,
      unit: row.unit as 'excel' | 'crew' | null,
      isFeatured: row.is_featured as boolean,
      isPublished: row.is_published as boolean,
      createdAt: row.created_at as string,
      parentId: (row.parent_id as number) || null,
      partNumber: (row.part_number as number) || 1,
      totalParts: (row.total_parts as number) || 1,
      duration: (row.duration as number) || null,
    }),
    toDbFormat: (item) => ({
      title: item.title,
      description: item.description,
      content_type: item.contentType,
      video_url: item.videoUrl,
      thumbnail_url: item.thumbnailUrl,
      vimeo_id: item.vimeoId,
      unit: item.unit,
      is_featured: item.isFeatured,
      is_published: item.isPublished,
      parent_id: item.parentId,
      part_number: item.partNumber,
      total_parts: item.totalParts,
      duration: item.duration,
    }),
    beforeSave: async (item, isNewItem) => {
      // 기존 멀티파트 VOD의 total_parts 변경 시 자식 파트도 일괄 업데이트
      if (!isNewItem && item.id && item.totalParts && item.totalParts > 1) {
        await updateChildPartsTotalParts(item.id, item.totalParts)
      }
    },
    validate: (item) => {
      if (!item.title) return '제목을 입력해주세요.'
      if (!item.videoUrl && !item.vimeoId) return '영상을 업로드하거나 URL을 입력해주세요.'
      return null
    },
    alertHandler,
  })

  // 삭제 시 멀티파트인 경우 자식 파트도 연쇄 삭제
  const handleDelete = async (media: Media) => {
    // 자식 파트 삭제 (멀티파트 부모인 경우)
    if (media.totalParts > 1) {
      await deleteMediaChildren(media.id)
    }

    // 파트 목록 패널이 열려있으면 닫기
    if (expandedVodId === media.id) {
      setExpandedVodId(null)
    }

    baseHandleDelete(media)
  }

  // Filter by activeType
  const mediaList = allMediaList.filter((m) => m.contentType === activeType && m.parentId === null)

  // Refetch when activeType changes
  useEffect(() => {
    refetch()
  }, [activeType, refetch])

  const openAddModal = () => {
    baseOpenAddModal()
    setEditingMedia((prev) => prev ? { ...prev, contentType: activeType } : null)
  }

  const handlePreview = (media: Media) => {
    setPreviewVimeoId(media.vimeoId)
    setPreviewUrl(media.videoUrl)
  }

  const closePreview = () => {
    setPreviewUrl(null)
    setPreviewVimeoId(null)
  }

  // 멀티파트 VOD 파트 조회
  const fetchVodParts = useCallback(async (parentId: number) => {
    setLoadingParts(true)
    try {
      const result = await getAdminVodParts(parentId)
      if (result.error) throw new Error(result.error)

      setVodParts((result.data || []).map(row => ({
        id: row.id,
        title: row.title,
        description: row.description || '',
        contentType: row.content_type as ContentType,
        videoUrl: row.video_url,
        thumbnailUrl: row.thumbnail_url || '',
        vimeoId: row.vimeo_id || null,
        unit: row.unit as 'excel' | 'crew' | null,
        isFeatured: row.is_featured,
        isPublished: row.is_published,
        createdAt: row.created_at,
        parentId: row.parent_id || null,
        partNumber: row.part_number || 1,
        totalParts: row.total_parts || 1,
        duration: row.duration || null,
      })))
    } catch (e) {
      logger.dbError('select', 'media_content', e)
      alertHandler.showError('파트 목록을 불러오지 못했습니다.')
    } finally {
      setLoadingParts(false)
    }
  }, [alertHandler])

  // expandedVodId 변경 시 파트 조회
  useEffect(() => {
    if (expandedVodId) {
      fetchVodParts(expandedVodId)
    } else {
      setVodParts([])
    }
  }, [expandedVodId, fetchVodParts])

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

      <MediaTable
        mediaList={mediaList}
        activeType={activeType}
        isLoading={isLoading}
        expandedVodId={expandedVodId}
        setExpandedVodId={setExpandedVodId}
        setAddPartTarget={setAddPartTarget}
        setAddPartModalOpen={setAddPartModalOpen}
        onEdit={openEditModal}
        onDelete={handleDelete}
        onPreview={handlePreview}
        alertHandler={alertHandler}
        refetch={refetch}
      />

      {/* 멀티파트 VOD 파트 목록 패널 */}
      <AnimatePresence>
        {activeType === 'vod' && expandedVodId && (
          <VodPartsPanel
            expandedVodId={expandedVodId}
            vodParts={vodParts}
            loadingParts={loadingParts}
            onClose={() => setExpandedVodId(null)}
            onPreview={handlePreview}
          />
        )}
      </AnimatePresence>

      {/* Edit/Add Modal */}
      <AnimatePresence>
        {isModalOpen && editingMedia && (
          <MediaEditModal
            isNew={isNew}
            editingMedia={editingMedia}
            setEditingMedia={setEditingMedia}
            onClose={closeModal}
            onSave={handleSave}
            alertHandler={alertHandler}
          />
        )}
      </AnimatePresence>

      {/* Video Preview Modal */}
      <AnimatePresence>
        {previewUrl && (
          <MediaPreviewModal
            previewUrl={previewUrl}
            previewVimeoId={previewVimeoId}
            onClose={closePreview}
          />
        )}
      </AnimatePresence>

      {/* 파트 추가 모달 */}
      <AnimatePresence>
        {addPartModalOpen && addPartTarget && (
          <AddPartModal
            addPartTarget={addPartTarget}
            expandedVodId={expandedVodId}
            onClose={() => {
              setAddPartModalOpen(false)
              setAddPartTarget(null)
            }}
            onSuccess={refetch}
            onExpandVod={setExpandedVodId}
            fetchVodParts={fetchVodParts}
            alertHandler={alertHandler}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
