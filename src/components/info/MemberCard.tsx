'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Radio } from 'lucide-react'
import styles from './MemberCard.module.css'
import type { OrgMember } from '@/types/organization'

// Re-export for backward compatibility
export type { OrgMember, ProfileInfo, SocialLinks } from '@/types/organization'

interface MemberCardProps {
  member: OrgMember
  size: 'large' | 'medium' | 'small'
  onClick: () => void
  isSelected?: boolean
}

export function MemberCard({ member, size, onClick, isSelected }: MemberCardProps) {
  // Check if member is a leader (대표, 부장, 팀장)
  const isLeader = ['대표', '부장', '팀장'].includes(member.role)

  return (
    <motion.div
      className={`${styles.memberCard} ${styles[size]} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      whileHover={{ y: -4 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className={`${styles.avatarWrapper} ${member.is_live ? styles.isLive : ''} ${isLeader ? styles.isLeader : ''}`}>
        {member.is_live && (
          <span className={styles.liveBadge}>
            LIVE
          </span>
        )}
        <div className={`${styles.avatar} ${member.is_live ? styles.avatarLive : ''}`}>
          {member.image_url ? (
            <Image
              src={member.image_url}
              alt={member.name}
              fill
              className={styles.avatarImage}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {member.name.charAt(0)}
            </div>
          )}
        </div>
      </div>
      <div className={styles.memberInfo}>
        <span className={styles.memberName}>{member.name}</span>
        {/* 대표는 role 표시, 멤버는 current_rank 표시 */}
        <span className={styles.memberRole}>
          {member.role === '대표' ? member.role : member.current_rank || member.role}
        </span>
      </div>
    </motion.div>
  )
}
