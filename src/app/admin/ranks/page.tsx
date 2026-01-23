'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  ChevronRight,
  History,
  Crown,
} from 'lucide-react'
import { useSupabaseContext } from '@/lib/context'
import { useAlert } from '@/lib/hooks/useAlert'
import styles from './page.module.css'

// 직급 타입
interface BjRank {
  id: number
  name: string
  level: number
  display_order: number
  color: string | null
  icon_url: string | null
  description: string | null
}

// BJ 멤버 타입
interface BjMember {
  id: number
  name: string
  image_url: string | null
  unit: 'excel' | 'crew'
  current_rank_id: number | null
  current_rank?: BjRank | null
}

// 직급 변동 이력 타입
interface RankHistory {
  id: number
  bj_member_id: number
  bj_member?: { name: string }
  rank_id: number
  rank?: BjRank
  previous_rank_id: number | null
  previous_rank?: BjRank | null
  change_reason: string | null
  is_rank_battle: boolean
  battle_number: number | null
  created_at: string
}

export default function RanksPage() {
  const supabase = useSupabaseContext()
  const { showError, showSuccess } = useAlert()

  const [ranks, setRanks] = useState<BjRank[]>([])
  const [bjMembers, setBjMembers] = useState<BjMember[]>([])
  const [rankHistory, setRankHistory] = useState<RankHistory[]>([])
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
      // 직급 목록
      const { data: ranksData, error: ranksError } = await supabase
        .from('bj_ranks')
        .select('*')
        .order('level', { ascending: true })

      if (ranksError) {
        console.error('직급 로드 실패:', ranksError)
        setRanks([])
      } else {
        setRanks(ranksData || [])
      }

      // BJ 멤버 목록
      const { data: bjData, error: bjError } = await supabase
        .from('organization')
        .select('id, name, image_url, unit, current_rank_id')
        .neq('role', '대표')
        .eq('is_active', true)
        .order('position_order', { ascending: true })

      if (bjError) throw bjError

      // 직급 정보 매핑
      const bjWithRanks = (bjData || []).map(bj => ({
        ...bj,
        current_rank: ranksData?.find(r => r.id === bj.current_rank_id) || null,
      })) as BjMember[]

      setBjMembers(bjWithRanks)

      // 직급 변동 이력
      const { data: historyData } = await supabase
        .from('bj_rank_history')
        .select(`
          *,
          organization:bj_member_id(name),
          bj_ranks:rank_id(id, name, color),
          previous:previous_rank_id(id, name, color)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (historyData) {
        setRankHistory(historyData.map(h => ({
          ...h,
          bj_member: h.organization as { name: string } | undefined,
          rank: h.bj_ranks as BjRank | undefined,
          previous_rank: h.previous as BjRank | undefined,
        })))
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

  // 직급 수정
  const handleSaveRank = async () => {
    if (!editingRank || !editForm.name) return

    try {
      const { error } = await supabase
        .from('bj_ranks')
        .update({
          name: editForm.name,
          color: editForm.color,
          description: editForm.description,
        })
        .eq('id', editingRank.id)

      if (error) throw error

      showSuccess('직급이 수정되었습니다.')
      setEditingRank(null)
      setEditForm({})
      fetchData()
    } catch (err) {
      console.error('직급 수정 실패:', err)
      showError('직급 수정에 실패했습니다.')
    }
  }

  // 직급 배정 시작
  const handleStartAssign = () => {
    const currentAssignments = new Map<number, number>()
    bjMembers.forEach(bj => {
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
      // 현재 시즌 조회
      const { data: seasonData } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .single()

      const seasonId = seasonData?.id

      // 변경된 BJ만 업데이트
      for (const bj of bjMembers) {
        const newRankId = assignedRanks.get(bj.id)
        const oldRankId = bj.current_rank_id

        if (newRankId !== oldRankId) {
          // 새 직급명 조회 (current_rank 문자열 동기화용)
          const newRank = ranks.find(r => r.id === newRankId)
          const rankName = newRank?.name || null

          // organization 테이블 업데이트 (current_rank_id + current_rank 모두)
          await supabase
            .from('organization')
            .update({
              current_rank_id: newRankId || null,
              current_rank: rankName,  // 문자열 필드도 동기화
            })
            .eq('id', bj.id)

          // 직급 변동 이력 추가
          if (newRankId) {
            await supabase.from('bj_rank_history').insert({
              bj_member_id: bj.id,
              season_id: seasonId,
              rank_id: newRankId,
              previous_rank_id: oldRankId,
              change_reason: '관리자 직급 배정',
              is_rank_battle: false,
            })
          }
        }
      }

      showSuccess('직급 배정이 저장되었습니다.')
      setAssignMode(false)
      fetchData()
    } catch (err) {
      console.error('직급 배정 저장 실패:', err)
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
                      <button onClick={() => { setEditingRank(null); setEditForm({}) }} className={styles.cancelBtn}>
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
                        setEditForm({ name: rank.name, color: rank.color || '#666666', description: rank.description || '' })
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
                  <span className={`${styles.unitBadge} ${bj.unit === 'excel' ? styles.excel : styles.crew}`}>
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
