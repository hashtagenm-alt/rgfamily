'use client'

/**
 * 명예의 전당 메인 컴포넌트
 *
 * 시즌별로 그룹화된 포디움 달성 기록을 표시합니다.
 */

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Crown, Medal, Award, Trophy, Calendar, ChevronDown, ChevronUp, Shield, Flame } from 'lucide-react'
import { useHallOfFame, useVipPodiumAchievers } from '@/lib/hooks'
import { getInitials } from '@/lib/utils'
import type { HallOfFameEntry, HallOfFameSeasonData } from '@/types/ranking'
import styles from './HallOfFame.module.css'

// 순위별 아이콘
function getRankIcon(rank: number, size: number = 18) {
  if (rank === 1) return <Crown size={size} />
  if (rank === 2) return <Medal size={size} />
  return <Award size={size} />
}

// 순위별 클래스
function getRankClass(rank: number) {
  if (rank === 1) return styles.rank1
  if (rank === 2) return styles.rank2
  return styles.rank3
}

// 미니 포디움 아이템 컴포넌트
function PodiumItem({
  entry,
  hasVipPage,
}: {
  entry: HallOfFameEntry
  hasVipPage: boolean
}) {
  const Content = (
    <div className={`${styles.podiumItem} ${getRankClass(entry.rank)}`}>
      <div className={styles.podiumAvatar}>
        {entry.avatarUrl ? (
          <Image
            src={entry.avatarUrl}
            alt={entry.nickname}
            fill
            className={styles.avatarImage}
            unoptimized
          />
        ) : (
          <span className={styles.initials}>{getInitials(entry.nickname)}</span>
        )}
      </div>
      <div className={styles.podiumInfo}>
        <span className={styles.podiumRank}>
          {getRankIcon(entry.rank, 14)}
          <span>{entry.rank}위</span>
        </span>
        <span className={styles.podiumName}>{entry.nickname}</span>
      </div>
    </div>
  )

  if (hasVipPage) {
    return (
      <Link href={`/ranking/vip/${entry.profileId}`} className={styles.podiumLink}>
        {Content}
      </Link>
    )
  }

  return <div className={styles.podiumLinkDisabled}>{Content}</div>
}

// 에피소드 섹션 컴포넌트
function EpisodeSection({
  episodeId,
  episodeTitle,
  episodeNumber,
  entries,
  podiumProfileIds,
}: {
  episodeId: number | null
  episodeTitle: string | null
  episodeNumber: number | null
  entries: HallOfFameEntry[]
  podiumProfileIds: string[]
}) {
  // 포디움 순서: 2위(왼쪽), 1위(가운데), 3위(오른쪽)
  const rank1 = entries.find(e => e.rank === 1)
  const rank2 = entries.find(e => e.rank === 2)
  const rank3 = entries.find(e => e.rank === 3)
  const podiumOrder = [rank2, rank1, rank3].filter(Boolean) as HallOfFameEntry[]

  const title = episodeId
    ? `${episodeNumber}차 직급전${episodeTitle ? ` - ${episodeTitle}` : ''}`
    : '시즌 최종'

  return (
    <div className={styles.episodeSection}>
      <div className={styles.episodeHeader}>
        <Calendar size={14} />
        <span>{title}</span>
      </div>
      <div className={styles.miniPodium}>
        {podiumOrder.map((entry) => (
          <PodiumItem
            key={`${entry.profileId}-${entry.episodeId}`}
            entry={entry}
            hasVipPage={podiumProfileIds.includes(entry.profileId)}
          />
        ))}
      </div>
    </div>
  )
}

// 시즌 섹션 컴포넌트
function SeasonSection({
  seasonData,
  podiumProfileIds,
  defaultExpanded = false,
}: {
  seasonData: HallOfFameSeasonData
  podiumProfileIds: string[]
  defaultExpanded?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // 에피소드별로 그룹화
  const episodeGroups = new Map<number | null, HallOfFameEntry[]>()

  for (const entry of seasonData.entries) {
    const key = entry.episodeId
    if (!episodeGroups.has(key)) {
      episodeGroups.set(key, [])
    }
    episodeGroups.get(key)!.push(entry)
  }

  // 에피소드 정렬 (최신 순, 시즌 최종은 맨 위)
  const sortedGroups = Array.from(episodeGroups.entries()).sort((a, b) => {
    if (a[0] === null) return -1
    if (b[0] === null) return 1
    return (b[0] || 0) - (a[0] || 0)
  })

  return (
    <div className={`${styles.seasonSection} ${seasonData.season.isActive ? styles.activeSeason : ''}`}>
      <button
        className={styles.seasonHeader}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={styles.seasonInfo}>
          <Trophy size={18} />
          <span className={styles.seasonName}>{seasonData.season.name}</span>
          {seasonData.season.isActive ? (
            <span className={styles.activeBadge}>
              <Flame size={12} />
              진행중
            </span>
          ) : (
            <span className={styles.finalizedBadge}>
              <Shield size={12} />
              확정
            </span>
          )}
        </div>
        <div className={styles.seasonMeta}>
          <span className={styles.episodeCount}>
            {episodeGroups.size}개 기록
          </span>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {isExpanded && (
        <div className={styles.seasonContent}>
          {sortedGroups.map(([episodeId, entries]) => (
            <EpisodeSection
              key={episodeId ?? 'season-final'}
              episodeId={episodeId}
              episodeTitle={entries[0]?.episodeTitle || null}
              episodeNumber={entries[0]?.episodeNumber || null}
              entries={entries}
              podiumProfileIds={podiumProfileIds}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// 메인 컴포넌트
export default function HallOfFame() {
  const { data, isLoading, error } = useHallOfFame()
  const { podiumProfileIds } = useVipPodiumAchievers()

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>명예의 전당을 불러오는 중...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.error}>
        <Crown size={48} />
        <p>{error}</p>
      </div>
    )
  }

  if (!data || data.seasons.length === 0) {
    return (
      <div className={styles.empty}>
        <Crown size={48} />
        <p>아직 기록된 명예의 전당이 없습니다</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* 통계 */}
      <div className={styles.stats}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{data.totalAchievers}</span>
          <span className={styles.statLabel}>역대 포디움 달성자</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statValue}>{data.totalEpisodes}</span>
          <span className={styles.statLabel}>진행된 직급전</span>
        </div>
      </div>

      {/* 시즌별 섹션 */}
      <div className={styles.seasonList}>
        {data.seasons.map((seasonData, index) => (
          <SeasonSection
            key={seasonData.season.id}
            seasonData={seasonData}
            podiumProfileIds={podiumProfileIds}
            defaultExpanded={index === 0} // 최신 시즌만 펼침
          />
        ))}
      </div>
    </div>
  )
}
