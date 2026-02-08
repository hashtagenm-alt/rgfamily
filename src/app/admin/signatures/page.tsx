'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Image as ImageIcon, Plus, X, Save, Hash, Video, Upload, Loader2, Zap, ChevronDown, ChevronUp, User, Play, Trash2, Link2, ExternalLink } from 'lucide-react'
import Image from 'next/image'
import { DataTable, Column, ImageUpload } from '@/components/admin'
import CloudflareVideoUpload from '@/components/admin/CloudflareVideoUpload'
import { getStreamIframeUrl } from '@/lib/cloudflare'
import { useAdminCRUD, useAlert } from '@/lib/hooks'
import { useSupabaseContext } from '@/lib/context'
import styles from '../shared.module.css'

interface Signature {
  id: number
  sigNumber: number
  title: string
  description: string
  thumbnailUrl: string
  unit: 'excel' | 'crew'
  isGroup: boolean
  videoCount: number
  createdAt: string
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

export default function SignaturesPage() {
  const router = useRouter()
  const supabase = useSupabaseContext()
  const alertHandler = useAlert()
  const [activeUnit, setActiveUnit] = useState<'excel' | 'crew'>('excel')
  const [videoCounts, setVideoCounts] = useState<Record<number, number>>({})
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [targetSigId, setTargetSigId] = useState<number | null>(null)

  // 빠른 추가 모드
  const [quickAddMode, setQuickAddMode] = useState(false)
  const [quickAddData, setQuickAddData] = useState({ sigNumber: 1, title: '' })
  const [isQuickAdding, setIsQuickAdding] = useState(false)

  // 인라인 영상 관리 상태
  const [expandedSigId, setExpandedSigId] = useState<number | null>(null)
  const [sigVideos, setSigVideos] = useState<SignatureVideo[]>([])
  const [sigMembers, setSigMembers] = useState<OrgMember[]>([])
  const [isLoadingVideos, setIsLoadingVideos] = useState(false)
  const [addingVideoMemberId, setAddingVideoMemberId] = useState<number | null>(null)
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [videoUploadMode, setVideoUploadMode] = useState<'url' | 'upload'>('url')
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null)

  const {
    items: allSignatures,
    isLoading,
    isModalOpen,
    isNew,
    editingItem: editingSignature,
    setEditingItem: setEditingSignature,
    openAddModal: baseOpenAddModal,
    openEditModal,
    closeModal,
    handleDelete,
    refetch,
  } = useAdminCRUD<Signature>({
    tableName: 'signatures',
    defaultItem: {
      sigNumber: 1,
      title: '',
      description: '',
      thumbnailUrl: '',
      unit: activeUnit,
      isGroup: false,
      videoCount: 0,
    },
    orderBy: { column: 'sig_number', ascending: true },
    fromDbFormat: (row) => ({
      id: row.id as number,
      sigNumber: row.sig_number as number,
      title: row.title as string,
      description: (row.description as string) || '',
      thumbnailUrl: (row.thumbnail_url as string) || '',
      unit: row.unit as 'excel' | 'crew',
      isGroup: false,
      videoCount: 0,
      createdAt: row.created_at as string,
    }),
    toDbFormat: (item) => ({
      sig_number: item.sigNumber,
      title: item.title,
      description: item.description,
      thumbnail_url: item.thumbnailUrl,
      unit: item.unit,
    }),
    validate: (item) => {
      if (!item.sigNumber || item.sigNumber < 1) return '시그 번호를 입력해주세요.'
      if (!item.title) return '시그 제목을 입력해주세요.'
      return null
    },
    alertHandler,
  })

  // Fetch video counts for each signature
  useEffect(() => {
    const fetchVideoCounts = async () => {
      const sigIds = allSignatures.map((s) => s.id)
      if (sigIds.length === 0) return

      const { data, error } = await supabase
        .from('signature_videos')
        .select('signature_id')
        .in('signature_id', sigIds)

      if (!error && data) {
        const counts: Record<number, number> = {}
        data.forEach((row) => {
          counts[row.signature_id] = (counts[row.signature_id] || 0) + 1
        })
        setVideoCounts(counts)
      }
    }

    fetchVideoCounts()
  }, [allSignatures, supabase])

