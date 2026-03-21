import {
  Link2,
  Link2Off,
  Crown,
  CheckCircle,
  User,
  Upload,
  Loader2,
} from 'lucide-react'
import Image from 'next/image'
import type { RankingEntry } from './types'
import styles from '../../shared.module.css'
import pageStyles from '../page.module.css'

interface DonorRankingsTableProps {
  rankings: RankingEntry[]
  isLoading: boolean
  onLink: (entry: RankingEntry) => void
  onUnlink: (entry: RankingEntry) => void
  onAvatarClick: (entry: RankingEntry) => void
}

export function DonorRankingsTable({
  rankings,
  isLoading,
  onLink,
  onUnlink,
  onAvatarClick,
}: DonorRankingsTableProps) {
  if (isLoading) {
    return (
      <div className={pageStyles.loading}>
        <Loader2 size={32} className={pageStyles.spinner} />
        <span>로딩 중...</span>
      </div>
    )
  }

  return (
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
          {rankings.map((entry) => (
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
                    onClick={() => onAvatarClick(entry)}
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
                    onClick={() => onUnlink(entry)}
                  >
                    <Link2Off size={14} />
                    해제
                  </button>
                ) : (
                  <button
                    className={pageStyles.linkBtn}
                    onClick={() => onLink(entry)}
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
  )
}
