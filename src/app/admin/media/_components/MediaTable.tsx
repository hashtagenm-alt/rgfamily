'use client'

import { useCallback } from 'react'
import { Plus, ExternalLink, Play, Star, Eye, EyeOff } from 'lucide-react'
import { DataTable, Column } from '@/components/admin'
import {
  toggleMediaFeatured,
  toggleMediaPublished,
  inlineEditMedia,
} from '@/lib/actions/media'
import { logger } from '@/lib/utils/logger'
import styles from '../../shared.module.css'
import { Media, ContentType, formatDate } from './types'
import ThumbnailCell, { ThumbnailCellManager } from './ThumbnailCell'

interface MediaTableProps {
  mediaList: Media[]
  activeType: ContentType
  isLoading: boolean
  expandedVodId: number | null
  setExpandedVodId: (id: number | null) => void
  setAddPartTarget: (media: Media) => void
  setAddPartModalOpen: (open: boolean) => void
  onEdit: (item: Media) => void
  onDelete: (item: Media) => void
  onPreview: (media: Media) => void
  alertHandler: { showSuccess: (msg: string) => void; showError: (msg: string) => void }
  refetch: () => void
}

export default function MediaTable({
  mediaList,
  activeType,
  isLoading,
  expandedVodId,
  setExpandedVodId,
  setAddPartTarget,
  setAddPartModalOpen,
  onEdit,
  onDelete,
  onPreview,
  alertHandler,
  refetch,
}: MediaTableProps) {
  const handleToggleFeatured = async (media: Media) => {
    const newFeatured = !media.isFeatured
    const result = await toggleMediaFeatured(media.id, newFeatured)
    if (result.error) {
      logger.dbError('update', 'media_content', result.error)
      alertHandler.showError('변경에 실패했습니다.')
    } else {
      alertHandler.showSuccess(newFeatured ? '추천 콘텐츠로 설정되었습니다.' : '추천 해제되었습니다.')
      refetch()
    }
  }

  const handleTogglePublished = async (media: Media) => {
    const newPublished = !media.isPublished
    const result = await toggleMediaPublished(media.id, newPublished)
    if (result.error) {
      logger.dbError('update', 'media_content', result.error)
      alertHandler.showError('변경에 실패했습니다.')
      return
    }
    alertHandler.showSuccess(newPublished ? '공개로 전환되었습니다.' : '비공개로 전환되었습니다.')
    refetch()
  }

  const handleInlineEdit = useCallback(async (id: string | number, field: string, value: unknown) => {
    const dbFieldMap: Record<string, string> = {
      title: 'title',
      thumbnailUrl: 'thumbnail_url',
    }
    const dbField = dbFieldMap[field] || field
    const result = await inlineEditMedia(Number(id), dbField, value)
    if (result.error) {
      logger.dbError('update', 'media_content', result.error)
      alertHandler.showError('수정에 실패했습니다.')
      return
    }
    alertHandler.showSuccess('수정되었습니다.')
    refetch()
  }, [alertHandler, refetch])

  return (
    <ThumbnailCellManager alertHandler={alertHandler} refetch={refetch}>
      {({ thumbnailInputRef, thumbnailUploadingId, handleThumbnailClick, handleThumbnailFileChange }) => {
        const columns: Column<Media>[] = [
          {
            key: 'thumbnailUrl',
            header: '썸네일',
            width: '120px',
            render: (item) => (
              <ThumbnailCell
                item={item}
                thumbnailUploadingId={thumbnailUploadingId}
                onThumbnailClick={handleThumbnailClick}
              />
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
                {item.vimeoId && (
                  <span title="Vimeo" style={{ fontSize: '11px', color: '#1ab7ea', fontWeight: 600 }}>V</span>
                )}
                {item.isFeatured && (
                  <Star size={14} style={{ color: 'var(--color-warning)', fill: 'var(--color-warning)' }} />
                )}
              </div>
            ),
          },
          ...(activeType === 'vod' ? [{
            key: 'totalParts' as keyof Media,
            header: '파트',
            width: '140px',
            render: (item: Media) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {item.totalParts <= 1 ? (
                  <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>단일</span>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedVodId(expandedVodId === item.id ? null : item.id)
                    }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '2px 8px', background: 'var(--primary)', color: 'white',
                      border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {item.totalParts}파트
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setAddPartTarget(item)
                    setAddPartModalOpen(true)
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '2px',
                    padding: '2px 6px', background: 'transparent', color: 'var(--primary)',
                    border: '1px solid var(--primary)', borderRadius: '4px', fontSize: '11px', cursor: 'pointer',
                  }}
                >
                  <Plus size={12} />
                  추가
                </button>
              </div>
            ),
          }] : []),
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
            key: 'isPublished',
            header: '공개',
            width: '80px',
            render: (item) => (
              <button
                onClick={(e) => { e.stopPropagation(); handleTogglePublished(item) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px',
                  background: item.isPublished ? 'var(--primary)' : 'transparent',
                  border: item.isPublished ? 'none' : '1px solid var(--card-border)',
                  borderRadius: '6px', cursor: 'pointer',
                }}
                title={item.isPublished ? '비공개로 전환' : '공개로 전환'}
              >
                {item.isPublished ? (
                  <Eye size={16} style={{ color: 'white' }} />
                ) : (
                  <EyeOff size={16} style={{ color: 'var(--text-tertiary)' }} />
                )}
              </button>
            ),
          },
          {
            key: 'isFeatured',
            header: '추천',
            width: '80px',
            render: (item) => (
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleFeatured(item) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px',
                  background: item.isFeatured ? 'var(--color-warning)' : 'transparent',
                  border: item.isFeatured ? 'none' : '1px solid var(--card-border)',
                  borderRadius: '6px', cursor: 'pointer',
                }}
                title={item.isFeatured ? '추천 해제' : '추천 설정'}
              >
                <Star size={16} style={{
                  color: item.isFeatured ? 'white' : 'var(--text-tertiary)',
                  fill: item.isFeatured ? 'white' : 'none',
                }} />
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
                  onClick={(e) => { e.stopPropagation(); onPreview(item) }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '4px 10px', background: 'var(--primary)', color: 'white',
                    border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  <Play size={12} />
                  재생
                </button>
                {!item.vimeoId && item.videoUrl && (
                  <a
                    href={item.videoUrl} target="_blank" rel="noopener noreferrer"
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
          <>
            <DataTable
              data={mediaList}
              columns={columns}
              onEdit={onEdit}
              onDelete={onDelete}
              onInlineEdit={handleInlineEdit}
              searchPlaceholder="제목으로 검색..."
              isLoading={isLoading}
            />
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              onChange={handleThumbnailFileChange}
              style={{ display: 'none' }}
            />
          </>
        )
      }}
    </ThumbnailCellManager>
  )
}