  // 인라인 영상 관리: 시그니처 확장 시 영상 및 멤버 로드
  const fetchSignatureVideos = useCallback(async (sigId: number, unit: 'excel' | 'crew') => {
    setIsLoadingVideos(true)

    // 해당 시그니처의 영상 로드
    const { data: videoData, error: videoError } = await supabase
      .from('signature_videos')
      .select('*, organization!member_id(name, image_url)')
      .eq('signature_id', sigId)
      .order('created_at', { ascending: true })

    if (!videoError && videoData) {
      setSigVideos(
        videoData.map((v) => {
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

    // 해당 부서 멤버 로드
    const { data: memberData, error: memberError } = await supabase
      .from('organization')
      .select('id, name, image_url, unit')
      .eq('unit', unit)
      .eq('is_active', true)
      .order('name')

    if (!memberError && memberData) {
      setSigMembers(
        memberData.map((m) => ({
          id: m.id,
          name: m.name,
          imageUrl: m.image_url,
          unit: m.unit,
        }))
      )
    }

    setIsLoadingVideos(false)
  }, [supabase])

  // 시그니처 행 확장/축소 토글
  const toggleExpand = useCallback((sig: Signature) => {
    if (expandedSigId === sig.id) {
      setExpandedSigId(null)
      setSigVideos([])
      setSigMembers([])
    } else {
      setExpandedSigId(sig.id)
      fetchSignatureVideos(sig.id, sig.unit)
    }
    setAddingVideoMemberId(null)
    setNewVideoUrl('')
  }, [expandedSigId, fetchSignatureVideos])

  // 인라인 영상 추가
  const handleAddVideo = useCallback(async (sigId: number, memberId: number, videoUrl: string, cloudflareUid?: string) => {
    if (!videoUrl.trim()) {
      alertHandler.showWarning('영상 URL을 입력해주세요.', '입력 오류')
      return
    }

    // 중복 체크
    const existingVideo = sigVideos.find(v => v.memberId === memberId)
    if (existingVideo) {
      alertHandler.showWarning('해당 멤버의 영상이 이미 등록되어 있습니다.', '중복 오류')
      return
    }

    const { error } = await supabase.from('signature_videos').insert({
      signature_id: sigId,
      member_id: memberId,
      video_url: videoUrl.trim(),
      ...(cloudflareUid ? { cloudflare_uid: cloudflareUid } : {}),
    })

    if (error) {
      console.error('영상 등록 실패:', error)
      alertHandler.showError('등록에 실패했습니다.', '오류')
      return
    }

    alertHandler.showSuccess('영상이 등록되었습니다.')
    setAddingVideoMemberId(null)
    setNewVideoUrl('')

    // 영상 목록 새로고침
    const sig = allSignatures.find(s => s.id === sigId)
    if (sig) {
      fetchSignatureVideos(sigId, sig.unit)
    }
    refetch() // 영상 카운트 업데이트
  }, [supabase, sigVideos, allSignatures, fetchSignatureVideos, alertHandler, refetch])

  // 인라인 영상 삭제
  const handleDeleteVideo = useCallback(async (video: SignatureVideo) => {
    const confirmed = await alertHandler.showConfirm(
      `${video.memberName}님의 영상을 삭제하시겠습니까?`,
      { title: '영상 삭제', variant: 'danger', confirmText: '삭제', cancelText: '취소' }
    )
    if (!confirmed) return

    const { error } = await supabase.from('signature_videos').delete().eq('id', video.id)

    if (error) {
      console.error('영상 삭제 실패:', error)
      alertHandler.showError('삭제에 실패했습니다.', '오류')
      return
    }

    alertHandler.showSuccess('영상이 삭제되었습니다.')

    // 영상 목록에서 제거
    setSigVideos(prev => prev.filter(v => v.id !== video.id))
    refetch() // 영상 카운트 업데이트
  }, [supabase, alertHandler, refetch])

  // YouTube URL을 embed URL로 변환
  const getEmbedUrl = (url: string) => {
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/)
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`
    }
    return url
  }

  const filteredSignatures = allSignatures
    .filter((s) => s.unit === activeUnit)
    .map((s) => ({ ...s, videoCount: videoCounts[s.id] || 0 }))

  const openAddModal = () => {
    const existingNumbers = allSignatures
      .filter((s) => s.unit === activeUnit)
      .map((s) => s.sigNumber)
    let nextNumber = 1
    while (existingNumbers.includes(nextNumber)) {
      nextNumber++
    }
    baseOpenAddModal()
    setEditingSignature((prev) => prev ? { ...prev, unit: activeUnit, sigNumber: nextNumber } : null)
  }

  const handleSave = useCallback(async () => {
    if (!editingSignature || !editingSignature.title || !editingSignature.sigNumber) {
      alertHandler.showWarning('시그 번호와 제목을 입력해주세요.', '입력 오류')
      return
    }

    const duplicate = allSignatures.find(
      (s) =>
        s.unit === editingSignature.unit &&
        s.sigNumber === editingSignature.sigNumber &&
        s.id !== editingSignature.id
    )
    if (duplicate) {
      alertHandler.showWarning(`${editingSignature.unit === 'excel' ? '엑셀부' : '크루부'}에 이미 ${editingSignature.sigNumber}번 시그가 있습니다.`, '중복 오류')
      return
    }

    const dbData = {
      sig_number: editingSignature.sigNumber,
      title: editingSignature.title,
      description: editingSignature.description || '',
      thumbnail_url: editingSignature.thumbnailUrl || '',
      unit: editingSignature.unit,
    }

    if (isNew) {
      const { error } = await supabase.from('signatures').insert(dbData)
      if (error) {
        console.error('시그 등록 실패:', error)
        if (error.code === '23505') {
          alertHandler.showError('해당 부서에 같은 시그 번호가 이미 존재합니다.', '등록 실패')
        } else {
          alertHandler.showError('등록에 실패했습니다.', '오류')
        }
        return
      }
    } else {
      const { error } = await supabase
        .from('signatures')
        .update(dbData)
        .eq('id', editingSignature.id!)
      if (error) {
        console.error('시그 수정 실패:', error)
        if (error.code === '23505') {
          alertHandler.showError('해당 부서에 같은 시그 번호가 이미 존재합니다.', '수정 실패')
        } else {
          alertHandler.showError('수정에 실패했습니다.', '오류')
        }
        return
      }
    }

    closeModal()
    refetch()
  }, [supabase, editingSignature, isNew, allSignatures, closeModal, refetch, alertHandler])

  const handleView = (sig: Signature) => {
    router.push(`/admin/signatures/${sig.id}`)
  }

  // 인라인 편집 핸들러
  const handleInlineEdit = useCallback(async (id: string | number, field: string, value: unknown) => {
    // sigNumber 변경 시 중복 검사
    if (field === 'sigNumber') {
      const numValue = typeof value === 'number' ? value : parseInt(String(value), 10)
      const targetItem = allSignatures.find(s => s.id === id)
      if (targetItem) {
        const duplicate = allSignatures.find(
          s => s.unit === targetItem.unit && s.sigNumber === numValue && s.id !== id
        )
        if (duplicate) {
          alertHandler.showWarning(
            `${targetItem.unit === 'excel' ? '엑셀부' : '크루부'}에 이미 ${numValue}번 시그가 있습니다.`,
            '중복 오류'
          )
          return
        }
      }
    }

    // DB 필드명 매핑 (sigNumber → sig_number)
    const dbFieldMap: Record<string, string> = {
      sigNumber: 'sig_number',
      title: 'title',
      thumbnailUrl: 'thumbnail_url',
    }
    const dbField = dbFieldMap[field] || field

    // Supabase update 실행
    const { error } = await supabase
      .from('signatures')
      .update({ [dbField]: value })
      .eq('id', id)

    if (error) {
      console.error('인라인 수정 실패:', error)
      alertHandler.showError('수정에 실패했습니다.', '오류')
      return
    }

    alertHandler.showSuccess('수정되었습니다.')
    refetch()
  }, [supabase, allSignatures, alertHandler, refetch])

  // 빠른 추가 모드 토글
  const toggleQuickAddMode = useCallback(() => {
    if (!quickAddMode) {
      // 다음 사용 가능한 번호 계산
      const existingNumbers = allSignatures
        .filter((s) => s.unit === activeUnit)
        .map((s) => s.sigNumber)
      let nextNumber = 1
      while (existingNumbers.includes(nextNumber)) {
        nextNumber++
      }
      setQuickAddData({ sigNumber: nextNumber, title: '' })
    }
    setQuickAddMode(!quickAddMode)
  }, [quickAddMode, allSignatures, activeUnit])

  // 빠른 추가 핸들러
  const handleQuickAdd = useCallback(async () => {
    if (!quickAddData.title.trim()) {
      alertHandler.showWarning('제목을 입력해주세요.', '입력 오류')
      return
    }

    // 중복 번호 검사
    const duplicate = allSignatures.find(
      s => s.unit === activeUnit && s.sigNumber === quickAddData.sigNumber
    )
    if (duplicate) {
      alertHandler.showWarning(
        `${activeUnit === 'excel' ? '엑셀부' : '크루부'}에 이미 ${quickAddData.sigNumber}번 시그가 있습니다.`,
        '중복 오류'
      )
      return
    }

    setIsQuickAdding(true)
    try {
      const { error } = await supabase.from('signatures').insert({
        sig_number: quickAddData.sigNumber,
        title: quickAddData.title.trim(),
        description: '',
        thumbnail_url: '',
        unit: activeUnit,
      })

      if (error) {
        console.error('빠른 추가 실패:', error)
        alertHandler.showError('추가에 실패했습니다.', '오류')
        return
      }

      alertHandler.showSuccess(`#${quickAddData.sigNumber} ${quickAddData.title} 추가됨`)
      refetch()

      // 다음 번호로 폼 초기화 (연속 추가 가능)
      const existingNumbers = [...allSignatures.map(s => s.unit === activeUnit ? s.sigNumber : 0), quickAddData.sigNumber]
      let nextNumber = 1
      while (existingNumbers.includes(nextNumber)) {
        nextNumber++
      }
      setQuickAddData({ sigNumber: nextNumber, title: '' })
    } finally {
      setIsQuickAdding(false)
    }
  }, [supabase, quickAddData, activeUnit, allSignatures, alertHandler, refetch])

  // 빠른 추가 키보드 핸들러
  const handleQuickAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleQuickAdd()
    } else if (e.key === 'Escape') {
      setQuickAddMode(false)
    }
  }

  // 인라인 썸네일 업로드 핸들러
  const handleInlineThumbnailClick = (sigId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setTargetSigId(sigId)
    fileInputRef.current?.click()
  }

  const handleInlineFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !targetSigId) return

    setUploadingId(targetSigId)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'signatures')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '업로드 실패')
      }

      // DB 업데이트
      const { error } = await supabase
        .from('signatures')
        .update({ thumbnail_url: data.url })
        .eq('id', targetSigId)

      if (error) {
        throw new Error('저장 실패')
      }

      alertHandler.showSuccess('썸네일이 변경되었습니다.')
      refetch()
    } catch (err) {
      alertHandler.showError(err instanceof Error ? err.message : '업로드 실패')
    } finally {
      setUploadingId(null)
      setTargetSigId(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const columns: Column<Signature>[] = [
    {
      key: 'expand',
      header: '',
      width: '50px',
      render: (item) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleExpand(item)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            background: expandedSigId === item.id ? 'var(--primary)' : 'var(--surface)',
            border: `1px solid ${expandedSigId === item.id ? 'var(--primary)' : 'var(--card-border)'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            color: expandedSigId === item.id ? 'white' : 'var(--text-secondary)',
            transition: 'all 0.2s',
          }}
          title={expandedSigId === item.id ? '영상 관리 닫기' : '영상 관리 열기'}
        >
          {expandedSigId === item.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      ),
    },
    {
      key: 'sigNumber',
      header: '번호',
      width: '80px',
      editable: true,
      editType: 'number',
      render: (item) => (
        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
          #{item.sigNumber}
        </span>
      ),
    },
    {
      key: 'thumbnailUrl',
      header: '썸네일',
      width: '100px',
      render: (item) => (
        <div
          onClick={(e) => handleInlineThumbnailClick(item.id, e)}
          style={{
            width: '80px',
            height: '45px',
            borderRadius: '4px',
            overflow: 'hidden',
            background: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            border: '2px dashed transparent',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--primary)'
            e.currentTarget.style.opacity = '0.8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'transparent'
            e.currentTarget.style.opacity = '1'
          }}
          title="클릭하여 썸네일 변경"
        >
          {uploadingId === item.id ? (
            <Loader2 size={20} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
          ) : item.thumbnailUrl ? (
            <>
              <Image
                src={item.thumbnailUrl}
                alt={item.title}
                width={80}
                height={45}
                style={{ objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
              >
                <Upload size={16} style={{ color: 'white' }} />
              </div>
            </>
          ) : (
            <Upload size={20} style={{ color: 'var(--text-tertiary)' }} />
          )}
        </div>
      ),
    },
    {
      key: 'title',
      header: '제목',
      editable: true,
      editType: 'text',
      render: (item) => (
        <span>{item.title}</span>
      ),
    },
    {
      key: 'videoCount',
      header: '영상',
      width: '100px',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Video size={14} style={{ color: item.videoCount > 0 ? 'var(--primary)' : 'var(--text-muted)' }} />
          <span style={{ fontWeight: 600, color: item.videoCount > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {item.videoCount}개
          </span>
        </div>
      ),
    },
  ]

  // 확장된 행에서 표시할 인라인 영상 관리 UI
  const renderExpandedContent = (sig: Signature) => {
    if (expandedSigId !== sig.id) return null

    // 멤버별 영상 상태 맵 생성
    const videoByMemberId = sigVideos.reduce<Record<number, SignatureVideo>>((acc, v) => {
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
            멤버별 시그니처 영상 ({sigVideos.length}/{sigMembers.length})
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

        {isLoadingVideos ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
            <Loader2 size={24} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {sigMembers.map((member) => {
              const video = videoByMemberId[member.id]
              const hasVideo = Boolean(video)
              const isAdding = addingVideoMemberId === member.id

              return (
                <div
                  key={member.id}
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
                  {/* 멤버 아바타 */}
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

                  {/* 멤버 이름 */}
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center' }}>
                    {member.name}
                  </span>

                  {/* 영상 액션 버튼 */}
                  {hasVideo ? (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => setPreviewVideoUrl(video.videoUrl)}
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
                        onClick={() => handleDeleteVideo(video)}
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
                      {/* URL/업로드 토글 */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => setVideoUploadMode('url')}
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
                          onClick={() => setVideoUploadMode('upload')}
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
                            onChange={(e) => setNewVideoUrl(e.target.value)}
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
                                handleAddVideo(sig.id, member.id, newVideoUrl)
                              } else if (e.key === 'Escape') {
                                setAddingVideoMemberId(null)
                                setNewVideoUrl('')
                              }
                            }}
                            autoFocus
                          />
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => handleAddVideo(sig.id, member.id, newVideoUrl)}
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
                                setAddingVideoMemberId(null)
                                setNewVideoUrl('')
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
                              handleAddVideo(sig.id, member.id, videoUrl, result.uid)
                            }}
                            onError={(error) => alertHandler.showError(error)}
                            skipThumbnailSelection
                          />
                          <button
                            onClick={() => {
                              setAddingVideoMemberId(null)
                              setNewVideoUrl('')
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
                        setAddingVideoMemberId(member.id)
                        setNewVideoUrl('')
                        setVideoUploadMode('url')
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
            })}
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <ImageIcon size={24} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>시그니처 관리</h1>
            <p className={styles.subtitle}>시그별 리액션 영상 관리</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={toggleQuickAddMode}
            className={styles.addButton}
            style={{
              background: quickAddMode ? 'var(--primary)' : 'transparent',
              border: '1px solid var(--primary)',
              color: quickAddMode ? 'white' : 'var(--primary)',
            }}
          >
            <Zap size={18} />
            빠른 추가
          </button>
          <button onClick={openAddModal} className={styles.addButton}>
            <Plus size={18} />
            시그 추가
          </button>
        </div>
      </header>

      {/* Unit Tabs */}
      <div className={styles.typeSelector}>
        <button
          onClick={() => setActiveUnit('excel')}
          className={`${styles.typeButton} ${activeUnit === 'excel' ? styles.active : ''}`}
        >
          엑셀부
        </button>
        <button
          onClick={() => setActiveUnit('crew')}
          className={`${styles.typeButton} ${activeUnit === 'crew' ? styles.active : ''}`}
        >
          크루부
        </button>
      </div>

      {/* 빠른 추가 폼 */}
      <AnimatePresence>
        {quickAddMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: 'var(--card-bg)',
              border: '2px dashed var(--primary)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Hash size={16} style={{ color: 'var(--primary)' }} />
                <input
                  type="number"
                  value={quickAddData.sigNumber}
                  onChange={(e) => setQuickAddData(prev => ({ ...prev, sigNumber: parseInt(e.target.value) || 1 }))}
                  onKeyDown={handleQuickAddKeyDown}
                  min={1}
                  style={{
                    width: '60px',
                    padding: '8px 12px',
                    border: '1px solid var(--card-border)',
                    borderRadius: '4px',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                />
              </div>
              <input
                type="text"
                value={quickAddData.title}
                onChange={(e) => setQuickAddData(prev => ({ ...prev, title: e.target.value }))}
                onKeyDown={handleQuickAddKeyDown}
                placeholder="시그 제목 입력 후 Enter..."
                autoFocus
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid var(--card-border)',
                  borderRadius: '4px',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              />
              <button
                onClick={handleQuickAdd}
                disabled={isQuickAdding || !quickAddData.title.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  opacity: isQuickAdding || !quickAddData.title.trim() ? 0.6 : 1,
                }}
              >
                {isQuickAdding ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
                추가
              </button>
              <button
                onClick={() => setQuickAddMode(false)}
                style={{
                  padding: '8px',
                  background: 'transparent',
                  border: '1px solid var(--card-border)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                <X size={16} />
              </button>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              Enter: 추가 · Escape: 닫기 · 연속 추가 가능
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <DataTable
        data={filteredSignatures}
        columns={columns}
        onView={handleView}
        onEdit={openEditModal}
        onDelete={handleDelete}
        onInlineEdit={handleInlineEdit}
        searchPlaceholder="시그 제목으로 검색..."
        isLoading={isLoading}
      />

      {/* 확장된 시그니처 영상 관리 패널 */}
      <AnimatePresence>
        {expandedSigId && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              marginTop: '-1px',
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '0 0 12px 12px',
              overflow: 'hidden',
            }}
          >
            {filteredSignatures.map((sig) => (
              <div key={sig.id}>
                {renderExpandedContent(sig)}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 영상 미리보기 모달 */}
      <AnimatePresence>
        {previewVideoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewVideoUrl(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '900px',
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '16px',
                overflow: 'hidden',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--card-border)',
              }}>
                <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>영상 미리보기</h2>
                <button
                  onClick={() => setPreviewVideoUrl(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    background: 'var(--surface)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
                <iframe
                  src={getEmbedUrl(previewVideoUrl)}
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

      {/* 인라인 썸네일 업로드용 숨김 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInlineFileChange}
        style={{ display: 'none' }}
      />

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && editingSignature && (
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
                <h2>{isNew ? '시그 추가' : '시그 수정'}</h2>
                <button onClick={closeModal} className={styles.closeButton}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>
                      <Hash size={14} style={{ marginRight: '4px' }} />
                      시그 번호
                    </label>
                    <input
                      type="number"
                      value={editingSignature.sigNumber || ''}
                      onChange={(e) =>
                        setEditingSignature({ ...editingSignature, sigNumber: parseInt(e.target.value) || 0 })
                      }
                      className={styles.input}
                      placeholder="1"
                      min={1}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>부서</label>
                    <div className={styles.typeSelector}>
                      <button
                        type="button"
                        onClick={() => setEditingSignature({ ...editingSignature, unit: 'excel' })}
                        className={`${styles.typeButton} ${editingSignature.unit === 'excel' ? styles.active : ''}`}
                      >
                        엑셀부
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSignature({ ...editingSignature, unit: 'crew' })}
                        className={`${styles.typeButton} ${editingSignature.unit === 'crew' ? styles.active : ''}`}
                      >
                        크루부
                      </button>
                    </div>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>시그 제목</label>
                  <input
                    type="text"
                    value={editingSignature.title || ''}
                    onChange={(e) =>
                      setEditingSignature({ ...editingSignature, title: e.target.value })
                    }
                    className={styles.input}
                    placeholder="예: valkyries"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>썸네일 이미지</label>
                  <ImageUpload
                    value={editingSignature.thumbnailUrl || ''}
                    onChange={(url) =>
                      setEditingSignature({ ...editingSignature, thumbnailUrl: url || '' })
                    }
                    folder="signatures"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>설명 (선택)</label>
                  <textarea
                    value={editingSignature.description || ''}
                    onChange={(e) =>
                      setEditingSignature({ ...editingSignature, description: e.target.value })
                    }
                    className={styles.textarea}
                    placeholder="시그에 대한 설명..."
                    rows={3}
                  />
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
    </div>
  )
}
