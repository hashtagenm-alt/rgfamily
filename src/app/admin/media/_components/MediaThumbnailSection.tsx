'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { getStreamThumbnailUrl } from '@/lib/cloudflare'
import { ImageUpload } from '@/components/admin'
import styles from '../../shared.module.css'
import { Media, THUMBNAIL_TIME_OPTIONS } from './types'

interface MediaThumbnailSectionProps {
  editingMedia: Partial<Media>
  setEditingMedia: React.Dispatch<React.SetStateAction<Partial<Media> | null>>
}

export default function MediaThumbnailSection({
  editingMedia,
  setEditingMedia,
}: MediaThumbnailSectionProps) {
  const [thumbnailMode, setThumbnailMode] = useState<'auto' | 'upload' | 'time'>('auto')
  const [selectedThumbnailTime, setSelectedThumbnailTime] = useState('0s')

  return (
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
                width: 180,
                height: 320,
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
                      width: 720,
                      height: 1280,
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
                  <div style={{ position: 'relative', aspectRatio: '9/16', height: '120px' }}>
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
          <div style={{ width: '90px', height: '160px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
            <Image
              src={editingMedia.thumbnailUrl}
              alt="썸네일 미리보기"
              width={90}
              height={160}
              style={{ objectFit: 'cover' }}
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  )
}
