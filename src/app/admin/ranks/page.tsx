'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Edit2, Save, X, ChevronRight, History, Crown } from 'lucide-react'
import { useAlert } from '@/lib/hooks/useAlert'
import {
  getBjRanks,
  getBjMembersForRank,
  getRankHistory,
  updateBjRank,
  saveRankAssignments,
  type BjMemberForRank,
} from '@/lib/actions/ranks'
import type { BjRank, BjRankHistoryWithDetails } from '@/types/database'
import { logger } from '@/lib/utils/logger'
import styles from './page.module.css'

export default function RanksPage() {
  const { showError, showSuccess } = useAlert()

  const [ranks, setRanks] = useState<BjRank[]>([])
  const [bjMembers, setBjMembers] = useState<BjMemberForRank[]>([])
  const [rankHistory, setRankHistory] = useState<BjRankHistoryWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 편집 모드
  const [editingRank, setEditingRank] = useState<BjRank | null>(null)
  const [editForm, setEditForm] = useState<Partial<BjRank>>({})

  // 직급 배정 모드
  const [assignMode, setAssignMode] = useState(false)
  const [assignedRanks, setAssignedRanks] = useState<Map<number, number>>(new Map())

  // 탭
  const [activeTab, setActiveTab] = useState<'ranks' | 'assign' | 'history'>('ranks')

  // 데이터 로드
  const fetchData = useCallback(async () => {
    setIsLoading(true)

    try {
      const [ranksResult, bjResult, historyResult] = await Promise.all([
        getBjRanks(),
        getBjMembersForRank(),
        getRankHistory(),
      ])

      if (ranksResult.error) {
        logger.dbError('select', 'bj_ranks', ranksResult.error)
        setRanks([])
      } else {
        setRanks(ranksResult.data || [])
      }

      if (bjResult.error) {
        throw new Error(bjResult.error)
      }
      setBjMembers(bjResult.data || [])

      if (historyResult.data) {
        setRankHistory(historyResult.data)
      }
    } catch (err) {
      logger.error('데이터 로드 실패', err)
      showError('데이터 로드에 실패했습니다.')
    }

    setIsLoading(false)
  }, [showError])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 직급 수정
  const handleSaveRank = async () => {
    if (!editingRank || !editForm.name) return

    try {
      const result = await updateBjRank(editingRank.id, {
        name: editForm.name!,
        color: editForm.color ?? null,
        description: editForm.description ?? null,
      })

      if (result.error) throw new Error(result.error)

      showSuccess('직급이 수정되었습니다.')
      setEditingRank(null)
      setEditForm({})
      fetchData()
    } catch (err) {
      logger.dbError('update', 'bj_ranks', err)
      showError('직급 수정에 실패했습니다.')
    }
  }

  // 직급 배정 시작
  const handleStartAssign = () => {
    const currentAssignments = new Map<number, number>()
    bjMembers.forEach((bj) => {
      if (bj.current_rank_id) {
        currentAssignments.set(bj.id, bj.current_rank_id)
      }
    })
    setAssignedRanks(currentAssignments)
    setAssignMode(true)
  }

  // 직급 배정 변경
  const handleAssignRank = (bjId: number, rankId: number) => {
    const newAssignments = new Map(assignedRanks)
    if (rankId === 0) {
      newAssignments.delete(bjId)
    } else {
      newAssignments.set(bjId, rankId)
    }
    setAssignedRanks(newAssignments)
  }

  // 직급 배정 저장
  const handleSaveAssignments = async () => {
    try {
      // 변경된 BJ만 추출
      const assignments = bjMembers.map((bj) => ({
        bjId: bj.id,
        newRankId: assignedRanks.get(bj.id) || null,
        oldRankId: bj.current_rank_id,
      }))

      const result = await saveRankAssignments(assignments, ranks)

      if (result.error) throw new Error(result.error)

      showSuccess('직급 배정이 저장되었습니다.')
      setAssignMode(false)
      fetchData()
    } catch (err) {
      logger.dbError('update', 'bj_ranks', err)
      showError('직급 배정 저장에 실패했습니다.')
    }
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
          <Trophy size={24} />
          <div>
            <h1>직급 관리</h1>
            <p>BJ 직급 설정 및 배정</p>
          </div>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <div className={styles.tabs}>
        <button
          onClick={() => setActiveTab('ranks')}
          className={`${styles.tab} ${activeTab === 'ranks' ? styles.active : ''}`}
        >
          <Crown size={16} />
          직급 목록
        </button>
        <button
          onClick={() => setActiveTab('assign')}
          className={`${styles.tab} ${activeTab === 'assign' ? styles.active : ''}`}
        >
          <Edit2 size={16} />
          직급 배정
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
        >
          <History size={16} />
          변동 이력
        </button>
      </div>

      {/* 직급 목록 탭 */}
      {activeTab === 'ranks' && (
        <motion.section
          className={styles.section}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className={styles.sectionHeader}>
            <h2>직급 목록 (12단계)</h2>
          </div>

          <div className={styles.rankList}>
            {ranks.map((rank) => (
              <div key={rank.id} className={styles.rankCard}>
                {editingRank?.id === rank.id ? (
                  // 편집 모드
                  <div className={styles.editForm}>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className={styles.input}
                      placeholder="직급명"
                    />
                    <input
                      type="color"
                      value={editForm.color || '#666666'}
                      onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                      className={styles.colorInput}
                    />
                    <input
                      type="text"
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className={styles.input}
                      placeholder="설명"
                    />
                    <div className={styles.editActions}>
                      <button onClick={handleSaveRank} className={styles.saveBtn}>
                        <Save size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingRank(null)
                          setEditForm({})
                        }}
                        className={styles.cancelBtn}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  // 뷰 모드
                  <>
                    <div className={styles.rankInfo}>
                      <span
                        className={styles.rankBadge}
                        style={{ backgroundColor: rank.color || '#666' }}
                      >
                        Lv.{rank.level}
                      </span>
                      <span className={styles.rankName}>{rank.name}</span>
                      {rank.description && (
                        <span className={styles.rankDesc}>{rank.description}</span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setEditingRank(rank)
                        setEditForm({
                          name: rank.name,
                          color: rank.color || '#666666',
                          description: rank.description || '',
                        })
                      }}
                      className={styles.editBtn}
                    >
                      <Edit2 size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {ranks.length === 0 && (
            <div className={styles.emptyState}>
              <Trophy size={32} />
              <p>직급이 없습니다. DB 스키마를 먼저 실행해주세요.</p>
            </div>
          )}
        </motion.section>
      )}

      {/* 직급 배정 탭 */}
      {activeTab === 'assign' && (
        <motion.section
          className={styles.section}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className={styles.sectionHeader}>
            <h2>직급 배정</h2>
            {!assignMode ? (
              <button onClick={handleStartAssign} className={styles.primaryBtn}>
                <Edit2 size={16} />
                배정 시작
              </button>
            ) : (
              <div className={styles.assignActions}>
                <button onClick={() => setAssignMode(false)} className={styles.cancelBtn}>
                  취소
                </button>
                <button onClick={handleSaveAssignments} className={styles.saveBtn}>
                  <Save size={16} />
                  저장
                </button>
              </div>
            )}
          </div>

          <div className={styles.assignGrid}>
            {bjMembers.map((bj) => (
              <div key={bj.id} className={styles.assignCard}>
                <div className={styles.bjInfo}>
                  <span className={styles.bjName}>{bj.name}</span>
                  <span
                    className={`${styles.unitBadge} ${bj.unit === 'excel' ? styles.excel : styles.crew}`}
                  >
                    {bj.unit === 'excel' ? 'EXCEL' : 'CREW'}
                  </span>
                </div>

                {assignMode ? (
                  <select
                    value={assignedRanks.get(bj.id) || 0}
                    onChange={(e) => handleAssignRank(bj.id, Number(e.target.value))}
                    className={styles.rankSelect}
                  >
                    <option value={0}>미배정</option>
                    {ranks.map((rank) => (
                      <option key={rank.id} value={rank.id}>
                        {rank.name} (Lv.{rank.level})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className={styles.currentRank}>
                    {bj.current_rank ? (
                      <span
                        className={styles.rankBadge}
                        style={{ backgroundColor: bj.current_rank.color || '#666' }}
                      >
                        {bj.current_rank.name}
                      </span>
                    ) : (
                      <span className={styles.noRank}>미배정</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {bjMembers.length === 0 && (
            <div className={styles.emptyState}>
              <Trophy size={32} />
              <p>등록된 BJ가 없습니다.</p>
            </div>
          )}
        </motion.section>
      )}

      {/* 변동 이력 탭 */}
      {activeTab === 'history' && (
        <motion.section
          className={styles.section}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className={styles.sectionHeader}>
            <h2>직급 변동 이력</h2>
          </div>

          <div className={styles.historyList}>
            {rankHistory.map((history) => (
              <div key={history.id} className={styles.historyCard}>
                <div className={styles.historyInfo}>
                  <span className={styles.historyName}>{history.bj_member?.name || 'Unknown'}</span>
                  <div className={styles.historyChange}>
                    {history.previous_rank ? (
                      <span
                        className={styles.rankBadge}
                        style={{ backgroundColor: history.previous_rank.color || '#666' }}
                      >
                        {history.previous_rank.name}
                      </span>
                    ) : (
                      <span className={styles.noRank}>미배정</span>
                    )}
                    <ChevronRight size={14} />
                    {history.rank ? (
                      <span
                        className={styles.rankBadge}
                        style={{ backgroundColor: history.rank.color || '#666' }}
                      >
                        {history.rank.name}
                      </span>
                    ) : (
                      <span className={styles.noRank}>미배정</span>
                    )}
                  </div>
                </div>
                <div className={styles.historyMeta}>
                  <span className={styles.historyReason}>{history.change_reason || '-'}</span>
                  <span className={styles.historyDate}>
                    {new Date(history.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {rankHistory.length === 0 && (
            <div className={styles.emptyState}>
              <History size={32} />
              <p>직급 변동 이력이 없습니다.</p>
            </div>
          )}
        </motion.section>
      )}
    </div>
  )
}
