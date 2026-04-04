'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'
import { useAlert } from '@/lib/hooks'
import {
  getSignatureDetail,
  getSignatureVideosAdmin,
  getBjMembersByUnit,
  createSignatureVideo,
  updateSignatureVideo,
  deleteSignatureVideo as deleteSignatureVideoAction,
  toggleSignatureVideoPublished,
} from '@/lib/actions/signatures'
import { logger } from '@/lib/utils/logger'
import styles from '../../shared.module.css'
import {
  SignatureInfoCard,
  VideoTable,
  VideoFormModal,
  VideoPreviewModal,
} from './_components'
import type { SignatureInfo, SignatureVideoWithMember, OrgMemberItem } from './_components'

export default function SignatureDetailPage() {
  const router = useRouter()
  const params = useParams()
  const signatureId = Number(params.id)
  const { showConfirm, showError, showSuccess } = useAlert()

  const [signature, setSignature] = useState<SignatureInfo | null>(null)
  const [videos, setVideos] = useState<SignatureVideoWithMember[]>([])
  const [members, setMembers] = useState<OrgMemberItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isNew, setIsNew] = useState(true)
  const [editingVideo, setEditingVideo] = useState<Partial<SignatureVideoWithMember> | null>(null)

  // Video preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Fetch signature details
  const fetchSignature = useCallback(async () => {
    const result = await getSignatureDetail(signatureId)

    if (result.error || !result.data) {
      showError('시그니처 정보를 불러올 수 없습니다.')
      router.push('/admin/signatures')
      return
    }

    setSignature({
      id: result.data.id,
      sigNumber: result.data.sig_number,
      title: result.data.title,
      description: result.data.description || '',
      thumbnailUrl: result.data.thumbnail_url || '',
      unit: result.data.unit,
    })
  }, [signatureId, router, showError])

  // Fetch videos
  const fetchVideos = useCallback(async () => {
    setIsLoading(true)

    const result = await getSignatureVideosAdmin(signatureId)

    if (result.error) {
      logger.dbError('select', 'signature_videos', result.error)
    } else if (result.data) {
      setVideos(result.data)
    }

    setIsLoading(false)
  }, [signatureId])

  // Fetch organization members for dropdown
  const fetchMembers = useCallback(async () => {
    if (!signature) return

    const result = await getBjMembersByUnit(signature.unit)

    if (!result.error && result.data) {
      setMembers(result.data)
    }
  }, [signature])

  useEffect(() => {
    fetchSignature()
  }, [fetchSignature])

  useEffect(() => {
    if (signature) {
      fetchVideos()
      fetchMembers()
    }
  }, [signature, fetchVideos, fetchMembers])

  // Open add modal
  const openAddModal = () => {
    setIsNew(true)
    setEditingVideo({
      signatureId,
      memberId: 0,
      videoUrl: '',
      vimeoId: null,
    })
    setIsModalOpen(true)
  }

  // Open edit modal
  const openEditModal = (video: SignatureVideoWithMember) => {
    setIsNew(false)
    setEditingVideo({
      id: video.id,
      signatureId: video.signatureId,
      memberId: video.memberId,
      videoUrl: video.videoUrl,
      vimeoId: video.vimeoId,
    })
    setIsModalOpen(true)
  }

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false)
    setEditingVideo(null)
  }

  // Save video
  const handleSave = async () => {
    if (!editingVideo?.memberId || !editingVideo?.videoUrl) {
      showError('멤버와 영상 URL을 입력해주세요.')
      return
    }

    // Check for duplicate member-signature combination
    if (isNew) {
      const duplicate = videos.find((v) => v.memberId === editingVideo.memberId)
      if (duplicate) {
        showError('이미 해당 멤버의 영상이 등록되어 있습니다.')
        return
      }
    }

    if (isNew) {
      const result = await createSignatureVideo({
        signature_id: signatureId,
        member_id: editingVideo.memberId,
        video_url: editingVideo.videoUrl,
        vimeo_id: editingVideo.vimeoId || null,
      })

      if (result.error) {
        showError(result.error)
        return
      }
      showSuccess('영상이 등록되었습니다.')
    } else {
      const result = await updateSignatureVideo(editingVideo.id!, {
        member_id: editingVideo.memberId,
        video_url: editingVideo.videoUrl,
        vimeo_id: editingVideo.vimeoId || null,
      })

      if (result.error) {
        showError(result.error)
        return
      }
      showSuccess('영상이 수정되었습니다.')
    }

    closeModal()
    fetchVideos()
  }

  // Delete video
  const handleDelete = async (video: SignatureVideoWithMember) => {
    const confirmed = await showConfirm(`${video.memberName}님의 영상을 삭제하시겠습니까?`, {
      title: '영상 삭제',
      variant: 'danger',
      confirmText: '삭제',
      cancelText: '취소',
    })
    if (!confirmed) return

    const result = await deleteSignatureVideoAction(video.id)

    if (result.error) {
      showError(result.error)
    } else {
      showSuccess('영상이 삭제되었습니다.')
      fetchVideos()
    }
  }

  // Toggle published
  const handleTogglePublished = async (video: SignatureVideoWithMember) => {
    const newPublished = !video.isPublished
    const result = await toggleSignatureVideoPublished(video.id, newPublished)

    if (result.error) {
      showError(result.error)
      return
    }

    showSuccess(newPublished ? '공개로 전환되었습니다.' : '비공개로 전환되었습니다.')
    setVideos(prev => prev.map(v => v.id === video.id ? { ...v, isPublished: newPublished } : v))
  }

  // Get vimeo id for preview
  const getPreviewVimeoId = (): string | null => {
    if (!previewUrl) return null
    const video = videos.find((v) => v.videoUrl === previewUrl)
    return video?.vimeoId || null
  }

  if (!signature) {
    return (
      <div className={styles.page}>
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-tertiary)' }}>
          로딩 중...
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            onClick={() => router.push('/admin/signatures')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              background: 'var(--surface)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className={styles.title}>
              #{signature.sigNumber} {signature.title}
            </h1>
            <p className={styles.subtitle}>
              {signature.unit === 'excel' ? '엑셀부' : '크루부'} 시그니처 영상 관리
            </p>
          </div>
        </div>
        <button onClick={openAddModal} className={styles.addButton}>
          <Plus size={18} />
          영상 추가
        </button>
      </header>

      <SignatureInfoCard signature={signature} videoCount={videos.length} />

      <VideoTable
        videos={videos}
        isLoading={isLoading}
        onEdit={openEditModal}
        onDelete={handleDelete}
        onTogglePublished={handleTogglePublished}
        onPreview={(video) => setPreviewUrl(video.videoUrl)}
      />

      <VideoFormModal
        isOpen={isModalOpen}
        isNew={isNew}
        editingVideo={editingVideo}
        members={members}
        onClose={closeModal}
        onSave={handleSave}
        onEditingVideoChange={setEditingVideo}
        onError={showError}
      />

      <VideoPreviewModal
        previewUrl={previewUrl}
        vimeoId={getPreviewVimeoId()}
        onClose={() => setPreviewUrl(null)}
      />
    </div>
  )
}
