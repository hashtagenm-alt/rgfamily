'use client'

import { useRef } from 'react'
import { Upload, X, FileText, AlertCircle, Loader2 } from 'lucide-react'
import { useAlert } from '@/lib/hooks'
import { parseDonationCsv } from '@/lib/utils/donation-csv'
import { importDonationsCsv, getEpisodesForImport } from '@/lib/actions/donations'
import type { Season, EpisodeOption, CsvPreview } from './types'
import styles from '../../shared.module.css'

interface CsvImportTabProps {
  seasons: Season[]
  importSeasonId: number | null
  importEpisodeId: number | null
  episodes: EpisodeOption[]
  csvPreview: CsvPreview | null
  isImporting: boolean
  onImportSeasonChange: (seasonId: number) => void
  onImportEpisodeChange: (episodeId: number | null) => void
  onEpisodesLoaded: (episodes: EpisodeOption[]) => void
  onCsvPreviewChange: (preview: CsvPreview | null) => void
  onImportingChange: (importing: boolean) => void
}

export function CsvImportTab({
  seasons,
  importSeasonId,
  importEpisodeId,
  episodes,
  csvPreview,
  isImporting,
  onImportSeasonChange,
  onImportEpisodeChange,
  onEpisodesLoaded,
  onCsvPreviewChange,
  onImportingChange,
}: CsvImportTabProps) {
  const alert = useAlert()
  const fileInputRef = useRef<HTMLInputElement>(null)

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

      onCsvPreviewChange({
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

    onImportingChange(true)
    try {
      const result = await importDonationsCsv(importSeasonId, importEpisodeId, csvPreview.csvText)
      if (result.error) {
        alert.showError(result.error)
      } else if (result.data) {
        alert.showSuccess(
          `임포트 완료! ${result.data.importedCount.toLocaleString()}건 (${result.data.uniqueDonors}명, ${result.data.totalHearts.toLocaleString()} 하트)`
        )
        onCsvPreviewChange(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        // Refresh episodes list (finalized status may have changed)
        const epResult = await getEpisodesForImport(importSeasonId)
        if (epResult.data) {
          onEpisodesLoaded(epResult.data)
        }
      }
    } finally {
      onImportingChange(false)
    }
  }

  const handleClearImport = () => {
    onCsvPreviewChange(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
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
        onCsvPreviewChange({ rowCount: rows.length, uniqueDonors, totalHearts, top5, csvText: text })
      }
      reader.readAsText(file)
    }
  }

  return (
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
              onImportSeasonChange(Number(e.target.value))
              onCsvPreviewChange(null)
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
              onImportEpisodeChange(Number(e.target.value) || null)
              onCsvPreviewChange(null)
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
            onDrop={handleDrop}
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
      {csvPreview && <CsvPreviewPanel csvPreview={csvPreview} isImporting={isImporting} onImport={handleImport} />}
    </div>
  )
}

// ── CSV Preview sub-component ──

function CsvPreviewPanel({
  csvPreview,
  isImporting,
  onImport,
}: {
  csvPreview: CsvPreview
  isImporting: boolean
  onImport: () => void
}) {
  return (
    <div style={{ marginTop: '1.5rem' }}>
      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <StatCard value={csvPreview.rowCount.toLocaleString()} label="총 후원 건수" />
        <StatCard value={csvPreview.uniqueDonors.toLocaleString()} label="고유 후원자" />
        <StatCard value={csvPreview.totalHearts.toLocaleString()} label="총 하트" />
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
        onClick={onImport}
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
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: '8px',
      padding: '1rem',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
        {label}
      </div>
    </div>
  )
}
