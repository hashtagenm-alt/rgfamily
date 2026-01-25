'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Image as ImageIcon, Plus, X, Save, Hash, Video, Upload, Loader2, Zap } from 'lucide-react'
import Image from 'next/image'
import { DataTable, Column, ImageUpload } from '@/components/admin'
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
        <button
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/admin/signatures/${item.id}`)
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
            whiteSpace: 'nowrap',
          }}
        >
          <Video size={12} />
          {item.videoCount}개
        </button>
      ),
    },
  ]

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
