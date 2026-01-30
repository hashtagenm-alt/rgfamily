'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Link2,
  Link2Off,
  Search,
  User,
  Crown,
  Trophy,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Filter,
  ChevronDown,
  Image as ImageIcon,
  Upload,
  X,
} from 'lucide-react'
import Image from 'next/image'
import { useSupabaseContext } from '@/lib/context'
import styles from '../shared.module.css'
import pageStyles from './page.module.css'

interface RankingEntry {
  id: number
  rank: number
  donor_id: string | null
  donor_name: string
  total_amount: number
  source: 'season' | 'total'
  season_id?: number
  profile?: {
    id: string
    nickname: string
    avatar_url: string | null
    role: string
  } | null
}

interface Profile {
  id: string
  nickname: string
  email: string | null
  avatar_url: string | null
  role: string
  total_donation: number
}

type FilterType = 'all' | 'linked' | 'unlinked'
type SourceFilter = 'all' | 'season' | 'total'

export default function DonorLinksPage() {
  const supabase = useSupabaseContext()
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Link modal state
  const [linkingEntry, setLinkingEntry] = useState<RankingEntry | null>(null)
  const [profileSearchTerm, setProfileSearchTerm] = useState('')
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [isLinking, setIsLinking] = useState(false)

  // Avatar upload modal
  const [avatarEntry, setAvatarEntry] = useState<RankingEntry | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  // Fetch rankings data
  const fetchRankings = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch season rankings
      const { data: seasonData, error: seasonError } = await supabase
        .from('season_donation_rankings')
        .select(`
          id,
          rank,
          donor_id,
          donor_name,
          total_amount,
          season_id
        `)
        .order('rank')

      if (seasonError) throw seasonError

      // Fetch total rankings
      const { data: totalData, error: totalError } = await supabase
        .from('total_donation_rankings')
        .select(`
          id,
          rank,
          donor_id,
          donor_name,
          total_amount
        `)
        .order('rank')

      if (totalError) throw totalError

      // Get all donor_ids that are linked
      const linkedDonorIds = [
        ...(seasonData || []).filter(r => r.donor_id).map(r => r.donor_id),
        ...(totalData || []).filter(r => r.donor_id).map(r => r.donor_id),
      ].filter(Boolean) as string[]

      // Fetch linked profiles
      let linkedProfiles: Record<string, Profile> = {}
      if (linkedDonorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, nickname, avatar_url, role, total_donation, email')
          .in('id', linkedDonorIds)

        if (profilesData) {
          linkedProfiles = profilesData.reduce((acc, p) => {
            acc[p.id] = p as Profile
            return acc
          }, {} as Record<string, Profile>)
        }
      }

      // Combine data
      const combined: RankingEntry[] = [
        ...(seasonData || []).map(r => ({
          ...r,
          source: 'season' as const,
          profile: r.donor_id ? linkedProfiles[r.donor_id] || null : null,
        })),
        ...(totalData || []).map(r => ({
          ...r,
          source: 'total' as const,
          profile: r.donor_id ? linkedProfiles[r.donor_id] || null : null,
        })),
      ]

      setRankings(combined)
    } catch (err) {
      console.error('Failed to fetch rankings:', err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // Fetch all profiles for linking
  const fetchProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname, email, avatar_url, role, total_donation')
      .order('nickname')

    if (!error && data) {
      setProfiles(data as Profile[])
    }
  }, [supabase])

  useEffect(() => {
    void fetchRankings()
    void fetchProfiles()
  }, [fetchRankings, fetchProfiles])

  // Filter rankings
  const filteredRankings = useMemo(() => {
    let result = rankings

    // Source filter
    if (sourceFilter !== 'all') {
      result = result.filter(r => r.source === sourceFilter)
    }

    // Link status filter
    if (filter === 'linked') {
      result = result.filter(r => r.donor_id !== null)
    } else if (filter === 'unlinked') {
      result = result.filter(r => r.donor_id === null)
    }

    // Search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(r => r.donor_name.toLowerCase().includes(term))
    }

    return result
  }, [rankings, filter, sourceFilter, searchTerm])

  // Filter profiles for linking modal
  const filteredProfiles = useMemo(() => {
    if (!profileSearchTerm) return profiles.slice(0, 20)
    const term = profileSearchTerm.toLowerCase()
    return profiles
      .filter(p =>
        p.nickname.toLowerCase().includes(term) ||
        (p.email && p.email.toLowerCase().includes(term))
      )
      .slice(0, 20)
  }, [profiles, profileSearchTerm])

  // Stats
  const stats = useMemo(() => {
    const seasonEntries = rankings.filter(r => r.source === 'season')
    const totalEntries = rankings.filter(r => r.source === 'total')
    return {
      total: rankings.length,
      linked: rankings.filter(r => r.donor_id).length,
      unlinked: rankings.filter(r => !r.donor_id).length,
      seasonLinked: seasonEntries.filter(r => r.donor_id).length,
      seasonTotal: seasonEntries.length,
      totalLinked: totalEntries.filter(r => r.donor_id).length,
      totalTotal: totalEntries.length,
    }
  }, [rankings])

  // Link donor to profile
  const handleLink = async () => {
    if (!linkingEntry || !selectedProfile) return
    setIsLinking(true)

    try {
      const table = linkingEntry.source === 'season'
        ? 'season_donation_rankings'
        : 'total_donation_rankings'

      const { error } = await supabase
        .from(table)
        .update({ donor_id: selectedProfile.id })
        .eq('id', linkingEntry.id)

      if (error) throw error

      // Update local state
      setRankings(prev => prev.map(r =>
        r.id === linkingEntry.id && r.source === linkingEntry.source
          ? { ...r, donor_id: selectedProfile.id, profile: selectedProfile }
          : r
      ))

      setLinkingEntry(null)
      setSelectedProfile(null)
      setProfileSearchTerm('')
    } catch (err) {
      console.error('Link failed:', err)
      alert('연결에 실패했습니다.')
    } finally {
      setIsLinking(false)
    }
  }

  // Unlink donor
  const handleUnlink = async (entry: RankingEntry) => {
    if (!confirm(`${entry.donor_name}의 프로필 연결을 해제하시겠습니까?`)) return

    try {
      const table = entry.source === 'season'
        ? 'season_donation_rankings'
        : 'total_donation_rankings'

      const { error } = await supabase
        .from(table)
        .update({ donor_id: null })
        .eq('id', entry.id)

      if (error) throw error

      setRankings(prev => prev.map(r =>
        r.id === entry.id && r.source === entry.source
          ? { ...r, donor_id: null, profile: null }
          : r
      ))
    } catch (err) {
      console.error('Unlink failed:', err)
      alert('연결 해제에 실패했습니다.')
    }
  }

  // Auto-match by nickname
  const handleAutoMatch = async () => {
    if (!confirm('닉네임이 일치하는 프로필을 자동으로 연결합니다. 계속하시겠습니까?')) return

    setIsLoading(true)
    let matchCount = 0

    try {
      const unlinked = rankings.filter(r => !r.donor_id)

      for (const entry of unlinked) {
        const matchingProfile = profiles.find(
          p => p.nickname.toLowerCase().trim() === entry.donor_name.toLowerCase().trim()
        )

        if (matchingProfile) {
          const table = entry.source === 'season'
            ? 'season_donation_rankings'
            : 'total_donation_rankings'

          const { error } = await supabase
            .from(table)
            .update({ donor_id: matchingProfile.id })
            .eq('id', entry.id)

          if (!error) matchCount++
        }
      }

      alert(`${matchCount}건의 프로필이 자동 연결되었습니다.`)
      await fetchRankings()
    } catch (err) {
      console.error('Auto-match failed:', err)
      alert('자동 연결 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // Avatar upload handler
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !avatarEntry?.profile) return

    setIsUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'avatars')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      // Update profile avatar
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: data.url })
        .eq('id', avatarEntry.profile.id)

      if (error) throw error

      // Update local state
      setRankings(prev => prev.map(r =>
        r.donor_id === avatarEntry.profile?.id
          ? { ...r, profile: r.profile ? { ...r.profile, avatar_url: data.url } : null }
          : r
      ))

      setAvatarEntry(null)
      alert('아바타가 업데이트되었습니다.')
    } catch (err) {
      console.error('Avatar upload failed:', err)
      alert('업로드에 실패했습니다.')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link2 size={24} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>후원자 연결 관리</h1>
            <p className={styles.subtitle}>
              후원 랭킹 유저와 회원 프로필을 연결합니다
            </p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.downloadButton}
            onClick={handleAutoMatch}
            disabled={isLoading}
          >
            <RefreshCw size={16} />
            닉네임 자동 매칭
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={pageStyles.statsGrid}>
        <div className={pageStyles.statCard}>
          <Trophy size={20} />
          <span>전체 랭킹</span>
          <strong>{stats.total}</strong>
        </div>
        <div className={pageStyles.statCard}>
          <CheckCircle size={20} className={pageStyles.successIcon} />
          <span>연결됨</span>
          <strong>{stats.linked}</strong>
        </div>
        <div className={pageStyles.statCard}>
          <XCircle size={20} className={pageStyles.warningIcon} />
          <span>미연결</span>
          <strong>{stats.unlinked}</strong>
        </div>
        <div className={pageStyles.statCard}>
          <Crown size={20} className={pageStyles.goldIcon} />
          <span>시즌 랭킹</span>
          <strong>{stats.seasonLinked}/{stats.seasonTotal}</strong>
        </div>
      </div>

      {/* Filters */}
      <div className={pageStyles.filterBar}>
        <div className={pageStyles.filterGroup}>
          <Filter size={16} />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className={styles.select}
          >
            <option value="all">전체</option>
            <option value="linked">연결됨</option>
            <option value="unlinked">미연결</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
            className={styles.select}
          >
            <option value="all">모든 랭킹</option>
            <option value="season">시즌 랭킹</option>
            <option value="total">총 후원 랭킹</option>
          </select>
        </div>
        <div className={pageStyles.searchWrapper}>
          <Search size={16} />
          <input
            type="text"
            placeholder="후원자 닉네임 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.input}
          />
        </div>
      </div>

      {/* Rankings Table */}
      {isLoading ? (
        <div className={pageStyles.loading}>
          <Loader2 size={32} className={pageStyles.spinner} />
          <span>로딩 중...</span>
        </div>
      ) : (
        <div className={pageStyles.tableContainer}>
          <table className={pageStyles.table}>
            <thead>
              <tr>
                <th>순위</th>
                <th>유형</th>
                <th>후원자</th>
                <th>연결된 프로필</th>
                <th>아바타</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredRankings.map((entry) => (
                <tr key={`${entry.source}-${entry.id}`}>
                  <td>
                    <span className={pageStyles.rank}>
                      {entry.rank <= 3 ? (
                        <Crown size={16} className={
                          entry.rank === 1 ? pageStyles.goldIcon :
                          entry.rank === 2 ? pageStyles.silverIcon :
                          pageStyles.bronzeIcon
                        } />
                      ) : null}
                      {entry.rank}위
                    </span>
                  </td>
                  <td>
                    <span className={`${pageStyles.sourceTag} ${pageStyles[entry.source]}`}>
                      {entry.source === 'season' ? '시즌' : '총후원'}
                      {entry.season_id ? ` S${entry.season_id}` : ''}
                    </span>
                  </td>
                  <td className={pageStyles.donorName}>{entry.donor_name}</td>
                  <td>
                    {entry.profile ? (
                      <div className={pageStyles.profileInfo}>
                        <CheckCircle size={14} className={pageStyles.successIcon} />
                        <span>{entry.profile.nickname}</span>
                        <span className={`${styles.badge} ${styles[`badge${entry.profile.role.charAt(0).toUpperCase() + entry.profile.role.slice(1)}`]}`}>
                          {entry.profile.role}
                        </span>
                      </div>
                    ) : (
                      <span className={pageStyles.unlinked}>미연결</span>
                    )}
                  </td>
                  <td>
                    {entry.profile ? (
                      <div
                        className={pageStyles.avatarWrapper}
                        onClick={() => setAvatarEntry(entry)}
                      >
                        {entry.profile.avatar_url ? (
                          <Image
                            src={entry.profile.avatar_url}
                            alt={entry.profile.nickname}
                            width={40}
                            height={40}
                            className={pageStyles.avatar}
                          />
                        ) : (
                          <div className={pageStyles.avatarPlaceholder}>
                            <User size={20} />
                          </div>
                        )}
                        <div className={pageStyles.avatarOverlay}>
                          <Upload size={14} />
                        </div>
                      </div>
                    ) : (
                      <span className={pageStyles.noAvatar}>-</span>
                    )}
                  </td>
                  <td>
                    {entry.donor_id ? (
                      <button
                        className={pageStyles.unlinkBtn}
                        onClick={() => handleUnlink(entry)}
                      >
                        <Link2Off size={14} />
                        해제
                      </button>
                    ) : (
                      <button
                        className={pageStyles.linkBtn}
                        onClick={() => {
                          setLinkingEntry(entry)
                          setProfileSearchTerm(entry.donor_name)
                        }}
                      >
                        <Link2 size={14} />
                        연결
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Link Modal */}
      <AnimatePresence>
        {linkingEntry && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLinkingEntry(null)}
          >
            <motion.div
              className={styles.modal}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2>프로필 연결: {linkingEntry.donor_name}</h2>
                <button
                  className={styles.closeButton}
                  onClick={() => setLinkingEntry(null)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>프로필 검색</label>
                  <div className={pageStyles.searchInput}>
                    <Search size={16} />
                    <input
                      type="text"
                      placeholder="닉네임 또는 이메일로 검색..."
                      value={profileSearchTerm}
                      onChange={(e) => setProfileSearchTerm(e.target.value)}
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={pageStyles.profileList}>
                  {filteredProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      className={`${pageStyles.profileItem} ${selectedProfile?.id === profile.id ? pageStyles.selected : ''}`}
                      onClick={() => setSelectedProfile(profile)}
                    >
                      <div className={pageStyles.profileAvatar}>
                        {profile.avatar_url ? (
                          <Image
                            src={profile.avatar_url}
                            alt={profile.nickname}
                            width={40}
                            height={40}
                          />
                        ) : (
                          <User size={20} />
                        )}
                      </div>
                      <div className={pageStyles.profileDetails}>
                        <span className={pageStyles.profileNickname}>{profile.nickname}</span>
                        <span className={pageStyles.profileEmail}>{profile.email || '-'}</span>
                      </div>
                      <span className={`${styles.badge} ${styles[`badge${profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}`]}`}>
                        {profile.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  className={styles.cancelButton}
                  onClick={() => setLinkingEntry(null)}
                >
                  취소
                </button>
                <button
                  className={styles.saveButton}
                  onClick={handleLink}
                  disabled={!selectedProfile || isLinking}
                >
                  {isLinking ? <Loader2 size={16} className={pageStyles.spinner} /> : <Link2 size={16} />}
                  연결하기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar Upload Modal */}
      <AnimatePresence>
        {avatarEntry && avatarEntry.profile && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAvatarEntry(null)}
          >
            <motion.div
              className={`${styles.modal} ${pageStyles.avatarModal}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2>아바타 업로드: {avatarEntry.profile.nickname}</h2>
                <button
                  className={styles.closeButton}
                  onClick={() => setAvatarEntry(null)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={pageStyles.currentAvatar}>
                  {avatarEntry.profile.avatar_url ? (
                    <Image
                      src={avatarEntry.profile.avatar_url}
                      alt={avatarEntry.profile.nickname}
                      width={200}
                      height={200}
                      className={pageStyles.largeAvatar}
                    />
                  ) : (
                    <div className={pageStyles.largeAvatarPlaceholder}>
                      <User size={60} />
                    </div>
                  )}
                </div>

                <div className={pageStyles.uploadArea}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                    id="avatar-upload"
                    className={pageStyles.fileInput}
                  />
                  <label htmlFor="avatar-upload" className={pageStyles.uploadLabel}>
                    {isUploadingAvatar ? (
                      <>
                        <Loader2 size={24} className={pageStyles.spinner} />
                        <span>업로드 중...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon size={24} />
                        <span>이미지 선택 (최대 20MB)</span>
                        <span className={pageStyles.uploadHint}>800x800 고해상도로 저장됩니다</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  className={styles.cancelButton}
                  onClick={() => setAvatarEntry(null)}
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
