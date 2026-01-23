'use client'

import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Trash2,
} from 'lucide-react'
import { useSupabaseContext } from '@/lib/context'
import styles from './page.module.css'

type UploadType = 'contribution' | 'prize_penalty'
type UploadStatus = 'idle' | 'parsing' | 'preview' | 'uploading' | 'success' | 'error'

interface ParsedRow {
  bjName: string
  amount: number
  reason?: string
  type?: 'prize' | 'penalty'
  isValid: boolean
  errorMessage?: string
  bjMemberId?: number
}

interface UploadResult {
  total: number
  success: number
  failed: number
  errors: string[]
}

export default function DataSyncPage() {
  const supabase = useSupabaseContext()
  const [uploadType, setUploadType] = useState<UploadType>('contribution')
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [result, setResult] = useState<UploadResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(null)
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null)
  const [episodes, setEpisodes] = useState<Array<{ id: number; episode_number: number; title: string }>>([])
  const [seasons, setSeasons] = useState<Array<{ id: number; name: string; is_active: boolean }>>([])
  const [isDragging, setIsDragging] = useState(false)

  // 시즌/에피소드 데이터 로드
  const loadMetadata = useCallback(async () => {
    const { data: seasonsData } = await supabase
      .from('seasons')
      .select('id, name, is_active')
      .order('id', { ascending: false })

    if (seasonsData) {
      setSeasons(seasonsData)
      const activeSeason = seasonsData.find(s => s.is_active)
      if (activeSeason) {
        setSelectedSeasonId(activeSeason.id)

        const { data: episodesData } = await supabase
          .from('episodes')
          .select('id, episode_number, title')
          .eq('season_id', activeSeason.id)
          .order('episode_number', { ascending: false })

        if (episodesData) {
          setEpisodes(episodesData)
        }
      }
    }
  }, [supabase])

  // 시즌 변경 시 에피소드 로드
  const handleSeasonChange = async (seasonId: number) => {
    setSelectedSeasonId(seasonId)
    setSelectedEpisodeId(null)

    const { data: episodesData } = await supabase
      .from('episodes')
      .select('id, episode_number, title')
      .eq('season_id', seasonId)
      .order('episode_number', { ascending: false })

    if (episodesData) {
      setEpisodes(episodesData)
    }
  }

  // CSV 파싱
  const parseCSV = useCallback(async (content: string): Promise<ParsedRow[]> => {
    const lines = content.trim().split('\n')
    if (lines.length < 2) {
      throw new Error('CSV 파일에 데이터가 없습니다.')
    }

    // BJ 멤버 목록 조회
    const { data: bjMembers } = await supabase
      .from('organization')
      .select('id, name')
      .neq('role', '대표')
      .eq('is_active', true)

    const bjMap = new Map(bjMembers?.map(bj => [bj.name.toLowerCase(), bj.id]) || [])

    const header = lines[0].split(',').map(h => h.trim().toLowerCase())
    const rows: ParsedRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.length < 2) continue

      const bjNameIdx = header.findIndex(h => h.includes('bj') || h.includes('이름') || h.includes('name'))
      const amountIdx = header.findIndex(h => h.includes('amount') || h.includes('금액') || h.includes('기여도'))
      const reasonIdx = header.findIndex(h => h.includes('reason') || h.includes('사유') || h.includes('내용'))
      const typeIdx = header.findIndex(h => h.includes('type') || h.includes('타입') || h.includes('구분'))

      const bjName = values[bjNameIdx !== -1 ? bjNameIdx : 0] || ''
      const amountStr = values[amountIdx !== -1 ? amountIdx : 1] || '0'
      const reason = reasonIdx !== -1 ? values[reasonIdx] : undefined
      const typeStr = typeIdx !== -1 ? values[typeIdx]?.toLowerCase() : undefined

      const amount = parseInt(amountStr.replace(/[^-\d]/g, ''), 10)
      const bjMemberId = bjMap.get(bjName.toLowerCase())

      let isValid = true
      let errorMessage = ''

      if (!bjName) {
        isValid = false
        errorMessage = 'BJ 이름이 비어있습니다.'
      } else if (!bjMemberId) {
        isValid = false
        errorMessage = `BJ "${bjName}"를 찾을 수 없습니다.`
      } else if (isNaN(amount)) {
        isValid = false
        errorMessage = '금액이 올바르지 않습니다.'
      }

      let type: 'prize' | 'penalty' | undefined
      if (uploadType === 'prize_penalty') {
        if (typeStr === 'prize' || typeStr === '상금') {
          type = 'prize'
        } else if (typeStr === 'penalty' || typeStr === '벌금') {
          type = 'penalty'
        } else if (amount > 0) {
          type = 'prize'
        } else {
          type = 'penalty'
        }
      }

      rows.push({
        bjName,
        amount: Math.abs(amount),
        reason,
        type,
        isValid,
        errorMessage,
        bjMemberId,
      })
    }

    return rows
  }, [supabase, uploadType])

  // 파일 드롭 처리
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setErrorMessage('CSV 파일만 업로드 가능합니다.')
      setStatus('error')
      return
    }

    setStatus('parsing')
    setErrorMessage('')

    try {
      const content = await file.text()
      const parsed = await parseCSV(content)
      setParsedData(parsed)
      setStatus('preview')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '파일 파싱 실패')
      setStatus('error')
    }
  }, [parseCSV])

  // 파일 선택 처리
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setErrorMessage('CSV 파일만 업로드 가능합니다.')
      setStatus('error')
      return
    }

    setStatus('parsing')
    setErrorMessage('')

    try {
      const content = await file.text()
      const parsed = await parseCSV(content)
      setParsedData(parsed)
      setStatus('preview')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '파일 파싱 실패')
      setStatus('error')
    }
  }, [parseCSV])

  // 업로드 실행
  const handleUpload = useCallback(async () => {
    const validRows = parsedData.filter(row => row.isValid)
    if (validRows.length === 0) {
      setErrorMessage('업로드할 유효한 데이터가 없습니다.')
      return
    }

    setStatus('uploading')
    const uploadResult: UploadResult = { total: validRows.length, success: 0, failed: 0, errors: [] }

    for (const row of validRows) {
      try {
        if (uploadType === 'contribution') {
          // 현재 잔액 조회
          const { data: currentBj } = await supabase
            .from('organization')
            .select('total_contribution, season_contribution')
            .eq('id', row.bjMemberId)
            .single()

          const balanceAfter = (currentBj?.season_contribution || 0) + row.amount

          // 기여도 로그 추가
          const { error } = await supabase.from('contribution_logs').insert({
            bj_member_id: row.bjMemberId!,
            episode_id: selectedEpisodeId,
            season_id: selectedSeasonId,
            amount: row.amount,
            reason: row.reason || 'CSV 일괄 업로드',
            balance_after: balanceAfter,
            event_type: 'csv_upload',
          })

          if (error) throw error
        } else {
          // 상벌금 추가
          const { error } = await supabase.from('prize_penalties').insert({
            bj_member_id: row.bjMemberId!,
            episode_id: selectedEpisodeId,
            season_id: selectedSeasonId,
            type: row.type!,
            amount: row.amount,
            description: row.reason || 'CSV 일괄 업로드',
            is_paid: false,
          })

          if (error) throw error
        }

        uploadResult.success++
      } catch (err) {
        uploadResult.failed++
        uploadResult.errors.push(`${row.bjName}: ${err instanceof Error ? err.message : '알 수 없는 오류'}`)
      }
    }

    setResult(uploadResult)
    setStatus('success')
  }, [parsedData, uploadType, selectedEpisodeId, selectedSeasonId, supabase])

  // 초기화
  const handleReset = () => {
    setStatus('idle')
    setParsedData([])
    setResult(null)
    setErrorMessage('')
  }

  // 초기 로드
  useState(() => {
    loadMetadata()
  })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>데이터 동기화</h1>
          <p>CSV 파일로 기여도, 상벌금 일괄 업로드</p>
        </div>
      </header>

      {/* 업로드 타입 선택 */}
      <div className={styles.typeSelector}>
        <button
          onClick={() => setUploadType('contribution')}
          className={`${styles.typeBtn} ${uploadType === 'contribution' ? styles.active : ''}`}
        >
          기여도 업로드
        </button>
        <button
          onClick={() => setUploadType('prize_penalty')}
          className={`${styles.typeBtn} ${uploadType === 'prize_penalty' ? styles.active : ''}`}
        >
          상벌금 업로드
        </button>
      </div>

      {/* 시즌/에피소드 선택 */}
      <div className={styles.selectors}>
        <div className={styles.selectorGroup}>
          <label>시즌</label>
          <select
            value={selectedSeasonId || ''}
            onChange={(e) => handleSeasonChange(Number(e.target.value))}
            className={styles.select}
          >
            <option value="">시즌 선택</option>
            {seasons.map(season => (
              <option key={season.id} value={season.id}>
                {season.name} {season.is_active ? '(활성)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.selectorGroup}>
          <label>에피소드 (선택)</label>
          <select
            value={selectedEpisodeId || ''}
            onChange={(e) => setSelectedEpisodeId(e.target.value ? Number(e.target.value) : null)}
            className={styles.select}
          >
            <option value="">전체 시즌</option>
            {episodes.map(ep => (
              <option key={ep.id} value={ep.id}>
                {ep.episode_number}화 - {ep.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 업로드 영역 */}
      {status === 'idle' && (
        <div
          className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
        >
          <Upload size={48} className={styles.dropzoneIcon} />
          <p className={styles.dropzoneText}>
            CSV 파일을 여기에 드래그하거나
          </p>
          <label className={styles.fileSelectBtn}>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className={styles.fileInput}
            />
            파일 선택
          </label>
          <p className={styles.dropzoneHint}>
            {uploadType === 'contribution'
              ? '필수 컬럼: BJ이름, 금액 / 선택: 사유'
              : '필수 컬럼: BJ이름, 금액, 타입(상금/벌금) / 선택: 사유'}
          </p>
        </div>
      )}

      {/* 파싱 중 */}
      {status === 'parsing' && (
        <div className={styles.loadingState}>
          <RefreshCw size={32} className={styles.spinning} />
          <p>파일 분석 중...</p>
        </div>
      )}

      {/* 프리뷰 */}
      {status === 'preview' && (
        <div className={styles.previewSection}>
          <div className={styles.previewHeader}>
            <h2>미리보기</h2>
            <div className={styles.previewStats}>
              <span className={styles.validCount}>
                <CheckCircle size={14} />
                유효: {parsedData.filter(r => r.isValid).length}
              </span>
              <span className={styles.invalidCount}>
                <XCircle size={14} />
                오류: {parsedData.filter(r => !r.isValid).length}
              </span>
            </div>
          </div>

          <div className={styles.previewTable}>
            <table>
              <thead>
                <tr>
                  <th>상태</th>
                  <th>BJ 이름</th>
                  <th>금액</th>
                  {uploadType === 'prize_penalty' && <th>타입</th>}
                  <th>사유</th>
                  <th>비고</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.map((row, idx) => (
                  <tr key={idx} className={row.isValid ? '' : styles.invalidRow}>
                    <td>
                      {row.isValid
                        ? <CheckCircle size={16} className={styles.validIcon} />
                        : <XCircle size={16} className={styles.invalidIcon} />
                      }
                    </td>
                    <td>{row.bjName}</td>
                    <td className={styles.amountCell}>
                      {uploadType === 'contribution'
                        ? row.amount.toLocaleString()
                        : `₩${row.amount.toLocaleString()}`
                      }
                    </td>
                    {uploadType === 'prize_penalty' && (
                      <td>
                        <span className={`${styles.typeBadge} ${row.type === 'prize' ? styles.prize : styles.penalty}`}>
                          {row.type === 'prize' ? '상금' : '벌금'}
                        </span>
                      </td>
                    )}
                    <td>{row.reason || '-'}</td>
                    <td className={styles.errorCell}>{row.errorMessage || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.previewActions}>
            <button onClick={handleReset} className={styles.cancelBtn}>
              <Trash2 size={16} />
              취소
            </button>
            <button
              onClick={handleUpload}
              className={styles.uploadBtn}
              disabled={parsedData.filter(r => r.isValid).length === 0}
            >
              <Upload size={16} />
              업로드 ({parsedData.filter(r => r.isValid).length}건)
            </button>
          </div>
        </div>
      )}

      {/* 업로드 중 */}
      {status === 'uploading' && (
        <div className={styles.loadingState}>
          <RefreshCw size={32} className={styles.spinning} />
          <p>데이터 업로드 중...</p>
        </div>
      )}

      {/* 결과 */}
      {status === 'success' && result && (
        <div className={styles.resultSection}>
          <div className={styles.resultIcon}>
            {result.failed === 0
              ? <CheckCircle size={48} className={styles.successIcon} />
              : <AlertTriangle size={48} className={styles.warningIcon} />
            }
          </div>
          <h2>{result.failed === 0 ? '업로드 완료' : '일부 실패'}</h2>
          <div className={styles.resultStats}>
            <span>전체: {result.total}건</span>
            <span className={styles.successText}>성공: {result.success}건</span>
            {result.failed > 0 && (
              <span className={styles.failText}>실패: {result.failed}건</span>
            )}
          </div>

          {result.errors.length > 0 && (
            <div className={styles.errorList}>
              <h3>오류 목록</h3>
              <ul>
                {result.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <button onClick={handleReset} className={styles.resetBtn}>
            <RefreshCw size={16} />
            다시 업로드
          </button>
        </div>
      )}

      {/* 오류 */}
      {status === 'error' && (
        <div className={styles.errorState}>
          <XCircle size={48} className={styles.errorIcon} />
          <p>{errorMessage}</p>
          <button onClick={handleReset} className={styles.resetBtn}>
            <RefreshCw size={16} />
            다시 시도
          </button>
        </div>
      )}

      {/* CSV 형식 가이드 */}
      <section className={styles.guideSection}>
        <h3>CSV 파일 형식 안내</h3>
        <div className={styles.guideContent}>
          {uploadType === 'contribution' ? (
            <>
              <p><strong>기여도 업로드용 CSV:</strong></p>
              <pre>
{`BJ이름,금액,사유
홍서하,50000,직급전 보너스
손밍,30000,1vs1 승리
별하,20000,기여도 전쟁`}
              </pre>
            </>
          ) : (
            <>
              <p><strong>상벌금 업로드용 CSV:</strong></p>
              <pre>
{`BJ이름,금액,타입,사유
홍서하,3000000,상금,1등 상금
손밍,1000000,상금,2등 상금
별하,500000,벌금,꼴등 벌금`}
              </pre>
            </>
          )}
          <p className={styles.note}>
            * 첫 번째 행은 헤더여야 합니다.<br />
            * BJ 이름은 조직도에 등록된 이름과 정확히 일치해야 합니다.
          </p>
        </div>
      </section>
    </div>
  )
}
