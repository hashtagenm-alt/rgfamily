'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Swords,
  Users,
  Plus,
  Trash2,
  Save,
  Trophy,
  RefreshCw,
} from 'lucide-react'
import { useSupabaseContext } from '@/lib/context'
import { useAlert } from '@/lib/hooks/useAlert'
import styles from './page.module.css'

// 에피소드 타입
interface Episode {
  id: number
  episode_number: number
  title: string
}

// BJ 멤버 타입
interface BjMember {
  id: number
  name: string
  unit: 'excel' | 'crew'
}

// 팀 타입
interface Team {
  id: number
  episode_id: number
  team_name: string
  team_type: 'major_minor' | 'queen_princess' | 'mercenary' | 'custom'
  team_color: string | null
  members: TeamMember[]
}

// 팀 멤버 타입
interface TeamMember {
  id: number
  bj_member_id: number
  bj_member?: BjMember
  role: 'leader' | 'member' | 'mercenary'
  partner_name: string | null
}

// 매칭 타입
interface Matchup {
  id: number
  episode_id: number
  bj_member_1_id: number
  bj_member_1?: BjMember
  bj_member_2_id: number
  bj_member_2?: BjMember
  winner_id: number | null
  winner?: BjMember | null
  match_type: '1vs1' | 'rival' | 'team_vs_team'
  prize_type: string | null
  prize_amount: number | null
}

