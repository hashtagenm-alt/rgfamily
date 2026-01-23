'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  Plus,
  Minus,
  RefreshCw,
  Search,
  Filter,
  History,
} from 'lucide-react'
import { useSupabaseContext } from '@/lib/context'
import { useAlert } from '@/lib/hooks/useAlert'
import styles from './page.module.css'

// BJ 멤버 타입
interface BjMember {
  id: number
  name: string
  unit: 'excel' | 'crew'
  total_contribution: number
  season_contribution: number
}

// 기여도 로그 타입
interface ContributionLog {
  id: number
  bj_member_id: number
  bj_member?: { name: string }
  episode_id: number | null
  episode?: { episode_number: number; title: string }
  amount: number
  reason: string
  balance_after: number
  event_type: string | null
  created_at: string
}

// 에피소드 타입
interface Episode {
  id: number
  episode_number: number
  title: string
}

export default function ContributionsPage() {
  const supabase = useSupabaseContext()
  const { showError, showSuccess } = useAlert()

  const [bjMembers, setBjMembers] = useState<BjMember[]>([])
  const [logs, setLogs] = useState<ContributionLog[]>([])
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 필터
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUnit, setSelectedUnit] = useState<'all' | 'excel' | 'crew'>('all')

  // 기여도 수정 모달
  const [editModal, setEditModal] = useState<{
    bj: BjMember | null
    amount: number
    reason: string
    isAdding: boolean
  }>({ bj: null, amount: 0, reason: '', isAdding: true })

  // 데이터 로드
  const fetchData = useCallback(async () => {
    setIsLoading(true)

    try {
      // BJ 멤버 목록
      const { data: bjData, error: bjError } = await supabase
        .from('organization')
        .select('id, name, unit, total_contribution, season_contribution')
        .neq('role', '대표')
        .eq('is_active', true)
        .order('season_contribution', { ascending: false })

      if (bjError) throw bjError
      setBjMembers((bjData || []).map(bj => ({
        ...bj,
        total_contribution: bj.total_contribution || 0,
        season_contribution: bj.season_contribution || 0,
      })))

      // 기여도 로그
      const { data: logsData } = await supabase
        .from('contribution_logs')
        .select(`
          *,
          organization:bj_member_id(name),
          episodes:episode_id(episode_number, title)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (logsData) {
        setLogs(logsData.map(log => ({
          ...log,
          bj_member: log.organization as { name: string } | undefined,
          episode: log.episodes as Episode | undefined,
        })))
      }

      // 에피소드 목록
      const { data: seasonData } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .single()

      if (seasonData) {
        const { data: episodesData } = await supabase
          .from('episodes')
          .select('id, episode_number, title')
          .eq('season_id', seasonData.id)
          .order('episode_number', { ascending: false })

        if (episodesData) {
          setEpisodes(episodesData)
        }
      }

    } catch (err) {
      console.error('데이터 로드 실패:', err)
      showError('데이터 로드에 실패했습니다.')
    }

    setIsLoading(false)
  }, [supabase, showError])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 기여도 수정
  const handleSaveContribution = async () => {
    if (!editModal.bj || editModal.amount <= 0 || !editModal.reason) {
      showError('금액과 사유를 입력해주세요.')
      return
    }

    try {
      const actualAmount = editModal.isAdding ? editModal.amount : -editModal.amount
      const newBalance = editModal.bj.season_contribution + actualAmount

      // 현재 시즌 조회
      const { data: seasonData } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .single()

      // 기여도 로그 추가
      const { error: logError } = await supabase.from('contribution_logs').insert({
        bj_member_id: editModal.bj.id,
        season_id: seasonData?.id,
        amount: actualAmount,
        reason: editModal.reason,
        balance_after: newBalance,
        event_type: 'manual',
      })

      if (logError) throw logError

      showSuccess(`${editModal.bj.name}의 기여도가 ${editModal.isAdding ? '추가' : '차감'}되었습니다.`)
      setEditModal({ bj: null, amount: 0, reason: '', isAdding: true })
      fetchData()
    } catch (err) {
      console.error('기여도 수정 실패:', err)
      showError('기여도 수정에 실패했습니다.')
    }
  }

  // 필터링된 BJ 목록
  const filteredBjMembers = bjMembers.filter(bj => {
    const matchesSearch = bj.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesUnit = selectedUnit === 'all' || bj.unit === selectedUnit
    return matchesSearch && matchesUnit
  })

  // 금액 포맷팅
  const formatAmount = (amount: number): string => {
    if (amount >= 10000) {
      return `${Math.floor(amount / 10000)}만`
    }
    return amount.toLocaleString()
  }

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
          <TrendingUp size={24} />
          <div>
            <h1>기여도 관리</h1>
            <p>BJ별 기여도 조회 및 수정</p>
          </div>
        </div>
        <button onClick={fetchData} className={styles.refreshBtn} disabled={isLoading}>
          <RefreshCw size={16} className={isLoading ? styles.spinning : ''} />
          새로고침
        </button>
      </header>

      {/* 필터 */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            type="text"
            placeholder="BJ 이름 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.unitFilter}>
          <button
            onClick={() => setSelectedUnit('all')}
            className={`${styles.filterBtn} ${selectedUnit === 'all' ? styles.active : ''}`}
          >
            전체
          </button>
          <button
            onClick={() => setSelectedUnit('excel')}
            className={`${styles.filterBtn} ${selectedUnit === 'excel' ? styles.active : ''}`}
          >
            EXCEL
          </button>
          <button
            onClick={() => setSelectedUnit('crew')}
            className={`${styles.filterBtn} ${selectedUnit === 'crew' ? styles.active : ''}`}
          >
            CREW
          </button>
        </div>
      </div>

      {/* BJ 목록 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>BJ 기여도 현황</h2>
          <span className={styles.totalCount}>{filteredBjMembers.length}명</span>
        </div>

        <div className={styles.bjGrid}>
          {filteredBjMembers.map((bj, index) => (
            <motion.div
              key={bj.id}
              className={styles.bjCard}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <div className={styles.bjInfo}>
                <div className={styles.bjRank}>{index + 1}</div>
                <div className={styles.bjDetails}>
                  <span className={styles.bjName}>{bj.name}</span>
                  <span className={`${styles.unitBadge} ${bj.unit === 'excel' ? styles.excel : styles.crew}`}>
                    {bj.unit === 'excel' ? 'EXCEL' : 'CREW'}
                  </span>
                </div>
              </div>
              <div className={styles.bjStats}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>시즌</span>
                  <span className={styles.statValue}>{formatAmount(bj.season_contribution)}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>누적</span>
                  <span className={styles.statValueSmall}>{formatAmount(bj.total_contribution)}</span>
                </div>
              </div>
              <div className={styles.bjActions}>
                <button
                  onClick={() => setEditModal({ bj, amount: 0, reason: '', isAdding: true })}
                  className={styles.addBtn}
                  title="기여도 추가"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={() => setEditModal({ bj, amount: 0, reason: '', isAdding: false })}
                  className={styles.subtractBtn}
                  title="기여도 차감"
                >
                  <Minus size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredBjMembers.length === 0 && (
          <div className={styles.emptyState}>
            <TrendingUp size={32} />
            <p>검색 결과가 없습니다.</p>
          </div>
        )}
      </section>

      {/* 변동 로그 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>
            <History size={18} />
            최근 변동 로그
          </h2>
        </div>

        <div className={styles.logList}>
          {logs.slice(0, 20).map((log) => (
            <div key={log.id} className={styles.logItem}>
              <div className={styles.logInfo}>
                <span className={styles.logName}>{log.bj_member?.name || 'Unknown'}</span>
                <span className={`${styles.logAmount} ${log.amount >= 0 ? styles.positive : styles.negative}`}>
                  {log.amount >= 0 ? '+' : ''}{formatAmount(log.amount)}
                </span>
              </div>
              <div className={styles.logMeta}>
                <span className={styles.logReason}>{log.reason}</span>
                <span className={styles.logDate}>
                  {new Date(log.created_at).toLocaleDateString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>

        {logs.length === 0 && (
          <div className={styles.emptyState}>
            <History size={32} />
            <p>기여도 변동 로그가 없습니다.</p>
          </div>
        )}
      </section>

      {/* 기여도 수정 모달 */}
      {editModal.bj && (
        <div className={styles.modalOverlay} onClick={() => setEditModal({ bj: null, amount: 0, reason: '', isAdding: true })}>
          <motion.div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h3>
              {editModal.bj.name} 기여도 {editModal.isAdding ? '추가' : '차감'}
            </h3>
            <p className={styles.currentBalance}>
              현재 기여도: <strong>{formatAmount(editModal.bj.season_contribution)}</strong>
            </p>

            <div className={styles.formGroup}>
              <label>금액</label>
              <input
                type="number"
                value={editModal.amount || ''}
                onChange={(e) => setEditModal({ ...editModal, amount: parseInt(e.target.value) || 0 })}
                className={styles.input}
                placeholder="0"
                min="1"
              />
            </div>

            <div className={styles.formGroup}>
              <label>사유</label>
              <input
                type="text"
                value={editModal.reason}
                onChange={(e) => setEditModal({ ...editModal, reason: e.target.value })}
                className={styles.input}
                placeholder="예: 1vs1 승리, 직급전 보너스"
              />
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => setEditModal({ bj: null, amount: 0, reason: '', isAdding: true })}
                className={styles.cancelBtn}
              >
                취소
              </button>
              <button
                onClick={handleSaveContribution}
                className={editModal.isAdding ? styles.addBtn : styles.subtractBtn}
                disabled={editModal.amount <= 0 || !editModal.reason}
              >
                {editModal.isAdding ? '추가' : '차감'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
