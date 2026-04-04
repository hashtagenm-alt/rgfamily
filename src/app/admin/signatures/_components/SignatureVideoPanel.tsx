'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Loader2, ExternalLink } from 'lucide-react'
import type { SignatureVideoWithMember, OrgMemberItem } from '@/lib/actions/signatures'
import type { SignatureUI } from './types'
import MemberVideoCard from './MemberVideoCard'

interface SignatureVideoPanelProps {
  sig: SignatureUI
  isLoading: boolean
  videos: SignatureVideoWithMember[]
  members: OrgMemberItem[]
  addingVideoMemberId: number | null
  newVideoUrl: string
  videoUploadMode: 'url' | 'upload'
  onSetAddingMemberId: (id: number | null) => void
  onSetNewVideoUrl: (url: string) => void
  onSetVideoUploadMode: (mode: 'url' | 'upload') => void
  onAddVideo: (sigId: number, memberId: number, videoUrl: string, vimeoId?: string) => void
  onDeleteVideo: (video: SignatureVideoWithMember) => void
  onTogglePublished: (video: SignatureVideoWithMember) => void
  onPreviewVideo: (url: string) => void
  onError: (error: string) => void
}

export default function SignatureVideoPanel({
  sig,
  isLoading,
  videos,
  members,
  addingVideoMemberId,
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
}: SignatureVideoPanelProps) {
  const router = useRouter()

  // Build member-to-video map
  const videoByMemberId = videos.reduce<Record<number, SignatureVideoWithMember>>((acc, v) => {
    acc[v.memberId] = v
    return acc
  }, {})

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      style={{
        background: 'var(--surface)',
        borderTop: '1px solid var(--card-border)',
        padding: '16px 20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          멤버별 시그니처 영상 ({videos.length}/{members.length})
        </span>
        <button
          onClick={() => router.push(`/admin/signatures/${sig.id}`)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid var(--card-border)',
            borderRadius: '6px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <ExternalLink size={12} />
          상세 페이지
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
          <Loader2 size={24} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {members.map((member) => {
            const video = videoByMemberId[member.id]
            const hasVideo = Boolean(video)
            const isAdding = addingVideoMemberId === member.id

            return (
              <MemberVideoCard
                key={member.id}
                sig={sig}
                member={member}
                video={video}
                hasVideo={hasVideo}
                isAdding={isAdding}
                newVideoUrl={newVideoUrl}
                videoUploadMode={videoUploadMode}
                onSetAddingMemberId={onSetAddingMemberId}
                onSetNewVideoUrl={onSetNewVideoUrl}
                onSetVideoUploadMode={onSetVideoUploadMode}
                onAddVideo={onAddVideo}
                onDeleteVideo={onDeleteVideo}
                onTogglePublished={onTogglePublished}
                onPreviewVideo={onPreviewVideo}
                onError={onError}
              />
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
