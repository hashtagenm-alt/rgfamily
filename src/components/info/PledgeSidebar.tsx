'use client'

import { motion } from 'framer-motion'
import { Target, X } from 'lucide-react'
import type { OrgMember } from './MemberCard'
import styles from './PledgeSidebar.module.css'

interface PledgeSidebarProps {
  member: OrgMember | null
  onClose?: () => void
}

interface PledgeRow {
  rank: string
  title: string
  content: string
}

const parsePledge = (pledgeText: string): PledgeRow[] => {
  const lines = pledgeText.split('\n').filter(line => line.trim())
  const rows: PledgeRow[] = []

  for (const line of lines) {
    const match = line.match(/^\[?(\d+(?:,\d+)*등?)\]?\s*(.+?)\s*[▶ㅡ\-→]\s*(.+)$/)
    if (match) {
      rows.push({
        rank: match[1].replace(/등$/, ''),
        title: match[2].trim(),
        content: match[3].trim()
      })
    } else {
      const simpleMatch = line.match(/^(\d+(?:,\d+)*등?)\s+(.+?)\s+[▶ㅡ\-→]\s*(.+)$/)
      if (simpleMatch) {
        rows.push({
          rank: simpleMatch[1].replace(/등$/, ''),
          title: simpleMatch[2].trim(),
          content: simpleMatch[3].trim()
        })
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
            const pledgeRows = parsePledge(member.profile_info!.position_pledge!)
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
                        className={styles.pledgeRow}
                        data-rank={row.rank}
                      >
                        <span className={styles.pledgeRankCell}>{getRankIcon(row.rank)}</span>
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
