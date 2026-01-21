'use client'

import { useState, useEffect } from 'react'
import { Heart, Plus, Upload, List, Calendar, UserPlus } from 'lucide-react'
import { DataTable, Column, CsvUploader, DonationModal } from '@/components/admin'
import { useDonationsData, useAlert, useEpisodes, type DonationItem } from '@/lib/hooks'
import { formatAmount } from '@/lib/utils/format'
import type { Episode } from '@/types/database'
import styles from '../shared.module.css'

type ViewMode = 'list' | 'upload'

export default function DonationsPage() {
  const {
    donations,
    seasons,
    profiles,
    isLoading,
    addDonation,
    updateDonation,
    deleteDonation,
    uploadCsv,
  } = useDonationsData()
  const { showConfirm, showError } = useAlert()
  const episodesRepo = useEpisodes()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDonation, setEditingDonation] = useState<Partial<DonationItem> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // CSV 업로드 옵션
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(null)
  const [autoCreateProfiles, setAutoCreateProfiles] = useState(true)

  // 에피소드 목록 로드
  useEffect(() => {
    const loadEpisodes = async () => {
      if (seasons.length > 0) {
        const eps = await episodesRepo.findBySeason(seasons[0].id)
        setEpisodes(eps)
      }
    }
    loadEpisodes()
  }, [seasons, episodesRepo])

  const handleAdd = () => {
    setEditingDonation({
      donorId: '',
      amount: 0,
      message: '',
      seasonId: seasons[0]?.id,
    })
    setIsNew(true)
    setIsModalOpen(true)
  }

  const handleEdit = (donation: DonationItem) => {
    setEditingDonation(donation)
    setIsNew(false)
    setIsModalOpen(true)
  }

  const handleDelete = async (donation: DonationItem) => {
    const confirmed = await showConfirm('정말 삭제하시겠습니까?', {
      title: '후원 기록 삭제',
      variant: 'danger',
      confirmText: '삭제',
      cancelText: '취소',
    })
    if (!confirmed) return
    const success = await deleteDonation(donation.id)
    if (!success) {
      showError('삭제에 실패했습니다.')
    }
  }

  const handleSave = async () => {
    if (!editingDonation || !editingDonation.donorId || !editingDonation.amount) {
      showError('후원자와 금액을 입력해주세요.', '입력 오류')
      return
    }

    const success = isNew
      ? await addDonation(editingDonation)
      : await updateDonation(editingDonation)

    if (success) {
      setIsModalOpen(false)
    } else {
      showError(isNew ? '등록에 실패했습니다.' : '수정에 실패했습니다.')
    }
  }

  const formatHeart = (amount: number) => formatAmount(amount, '하트')

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // CSV 컬럼 정의 (두 가지 형식 지원)
  // 1. 일반 CSV: ID, 하트, 일시, 내용
  // 2. 랭킹 CSV: 순위, 후원 아이디(닉네임), 총 후원하트
  const csvColumns = [
    { key: 'ID', altKey: '후원 아이디(닉네임)', label: '후원자ID/닉네임', required: true },
    { key: '하트', altKey: '총 후원하트', label: '하트', required: true },
    { key: '일시', label: '일시', required: false },
    { key: '내용', label: '내용', required: false },
  ]

  const columns: Column<DonationItem>[] = [
    { key: 'donorName', header: '후원자', width: '150px' },
    {
      key: 'amount',
      header: '금액',
      width: '120px',
      render: (item) => (
        <span className={styles.amountCell}>{formatHeart(item.amount)}</span>
      ),
    },
    {
      key: 'message',
      header: '메시지',
      render: (item) => (
        <span className={styles.messageCell}>{item.message || '-'}</span>
      ),
    },
    {
      key: 'seasonName',
      header: '시즌',
      width: '160px',
      render: (item) => (
        <span className={styles.badge}>{item.seasonName || '-'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: '일시',
      width: '140px',
      render: (item) => formatShortDate(item.createdAt),
    },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Heart size={24} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>후원 관리</h1>
            <p className={styles.subtitle}>후원 내역 관리</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.tabButtons}>
            <button
              onClick={() => setViewMode('list')}
              className={`${styles.tabButton} ${viewMode === 'list' ? styles.active : ''}`}
            >
              <List size={16} />
              목록
            </button>
            <button
              onClick={() => setViewMode('upload')}
              className={`${styles.tabButton} ${viewMode === 'upload' ? styles.active : ''}`}
            >
              <Upload size={16} />
              CSV 업로드
            </button>
          </div>
          {viewMode === 'list' && (
            <button onClick={handleAdd} className={styles.addButton}>
              <Plus size={18} />
              후원 등록
            </button>
          )}
        </div>
      </header>

      {viewMode === 'list' ? (
        <DataTable
          data={donations}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          searchPlaceholder="후원자 이름으로 검색..."
          isLoading={isLoading}
        />
      ) : (
        <div className={styles.uploadSection}>
          <div className={styles.uploadInfo}>
            <h3>CSV 파일로 대량 등록</h3>
            <p>아래 형식의 CSV 파일을 업로드하여 여러 후원 내역을 한 번에 등록할 수 있습니다.</p>
          </div>

          {/* 업로드 옵션 */}
          <div className={styles.uploadOptions}>
            {/* 에피소드 선택 */}
            <div className={styles.optionRow}>
              <label className={styles.optionLabel}>
                <Calendar size={16} />
                에피소드 연결 (직급전)
              </label>
              <select
                value={selectedEpisodeId ?? ''}
                onChange={(e) => setSelectedEpisodeId(e.target.value ? Number(e.target.value) : null)}
                className={styles.optionSelect}
              >
                <option value="">선택 안 함</option>
                {episodes.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.episode_number}화: {ep.title}
                    {ep.is_rank_battle && ' ⚔️ 직급전'}
                  </option>
                ))}
              </select>
            </div>

            {/* 프로필 자동 생성 */}
            <div className={styles.optionRow}>
              <label className={styles.optionCheckbox}>
                <input
                  type="checkbox"
                  checked={autoCreateProfiles}
                  onChange={(e) => setAutoCreateProfiles(e.target.checked)}
                />
                <UserPlus size={16} />
                프로필 자동 생성
              </label>
              <span className={styles.optionHint}>
                등록되지 않은 닉네임은 자동으로 프로필을 생성합니다
              </span>
            </div>
          </div>

          <CsvUploader
            columns={csvColumns}
            onUpload={(data, options) => uploadCsv(data, {
              ...options,
              autoCreateProfiles,
              episodeId: selectedEpisodeId ?? undefined,
            })}
            sampleFile="/samples/donations_sample.csv"
            showDuplicateOptions
          />
        </div>
      )}

      <DonationModal
        isOpen={isModalOpen}
        isNew={isNew}
        donation={editingDonation}
        seasons={seasons}
        profiles={profiles}
        onChange={setEditingDonation}
        onSave={handleSave}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
