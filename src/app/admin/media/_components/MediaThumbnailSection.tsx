'use client'

import React from 'react'
import Image from 'next/image'
import { ImageUpload } from '@/components/admin'
import styles from '../../shared.module.css'
import { Media } from './types'

interface MediaThumbnailSectionProps {
  editingMedia: Partial<Media>
  setEditingMedia: React.Dispatch<React.SetStateAction<Partial<Media> | null>>
}

export default function MediaThumbnailSection({
  editingMedia,
  setEditingMedia,
}: MediaThumbnailSectionProps) {
  return (
    <div className={styles.formGroup}>
      <label>썸네일</label>
      <ImageUpload
        value={editingMedia.thumbnailUrl || ''}
        onChange={(url) =>
          setEditingMedia({ ...editingMedia, thumbnailUrl: url || '' })
        }
        folder="media-thumbnails"
      />

      {/* 현재 썸네일 미리보기 */}
      {editingMedia.thumbnailUrl && (
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
