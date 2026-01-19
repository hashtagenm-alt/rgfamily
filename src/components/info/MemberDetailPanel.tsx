'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Radio, Youtube, Instagram, ExternalLink, X,
  User, Target, Share2, Heart, Cake, Ruler, Droplet
} from 'lucide-react'
import type { OrgMember } from './MemberCard'
import styles from './MemberDetailPanel.module.css'

const getPandaTvUrl = (id: string) => `https://www.pandalive.co.kr/play/${id}`

interface MemberDetailPanelProps {
  member: OrgMember | null
  onClose: () => void
}

type TabType = 'profile' | 'pledge' | 'social'

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
  const [activeTab, setActiveTab] = useState<TabType>('profile')

  if (!member) return null

  const hasPledge = !!member.profile_info?.position_pledge
  const hasSocial = member.social_links && Object.keys(member.social_links).length > 0
  const hasProfile = hasProfileInfo(member)

  const availableTabs: TabType[] = ['profile']
  if (hasPledge) availableTabs.push('pledge')
  if (hasSocial) availableTabs.push('social')

  const tabLabels: Record<TabType, { icon: React.ReactNode; label: string }> = {
    profile: { icon: <User size={16} />, label: '프로필' },
    pledge: { icon: <Target size={16} />, label: '공약' },
    social: { icon: <Share2 size={16} />, label: '소셜' }
  }

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

      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.coverGradient} data-unit={member.unit} />

        <div className={styles.avatarSection}>
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
        </div>

        <div className={styles.headerInfo}>
          <div className={styles.nameRow}>
            <h2 className={styles.name}>{member.name}</h2>
            <span className={styles.unitBadge} data-unit={member.unit}>
              {member.unit === 'excel' ? 'EXCEL' : 'CREW'}
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

        <div className={`${styles.statusBadge} ${member.is_live ? styles.live : ''}`}>
          {member.is_live ? '🔴 방송 중' : '⚫ 오프라인'}
        </div>
      </div>

      {/* 탭 네비게이션 */}
      {availableTabs.length > 1 && (
        <div className={styles.tabNav}>
          {availableTabs.map((tab) => (
            <button
              key={tab}
              className={`${styles.tabBtn} ${activeTab === tab ? styles.active : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tabLabels[tab].icon}
              <span>{tabLabels[tab].label}</span>
            </button>
          ))}
        </div>
      )}

      {/* 탭 컨텐츠 */}
      <div className={styles.tabContent}>
        <AnimatePresence mode="wait">
          {/* 프로필 탭 */}
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className={styles.profileTab}
            >
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
                  <User size={32} />
                  <p>등록된 프로필 정보가 없습니다</p>
                </div>
              )}
            </motion.div>
          )}

          {/* 공약 탭 */}
          {activeTab === 'pledge' && hasPledge && (
            <motion.div
              key="pledge"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className={styles.pledgeTab}
            >
              {(() => {
                const pledgeRows = parsePledge(member.profile_info!.position_pledge!)
                if (pledgeRows.length > 0) {
                  return (
                    <div className={styles.pledgeTimeline}>
                      {pledgeRows.map((row, idx) => (
                        <div
                          key={idx}
                          className={styles.pledgeItem}
                          data-rank={row.rank}
                        >
                          <div className={styles.pledgeRank}>
                            <span className={styles.rankIcon}>{getRankIcon(row.rank)}</span>
                          </div>
                          <div className={styles.pledgeContent}>
                            <span className={styles.pledgeTitle}>{row.title}</span>
                            <p className={styles.pledgeDesc}>{row.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                }
                return (
                  <div className={styles.pledgeText}>
                    {member.profile_info!.position_pledge}
                  </div>
                )
              })()}
            </motion.div>
          )}

          {/* 소셜 탭 */}
          {activeTab === 'social' && hasSocial && (
            <motion.div
              key="social"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className={styles.socialTab}
            >
              <div className={styles.socialGrid}>
                {member.social_links?.pandatv && (
                  <a
                    href={getPandaTvUrl(member.social_links.pandatv)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialCard}
                    data-platform="pandatv"
                  >
                    <Radio size={24} />
                    <span className={styles.socialName}>팬더티비</span>
                    <ExternalLink size={14} className={styles.socialArrow} />
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
                    <Heart size={24} />
                    <span className={styles.socialName}>치지직</span>
                    <ExternalLink size={14} className={styles.socialArrow} />
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
                    <Youtube size={24} />
                    <span className={styles.socialName}>유튜브</span>
                    <ExternalLink size={14} className={styles.socialArrow} />
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
                    <Instagram size={24} />
                    <span className={styles.socialName}>인스타그램</span>
                    <ExternalLink size={14} className={styles.socialArrow} />
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 하단 CTA */}
      {member.is_live && member.social_links?.pandatv && (
        <div className={styles.footer}>
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
    </motion.div>
  )
}
