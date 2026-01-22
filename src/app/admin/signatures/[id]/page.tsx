'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  ArrowLeft,
  Video,
  Plus,
  X,
  Save,
  ExternalLink,
  User,
  Play,
  Image as ImageIcon,
} from 'lucide-react'
import { DataTable, Column, AdminModal } from '@/components/admin'
import { useSupabaseContext } from '@/lib/context'
import { useAlert } from '@/lib/hooks'
import styles from '../../shared.module.css'

interface Signature {
  id: number
  sigNumber: number
  title: string
  description: string
  thumbnailUrl: string
  unit: 'excel' | 'crew'
}

interface SignatureVideo {
  id: number
  signatureId: number
  memberId: number
  memberName: string
  memberImageUrl: string | null
  videoUrl: string
  createdAt: string
}

interface OrgMember {
  id: number
  name: string
  imageUrl: string | null
  unit: 'excel' | 'crew'
}

export default function SignatureDetailPage() {
  const router = useRouter()
  const params = useParams()
  const signatureId = Number(params.id)
  const supabase = useSupabaseContext()
  const { showConfirm, showError, showSuccess } = useAlert()

  const [signature, setSignature] = useState<Signature | null>(null)
  const [videos, setVideos] = useState<SignatureVideo[]>([])
  const [members, setMembers] = useState<OrgMember[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isNew, setIsNew] = useState(true)
  const [editingVideo, setEditingVideo] = useState<Partial<SignatureVideo> | null>(null)

  // Video preview modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Fetch signature details
  const fetchSignature = useCallback(async () => {
    const { data, error } = await supabase
      .from('signatures')
      .select('*')
      .eq('id', signatureId)
      .single()

    if (error) {
      console.error('시그니처 정보 로드 실패:', error)
      showError('시그니처 정보를 불러올 수 없습니다.')
      router.push('/admin/signatures')
      return
    }

    setSignature({
      id: data.id,
      sigNumber: data.sig_number,
      title: data.title,
      description: data.description || '',
      thumbnailUrl: data.thumbnail_url || '',
      unit: data.unit,
    })
  }, [supabase, signatureId, router, showError])

  // Fetch videos
  const fetchVideos = useCallback(async () => {
    setIsLoading(true)

    const { data, error } = await supabase
      .from('signature_videos')
      .select('*, organization!member_id(name, image_url)')
      .eq('signature_id', signatureId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('영상 목록 로드 실패:', error)
    } else {
      setVideos(
        (data || []).map((v) => {
          const member = v.organization as { name: string; image_url: string | null } | null
          return {
            id: v.id,
            signatureId: v.signature_id,
            memberId: v.member_id,
            memberName: member?.name || '알 수 없음',
            memberImageUrl: member?.image_url || null,
            videoUrl: v.video_url,
            createdAt: v.created_at,
          }
        })
      )
    }

    setIsLoading(false)
  }, [supabase, signatureId])

  // Fetch organization members for dropdown
  const fetchMembers = useCallback(async () => {
    if (!signature) return

    const { data, error } = await supabase
      .from('organization')
      .select('id, name, image_url, unit')
      .eq('unit', signature.unit)
      .order('name')

    if (!error && data) {
      setMembers(
        data.map((m) => ({
          id: m.id,
          name: m.name,
          imageUrl: m.image_url,
          unit: m.unit,
        }))
      )
    }
  }, [supabase, signature])

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
    })
    setIsModalOpen(true)
  }

  // Open edit modal
  const openEditModal = (video: SignatureVideo) => {
    setIsNew(false)
    setEditingVideo({
      id: video.id,
      signatureId: video.signatureId,
      memberId: video.memberId,
      videoUrl: video.videoUrl,
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
      const { error } = await supabase.from('signature_videos').insert({
        signature_id: signatureId,
        member_id: editingVideo.memberId,
        video_url: editingVideo.videoUrl,
      })

      if (error) {
        console.error('영상 등록 실패:', error)
        showError('등록에 실패했습니다.')
        return
      }
      showSuccess('영상이 등록되었습니다.')
    } else {
      const { error } = await supabase
        .from('signature_videos')
        .update({
          member_id: editingVideo.memberId,
          video_url: editingVideo.videoUrl,
        })
        .eq('id', editingVideo.id)

      if (error) {
        console.error('영상 수정 실패:', error)
        showError('수정에 실패했습니다.')
        return
      }
      showSuccess('영상이 수정되었습니다.')
    }

    closeModal()
    fetchVideos()
  }

  // Delete video
  const handleDelete = async (video: SignatureVideo) => {
    const confirmed = await showConfirm(`${video.memberName}님의 영상을 삭제하시겠습니까?`, {
      title: '영상 삭제',
      variant: 'danger',
      confirmText: '삭제',
      cancelText: '취소',
    })
    if (!confirmed) return

    const { error } = await supabase.from('signature_videos').delete().eq('id', video.id)

    if (error) {
      console.error('영상 삭제 실패:', error)
      showError('삭제에 실패했습니다.')
    } else {
      showSuccess('영상이 삭제되었습니다.')
      fetchVideos()
    }
  }

  // Handle video preview
  const handleView = (video: SignatureVideo) => {
    setPreviewUrl(video.videoUrl)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Convert YouTube URL to embed URL
  const getEmbedUrl = (url: string) => {
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/)
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`
    }
    return url
  }

  const columns: Column<SignatureVideo>[] = [
    {
      key: 'memberImageUrl',
      header: '',
      width: '60px',
      render: (item) => (
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--card-border)',
          }}
        >
          {item.memberImageUrl ? (
            <Image
              src={item.memberImageUrl}
              alt={item.memberName}
              width={40}
              height={40}
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <User size={20} style={{ color: 'var(--text-tertiary)' }} />
          )}
        </div>
      ),
    },
    {
      key: 'memberName',
      header: '멤버',
      width: '150px',
      render: (item) => (
        <span style={{ fontWeight: 600 }}>{item.memberName}</span>
      ),
    },
    {
      key: 'videoUrl',
      header: '영상 URL',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'var(--text-tertiary)',
              fontSize: '0.8125rem',
            }}
          >
            {item.videoUrl}
          </span>
          <a
            href={item.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--primary)', flexShrink: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={14} />
          </a>
        </div>
      ),
    },
    {
      key: 'id',
      header: '미리보기',
      width: '100px',
      render: (item) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleView(item)
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
      ),
    },
    {
      key: 'createdAt',
      header: '등록일',
      width: '120px',
      render: (item) => formatDate(item.createdAt),
    },
  ]

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

      {/* Signature Info Card */}
      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          padding: '1.5rem',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
        }}
      >
        <div
          style={{
            width: '160px',
            height: '90px',
            borderRadius: '8px',
            overflow: 'hidden',
            background: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {signature.thumbnailUrl ? (
            <Image
              src={signature.thumbnailUrl}
              alt={signature.title}
              width={160}
              height={90}
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <ImageIcon size={32} style={{ color: 'var(--text-tertiary)' }} />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem',
            }}
          >
            <span
              className={`${styles.badge} ${signature.unit === 'excel' ? styles.badgeExcel : styles.badgeCrew}`}
            >
              {signature.unit === 'excel' ? '엑셀부' : '크루부'}
            </span>
            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
              #{signature.sigNumber}
            </span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            {signature.title}
          </h2>
          {signature.description && (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
              {signature.description}
            </p>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-tertiary)',
          }}
        >
          <Video size={20} />
          <span style={{ fontWeight: 600, fontSize: '1.25rem' }}>{videos.length}</span>
          <span style={{ fontSize: '0.875rem' }}>영상</span>
        </div>
      </div>

      {/* Videos Table */}
      <DataTable
        data={videos}
        columns={columns}
        onEdit={openEditModal}
        onDelete={handleDelete}
        searchPlaceholder="멤버 이름으로 검색..."
        isLoading={isLoading}
      />

      {/* Add/Edit Modal */}
      <AdminModal
        isOpen={isModalOpen}
        title={isNew ? '영상 추가' : '영상 수정'}
        onClose={closeModal}
        onSave={handleSave}
        saveLabel={isNew ? '추가' : '저장'}
      >
        <div className={styles.formGroup}>
          <label>멤버 선택</label>
          <select
            value={editingVideo?.memberId || ''}
            onChange={(e) =>
              setEditingVideo((prev) =>
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
          <label>영상 URL</label>
          <input
            type="text"
            value={editingVideo?.videoUrl || ''}
            onChange={(e) =>
              setEditingVideo((prev) => (prev ? { ...prev, videoUrl: e.target.value } : null))
            }
            className={styles.input}
            placeholder="https://youtube.com/watch?v=..."
          />
          <span className={styles.helperText} style={{ color: 'var(--text-tertiary)' }}>
            YouTube, 트위치 클립 등 영상 URL을 입력하세요
          </span>
        </div>
      </AdminModal>

      {/* Video Preview Modal */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewUrl(null)}
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
                <button onClick={() => setPreviewUrl(null)} className={styles.closeButton}>
                  <X size={20} />
                </button>
              </div>
              <div style={{ position: 'relative', paddingBottom: '56.25%' }}>
                <iframe
                  src={getEmbedUrl(previewUrl)}
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
