'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Upload, Download, X, Save, RefreshCw, FileText, AlertCircle, Loader2 } from 'lucide-react'
import { exportToExcel } from '@/lib/utils/excel'
import { DataTable, Column } from '@/components/admin'
import { useAlert } from '@/lib/hooks'
import {
  getSeasonRankings,
  getTotalRankings,
  updateSeasonRanking,
  deleteSeasonRanking,
  updateTotalRanking,
  deleteTotalRanking,
  getAllSeasons,
} from '@/lib/actions/donation-rankings'
import {
  refreshSeasonRankings,
  refreshTotalRankings,
  importDonationsCsv,
  getEpisodesForImport,
} from '@/lib/actions/donations'
import { parseDonationCsv } from '@/lib/utils/donation-csv'
import type { SeasonDonationRanking, TotalDonationRanking, Season } from '@/types/database'
import styles from '../shared.module.css'

type TabType = 'season' | 'total' | 'import'

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

interface EpisodeOption {
  id: number
  episode_number: number
  title: string
  is_finalized: boolean
}

interface CsvPreview {
  rowCount: number
  uniqueDonors: number
  totalHearts: number
  top5: Array<{ donor_name: string; total: number }>
  csvText: string
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

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Import state
  const [importSeasonId, setImportSeasonId] = useState<number | null>(null)
  const [importEpisodeId, setImportEpisodeId] = useState<number | null>(null)
  const [episodes, setEpisodes] = useState<EpisodeOption[]>([])
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load seasons on mount
  useEffect(() => {
    const loadSeasons = async () => {
      const result = await getAllSeasons()
      if (result.data) {
        setSeasons(result.data)
        const activeSeason = result.data.find(s => s.is_active)
        if (activeSeason) {
          setSelectedSeasonId(activeSeason.id)
          setImportSeasonId(activeSeason.id)
        } else if (result.data.length > 0) {
          setSelectedSeasonId(result.data[0].id)
          setImportSeasonId(result.data[0].id)
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

  // Load episodes when import season changes
  useEffect(() => {
    if (importSeasonId) {
      loadEpisodes(importSeasonId)
    }
  }, [importSeasonId])

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

  const loadEpisodes = async (seasonId: number) => {
    const result = await getEpisodesForImport(seasonId)
    if (result.data) {
      setEpisodes(result.data)
      setImportEpisodeId(null)
    }
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

  // ========================================
  // Phase 2: 랭킹 갱신 핸들러
  // ========================================

  const handleRefreshSeasonRankings = async () => {
    if (!selectedSeasonId) {
      alert.showError('시즌을 선택해주세요.')
      return
    }

    const selectedSeason = seasons.find(s => s.id === selectedSeasonId)
    const seasonName = selectedSeason?.name || `시즌 ${selectedSeasonId}`

    if (!confirm(`${seasonName}의 랭킹을 donations 데이터 기준으로 재계산하시겠습니까?\n\n기존 시즌 랭킹 데이터가 모두 교체됩니다.`)) {
      return
    }

    setIsRefreshing(true)
    try {
      const result = await refreshSeasonRankings(selectedSeasonId)
      if (result.error) {
        alert.showError(result.error)
      } else if (result.data) {
        alert.showSuccess(
          `시즌 랭킹 갱신 완료! (후원 ${result.data.totalDonations.toLocaleString()}건 → ${result.data.rankedCount}명 랭킹)`
        )
        loadSeasonRankings(selectedSeasonId)
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRefreshTotalRankings = async () => {
    if (!confirm('종합 랭킹을 레거시 + 시즌 데이터 기준으로 재계산하시겠습니까?\n\n기존 종합 랭킹 데이터가 모두 교체됩니다.')) {
      return
    }

    setIsRefreshing(true)
    try {
      const result = await refreshTotalRankings()
      if (result.error) {
        alert.showError(result.error)
      } else if (result.data) {
        alert.showSuccess(
          `종합 랭킹 갱신 완료! (후원 ${result.data.totalDonations.toLocaleString()}건 + 레거시 ${result.data.legacyEntries}건 → ${result.data.rankedCount}명 랭킹)`
        )
        loadTotalRankings()
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  // ========================================
  // Phase 1: CSV 임포트 핸들러
  // ========================================

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const { rows, totalHearts, uniqueDonors, top5 } = parseDonationCsv(text)

      if (rows.length === 0) {
        alert.showError('유효한 후원 데이터가 없습니다. CSV 형식을 확인해주세요.')
        return
      }

      setCsvPreview({
        rowCount: rows.length,
        uniqueDonors,
        totalHearts,
        top5,
        csvText: text,
      })
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!importSeasonId || !importEpisodeId || !csvPreview) return

    const selectedEpisode = episodes.find(e => e.id === importEpisodeId)
    if (selectedEpisode?.is_finalized) {
      if (!confirm(`이 에피소드는 이미 확정되었습니다. 기존 데이터를 덮어쓰시겠습니까?`)) {
        return
      }
    }

    setIsImporting(true)
    try {
      const result = await importDonationsCsv(importSeasonId, importEpisodeId, csvPreview.csvText)
      if (result.error) {
        alert.showError(result.error)
      } else if (result.data) {
        alert.showSuccess(
          `임포트 완료! ${result.data.importedCount.toLocaleString()}건 (${result.data.uniqueDonors}명, ${result.data.totalHearts.toLocaleString()} 하트)`
        )
        setCsvPreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        // 에피소드 목록 새로고침 (finalized 상태 반영)
        loadEpisodes(importSeasonId)
      }
    } finally {
      setIsImporting(false)
    }
  }

  const handleClearImport = () => {
    setCsvPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
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

  // Download handlers
  const handleDownloadSeasonRankings = () => {
    if (seasonRankings.length === 0) {
      alert.showError('다운로드할 데이터가 없습니다.')
      return
    }

    const selectedSeason = seasons.find(s => s.id === selectedSeasonId)
    const seasonName = selectedSeason?.name || `시즌${selectedSeasonId}`

    exportToExcel(
      seasonRankings,
      [
        { key: 'rank', header: '순위' },
        { key: 'donorName', header: '닉네임' },
        { key: 'totalAmount', header: '총 하트', format: (v) => Number(v) },
        { key: 'donationCount', header: '건수', format: (v) => Number(v) },
        { key: 'updatedAt', header: '업데이트', format: (v) => formatDate(String(v)) },
      ],
      {
        sheetName: seasonName,
        fileName: `시즌랭킹_${seasonName}`,
      }
    )
    alert.showSuccess('다운로드가 시작되었습니다.')
  }

  const handleDownloadTotalRankings = () => {
    if (totalRankings.length === 0) {
      alert.showError('다운로드할 데이터가 없습니다.')
      return
    }

    exportToExcel(
      totalRankings,
      [
        { key: 'rank', header: '순위' },
        { key: 'donorName', header: '닉네임' },
        { key: 'totalAmount', header: '총 하트', format: (v) => Number(v) },
        { key: 'updatedAt', header: '업데이트', format: (v) => formatDate(String(v)) },
      ],
      {
        sheetName: '종합랭킹',
        fileName: '종합랭킹',
      }
    )
    alert.showSuccess('다운로드가 시작되었습니다.')
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
            className={`${styles.tabButton} ${activeTab === 'import' ? styles.active : ''}`}
            onClick={() => setActiveTab('import')}
          >
            <FileText size={16} />
            후원 내역 임포트
          </button>
        </div>
      </header>

      {/* Season Selector + Refresh Button (for season tab) */}
      {activeTab === 'season' && (
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
            {activeTab === 'season' && (
              <>
                <button
                  className={styles.saveButton}
                  onClick={handleRefreshSeasonRankings}
                  disabled={isRefreshing || isLoading}
                  style={{ gap: '0.5rem' }}
                >
                  {isRefreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  시즌 랭킹 갱신
                </button>
                <button
                  className={styles.downloadButton}
                  onClick={handleDownloadSeasonRankings}
                  disabled={isLoading || seasonRankings.length === 0}
                >
                  <Download size={16} />
                  Excel 다운로드
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Download + Refresh button for total rankings */}
      {activeTab === 'total' && (
        <div className={styles.uploadOptions}>
          <div className={styles.optionRow}>
            <button
              className={styles.saveButton}
              onClick={handleRefreshTotalRankings}
              disabled={isRefreshing || isLoading}
              style={{ gap: '0.5rem' }}
            >
              {isRefreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              종합 랭킹 갱신
            </button>
            <button
              className={styles.downloadButton}
              onClick={handleDownloadTotalRankings}
              disabled={isLoading || totalRankings.length === 0}
            >
              <Download size={16} />
              Excel 다운로드
            </button>
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

      {/* Import Tab - 후원 내역 CSV 임포트 */}
      {activeTab === 'import' && (
        <div className={styles.uploadSection}>
          <div className={styles.uploadInfo}>
            <h3>후원 내역 CSV 임포트</h3>
            <p>PandaTV 후원 내역 CSV 파일을 에피소드별로 임포트합니다.</p>
            <p style={{ color: 'var(--color-warning)', marginTop: '0.5rem' }}>
              <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              해당 에피소드의 기존 후원 데이터가 모두 교체됩니다. RG_family, 대표BJ는 자동 제외됩니다.
            </p>
          </div>

          {/* Season + Episode Selection */}
          <div className={styles.uploadOptions}>
            <div className={styles.optionRow}>
              <label className={styles.optionLabel}>시즌 선택</label>
              <select
                className={styles.optionSelect}
                value={importSeasonId || ''}
                onChange={(e) => {
                  setImportSeasonId(Number(e.target.value))
                  setCsvPreview(null)
                }}
              >
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name} {season.is_active ? '(활성)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.optionRow}>
              <label className={styles.optionLabel}>에피소드 선택</label>
              <select
                className={styles.optionSelect}
                value={importEpisodeId || ''}
                onChange={(e) => {
                  setImportEpisodeId(Number(e.target.value) || null)
                  setCsvPreview(null)
                }}
              >
                <option value="">에피소드를 선택하세요</option>
                {episodes.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.episode_number}회 - {ep.title}
                    {ep.is_finalized ? ' (확정)' : ' (미확정)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CSV File Input */}
          {importEpisodeId && (
            <div style={{ marginTop: '1rem' }}>
              <div
                style={{
                  border: '2px dashed var(--card-border)',
                  borderRadius: '12px',
                  padding: '2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)' }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)' }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.currentTarget.style.borderColor = 'var(--card-border)'
                  const file = e.dataTransfer.files[0]
                  if (file && file.name.endsWith('.csv')) {
                    const reader = new FileReader()
                    reader.onload = (ev) => {
                      const text = ev.target?.result as string
                      const { rows, totalHearts, uniqueDonors, top5 } = parseDonationCsv(text)
                      if (rows.length === 0) {
                        alert.showError('유효한 후원 데이터가 없습니다.')
                        return
                      }
                      setCsvPreview({ rowCount: rows.length, uniqueDonors, totalHearts, top5, csvText: text })
                    }
                    reader.readAsText(file)
                  }
                }}
              >
                {csvPreview ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <FileText size={24} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {csvPreview.rowCount.toLocaleString()}건 파싱됨
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleClearImport() }}
                      style={{
                        background: 'var(--color-error-bg-strong)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.375rem 0.75rem',
                        color: 'var(--color-error)',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <X size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                      제거
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      CSV 파일을 드래그하거나 클릭하여 선택
                    </p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                      형식: 후원시간, 후원아이디(닉네임), 후원하트, 참여BJ
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          )}

          {/* CSV Preview */}
          {csvPreview && (
            <div style={{ marginTop: '1.5rem' }}>
              {/* Summary Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}>
                <div style={{
                  background: 'var(--surface)',
                  borderRadius: '8px',
                  padding: '1rem',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {csvPreview.rowCount.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                    총 후원 건수
                  </div>
                </div>
                <div style={{
                  background: 'var(--surface)',
                  borderRadius: '8px',
                  padding: '1rem',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {csvPreview.uniqueDonors.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                    고유 후원자
                  </div>
                </div>
                <div style={{
                  background: 'var(--surface)',
                  borderRadius: '8px',
                  padding: '1rem',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {csvPreview.totalHearts.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                    총 하트
                  </div>
                </div>
              </div>

              {/* Top 5 Preview */}
              {csvPreview.top5.length > 0 && (
                <div style={{
                  background: 'var(--surface)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                    Top 5 후원자
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {csvPreview.top5.map((donor, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.5rem 0.75rem',
                        background: 'var(--card-bg)',
                        borderRadius: '6px',
                      }}>
                        <span style={{
                          fontWeight: 600,
                          color: i < 3 ? 'var(--primary)' : 'var(--text-primary)',
                        }}>
                          {i + 1}. {donor.donor_name}
                        </span>
                        <span className={styles.amountCell}>
                          {donor.total.toLocaleString()} 하트
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Import Button */}
              <button
                className={styles.saveButton}
                onClick={handleImport}
                disabled={isImporting}
                style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '1rem' }}
              >
                {isImporting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Upload size={18} />
                )}
                {isImporting
                  ? '임포트 중...'
                  : `${csvPreview.rowCount.toLocaleString()}건 임포트`
                }
              </button>
            </div>
          )}
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
