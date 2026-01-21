'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Image as ImageIcon, Plus, X, Save, Hash, Video } from 'lucide-react'
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

  const columns: Column<Signature>[] = [
    {
      key: 'sigNumber',
      header: '번호',
      width: '80px',
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
        <div style={{
          width: '80px',
          height: '45px',
          borderRadius: '4px',
          overflow: 'hidden',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {item.thumbnailUrl ? (
            <Image
              src={item.thumbnailUrl}
              alt={item.title}
              width={80}
              height={45}
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <ImageIcon size={20} style={{ color: 'var(--text-tertiary)' }} />
          )}
        </div>
      ),
    },
    {
      key: 'title',
      header: '제목',
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
        <button onClick={openAddModal} className={styles.addButton}>
          <Plus size={18} />
          시그 추가
        </button>
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

      <DataTable
        data={filteredSignatures}
        columns={columns}
        onView={handleView}
        onEdit={openEditModal}
        onDelete={handleDelete}
        searchPlaceholder="시그 제목으로 검색..."
        isLoading={isLoading}
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
