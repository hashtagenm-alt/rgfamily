'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Image as ImageIcon, Plus, Zap } from 'lucide-react'
import { DataTable } from '@/components/admin'
import { useAlert } from '@/lib/hooks'
import {
  getSignaturesWithVideoCounts,
  createSignature,
  updateSignature,
  deleteSignature,
  getSignatureVideosAdmin,
  getBjMembersByUnit,
  createSignatureVideo,
  deleteSignatureVideo as deleteSignatureVideoAction,
  toggleSignatureVideoPublished,
  updateSignatureField,
} from '@/lib/actions/signatures'
import type { SignatureWithVideoCount, SignatureVideoWithMember } from '@/lib/actions/signatures'
import styles from '../shared.module.css'
import {
  SignatureFormModal,
  SignatureQuickAdd,
  SignatureVideoPanel,
  SignatureVideoPreview,
  useSignatureColumns,
} from './_components'
import type { SignatureUI } from './_components'

export default function SignaturesPage() {
  const router = useRouter()
  const alertHandler = useAlert()
  const [activeUnit, setActiveUnit] = useState<'excel' | 'crew'>('excel')
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [targetSigId, setTargetSigId] = useState<number | null>(null)

  // Data state
  const [allSignatures, setAllSignatures] = useState<SignatureUI[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isNew, setIsNew] = useState(true)
  const [editingSignature, setEditingSignature] = useState<Partial<SignatureUI> | null>(null)

  // Quick add state
  const [quickAddMode, setQuickAddMode] = useState(false)
  const [quickAddData, setQuickAddData] = useState({ sigNumber: 1, title: '' })
  const [isQuickAdding, setIsQuickAdding] = useState(false)

  // Inline video management state
  const [expandedSigId, setExpandedSigId] = useState<number | null>(null)
  const [sigVideos, setSigVideos] = useState<SignatureVideoWithMember[]>([])
  const [sigMembers, setSigMembers] = useState<import('@/lib/actions/signatures').OrgMemberItem[]>(
    []
  )
  const [isLoadingVideos, setIsLoadingVideos] = useState(false)
  const [addingVideoMemberId, setAddingVideoMemberId] = useState<number | null>(null)
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [videoUploadMode, setVideoUploadMode] = useState<'url' | 'upload'>('url')
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null)

  // ── Data fetching ──

  const fetchSignatures = useCallback(async () => {
    setIsLoading(true)
    const result = await getSignaturesWithVideoCounts()
    if (result.error) {
      alertHandler.showError(result.error)
    } else if (result.data) {
      setAllSignatures(
        result.data.map((s: SignatureWithVideoCount) => ({
          id: s.id,
          sigNumber: s.sig_number,
          title: s.title,
          description: s.description || '',
          thumbnailUrl: s.thumbnail_url || '',
          unit: s.unit,
          isGroup: ((s as unknown as Record<string, unknown>).is_group as boolean) ?? false,
          videoCount: s.videoCount,
          createdAt: s.created_at,
        }))
      )
    }
    setIsLoading(false)
  }, [alertHandler])

  useEffect(() => {
    fetchSignatures()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchSignatureVideos = useCallback(async (sigId: number, unit: 'excel' | 'crew') => {
    setIsLoadingVideos(true)
    const [videosResult, membersResult] = await Promise.all([
      getSignatureVideosAdmin(sigId),
      getBjMembersByUnit(unit),
    ])
    if (!videosResult.error && videosResult.data) {
      setSigVideos(videosResult.data)
    }
    if (!membersResult.error && membersResult.data) {
      setSigMembers(membersResult.data)
    }
    setIsLoadingVideos(false)
  }, [])

  // ── Expand/collapse toggle ──

  const toggleExpand = useCallback(
    (sig: SignatureUI) => {
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
    },
    [expandedSigId, fetchSignatureVideos]
  )

  // ── Video handlers ──

  const handleAddVideo = useCallback(
    async (sigId: number, memberId: number, videoUrl: string, vimeoId?: string) => {
      if (!videoUrl.trim()) {
        alertHandler.showWarning('영상 URL을 입력해주세요.', '입력 오류')
        return
      }
      const existingVideo = sigVideos.find((v) => v.memberId === memberId)
      if (existingVideo) {
        alertHandler.showWarning('해당 멤버의 영상이 이미 등록되어 있습니다.', '중복 오류')
        return
      }
      const result = await createSignatureVideo({
        signature_id: sigId,
        member_id: memberId,
        video_url: videoUrl.trim(),
        ...(vimeoId ? { vimeo_id: vimeoId } : {}),
      })
      if (result.error) {
        alertHandler.showError(result.error, '오류')
        return
      }
      alertHandler.showSuccess('영상이 등록되었습니다.')
      setAddingVideoMemberId(null)
      setNewVideoUrl('')
      const sig = allSignatures.find((s) => s.id === sigId)
      if (sig) {
        fetchSignatureVideos(sigId, sig.unit)
      }
      fetchSignatures()
    },
    [sigVideos, allSignatures, fetchSignatureVideos, alertHandler, fetchSignatures]
  )

  const handleDeleteVideo = useCallback(
    async (video: SignatureVideoWithMember) => {
      const confirmed = await alertHandler.showConfirm(
        `${video.memberName}님의 영상을 삭제하시겠습니까?`,
        { title: '영상 삭제', variant: 'danger', confirmText: '삭제', cancelText: '취소' }
      )
      if (!confirmed) return
      const result = await deleteSignatureVideoAction(video.id)
      if (result.error) {
        alertHandler.showError(result.error, '오류')
        return
      }
      alertHandler.showSuccess('영상이 삭제되었습니다.')
      setSigVideos((prev) => prev.filter((v) => v.id !== video.id))
      fetchSignatures()
    },
    [alertHandler, fetchSignatures]
  )

  const handleToggleVideoPublished = useCallback(
    async (video: SignatureVideoWithMember) => {
      const newPublished = !video.isPublished
      const result = await toggleSignatureVideoPublished(video.id, newPublished)
      if (result.error) {
        alertHandler.showError(result.error)
        return
      }
      alertHandler.showSuccess(newPublished ? '공개로 전환되었습니다.' : '비공개로 전환되었습니다.')
      setSigVideos((prev) =>
        prev.map((v) => (v.id === video.id ? { ...v, isPublished: newPublished } : v))
      )
    },
    [alertHandler]
  )

  // ── Modal handlers ──

  const filteredSignatures = allSignatures.filter((s) => s.unit === activeUnit)

  const openAddModal = () => {
    const existingNumbers = allSignatures
      .filter((s) => s.unit === activeUnit)
      .map((s) => s.sigNumber)
    let nextNumber = 1
    while (existingNumbers.includes(nextNumber)) {
      nextNumber++
    }
    setIsNew(true)
    setEditingSignature({
      sigNumber: nextNumber,
      title: '',
      description: '',
      thumbnailUrl: '',
      unit: activeUnit,
      isGroup: false,
      videoCount: 0,
    })
    setIsModalOpen(true)
  }

  const openEditModal = (item: SignatureUI) => {
    setIsNew(false)
    setEditingSignature({ ...item })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingSignature(null)
  }

  const handleDelete = async (item: SignatureUI) => {
    const confirmed = await alertHandler.showConfirm(`"${item.title}" 시그를 삭제하시겠습니까?`, {
      title: '시그 삭제',
      variant: 'danger',
      confirmText: '삭제',
      cancelText: '취소',
    })
    if (!confirmed) return
    const result = await deleteSignature(item.id)
    if (result.error) {
      alertHandler.showError(result.error, '삭제 실패')
      return
    }
    alertHandler.showSuccess('삭제되었습니다.')
    fetchSignatures()
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
      alertHandler.showWarning(
        `${editingSignature.unit === 'excel' ? '엑셀부' : '크루부'}에 이미 ${editingSignature.sigNumber}번 시그가 있습니다.`,
        '중복 오류'
      )
      return
    }
    const dbData = {
      sig_number: editingSignature.sigNumber,
      title: editingSignature.title,
      description: editingSignature.description || '',
      thumbnail_url: editingSignature.thumbnailUrl || '',
      unit: editingSignature.unit as 'excel' | 'crew',
    }
    if (isNew) {
      const result = await createSignature(dbData)
      if (result.error) {
        if (result.error.includes('23505') || result.error.includes('duplicate')) {
          alertHandler.showError('해당 부서에 같은 시그 번호가 이미 존재합니다.', '등록 실패')
        } else {
          alertHandler.showError(result.error, '오류')
        }
        return
      }
    } else {
      const result = await updateSignature(editingSignature.id!, dbData)
      if (result.error) {
        if (result.error.includes('23505') || result.error.includes('duplicate')) {
          alertHandler.showError('해당 부서에 같은 시그 번호가 이미 존재합니다.', '수정 실패')
        } else {
          alertHandler.showError(result.error, '오류')
        }
        return
      }
    }
    closeModal()
    fetchSignatures()
  }, [editingSignature, isNew, allSignatures, alertHandler, fetchSignatures])

  const handleView = (sig: SignatureUI) => {
    router.push(`/admin/signatures/${sig.id}`)
  }

  // ── Inline edit handler ──

  const handleInlineEdit = useCallback(
    async (id: string | number, field: string, value: unknown) => {
      if (field === 'sigNumber') {
        const numValue = typeof value === 'number' ? value : parseInt(String(value), 10)
        const targetItem = allSignatures.find((s) => s.id === id)
        if (targetItem) {
          const dup = allSignatures.find(
            (s) => s.unit === targetItem.unit && s.sigNumber === numValue && s.id !== id
          )
          if (dup) {
            alertHandler.showWarning(
              `${targetItem.unit === 'excel' ? '엑셀부' : '크루부'}에 이미 ${numValue}번 시그가 있습니다.`,
              '중복 오류'
            )
            return
          }
        }
      }
      const result = await updateSignatureField(Number(id), field, value)
      if (result.error) {
        alertHandler.showError(result.error, '오류')
        return
      }
      alertHandler.showSuccess('수정되었습니다.')
      fetchSignatures()
    },
    [allSignatures, alertHandler, fetchSignatures]
  )

  // ── Quick add handlers ──

  const toggleQuickAddMode = useCallback(() => {
    if (!quickAddMode) {
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

  const handleQuickAdd = useCallback(async () => {
    if (!quickAddData.title.trim()) {
      alertHandler.showWarning('제목을 입력해주세요.', '입력 오류')
      return
    }
    const duplicate = allSignatures.find(
      (s) => s.unit === activeUnit && s.sigNumber === quickAddData.sigNumber
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
      const result = await createSignature({
        sig_number: quickAddData.sigNumber,
        title: quickAddData.title.trim(),
        description: '',
        thumbnail_url: '',
        unit: activeUnit,
      })
      if (result.error) {
        alertHandler.showError(result.error, '오류')
        return
      }
      alertHandler.showSuccess(`#${quickAddData.sigNumber} ${quickAddData.title} 추가됨`)
      fetchSignatures()
      const existingNumbers = [
        ...allSignatures.map((s) => (s.unit === activeUnit ? s.sigNumber : 0)),
        quickAddData.sigNumber,
      ]
      let nextNumber = 1
      while (existingNumbers.includes(nextNumber)) {
        nextNumber++
      }
      setQuickAddData({ sigNumber: nextNumber, title: '' })
    } finally {
      setIsQuickAdding(false)
    }
  }, [quickAddData, activeUnit, allSignatures, alertHandler, fetchSignatures])

  const handleQuickAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleQuickAdd()
    } else if (e.key === 'Escape') {
      setQuickAddMode(false)
    }
  }

  // ── Inline thumbnail upload ──

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
      const result = await updateSignature(targetSigId, { thumbnail_url: data.url })
      if (result.error) {
        throw new Error(result.error)
      }
      alertHandler.showSuccess('썸네일이 변경되었습니다.')
      fetchSignatures()
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

  // ── Column definitions ──

  const columns = useSignatureColumns({
    expandedSigId,
    uploadingId,
    onToggleExpand: toggleExpand,
    onThumbnailClick: handleInlineThumbnailClick,
  })

  // ── Render ──

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

      {/* Quick Add */}
      <SignatureQuickAdd
        isOpen={quickAddMode}
        sigNumber={quickAddData.sigNumber}
        title={quickAddData.title}
        isAdding={isQuickAdding}
        onSigNumberChange={(num) => setQuickAddData((prev) => ({ ...prev, sigNumber: num }))}
        onTitleChange={(title) => setQuickAddData((prev) => ({ ...prev, title }))}
        onAdd={handleQuickAdd}
        onClose={() => setQuickAddMode(false)}
        onKeyDown={handleQuickAddKeyDown}
      />

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

      {/* Expanded signature video management panel */}
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
                {expandedSigId === sig.id && (
                  <SignatureVideoPanel
                    sig={sig}
                    isLoading={isLoadingVideos}
                    videos={sigVideos}
                    members={sigMembers}
                    addingVideoMemberId={addingVideoMemberId}
                    newVideoUrl={newVideoUrl}
                    videoUploadMode={videoUploadMode}
                    onSetAddingMemberId={setAddingVideoMemberId}
                    onSetNewVideoUrl={setNewVideoUrl}
                    onSetVideoUploadMode={setVideoUploadMode}
                    onAddVideo={handleAddVideo}
                    onDeleteVideo={handleDeleteVideo}
                    onTogglePublished={handleToggleVideoPublished}
                    onPreviewVideo={setPreviewVideoUrl}
                    onError={(error) => alertHandler.showError(error)}
                  />
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Preview Modal */}
      <SignatureVideoPreview videoUrl={previewVideoUrl} onClose={() => setPreviewVideoUrl(null)} />

      {/* Hidden file input for inline thumbnail upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInlineFileChange}
        style={{ display: 'none' }}
      />

      {/* Create/Edit Modal */}
      <SignatureFormModal
        isOpen={isModalOpen}
        isNew={isNew}
        editingSignature={editingSignature}
        onClose={closeModal}
        onSave={handleSave}
        onChange={setEditingSignature}
      />
    </div>
  )
}
