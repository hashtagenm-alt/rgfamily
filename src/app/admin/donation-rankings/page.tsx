'use client'

import { useState, useEffect } from 'react'
import { Trophy, FileText } from 'lucide-react'
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
  getEpisodesForImport,
} from '@/lib/actions/donations'
import type { SeasonDonationRanking, TotalDonationRanking, Season } from '@/types/database'
import { RankingEditModal, RankingsToolbar, CsvImportTab } from './_components'
import type {
  TabType,
  SeasonRankingUI,
  TotalRankingUI,
  EpisodeOption,
  CsvPreview,
} from './_components'
import styles from '../shared.module.css'

// ── Helpers ──

const formatNumber = (num: number): string => num.toLocaleString('ko-KR')

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

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
  updatedAt:
    ((r as unknown as Record<string, unknown>).updated_at as string) ?? new Date().toISOString(),
})

// ── Column definitions ──

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
    render: (item) => <span className={styles.amountCell}>{formatNumber(item.totalAmount)}</span>,
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
    render: (item) => <span className={styles.amountCell}>{formatNumber(item.totalAmount)}</span>,
  },
  {
    key: 'updatedAt',
    header: '업데이트',
    width: '140px',
    render: (item) => <span style={{ whiteSpace: 'nowrap' }}>{formatDate(item.updatedAt)}</span>,
  },
]

// ── Page Component ──

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

  // ── Data loading ──

  useEffect(() => {
    const loadSeasons = async () => {
      const result = await getAllSeasons()
      if (result.data) {
        setSeasons(result.data)
        const activeSeason = result.data.find((s) => s.is_active)
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

  useEffect(() => {
    if (activeTab === 'season' && selectedSeasonId) {
      loadSeasonRankings(selectedSeasonId)
    }
  }, [activeTab, selectedSeasonId])

  useEffect(() => {
    if (activeTab === 'total') {
      loadTotalRankings()
    }
  }, [activeTab])

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

  // ── Edit handlers ──

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

  // ── Refresh handlers ──

  const handleRefreshSeasonRankings = async () => {
    if (!selectedSeasonId) {
      alert.showError('시즌을 선택해주세요.')
      return
    }

    const selectedSeason = seasons.find((s) => s.id === selectedSeasonId)
    const seasonName = selectedSeason?.name || `시즌 ${selectedSeasonId}`

    if (
      !confirm(
        `${seasonName}의 랭킹을 donations 데이터 기준으로 재계산하시겠습니까?\n\n기존 시즌 랭킹 데이터가 모두 교체됩니다.`
      )
    ) {
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
    if (
      !confirm(
        '종합 랭킹을 레거시 + 시즌 데이터 기준으로 재계산하시겠습니까?\n\n기존 종합 랭킹 데이터가 모두 교체됩니다.'
      )
    ) {
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

  // ── Download handlers ──

  const handleDownloadSeasonRankings = () => {
    if (seasonRankings.length === 0) {
      alert.showError('다운로드할 데이터가 없습니다.')
      return
    }

    const selectedSeason = seasons.find((s) => s.id === selectedSeasonId)
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

  // ── Render ──

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

      {/* Toolbar (season selector, refresh, download) */}
      <RankingsToolbar
        activeTab={activeTab}
        seasons={seasons}
        selectedSeasonId={selectedSeasonId}
        isRefreshing={isRefreshing}
        isLoading={isLoading}
        seasonRankingsCount={seasonRankings.length}
        totalRankingsCount={totalRankings.length}
        onSeasonChange={setSelectedSeasonId}
        onRefreshSeason={handleRefreshSeasonRankings}
        onRefreshTotal={handleRefreshTotalRankings}
        onDownloadSeason={handleDownloadSeasonRankings}
        onDownloadTotal={handleDownloadTotalRankings}
      />

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

      {/* Import Tab */}
      {activeTab === 'import' && (
        <CsvImportTab
          seasons={seasons}
          importSeasonId={importSeasonId}
          importEpisodeId={importEpisodeId}
          episodes={episodes}
          csvPreview={csvPreview}
          isImporting={isImporting}
          onImportSeasonChange={setImportSeasonId}
          onImportEpisodeChange={setImportEpisodeId}
          onEpisodesLoaded={(eps) => {
            setEpisodes(eps)
            setImportEpisodeId(null)
          }}
          onCsvPreviewChange={setCsvPreview}
          onImportingChange={setIsImporting}
        />
      )}

      {/* Edit Modal */}
      <RankingEditModal
        isOpen={isModalOpen}
        editingItem={editingItem}
        editType={editType}
        isLoading={isLoading}
        onClose={closeModal}
        onSave={handleSave}
        onItemChange={setEditingItem}
      />
    </div>
  )
}
