'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link2, RefreshCw } from 'lucide-react'
import {
  fetchDonorRankings,
  fetchLinkableProfiles,
  linkDonorToProfile,
  unlinkDonorFromProfile,
  autoMatchDonors,
  updateProfileAvatar,
} from '@/lib/actions/donor-links'
import { logger } from '@/lib/utils/logger'
import styles from '../shared.module.css'
import {
  DonorStatsGrid,
  DonorFilterBar,
  DonorRankingsTable,
  ProfileLinkModal,
  AvatarUploadModal,
} from './_components'
import type { RankingEntry, Profile, FilterType, SourceFilter } from './_components'

export default function DonorLinksPage() {
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
      const result = await fetchDonorRankings()
      if (result.error) throw new Error(result.error)

      const { seasonData, totalData, linkedProfiles } = result.data!

      const combined: RankingEntry[] = [
        ...seasonData.map(r => ({
          ...r,
          source: 'season' as const,
          profile: r.donor_id ? linkedProfiles[r.donor_id] || null : null,
        })),
        ...totalData.map(r => ({
          ...r,
          source: 'total' as const,
          profile: r.donor_id ? linkedProfiles[r.donor_id] || null : null,
        })),
      ]

      setRankings(combined)
    } catch (err) {
      logger.error('Failed to fetch rankings', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch all profiles for linking
  const fetchProfilesList = useCallback(async () => {
    const result = await fetchLinkableProfiles()
    if (!result.error && result.data) {
      setProfiles(result.data as Profile[])
    }
  }, [])

  useEffect(() => {
    void fetchRankings()
    void fetchProfilesList()
  }, [fetchRankings, fetchProfilesList])

  // Filter rankings
  const filteredRankings = useMemo(() => {
    let result = rankings

    if (sourceFilter !== 'all') {
      result = result.filter(r => r.source === sourceFilter)
    }

    if (filter === 'linked') {
      result = result.filter(r => r.donor_id !== null)
    } else if (filter === 'unlinked') {
      result = result.filter(r => r.donor_id === null)
    }

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
      const result = await linkDonorToProfile(
        linkingEntry.source,
        linkingEntry.id,
        selectedProfile.id
      )

      if (result.error) throw new Error(result.error)

      setRankings(prev => prev.map(r =>
        r.id === linkingEntry.id && r.source === linkingEntry.source
          ? { ...r, donor_id: selectedProfile.id, profile: selectedProfile }
          : r
      ))

      setLinkingEntry(null)
      setSelectedProfile(null)
      setProfileSearchTerm('')
    } catch (err) {
      logger.error('Link failed', err)
      alert('연결에 실패했습니다.')
    } finally {
      setIsLinking(false)
    }
  }

  // Unlink donor
  const handleUnlink = async (entry: RankingEntry) => {
    if (!confirm(`${entry.donor_name}의 프로필 연결을 해제하시겠습니까?`)) return

    try {
      const result = await unlinkDonorFromProfile(entry.source, entry.id)

      if (result.error) throw new Error(result.error)

      setRankings(prev => prev.map(r =>
        r.id === entry.id && r.source === entry.source
          ? { ...r, donor_id: null, profile: null }
          : r
      ))
    } catch (err) {
      logger.error('Unlink failed', err)
      alert('연결 해제에 실패했습니다.')
    }
  }

  // Auto-match by nickname
  const handleAutoMatch = async () => {
    if (!confirm('닉네임이 일치하는 프로필을 자동으로 연결합니다. 계속하시겠습니까?')) return

    setIsLoading(true)

    try {
      const unlinked = rankings.filter(r => !r.donor_id)

      const matches: Array<{
        source: 'season' | 'total'
        rankingId: number
        profileId: string
      }> = []

      for (const entry of unlinked) {
        const matchingProfile = profiles.find(
          p => p.nickname.toLowerCase().trim() === entry.donor_name.toLowerCase().trim()
        )

        if (matchingProfile) {
          matches.push({
            source: entry.source,
            rankingId: entry.id,
            profileId: matchingProfile.id,
          })
        }
      }

      const result = await autoMatchDonors(matches)
      if (result.error) throw new Error(result.error)

      alert(`${result.data}건의 프로필이 자동 연결되었습니다.`)
      await fetchRankings()
    } catch (err) {
      logger.error('Auto-match failed', err)
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

      const result = await updateProfileAvatar(avatarEntry.profile.id, data.url)
      if (result.error) throw new Error(result.error)

      setRankings(prev => prev.map(r =>
        r.donor_id === avatarEntry.profile?.id
          ? { ...r, profile: r.profile ? { ...r.profile, avatar_url: data.url } : null }
          : r
      ))

      setAvatarEntry(null)
      alert('아바타가 업데이트되었습니다.')
    } catch (err) {
      logger.apiError('upload/avatar', err)
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

      <DonorStatsGrid stats={stats} />

      <DonorFilterBar
        filter={filter}
        sourceFilter={sourceFilter}
        searchTerm={searchTerm}
        onFilterChange={setFilter}
        onSourceFilterChange={setSourceFilter}
        onSearchTermChange={setSearchTerm}
      />

      <DonorRankingsTable
        rankings={filteredRankings}
        isLoading={isLoading}
        onLink={(entry) => {
          setLinkingEntry(entry)
          setProfileSearchTerm(entry.donor_name)
        }}
        onUnlink={handleUnlink}
        onAvatarClick={setAvatarEntry}
      />

      <ProfileLinkModal
        linkingEntry={linkingEntry}
        profiles={filteredProfiles}
        profileSearchTerm={profileSearchTerm}
        selectedProfile={selectedProfile}
        isLinking={isLinking}
        onClose={() => setLinkingEntry(null)}
        onProfileSearchChange={setProfileSearchTerm}
        onProfileSelect={setSelectedProfile}
        onLink={handleLink}
      />

      <AvatarUploadModal
        avatarEntry={avatarEntry}
        isUploading={isUploadingAvatar}
        onClose={() => setAvatarEntry(null)}
        onUpload={handleAvatarUpload}
      />
    </div>
  )
}
