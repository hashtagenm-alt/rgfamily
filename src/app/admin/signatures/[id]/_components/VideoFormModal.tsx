import { useState } from 'react'
import { AdminModal, VideoUpload, CloudflareVideoUpload } from '@/components/admin'
import styles from '../../../shared.module.css'
import type { SignatureVideoWithMember, OrgMemberItem } from './types'

type UploadMode = 'url' | 'upload' | 'cloudflare'

interface VideoFormModalProps {
  isOpen: boolean
  isNew: boolean
  editingVideo: Partial<SignatureVideoWithMember> | null
  members: OrgMemberItem[]
  onClose: () => void
  onSave: () => void
  onEditingVideoChange: (updater: (prev: Partial<SignatureVideoWithMember> | null) => Partial<SignatureVideoWithMember> | null) => void
  onError: (message: string) => void
}

export function VideoFormModal({
  isOpen,
  isNew,
  editingVideo,
  members,
  onClose,
  onSave,
  onEditingVideoChange,
  onError,
}: VideoFormModalProps) {
  const [uploadMode, setUploadMode] = useState<UploadMode>('url')

  return (
    <AdminModal
      isOpen={isOpen}
      title={isNew ? '영상 추가' : '영상 수정'}
      onClose={onClose}
      onSave={onSave}
      saveLabel={isNew ? '추가' : '저장'}
    >
      <div className={styles.formGroup}>
        <label>멤버 선택</label>
        <select
          value={editingVideo?.memberId || ''}
          onChange={(e) =>
            onEditingVideoChange((prev) =>
              prev ? { ...prev, memberId: parseInt(e.target.value) || 0 } : null
            )
          }
          className={styles.select}
        >
          <option value="">멤버를 선택하세요</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.formGroup}>
        <label>영상</label>
        <div className={styles.typeSelector} style={{ marginBottom: '12px' }}>
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
            Supabase 업로드
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('cloudflare')}
            className={`${styles.typeButton} ${uploadMode === 'cloudflare' ? styles.active : ''}`}
            style={{ background: uploadMode === 'cloudflare' ? '#f38020' : undefined }}
          >
            Cloudflare 업로드
          </button>
        </div>

        {uploadMode === 'url' ? (
          <>
            <input
              type="text"
              value={editingVideo?.videoUrl || ''}
              onChange={(e) =>
                onEditingVideoChange((prev) => (prev ? { ...prev, videoUrl: e.target.value, cloudflareUid: null } : null))
              }
              className={styles.input}
              placeholder="https://youtube.com/watch?v=..."
            />
            <span className={styles.helperText} style={{ color: 'var(--text-tertiary)' }}>
              YouTube, 트위치 클립 등 영상 URL을 입력하세요
            </span>
          </>
        ) : uploadMode === 'upload' ? (
          <VideoUpload
            onUploadComplete={(url) => {
              onEditingVideoChange((prev) => (prev ? { ...prev, videoUrl: url, cloudflareUid: null } : null))
            }}
            onError={(error) => onError(error)}
            bucketName="videos"
            folderPath="signature-videos"
          />
        ) : (
          <CloudflareVideoUpload
            onUploadComplete={(result) => {
              onEditingVideoChange((prev) =>
                prev
                  ? {
                      ...prev,
                      videoUrl: `https://customer-${process.env.NEXT_PUBLIC_CLOUDFLARE_CUSTOMER_SUBDOMAIN || 'stream'}.cloudflarestream.com/${result.uid}/manifest/video.m3u8`,
                      cloudflareUid: result.uid,
                    }
                  : null
              )
            }}
            onError={(error) => onError(error)}
          />
        )}

        {editingVideo?.videoUrl && uploadMode === 'upload' && (
          <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-tertiary)' }}>
            업로드 완료: {editingVideo.videoUrl.split('/').pop()}
          </div>
        )}

        {editingVideo?.cloudflareUid && uploadMode === 'cloudflare' && (
          <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--success)' }}>
            Cloudflare UID: {editingVideo.cloudflareUid}
          </div>
        )}
      </div>
    </AdminModal>
  )
}
