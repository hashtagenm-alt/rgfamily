'use client'

import { motion } from 'framer-motion'
import { Target, X, Star } from 'lucide-react'
import type { OrgMember } from './MemberCard'
import { RANKS } from '@/lib/constants/ranks'
import styles from './PledgeSidebar.module.css'

interface PledgeSidebarProps {
  member: OrgMember | null
  onClose?: () => void
}

interface PledgeRow {
  rank: string
  title: string
  content: string
  isCurrentRank?: boolean
}

/**
 * 직급명으로 순위(position) 찾기
 */
const getPositionByRankName = (rankName: string | null | undefined): number | null => {
  if (!rankName) return null
  const rank = RANKS.find(r => r.name === rankName)
  return rank?.position || null
}

/**
 * 공약 텍스트 파싱
 * - 묶음 순위(예: 10,11,12등)도 개별 행으로 분리
 * - 현재 직급 강조 표시 지원
 */
const parsePledge = (pledgeText: string, currentRankPosition: number | null): PledgeRow[] => {
  const lines = pledgeText.split('\n').filter(line => line.trim())
  const rows: PledgeRow[] = []

  for (const line of lines) {
    // 패턴: [1등] 여왕 ▶ 내용 또는 1등 여왕 ▶ 내용
    const match = line.match(/^\[?(\d+(?:[,&\s]*\d+)*(?:등)?)\]?\s*(.+?)\s*[▶ㅡ\-→]\s*(.+)$/)
    if (match) {
      const rankStr = match[1].replace(/등$/, '').replace(/\s+/g, '')
      const title = match[2].trim()
      const content = match[3].trim()

      // 묶음 순위 분리 (예: "10,11,12" → ["10", "11", "12"])
      const ranks = rankStr.split(/[,&]/).map(r => r.trim()).filter(Boolean)

      for (const rank of ranks) {
        const rankNum = parseInt(rank, 10)
        rows.push({
          rank,
          title,
          content,
          isCurrentRank: currentRankPosition === rankNum
        })
      }
    } else {
      // 대체 패턴: 1등 여왕 ▶ 내용
      const simpleMatch = line.match(/^(\d+(?:[,&\s]*\d+)*(?:등)?)\s+(.+?)\s+[▶ㅡ\-→]\s*(.+)$/)
      if (simpleMatch) {
        const rankStr = simpleMatch[1].replace(/등$/, '').replace(/\s+/g, '')
        const title = simpleMatch[2].trim()
        const content = simpleMatch[3].trim()

        const ranks = rankStr.split(/[,&]/).map(r => r.trim()).filter(Boolean)

        for (const rank of ranks) {
          const rankNum = parseInt(rank, 10)
          rows.push({
            rank,
            title,
            content,
            isCurrentRank: currentRankPosition === rankNum
          })
        }
      }
    }
  }

  return rows
}

const getRankIcon = (rank: string) => {
  if (rank === '1') return '🥇'
  if (rank === '2') return '🥈'
  if (rank === '3') return '🥉'
  return `${rank}등`
}

export function PledgeSidebar({ member, onClose }: PledgeSidebarProps) {
  const hasPledge = !!member?.profile_info?.position_pledge

  return (
    <motion.div
      className={styles.sidebar}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.sidebarHeader}>
        <Target size={16} />
        <h3 className={styles.sidebarTitle}>공약표</h3>
        {member && onClose && (
          <button className={styles.closeBtn} onClick={onClose} title="닫기">
            <X size={18} />
          </button>
        )}
      </div>

      <div className={styles.sidebarContent}>
        {!member ? (
          <div className={styles.emptyState}>
            <Target size={32} />
            <p>멤버를 선택하면<br />공약표가 표시됩니다</p>
          </div>
        ) : !hasPledge ? (
          <div className={styles.emptyState}>
            <Target size={32} />
            <p>등록된 공약이 없습니다</p>
          </div>
        ) : (
          (() => {
            const currentRankPosition = getPositionByRankName(member.current_rank)
            const pledgeRows = parsePledge(member.profile_info!.position_pledge!, currentRankPosition)
            if (pledgeRows.length > 0) {
              return (
                <div className={styles.pledgeTable}>
                  <div className={styles.pledgeTableHeader}>
                    <span className={styles.pledgeColRank}>등수</span>
                    <span className={styles.pledgeColTitle}>항목</span>
                    <span className={styles.pledgeColContent}>내용</span>
                  </div>
                  <div className={styles.pledgeTableBody}>
                    {pledgeRows.map((row, idx) => (
                      <div
                        key={idx}
                        className={`${styles.pledgeRow} ${row.isCurrentRank ? styles.currentRankRow : ''}`}
                        data-rank={row.rank}
                      >
                        <span className={styles.pledgeRankCell}>
                          {row.isCurrentRank && <Star size={12} className={styles.currentRankStar} />}
                          {getRankIcon(row.rank)}
                        </span>
                        <span className={styles.pledgeTitleCell}>{row.title}</span>
                        <span className={styles.pledgeContentCell}>{row.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
            return (
              <div className={styles.pledgeText}>
                {member.profile_info!.position_pledge}
              </div>
            )
          })()
        )}
      </div>
    </motion.div>
  )
}
