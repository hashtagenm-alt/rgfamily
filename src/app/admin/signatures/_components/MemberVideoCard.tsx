'use client'

import Image from 'next/image'
import { User, Play, Plus, Eye, EyeOff, Trash2, Link2, Upload } from 'lucide-react'
import CloudflareVideoUpload from '@/components/admin/CloudflareVideoUpload'
import { getStreamIframeUrl } from '@/lib/cloudflare'
import type { SignatureVideoWithMember, OrgMemberItem } from '@/lib/actions/signatures'
import type { SignatureUI } from './types'

export interface MemberVideoCardProps {
  sig: SignatureUI
  member: OrgMemberItem
  video: SignatureVideoWithMember | undefined
  hasVideo: boolean
  isAdding: boolean
  newVideoUrl: string
  videoUploadMode: 'url' | 'upload'
  onSetAddingMemberId: (id: number | null) => void
  onSetNewVideoUrl: (url: string) => void
  onSetVideoUploadMode: (mode: 'url' | 'upload') => void
  onAddVideo: (sigId: number, memberId: number, videoUrl: string, cloudflareUid?: string) => void
  onDeleteVideo: (video: SignatureVideoWithMember) => void
  onTogglePublished: (video: SignatureVideoWithMember) => void
  onPreviewVideo: (url: string) => void
  onError: (error: string) => void
}

export default function MemberVideoCard({
  sig,
  member,
  video,
  hasVideo,
  isAdding,
  newVideoUrl,
  videoUploadMode,
  onSetAddingMemberId,
  onSetNewVideoUrl,
  onSetVideoUploadMode,
  onAddVideo,
  onDeleteVideo,
  onTogglePublished,
  onPreviewVideo,
  onError,
}: MemberVideoCardProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '12px',
        background: hasVideo ? 'rgba(253, 104, 186, 0.08)' : 'var(--card-bg)',
        border: `1px solid ${hasVideo ? 'rgba(253, 104, 186, 0.3)' : 'var(--card-border)'}`,
        borderRadius: '12px',
        minWidth: isAdding ? '280px' : '100px',
        transition: 'all 0.2s',
      }}
    >
      {/* Member avatar */}
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `2px solid ${hasVideo ? 'var(--primary)' : 'var(--card-border)'}`,
          position: 'relative',
        }}
      >
        {member.imageUrl ? (
          <Image
            src={member.imageUrl}
            alt={member.name}
            width={48}
            height={48}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <User size={20} style={{ color: 'var(--text-tertiary)' }} />
        )}
        {hasVideo && (
          <div
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '18px',
              height: '18px',
              background: 'var(--primary)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Play size={10} fill="white" style={{ color: 'white' }} />
          </div>
        )}
      </div>

      {/* Member name */}
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center' }}>
        {member.name}
      </span>

      {/* Video action buttons */}
      {hasVideo && video ? (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => onTogglePublished(video)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              background: video.isPublished ? 'var(--primary)' : 'var(--surface)',
              border: video.isPublished ? 'none' : '1px solid var(--card-border)',
              borderRadius: '6px',
              cursor: 'pointer',
              color: video.isPublished ? 'white' : 'var(--text-tertiary)',
            }}
            title={video.isPublished ? '비공개로 전환' : '공개로 전환'}
          >
            {video.isPublished ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
          <button
            onClick={() => onPreviewVideo(video.videoUrl)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              background: 'var(--primary)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'white',
            }}
            title="영상 보기"
          >
            <Play size={12} />
          </button>
          <button
            onClick={() => onDeleteVideo(video)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              background: 'var(--color-error)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'white',
            }}
            title="영상 삭제"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ) : isAdding ? (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* URL/upload toggle */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => onSetVideoUploadMode('url')}
              style={{
                flex: 1,
                padding: '4px 8px',
                background: videoUploadMode === 'url' ? 'var(--primary)' : 'var(--surface)',
                border: '1px solid var(--card-border)',
                borderRadius: '4px',
                fontSize: '0.6875rem',
                color: videoUploadMode === 'url' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <Link2 size={10} style={{ marginRight: '2px' }} />
              URL
            </button>
            <button
              onClick={() => onSetVideoUploadMode('upload')}
              style={{
                flex: 1,
                padding: '4px 8px',
                background: videoUploadMode === 'upload' ? 'var(--primary)' : 'var(--surface)',
                border: '1px solid var(--card-border)',
                borderRadius: '4px',
                fontSize: '0.6875rem',
                color: videoUploadMode === 'upload' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <Upload size={10} style={{ marginRight: '2px' }} />
              업로드
            </button>
          </div>

          {videoUploadMode === 'url' ? (
            <>
              <input
                type="text"
                value={newVideoUrl}
                onChange={(e) => onSetNewVideoUrl(e.target.value)}
                placeholder="YouTube URL..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    onAddVideo(sig.id, member.id, newVideoUrl)
                  } else if (e.key === 'Escape') {
                    onSetAddingMemberId(null)
                    onSetNewVideoUrl('')
                  }
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => onAddVideo(sig.id, member.id, newVideoUrl)}
                  disabled={!newVideoUrl.trim()}
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: 'var(--primary)',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: 'white',
                    cursor: 'pointer',
                    opacity: newVideoUrl.trim() ? 1 : 0.5,
                  }}
                >
                  등록
                </button>
                <button
                  onClick={() => {
                    onSetAddingMemberId(null)
                    onSetNewVideoUrl('')
                  }}
                  style={{
                    padding: '6px 10px',
                    background: 'var(--surface)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  취소
                </button>
              </div>
            </>
          ) : (
            <>
              <CloudflareVideoUpload
                onUploadComplete={(result) => {
                  const videoUrl = getStreamIframeUrl(result.uid)
                  onAddVideo(sig.id, member.id, videoUrl, result.uid)
                }}
                onError={(error) => onError(error)}
                skipThumbnailSelection
              />
              <button
                onClick={() => {
                  onSetAddingMemberId(null)
                  onSetNewVideoUrl('')
                }}
                style={{
                  padding: '6px 10px',
                  background: 'var(--surface)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
            </>
          )}
        </div>
      ) : (
        <button
          onClick={() => {
            onSetAddingMemberId(member.id)
            onSetNewVideoUrl('')
            onSetVideoUploadMode('url')
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 10px',
            background: 'transparent',
            border: '1px dashed var(--card-border)',
            borderRadius: '6px',
            fontSize: '0.6875rem',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <Plus size={12} />
          추가
        </button>
      )}
    </div>
  )
}