export default function TeamsPage() {
  const supabase = useSupabaseContext()
  const { showError, showSuccess } = useAlert()

  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(null)
  const [bjMembers, setBjMembers] = useState<BjMember[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [matchups, setMatchups] = useState<Matchup[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 탭
  const [activeTab, setActiveTab] = useState<'teams' | 'matchups'>('teams')

  // 팀 추가 모달
  const [teamModal, setTeamModal] = useState<{
    open: boolean
    teamName: string
    teamType: 'major_minor' | 'queen_princess' | 'mercenary' | 'custom'
    teamColor: string
    selectedMembers: number[]
  }>({ open: false, teamName: '', teamType: 'custom', teamColor: '#fd68ba', selectedMembers: [] })

  // 매칭 추가 모달
  const [matchupModal, setMatchupModal] = useState<{
    open: boolean
    bj1Id: number | null
    bj2Id: number | null
    matchType: '1vs1' | 'rival' | 'team_vs_team'
    prizeType: string
    prizeAmount: number
  }>({ open: false, bj1Id: null, bj2Id: null, matchType: '1vs1', prizeType: 'contribution', prizeAmount: 0 })

  // 초기 데이터 로드
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true)

    try {
      // 현재 시즌 에피소드 조회
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
          if (episodesData.length > 0) {
            setSelectedEpisodeId(episodesData[0].id)
          }
        }
      }

      // BJ 멤버 목록
      const { data: bjData } = await supabase
        .from('organization')
        .select('id, name, unit')
        .neq('role', '대표')
        .eq('is_active', true)
        .order('position_order', { ascending: true })

      if (bjData) {
        setBjMembers(bjData)
      }

    } catch (err) {
      console.error('초기 데이터 로드 실패:', err)
    }

    setIsLoading(false)
  }, [supabase])

  // 에피소드별 팀/매칭 데이터 로드
  const fetchEpisodeData = useCallback(async () => {
    if (!selectedEpisodeId) return

    try {
      // 팀 데이터
      const { data: teamsData } = await supabase
        .from('episode_teams')
        .select(`
          *,
          episode_team_members(
            *,
            organization:bj_member_id(id, name, unit)
          )
        `)
        .eq('episode_id', selectedEpisodeId)

      if (teamsData) {
        setTeams(teamsData.map(t => ({
          ...t,
          members: (t.episode_team_members || []).map((m: Record<string, unknown>) => ({
            ...m,
            bj_member: m.organization as BjMember | undefined,
          })),
        })))
      }

      // 매칭 데이터
      const { data: matchupsData } = await supabase
        .from('episode_matchups')
        .select(`
          *,
          bj1:bj_member_1_id(id, name, unit),
          bj2:bj_member_2_id(id, name, unit),
          winnerBj:winner_id(id, name, unit)
        `)
        .eq('episode_id', selectedEpisodeId)
        .order('match_order', { ascending: true })

      if (matchupsData) {
        setMatchups(matchupsData.map(m => ({
          ...m,
          bj_member_1: m.bj1 as BjMember | undefined,
          bj_member_2: m.bj2 as BjMember | undefined,
          winner: m.winnerBj as BjMember | undefined,
        })))
      }

    } catch (err) {
      console.error('에피소드 데이터 로드 실패:', err)
    }
  }, [supabase, selectedEpisodeId])

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  useEffect(() => {
    if (selectedEpisodeId) {
      fetchEpisodeData()
    }
  }, [selectedEpisodeId, fetchEpisodeData])

  // 팀 추가
  const handleAddTeam = async () => {
    if (!selectedEpisodeId || !teamModal.teamName || teamModal.selectedMembers.length === 0) {
      showError('팀명과 멤버를 선택해주세요.')
      return
    }

    try {
      // 팀 생성
      const { data: teamData, error: teamError } = await supabase
        .from('episode_teams')
        .insert({
          episode_id: selectedEpisodeId,
          team_name: teamModal.teamName,
          team_type: teamModal.teamType,
          team_color: teamModal.teamColor,
        })
        .select()
        .single()

      if (teamError) throw teamError

      // 멤버 추가
      const memberInserts = teamModal.selectedMembers.map((bjId, idx) => ({
        team_id: teamData.id,
        bj_member_id: bjId,
        role: idx === 0 ? 'leader' : 'member',
      }))

      const { error: memberError } = await supabase
        .from('episode_team_members')
        .insert(memberInserts)

      if (memberError) throw memberError

      showSuccess('팀이 생성되었습니다.')
      setTeamModal({ open: false, teamName: '', teamType: 'custom', teamColor: '#fd68ba', selectedMembers: [] })
      fetchEpisodeData()
    } catch (err) {
      console.error('팀 생성 실패:', err)
      showError('팀 생성에 실패했습니다.')
    }
  }

  // 팀 삭제
  const handleDeleteTeam = async (teamId: number) => {
    if (!confirm('팀을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('episode_teams')
        .delete()
        .eq('id', teamId)

      if (error) throw error

      showSuccess('팀이 삭제되었습니다.')
      fetchEpisodeData()
    } catch (err) {
      console.error('팀 삭제 실패:', err)
      showError('삭제에 실패했습니다.')
    }
  }

  // 매칭 추가
  const handleAddMatchup = async () => {
    if (!selectedEpisodeId || !matchupModal.bj1Id || !matchupModal.bj2Id) {
      showError('대결할 BJ를 선택해주세요.')
      return
    }

    if (matchupModal.bj1Id === matchupModal.bj2Id) {
      showError('서로 다른 BJ를 선택해주세요.')
      return
    }

    try {
      const { error } = await supabase.from('episode_matchups').insert({
        episode_id: selectedEpisodeId,
        bj_member_1_id: matchupModal.bj1Id,
        bj_member_2_id: matchupModal.bj2Id,
        match_type: matchupModal.matchType,
        prize_type: matchupModal.prizeType,
        prize_amount: matchupModal.prizeAmount || null,
        match_order: matchups.length + 1,
      })

      if (error) throw error

      showSuccess('매칭이 추가되었습니다.')
      setMatchupModal({ open: false, bj1Id: null, bj2Id: null, matchType: '1vs1', prizeType: 'contribution', prizeAmount: 0 })
      fetchEpisodeData()
    } catch (err) {
      console.error('매칭 추가 실패:', err)
      showError('매칭 추가에 실패했습니다.')
    }
  }

  // 승자 설정
  const handleSetWinner = async (matchupId: number, winnerId: number) => {
    try {
      const { error } = await supabase
        .from('episode_matchups')
        .update({ winner_id: winnerId })
        .eq('id', matchupId)

      if (error) throw error

      showSuccess('승자가 설정되었습니다.')
      fetchEpisodeData()
    } catch (err) {
      console.error('승자 설정 실패:', err)
      showError('설정에 실패했습니다.')
    }
  }

  // 매칭 삭제
  const handleDeleteMatchup = async (matchupId: number) => {
    if (!confirm('매칭을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('episode_matchups')
        .delete()
        .eq('id', matchupId)

      if (error) throw error

      showSuccess('매칭이 삭제되었습니다.')
      fetchEpisodeData()
    } catch (err) {
      console.error('매칭 삭제 실패:', err)
      showError('삭제에 실패했습니다.')
    }
  }

  // 팀 멤버 토글
  const toggleMember = (bjId: number) => {
    const newSelected = teamModal.selectedMembers.includes(bjId)
      ? teamModal.selectedMembers.filter(id => id !== bjId)
      : [...teamModal.selectedMembers, bjId]
    setTeamModal({ ...teamModal, selectedMembers: newSelected })
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>로딩 중...</span>
      </div>
    )
  }

  const selectedEpisode = episodes.find(e => e.id === selectedEpisodeId)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <Swords size={24} />
          <div>
            <h1>팀/매칭 관리</h1>
            <p>에피소드별 팀 구성 및 1vs1 매칭</p>
          </div>
        </div>
      </header>

      {/* 에피소드 선택 */}
      <div className={styles.episodeSelector}>
        <label>에피소드 선택:</label>
        <select
          value={selectedEpisodeId || ''}
          onChange={(e) => setSelectedEpisodeId(Number(e.target.value) || null)}
          className={styles.select}
        >
          <option value="">에피소드 선택</option>
          {episodes.map(ep => (
            <option key={ep.id} value={ep.id}>
              {ep.episode_number}화 - {ep.title}
            </option>
          ))}
        </select>
      </div>

      {selectedEpisodeId && (
        <>
          {/* 탭 */}
          <div className={styles.tabs}>
            <button
              onClick={() => setActiveTab('teams')}
              className={`${styles.tab} ${activeTab === 'teams' ? styles.active : ''}`}
            >
              <Users size={16} />
              팀 구성
            </button>
            <button
              onClick={() => setActiveTab('matchups')}
              className={`${styles.tab} ${activeTab === 'matchups' ? styles.active : ''}`}
            >
              <Swords size={16} />
              1vs1 매칭
            </button>
          </div>

          {/* 팀 구성 탭 */}
          {activeTab === 'teams' && (
            <motion.section
              className={styles.section}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className={styles.sectionHeader}>
                <h2>{selectedEpisode?.episode_number}화 팀 구성</h2>
                <button onClick={() => setTeamModal({ ...teamModal, open: true })} className={styles.primaryBtn}>
                  <Plus size={16} />
                  팀 추가
                </button>
              </div>

              <div className={styles.teamGrid}>
                {teams.map((team) => (
                  <div key={team.id} className={styles.teamCard}>
                    <div className={styles.teamHeader}>
                      <div
                        className={styles.teamColor}
                        style={{ backgroundColor: team.team_color || '#666' }}
                      />
                      <h3>{team.team_name}</h3>
                      <span className={styles.teamType}>{team.team_type}</span>
                      <button onClick={() => handleDeleteTeam(team.id)} className={styles.deleteBtn}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className={styles.memberList}>
                      {team.members.map((member, idx) => (
                        <div key={member.id} className={styles.memberItem}>
                          {idx === 0 && <Trophy size={12} className={styles.leaderIcon} />}
                          <span className={styles.memberName}>{member.bj_member?.name}</span>
                          <span className={`${styles.unitBadge} ${member.bj_member?.unit === 'excel' ? styles.excel : styles.crew}`}>
                            {member.bj_member?.unit === 'excel' ? 'E' : 'C'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {teams.length === 0 && (
                <div className={styles.emptyState}>
                  <Users size={32} />
                  <p>구성된 팀이 없습니다.</p>
                </div>
              )}
            </motion.section>
          )}

          {/* 매칭 탭 */}
          {activeTab === 'matchups' && (
            <motion.section
              className={styles.section}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className={styles.sectionHeader}>
                <h2>{selectedEpisode?.episode_number}화 매칭</h2>
                <button onClick={() => setMatchupModal({ ...matchupModal, open: true })} className={styles.primaryBtn}>
                  <Plus size={16} />
                  매칭 추가
                </button>
              </div>

              <div className={styles.matchupList}>
                {matchups.map((matchup) => (
                  <div key={matchup.id} className={styles.matchupCard}>
                    <div
                      className={`${styles.matchupPlayer} ${matchup.winner_id === matchup.bj_member_1_id ? styles.winner : ''}`}
                      onClick={() => handleSetWinner(matchup.id, matchup.bj_member_1_id)}
                    >
                      <span className={styles.playerName}>{matchup.bj_member_1?.name}</span>
                      {matchup.winner_id === matchup.bj_member_1_id && <Trophy size={14} className={styles.winnerIcon} />}
                    </div>
                    <div className={styles.vsLabel}>VS</div>
                    <div
                      className={`${styles.matchupPlayer} ${matchup.winner_id === matchup.bj_member_2_id ? styles.winner : ''}`}
                      onClick={() => handleSetWinner(matchup.id, matchup.bj_member_2_id)}
                    >
                      <span className={styles.playerName}>{matchup.bj_member_2?.name}</span>
                      {matchup.winner_id === matchup.bj_member_2_id && <Trophy size={14} className={styles.winnerIcon} />}
                    </div>
                    <div className={styles.matchupMeta}>
                      <span className={styles.matchType}>{matchup.match_type}</span>
                      {matchup.prize_amount && (
                        <span className={styles.prizeAmount}>
                          {matchup.prize_type === 'contribution' ? '' : '₩'}{matchup.prize_amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <button onClick={() => handleDeleteMatchup(matchup.id)} className={styles.deleteBtn}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {matchups.length === 0 && (
                <div className={styles.emptyState}>
                  <Swords size={32} />
                  <p>등록된 매칭이 없습니다.</p>
                </div>
              )}
            </motion.section>
          )}
        </>
      )}

      {/* 팀 추가 모달 */}
      {teamModal.open && (
        <div className={styles.modalOverlay} onClick={() => setTeamModal({ ...teamModal, open: false })}>
          <motion.div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h3>팀 추가</h3>

            <div className={styles.formGroup}>
              <label>팀명 *</label>
              <input
                type="text"
                value={teamModal.teamName}
                onChange={(e) => setTeamModal({ ...teamModal, teamName: e.target.value })}
                className={styles.input}
                placeholder="예: 메이저팀, 여왕팀"
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>팀 타입</label>
                <select
                  value={teamModal.teamType}
                  onChange={(e) => setTeamModal({ ...teamModal, teamType: e.target.value as typeof teamModal.teamType })}
                  className={styles.select}
                >
                  <option value="major_minor">메이저/마이너</option>
                  <option value="queen_princess">여왕/공주</option>
                  <option value="mercenary">용병</option>
                  <option value="custom">기타</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>팀 컬러</label>
                <input
                  type="color"
                  value={teamModal.teamColor}
                  onChange={(e) => setTeamModal({ ...teamModal, teamColor: e.target.value })}
                  className={styles.colorInput}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>멤버 선택 * (첫 번째가 리더)</label>
              <div className={styles.memberSelector}>
                {bjMembers.map(bj => (
                  <button
                    key={bj.id}
                    onClick={() => toggleMember(bj.id)}
                    className={`${styles.memberSelectBtn} ${teamModal.selectedMembers.includes(bj.id) ? styles.selected : ''}`}
                  >
                    <span>{bj.name}</span>
                    <span className={`${styles.unitBadge} ${bj.unit === 'excel' ? styles.excel : styles.crew}`}>
                      {bj.unit === 'excel' ? 'E' : 'C'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.modalActions}>
              <button onClick={() => setTeamModal({ ...teamModal, open: false })} className={styles.cancelBtn}>
                취소
              </button>
              <button
                onClick={handleAddTeam}
                className={styles.primaryBtn}
                disabled={!teamModal.teamName || teamModal.selectedMembers.length === 0}
              >
                추가
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 매칭 추가 모달 */}
      {matchupModal.open && (
        <div className={styles.modalOverlay} onClick={() => setMatchupModal({ ...matchupModal, open: false })}>
          <motion.div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h3>매칭 추가</h3>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>BJ 1 *</label>
                <select
                  value={matchupModal.bj1Id || ''}
                  onChange={(e) => setMatchupModal({ ...matchupModal, bj1Id: Number(e.target.value) || null })}
                  className={styles.select}
                >
                  <option value="">선택</option>
                  {bjMembers.map(bj => (
                    <option key={bj.id} value={bj.id}>{bj.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>BJ 2 *</label>
                <select
                  value={matchupModal.bj2Id || ''}
                  onChange={(e) => setMatchupModal({ ...matchupModal, bj2Id: Number(e.target.value) || null })}
                  className={styles.select}
                >
                  <option value="">선택</option>
                  {bjMembers.map(bj => (
                    <option key={bj.id} value={bj.id}>{bj.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>매칭 타입</label>
              <select
                value={matchupModal.matchType}
                onChange={(e) => setMatchupModal({ ...matchupModal, matchType: e.target.value as typeof matchupModal.matchType })}
                className={styles.select}
              >
                <option value="1vs1">1vs1</option>
                <option value="rival">라이벌</option>
                <option value="team_vs_team">팀 vs 팀</option>
              </select>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>보상 타입</label>
                <select
                  value={matchupModal.prizeType}
                  onChange={(e) => setMatchupModal({ ...matchupModal, prizeType: e.target.value })}
                  className={styles.select}
                >
                  <option value="contribution">기여도</option>
                  <option value="prize">상금</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>보상 금액</label>
                <input
                  type="number"
                  value={matchupModal.prizeAmount || ''}
                  onChange={(e) => setMatchupModal({ ...matchupModal, prizeAmount: parseInt(e.target.value) || 0 })}
                  className={styles.input}
                  placeholder="0"
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button onClick={() => setMatchupModal({ ...matchupModal, open: false })} className={styles.cancelBtn}>
                취소
              </button>
              <button
                onClick={handleAddMatchup}
                className={styles.primaryBtn}
                disabled={!matchupModal.bj1Id || !matchupModal.bj2Id}
              >
                추가
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
