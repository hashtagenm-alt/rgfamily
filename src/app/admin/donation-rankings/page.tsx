'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Upload, X, Save, Trash2, Edit3, AlertCircle } from 'lucide-react'
import { DataTable, Column, CsvUploader } from '@/components/admin'
import { useAlert } from '@/lib/hooks'
import {
  getSeasonRankings,
  getTotalRankings,
  updateSeasonRanking,
  deleteSeasonRanking,
  updateTotalRanking,
  deleteTotalRanking,
  bulkReplaceSeasonRankings,
  bulkReplaceTotalRankings,
  getAllSeasons,
} from '@/lib/actions/donation-rankings'
import type { SeasonDonationRanking, TotalDonationRanking, Season } from '@/types/database'
import styles from '../shared.module.css'

type TabType = 'season' | 'total' | 'upload'

interface SeasonRankingUI {
  id: number
  rank: number
  donorName: string
  totalAmount: number
  donationCount: number
  updatedAt: string
}

interface TotalRankingUI {
  id: number
  rank: number
  donorName: string
  totalAmount: number
  updatedAt: string
}

export default function DonationRankingsPage() {
  const alert = useAlert()

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('season')

  // Seasons
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null)

  // Rankings data
  const [seasonRankings, setSeasonRankings] = useState<SeasonRankingUI[]>([])
  const [totalRankings, setTotalRankings] = useState<TotalRankingUI[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SeasonRankingUI | TotalRankingUI | null>(null)
  const [editType, setEditType] = useState<'season' | 'total'>('season')

  // Upload state
  const [uploadType, setUploadType] = useState<'season' | 'total'>('season')

  // Load seasons on mount
  useEffect(() => {
    const loadSeasons = async () => {
      const result = await getAllSeasons()
      if (result.data) {
        setSeasons(result.data)
        // 활성 시즌 선택
        const activeSeason = result.data.find(s => s.is_active)
        if (activeSeason) {
          setSelectedSeasonId(activeSeason.id)
        } else if (result.data.length > 0) {
          setSelectedSeasonId(result.data[0].id)
        }
      }
    }
    loadSeasons()
  }, [])

  // Load season rankings when season changes
  useEffect(() => {
    if (activeTab === 'season' && selectedSeasonId) {
      loadSeasonRankings(selectedSeasonId)
    }
  }, [activeTab, selectedSeasonId])

  // Load total rankings when tab changes
  useEffect(() => {
    if (activeTab === 'total') {
      loadTotalRankings()
    }
  }, [activeTab])

  const loadSeasonRankings = async (seasonId: number) => {
    setIsLoading(true)
    const result = await getSeasonRankings(seasonId)
    if (result.data) {
      setSeasonRankings(result.data.map(convertSeasonToUI))
    } else if (result.error) {
      alert.showError(result.error)
    }
    setIsLoading(false)
  }

  const loadTotalRankings = async () => {
    setIsLoading(true)
    const result = await getTotalRankings()
    if (result.data) {
      setTotalRankings(result.data.map(convertTotalToUI))
    } else if (result.error) {
      alert.showError(result.error)
    }
    setIsLoading(false)
  }

  const convertSeasonToUI = (r: SeasonDonationRanking): SeasonRankingUI => ({
    id: r.id,
    rank: r.rank,
    donorName: r.donor_name,
    totalAmount: r.total_amount,
    donationCount: r.donation_count,
    updatedAt: r.updated_at,
  })

  const convertTotalToUI = (r: TotalDonationRanking): TotalRankingUI => ({
    id: r.id,
    rank: r.rank,
    donorName: r.donor_name,
    totalAmount: r.total_amount,
    updatedAt: r.updated_at,
  })

  // Edit handlers
  const openEditModal = (item: SeasonRankingUI | TotalRankingUI, type: 'season' | 'total') => {
    setEditingItem(item)
    setEditType(type)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingItem(null)
  }

  const handleSave = async () => {
    if (!editingItem) return

    setIsLoading(true)
    try {
      if (editType === 'season') {
        const item = editingItem as SeasonRankingUI
        const result = await updateSeasonRanking(item.id, {
          rank: item.rank,
          donor_name: item.donorName,
          total_amount: item.totalAmount,
          donation_count: item.donationCount,
        })
        if (result.error) {
          alert.showError(result.error)
        } else {
          alert.showSuccess('수정되었습니다.')
          if (selectedSeasonId) loadSeasonRankings(selectedSeasonId)
        }
      } else {
        const item = editingItem as TotalRankingUI
        const result = await updateTotalRanking(item.id, {
          rank: item.rank,
          donor_name: item.donorName,
          total_amount: item.totalAmount,
        })
        if (result.error) {
          alert.showError(result.error)
        } else {
          alert.showSuccess('수정되었습니다.')
          loadTotalRankings()
        }
      }
    } finally {
      setIsLoading(false)
      closeModal()
    }
  }

  const handleDelete = async (item: SeasonRankingUI | TotalRankingUI, type: 'season' | 'total') => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    setIsLoading(true)
    try {
      if (type === 'season') {
        const result = await deleteSeasonRanking(item.id)
        if (result.error) {
          alert.showError(result.error)
        } else {
          alert.showSuccess('삭제되었습니다.')
          if (selectedSeasonId) loadSeasonRankings(selectedSeasonId)
        }
      } else {
        const result = await deleteTotalRanking(item.id)
        if (result.error) {
          alert.showError(result.error)
        } else {
          alert.showSuccess('삭제되었습니다.')
          loadTotalRankings()
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  // CSV Upload handler
  const handleCsvUpload = useCallback(async (data: Record<string, string>[]) => {
    // 필터링: RG_family, 대표BJ 제외
    const excludeNames = ['RG_family', '대표BJ', 'RG_Family', 'rg_family']

    // 파싱
    const parsed = data
      .filter(row => {
        const nickname = extractNickname(row)
        return !excludeNames.some(name => nickname?.toLowerCase().includes(name.toLowerCase()))
      })
      .map((row, index) => {
        const rank = parseInt(row['순위'] || row['rank'] || String(index + 1))
        const nickname = extractNickname(row)
        const hearts = parseHearts(row['하트'] || row['총 후원하트'] || row['total_amount'] || '0')
        const count = parseInt(row['건수'] || row['donation_count'] || '0') || 0

        return {
          rank,
          donor_name: nickname || `Unknown_${index + 1}`,
          total_amount: hearts,
          donation_count: count,
        }
      })
      .filter(item => item.donor_name && item.total_amount > 0)
      .slice(0, 50) // Top 50만

    if (parsed.length === 0) {
      return { success: 0, errors: ['유효한 데이터가 없습니다.'] }
    }

    // 순위 재정렬
    const sorted = parsed.sort((a, b) => b.total_amount - a.total_amount)
    sorted.forEach((item, idx) => {
      item.rank = idx + 1
    })

    try {
      if (uploadType === 'season') {
        if (!selectedSeasonId) {
          return { success: 0, errors: ['시즌을 선택해주세요.'] }
        }
        const result = await bulkReplaceSeasonRankings(selectedSeasonId, sorted)
        if (result.error) {
          return { success: 0, errors: [result.error] }
        }
        loadSeasonRankings(selectedSeasonId)
        return { success: result.data?.insertedCount || sorted.length, errors: [] }
      } else {
        const totalData = sorted.map(item => ({
          rank: item.rank,
          donor_name: item.donor_name,
          total_amount: item.total_amount,
        }))
        const result = await bulkReplaceTotalRankings(totalData)
        if (result.error) {
          return { success: 0, errors: [result.error] }
        }
        loadTotalRankings()
        return { success: result.data?.insertedCount || sorted.length, errors: [] }
      }
    } catch (err) {
      return { success: 0, errors: [err instanceof Error ? err.message : '업로드 실패'] }
    }
  }, [uploadType, selectedSeasonId])

  // Helpers
  const extractNickname = (row: Record<string, string>): string => {
    // 닉네임 컬럼 우선 확인
    if (row['닉네임']) return row['닉네임'].trim()
    if (row['donor_name']) return row['donor_name'].trim()

    // ID(닉네임) 형식에서 닉네임 추출
    const idNickname = row['후원 아이디(닉네임)'] || row['후원 아이디'] || ''
    const match = idNickname.match(/\(([^)]+)\)/)
    if (match) return match[1].trim()

    return idNickname.trim()
  }

  const parseHearts = (value: string): number => {
    // 콤마 제거 후 파싱
    const cleaned = value.replace(/,/g, '').trim()
    return parseInt(cleaned) || 0
  }

  const formatNumber = (num: number): string => {
    return num.toLocaleString('ko-KR')
  }

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Season Ranking Columns
  const seasonColumns: Column<SeasonRankingUI>[] = [
    {
      key: 'rank',
      header: '순위',
      width: '80px',
      render: (item) => (
        <span style={{ fontWeight: 600, color: item.rank <= 3 ? 'var(--primary)' : 'inherit' }}>
          {item.rank}
        </span>
      ),
    },
    { key: 'donorName', header: '닉네임', width: '200px' },
    {
      key: 'totalAmount',
      header: '총 하트',
      width: '150px',
      render: (item) => (
        <span className={styles.amountCell}>{formatNumber(item.totalAmount)}</span>
      ),
    },
    {
      key: 'donationCount',
      header: '건수',
      width: '100px',
      render: (item) => formatNumber(item.donationCount),
    },
    {
      key: 'updatedAt',
      header: '업데이트',
      width: '140px',
      render: (item) => <span style={{ whiteSpace: 'nowrap' }}>{formatDate(item.updatedAt)}</span>,
    },
  ]

  // Total Ranking Columns
  const totalColumns: Column<TotalRankingUI>[] = [
    {
      key: 'rank',
      header: '순위',
      width: '80px',
      render: (item) => (
        <span style={{ fontWeight: 600, color: item.rank <= 3 ? 'var(--primary)' : 'inherit' }}>
          {item.rank}
        </span>
      ),
    },
    { key: 'donorName', header: '닉네임', width: '200px' },
    {
      key: 'totalAmount',
      header: '총 하트',
      width: '150px',
      render: (item) => (
        <span className={styles.amountCell}>{formatNumber(item.totalAmount)}</span>
      ),
    },
    {
      key: 'updatedAt',
      header: '업데이트',
      width: '140px',
      render: (item) => <span style={{ whiteSpace: 'nowrap' }}>{formatDate(item.updatedAt)}</span>,
    },
  ]

  // CSV columns for uploader
  const csvColumns = [
    { key: '순위', altKey: 'rank', label: '순위', required: false },
    { key: '닉네임', altKey: '후원 아이디(닉네임)', label: '닉네임', required: true },
    { key: '하트', altKey: '총 후원하트', label: '하트', required: true },
    { key: '건수', altKey: 'donation_count', label: '건수', required: false },
  ]

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Trophy size={24} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>후원 랭킹 관리</h1>
            <p className={styles.subtitle}>시즌별/종합 후원 랭킹 데이터 관리</p>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabButtons}>
          <button
            className={`${styles.tabButton} ${activeTab === 'season' ? styles.active : ''}`}
            onClick={() => setActiveTab('season')}
          >
            시즌 랭킹
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'total' ? styles.active : ''}`}
            onClick={() => setActiveTab('total')}
          >
            종합 랭킹
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'upload' ? styles.active : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <Upload size={16} />
            CSV 업로드
          </button>
        </div>
      </header>

      {/* Season Selector (for season tab) */}
      {(activeTab === 'season' || (activeTab === 'upload' && uploadType === 'season')) && (
        <div className={styles.uploadOptions}>
          <div className={styles.optionRow}>
            <label className={styles.optionLabel}>시즌 선택</label>
            <select
              className={styles.optionSelect}
              value={selectedSeasonId || ''}
              onChange={(e) => setSelectedSeasonId(Number(e.target.value))}
            >
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name} {season.is_active ? '(활성)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Season Rankings Tab */}
      {activeTab === 'season' && (
        <DataTable
          data={seasonRankings}
          columns={seasonColumns}
          onEdit={(item) => openEditModal(item, 'season')}
          onDelete={(item) => handleDelete(item, 'season')}
          searchPlaceholder="닉네임으로 검색..."
          isLoading={isLoading}
        />
      )}

      {/* Total Rankings Tab */}
      {activeTab === 'total' && (
        <DataTable
          data={totalRankings}
          columns={totalColumns}
          onEdit={(item) => openEditModal(item, 'total')}
          onDelete={(item) => handleDelete(item, 'total')}
          searchPlaceholder="닉네임으로 검색..."
          isLoading={isLoading}
        />
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className={styles.uploadSection}>
          <div className={styles.uploadInfo}>
            <h3>CSV 파일 업로드</h3>
            <p>시즌별 또는 종합 랭킹 데이터를 CSV 파일로 일괄 업로드합니다.</p>
            <p style={{ color: 'var(--color-warning)', marginTop: '0.5rem' }}>
              <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              기존 데이터가 모두 교체됩니다. RG_family, 대표BJ는 자동 제외됩니다.
            </p>
          </div>

          {/* Upload Type Selection */}
          <div className={styles.uploadOptions}>
            <div className={styles.optionRow}>
              <label className={styles.optionLabel}>업로드 대상</label>
              <div className={styles.typeSelector}>
                <button
                  className={`${styles.typeButton} ${uploadType === 'season' ? styles.active : ''}`}
                  onClick={() => setUploadType('season')}
                >
                  시즌 랭킹
                </button>
                <button
                  className={`${styles.typeButton} ${uploadType === 'total' ? styles.active : ''}`}
                  onClick={() => setUploadType('total')}
                >
                  종합 랭킹
                </button>
              </div>
            </div>
          </div>

          <CsvUploader
            columns={csvColumns}
            onUpload={handleCsvUpload}
          />
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {isModalOpen && editingItem && (
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
                <h2>랭킹 수정</h2>
                <button onClick={closeModal} className={styles.closeButton}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>순위</label>
                    <input
                      type="number"
                      value={editingItem.rank}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, rank: parseInt(e.target.value) || 0 })
                      }
                      className={styles.input}
                      min={1}
                      max={50}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>닉네임</label>
                    <input
                      type="text"
                      value={editingItem.donorName}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, donorName: e.target.value })
                      }
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>총 하트</label>
                  <input
                    type="number"
                    value={editingItem.totalAmount}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, totalAmount: parseInt(e.target.value) || 0 })
                    }
                    className={styles.input}
                    min={0}
                  />
                </div>

                {editType === 'season' && 'donationCount' in editingItem && (
                  <div className={styles.formGroup}>
                    <label>건수</label>
                    <input
                      type="number"
                      value={(editingItem as SeasonRankingUI).donationCount}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          donationCount: parseInt(e.target.value) || 0,
                        } as SeasonRankingUI)
                      }
                      className={styles.input}
                      min={0}
                    />
                  </div>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button onClick={closeModal} className={styles.cancelButton}>
                  취소
                </button>
                <button onClick={handleSave} className={styles.saveButton} disabled={isLoading}>
                  <Save size={16} />
                  저장
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
