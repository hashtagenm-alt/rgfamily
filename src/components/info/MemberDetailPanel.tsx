'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  Radio, Youtube, Instagram, ExternalLink, X,
  User, Target, Heart, Cake, Ruler, Droplet
} from 'lucide-react'
import type { OrgMember } from './MemberCard'
import styles from './MemberDetailPanel.module.css'

const getPandaTvUrl = (id: string) => `https://www.pandalive.co.kr/play/${id}`

interface MemberDetailPanelProps {
  member: OrgMember | null
  onClose: () => void
}

const hasProfileInfo = (member: OrgMember) => {
  const info = member.profile_info
  if (!info) return false
  return !!(info.mbti || info.blood_type || info.height || info.weight || info.birthday)
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

export function MemberDetailPanel({ member, onClose }: MemberDetailPanelProps) {
  if (!member) return null

  const hasPledge = !!member.profile_info?.position_pledge
  const hasSocial = member.social_links && Object.keys(member.social_links).length > 0
  const hasProfile = hasProfileInfo(member)

  return (
    <motion.div
      className={styles.panel}
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      {/* 닫기 버튼 */}
      <button className={styles.closeBtn} onClick={onClose}>
        <X size={20} />
      </button>

      {/* 컴팩트 헤더 */}
      <div className={styles.header}>
        <div className={styles.coverGradient} data-unit={member.unit} />

        <div className={styles.headerContent}>
          <div className={`${styles.avatarWrapper} ${member.is_live ? styles.isLive : ''}`}>
            {member.is_live && <span className={styles.liveBadge}>LIVE</span>}
            <div className={styles.avatar}>
              {member.image_url ? (
                <Image src={member.image_url} alt={member.name} fill className={styles.avatarImage} />
              ) : (
                <div className={styles.avatarPlaceholder}>{member.name.charAt(0)}</div>
              )}
            </div>
          </div>

          <div className={styles.headerInfo}>
            <div className={styles.nameRow}>
              <h2 className={styles.name}>{member.name}</h2>
              <span className={styles.unitBadge} data-unit={member.unit}>
                {member.unit === 'excel' ? 'EXCEL' : 'CREW'}
              </span>
              <span className={`${styles.statusBadge} ${member.is_live ? styles.live : ''}`}>
                {member.is_live ? '🔴 방송 중' : '⚫ 오프라인'}
              </span>
            </div>
            <span className={styles.role}>{member.role}</span>

            {hasProfile && (
              <div className={styles.quickProfile}>
                {member.profile_info?.birthday && (
                  <span className={styles.quickItem}>
                    <Cake size={12} />
                    {member.profile_info.birthday}
                  </span>
                )}
                {member.profile_info?.height && (
                  <span className={styles.quickItem}>
                    <Ruler size={12} />
                    {member.profile_info.height}
                  </span>
                )}
                {member.profile_info?.blood_type && (
                  <span className={styles.quickItem}>
                    <Droplet size={12} />
                    {member.profile_info.blood_type}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 라이브 CTA - 상단 */}
      {member.is_live && member.social_links?.pandatv && (
        <div className={styles.liveCtaTop}>
          <a
            href={getPandaTvUrl(member.social_links.pandatv)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.watchBtn}
          >
            <Radio size={18} />
            지금 방송 보러가기
          </a>
        </div>
      )}

      {/* 2컬럼 콘텐츠: 공약표 | 프로필/소셜 */}
      <div className={styles.mainContent}>
        {/* 왼쪽: 공약표 */}
        <div className={styles.leftColumn}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Target size={14} />
              공약표
            </h3>
            {hasPledge ? (
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
            ) : (
              <div className={styles.emptyState}>
                <Target size={24} />
                <p>등록된 공약이 없습니다</p>
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 프로필 + 소셜 */}
        <div className={styles.rightColumn}>
          {/* 프로필 섹션 */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <User size={14} />
              프로필
            </h3>
            {hasProfile ? (
              <div className={styles.profileGrid}>
                {member.profile_info?.mbti && (
                  <div className={styles.profileCard}>
                    <span className={styles.profileIcon}>🧠</span>
                    <div className={styles.profileCardContent}>
                      <span className={styles.profileLabel}>MBTI</span>
                      <span className={styles.profileValue}>{member.profile_info.mbti}</span>
                    </div>
                  </div>
                )}
                {member.profile_info?.blood_type && (
                  <div className={styles.profileCard}>
                    <span className={styles.profileIcon}>🩸</span>
                    <div className={styles.profileCardContent}>
                      <span className={styles.profileLabel}>혈액형</span>
                      <span className={styles.profileValue}>{member.profile_info.blood_type}</span>
                    </div>
                  </div>
                )}
                {member.profile_info?.height && (
                  <div className={styles.profileCard}>
                    <span className={styles.profileIcon}>📏</span>
                    <div className={styles.profileCardContent}>
                      <span className={styles.profileLabel}>키</span>
                      <span className={styles.profileValue}>{member.profile_info.height}</span>
                    </div>
                  </div>
                )}
                {member.profile_info?.weight && (
                  <div className={styles.profileCard}>
                    <span className={styles.profileIcon}>⚖️</span>
                    <div className={styles.profileCardContent}>
                      <span className={styles.profileLabel}>몸무게</span>
                      <span className={styles.profileValue}>{member.profile_info.weight}</span>
                    </div>
                  </div>
                )}
                {member.profile_info?.birthday && (
                  <div className={styles.profileCard}>
                    <span className={styles.profileIcon}>🎂</span>
                    <div className={styles.profileCardContent}>
                      <span className={styles.profileLabel}>생일</span>
                      <span className={styles.profileValue}>{member.profile_info.birthday}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <User size={24} />
                <p>등록된 프로필 정보가 없습니다</p>
              </div>
            )}
          </div>

          {/* 소셜 섹션 */}
          {hasSocial && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <Radio size={14} />
                소셜
              </h3>
              <div className={styles.socialGrid}>
                {member.social_links?.pandatv && (
                  <a
                    href={getPandaTvUrl(member.social_links.pandatv)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialCard}
                    data-platform="pandatv"
                  >
                    <Radio size={18} />
                    <span className={styles.socialName}>팬더티비</span>
                    <ExternalLink size={12} className={styles.socialArrow} />
                  </a>
                )}
                {member.social_links?.chzzk && (
                  <a
                    href={member.social_links.chzzk}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialCard}
                    data-platform="chzzk"
                  >
                    <Heart size={18} />
                    <span className={styles.socialName}>치지직</span>
                    <ExternalLink size={12} className={styles.socialArrow} />
                  </a>
                )}
                {member.social_links?.youtube && (
                  <a
                    href={member.social_links.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialCard}
                    data-platform="youtube"
                  >
                    <Youtube size={18} />
                    <span className={styles.socialName}>유튜브</span>
                    <ExternalLink size={12} className={styles.socialArrow} />
                  </a>
                )}
                {member.social_links?.instagram && (
                  <a
                    href={member.social_links.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialCard}
                    data-platform="instagram"
                  >
                    <Instagram size={18} />
                    <span className={styles.socialName}>인스타그램</span>
                    <ExternalLink size={12} className={styles.socialArrow} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

    </motion.div>
  )
}
