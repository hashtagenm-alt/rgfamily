'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Coins,
  Plus,
  Check,
  X,
  RefreshCw,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { useAlert } from '@/lib/hooks/useAlert'
import {
  getPrizePenalties,
  getBjContributionStats,
  getCurrentSeasonEpisodes,
  createPrizePenalty,
  markPrizePenaltyPaid,
  deletePrizePenalty,
  type PrizePenaltyRecord,
  type BjContributionStat,
  type EpisodeInfo,
} from '@/lib/actions/prizes'
import { logger } from '@/lib/utils/logger'
import styles from './page.module.css'

export default function PrizesPage() {
  const { showError, showSuccess } = useAlert()

  const [records, setRecords] = useState<PrizePenaltyRecord[]>([])
  const [bjMembers, setBjMembers] = useState<BjContributionStat[]>([])
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 필터
  const [filterType, setFilterType] = useState<'all' | 'prize' | 'penalty'>('all')
  const [filterPaid, setFilterPaid] = useState<'all' | 'paid' | 'unpaid'>('all')

  // 추가 모달
  const [addModal, setAddModal] = useState<{
    open: boolean
    bjId: number | null
    type: 'prize' | 'penalty'
    amount: number
    description: string
    episodeId: number | null
  }>({ open: false, bjId: null, type: 'prize', amount: 0, description: '', episodeId: null })

  // 데이터 로드
  const fetchData = useCallback(async () => {
    setIsLoading(true)

    try {
      const [recordsResult, bjResult, episodesResult] = await Promise.all([
        getPrizePenalties(),
        getBjContributionStats(),
        getCurrentSeasonEpisodes(),
      ])

      if (recordsResult.error) {
        logger.dbError('select', 'prize_penalties', recordsResult.error)
        setRecords([])
      } else {
        setRecords(recordsResult.data || [])
      }

      if (bjResult.error) {
        logger.dbError('select', 'organization', bjResult.error)
      } else {
        setBjMembers(bjResult.data || [])
      }

      if (episodesResult.error) {
        logger.dbError('select', 'episodes', episodesResult.error)
      } else {
        setEpisodes(episodesResult.data || [])
      }
    } catch (err) {
      logger.error('데이터 로드 실패', err)
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 상벌금 추가
  const handleAddRecord = async () => {
    if (!addModal.bjId || addModal.amount <= 0) {
      showError('BJ와 금액을 입력해주세요.')
      return
    }

    try {
      const result = await createPrizePenalty({
        bjId: addModal.bjId,
        type: addModal.type,
        amount: addModal.amount,
        description: addModal.description || null,
        episodeId: addModal.episodeId,
      })

      if (result.error) throw new Error(result.error)

      showSuccess(`${addModal.type === 'prize' ? '상금' : '벌금'}이 등록되었습니다.`)
      setAddModal({ open: false, bjId: null, type: 'prize', amount: 0, description: '', episodeId: null })
      fetchData()
    } catch (err) {
      logger.dbError('insert', 'prize_penalties', err)
      showError('등록에 실패했습니다.')
    }
  }

  // 지급 완료 처리
  const handleMarkPaid = async (id: number) => {
    try {
      const result = await markPrizePenaltyPaid(id)

      if (result.error) throw new Error(result.error)

      showSuccess('지급 완료 처리되었습니다.')
      fetchData()
    } catch (err) {
      logger.dbError('update', 'prize_penalties', err)
      showError('처리에 실패했습니다.')
    }
  }

  // 삭제
  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const result = await deletePrizePenalty(id)

      if (result.error) throw new Error(result.error)

      showSuccess('삭제되었습니다.')
      fetchData()
    } catch (err) {
      logger.dbError('delete', 'prize_penalties', err)
      showError('삭제에 실패했습니다.')
    }
  }

  // 필터링
  const filteredRecords = records.filter(r => {
    const matchesType = filterType === 'all' || r.type === filterType
    const matchesPaid = filterPaid === 'all'
      || (filterPaid === 'paid' && r.is_paid)
      || (filterPaid === 'unpaid' && !r.is_paid)
    return matchesType && matchesPaid
  })

  // 금액 포맷팅
  const formatAmount = (amount: number): string => {
    if (amount >= 10000) {
      return `${Math.floor(amount / 10000)}만`
    }
    return amount.toLocaleString()
  }

  // 통계
  const totalPrize = bjMembers.reduce((sum, bj) => sum + bj.total_prize, 0)
  const totalPenalty = bjMembers.reduce((sum, bj) => sum + bj.total_penalty, 0)
  const unpaidCount = records.filter(r => !r.is_paid).length

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>로딩 중...</span>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <Coins size={24} />
          <div>
            <h1>상벌금 관리</h1>
            <p>에피소드별 상금/벌금 기록 및 정산</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button onClick={() => setAddModal({ ...addModal, open: true, type: 'prize' })} className={styles.prizeBtn}>
            <ArrowUpRight size={16} />
            상금 등록
          </button>
          <button onClick={() => setAddModal({ ...addModal, open: true, type: 'penalty' })} className={styles.penaltyBtn}>
            <ArrowDownRight size={16} />
            벌금 등록
          </button>
        </div>
      </header>

      {/* 통계 카드 */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <ArrowUpRight size={20} className={styles.prizeIcon} />
          <div className={styles.statContent}>
            <span className={styles.statValue}>₩{formatAmount(totalPrize)}</span>
            <span className={styles.statLabel}>총 상금</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <ArrowDownRight size={20} className={styles.penaltyIcon} />
          <div className={styles.statContent}>
            <span className={styles.statValue}>₩{formatAmount(totalPenalty)}</span>
            <span className={styles.statLabel}>총 벌금</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <RefreshCw size={20} className={styles.pendingIcon} />
          <div className={styles.statContent}>
            <span className={styles.statValue}>{unpaidCount}</span>
            <span className={styles.statLabel}>미정산 건수</span>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>타입:</span>
          <button
            onClick={() => setFilterType('all')}
            className={`${styles.filterBtn} ${filterType === 'all' ? styles.active : ''}`}
          >
            전체
          </button>
          <button
            onClick={() => setFilterType('prize')}
            className={`${styles.filterBtn} ${filterType === 'prize' ? styles.active : ''}`}
          >
            상금
          </button>
          <button
            onClick={() => setFilterType('penalty')}
            className={`${styles.filterBtn} ${filterType === 'penalty' ? styles.active : ''}`}
          >
            벌금
          </button>
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>상태:</span>
          <button
            onClick={() => setFilterPaid('all')}
            className={`${styles.filterBtn} ${filterPaid === 'all' ? styles.active : ''}`}
          >
            전체
          </button>
          <button
            onClick={() => setFilterPaid('unpaid')}
            className={`${styles.filterBtn} ${filterPaid === 'unpaid' ? styles.active : ''}`}
          >
            미정산
          </button>
          <button
            onClick={() => setFilterPaid('paid')}
            className={`${styles.filterBtn} ${filterPaid === 'paid' ? styles.active : ''}`}
          >
            정산완료
          </button>
        </div>
      </div>

      {/* 기록 테이블 */}
      <section className={styles.section}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>BJ</th>
                <th>타입</th>
                <th className={styles.rightAlign}>금액</th>
                <th>에피소드</th>
                <th>설명</th>
                <th>상태</th>
                <th>등록일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td className={styles.nameCell}>{record.bj_member?.name || '-'}</td>
                  <td>
                    <span className={`${styles.typeBadge} ${record.type === 'prize' ? styles.prize : styles.penalty}`}>
                      {record.type === 'prize' ? '상금' : '벌금'}
                    </span>
                  </td>
                  <td className={`${styles.rightAlign} ${record.type === 'prize' ? styles.prizeAmount : styles.penaltyAmount}`}>
                    ₩{formatAmount(record.amount)}
                  </td>
                  <td className={styles.episodeCell}>
                    {record.episode ? `${record.episode.episode_number}화` : '-'}
                  </td>
                  <td className={styles.descCell}>{record.description || '-'}</td>
                  <td>
                    {record.is_paid ? (
                      <span className={styles.paidBadge}>완료</span>
                    ) : (
                      <span className={styles.unpaidBadge}>미정산</span>
                    )}
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(record.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {!record.is_paid && (
                        <button
                          onClick={() => handleMarkPaid(record.id)}
                          className={styles.checkBtn}
                          title="정산 완료"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(record.id)}
                        className={styles.deleteBtn}
                        title="삭제"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <div className={styles.emptyState}>
            <Coins size={32} />
            <p>상벌금 기록이 없습니다.</p>
          </div>
        )}
      </section>

      {/* 추가 모달 */}
      {addModal.open && (
        <div className={styles.modalOverlay} onClick={() => setAddModal({ ...addModal, open: false })}>
          <motion.div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h3>{addModal.type === 'prize' ? '상금' : '벌금'} 등록</h3>

            <div className={styles.formGroup}>
              <label>BJ 선택 *</label>
              <select
                value={addModal.bjId || ''}
                onChange={(e) => setAddModal({ ...addModal, bjId: Number(e.target.value) || null })}
                className={styles.select}
              >
                <option value="">BJ 선택</option>
                {bjMembers.map(bj => (
                  <option key={bj.id} value={bj.id}>{bj.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>금액 (원) *</label>
              <input
                type="number"
                value={addModal.amount || ''}
                onChange={(e) => setAddModal({ ...addModal, amount: parseInt(e.target.value) || 0 })}
                className={styles.input}
                placeholder="0"
                min="1"
              />
            </div>

            <div className={styles.formGroup}>
              <label>에피소드 (선택)</label>
              <select
                value={addModal.episodeId || ''}
                onChange={(e) => setAddModal({ ...addModal, episodeId: e.target.value ? Number(e.target.value) : null })}
                className={styles.select}
              >
                <option value="">전체 시즌</option>
                {episodes.map(ep => (
                  <option key={ep.id} value={ep.id}>{ep.episode_number}화 - {ep.title}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>설명</label>
              <input
                type="text"
                value={addModal.description}
                onChange={(e) => setAddModal({ ...addModal, description: e.target.value })}
                className={styles.input}
                placeholder="예: 1등 상금, 꼴등 벌금"
              />
            </div>

            <div className={styles.modalActions}>
              <button onClick={() => setAddModal({ ...addModal, open: false })} className={styles.cancelBtn}>
                취소
              </button>
              <button
                onClick={handleAddRecord}
                className={addModal.type === 'prize' ? styles.prizeBtn : styles.penaltyBtn}
                disabled={!addModal.bjId || addModal.amount <= 0}
              >
                등록
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
