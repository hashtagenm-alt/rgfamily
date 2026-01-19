"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useLiveRoster } from "@/lib/hooks";
import type { LiveMember, UnitFilter } from "@/types/organization";
import { Radio, Youtube, Instagram, ExternalLink, X, ArrowLeft, Users, Filter } from "lucide-react";
import styles from "./page.module.css";

// PandaTV ID로 URL 생성
const getPandaTvUrl = (id: string) => `https://www.pandalive.co.kr/play/${id}`;

export default function LivePage() {
  const { members, isLoading } = useLiveRoster({ realtime: true });
  const [selectedMember, setSelectedMember] = useState<LiveMember | null>(null);
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('all');

  // Filter by unit
  const unitFilteredMembers = useMemo(() => {
    const filtered = unitFilter === 'all'
      ? members
      : members.filter((member) => member.unit === unitFilter);
    return filtered as LiveMember[];
  }, [members, unitFilter]);

  // Separate live and offline members
  const liveMembers = useMemo(() => unitFilteredMembers.filter(m => m.is_live), [unitFilteredMembers]);
  const offlineMembers = useMemo(() => unitFilteredMembers.filter(m => !m.is_live), [unitFilteredMembers]);

  const liveCount = liveMembers.length;
  const totalCount = unitFilteredMembers.length;

  return (
    <main className={styles.main}>
      {/* Navigation Bar - Reference Style */}
      <nav className={styles.pageNav}>
        <Link href="/" className={styles.backBtn}>
          <ArrowLeft size={18} />
          <span>홈</span>
        </Link>
        <div className={styles.navTitle}>
          <Radio size={16} />
          <span>LIVE STATUS</span>
        </div>
        <div className={styles.navActions}>
          <button className={styles.navBtn}>
            <Filter size={16} />
            <span>필터</span>
          </button>
          <button className={styles.navBtn}>
            <Users size={16} />
            <span>{totalCount}명</span>
          </button>
        </div>
      </nav>

      <div className={styles.container}>
        {/* Unit Filter */}
        <div className={styles.filters}>
          <div className={styles.unitFilter}>
            {(['all', 'excel', 'crew'] as const).map((unit) => (
              <button
                key={unit}
                onClick={() => setUnitFilter(unit)}
                className={`${styles.unitButton} ${unitFilter === unit ? styles.active : ''}`}
                data-unit={unit}
              >
                {unit === 'all' ? 'ALL' : unit.toUpperCase()}
              </button>
            ))}
          </div>
          <div className={styles.liveIndicator}>
            <span className={styles.liveDotSmall} />
            <span className={styles.liveCount}>{liveCount} LIVE</span>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>멤버 목록을 불러오는 중...</span>
          </div>
        ) : (
          <>
            {/* Live Members Section */}
            {liveMembers.length > 0 && (
              <section className={styles.liveSection}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.liveDotSmall} />
                  NOW STREAMING
                </h2>
                <div className={styles.liveGrid}>
                  {liveMembers.map((member, index) => (
                    <motion.div
                      key={member.id}
                      className={styles.liveCard}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedMember(member)}
                    >
                      <div className={styles.liveCardAvatar}>
                        <div className={styles.avatarRing}>
                          <div className={styles.avatarInner}>
                            {member.image_url ? (
                              <Image
                                src={member.image_url}
                                alt={member.name}
                                fill
                                className={styles.avatarImage}
                                unoptimized
                              />
                            ) : (
                              <div className={styles.avatarPlaceholder}>
                                {member.name.charAt(0)}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className={styles.liveBadge}>LIVE</span>
                      </div>
                      <div className={styles.liveCardInfo}>
                        <span className={styles.unitBadge} data-unit={member.unit}>
                          {member.unit.toUpperCase()}
                        </span>
                        <span className={styles.cardName}>{member.name}</span>
                        <span className={styles.cardRole}>{member.role}</span>
                      </div>
                      {member.social_links?.pandatv && (
                        <a
                          href={getPandaTvUrl(member.social_links.pandatv)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.watchBtn}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Radio size={14} />
                          시청하기
                        </a>
                      )}
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Offline Members Section */}
            <section className={styles.offlineSection}>
              <h2 className={styles.sectionTitle}>
                <Users size={18} />
                전체 멤버
              </h2>
              {offlineMembers.length === 0 && liveMembers.length === 0 ? (
                <div className={styles.empty}>
                  <Radio size={48} className={styles.emptyIcon} />
                  <p>등록된 멤버가 없습니다</p>
                </div>
              ) : (
                <div className={styles.grid}>
                  {offlineMembers.map((member, index) => (
                    <motion.div
                      key={member.id}
                      className={styles.card}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => setSelectedMember(member)}
                    >
                      <div className={styles.cardAvatar}>
                        {member.image_url ? (
                          <Image
                            src={member.image_url}
                            alt={member.name}
                            fill
                            className={styles.avatarImage}
                            unoptimized
                          />
                        ) : (
                          <div className={styles.avatarPlaceholder}>
                            {member.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className={styles.cardInfo}>
                        <span className={styles.unitBadge} data-unit={member.unit}>
                          {member.unit.toUpperCase()}
                        </span>
                        <span className={styles.cardName}>{member.name}</span>
                        <span className={styles.cardRole}>{member.role}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Member Detail Modal */}
      <AnimatePresence>
        {selectedMember && (
          <MemberDetailModal
            member={selectedMember}
            onClose={() => setSelectedMember(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function MemberDetailModal({ member, onClose }: { member: LiveMember; onClose: () => void }) {
  return (
    <motion.div
      className={styles.modalOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className={styles.modalClose} onClick={onClose}>
          <X size={24} />
        </button>

        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={`${styles.modalAvatarWrapper} ${member.is_live ? styles.isLive : ''}`}>
            {member.is_live && (
              <span className={styles.modalLiveBadge}>LIVE</span>
            )}
            <div className={styles.modalAvatar}>
              {member.image_url ? (
                <Image
                  src={member.image_url}
                  alt={member.name}
                  fill
                  className={styles.modalAvatarImage}
                  unoptimized
                />
              ) : (
                <div className={styles.modalAvatarPlaceholder}>
                  {member.name.charAt(0)}
                </div>
              )}
            </div>
          </div>

          <div className={styles.modalInfo}>
            <span className={styles.modalUnit} data-unit={member.unit}>
              {member.unit === 'excel' ? 'EXCEL UNIT' : 'CREW UNIT'}
            </span>
            <h2 className={styles.modalName}>{member.name}</h2>
            <span className={styles.modalRole}>{member.role}</span>
          </div>
        </div>

        {/* Status */}
        <div className={styles.modalStatus}>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>상태</span>
            <span className={`${styles.statusValue} ${member.is_live ? styles.statusLive : ''}`}>
              {member.is_live ? "LIVE" : "오프라인"}
            </span>
          </div>
        </div>

        {/* Social Links */}
        {member.social_links && Object.keys(member.social_links).length > 0 && (
          <div className={styles.modalSocial}>
            <h3 className={styles.modalSectionTitle}>소셜 링크</h3>
            <div className={styles.modalSocialGrid}>
              {member.social_links.pandatv && (
                <a
                  href={getPandaTvUrl(member.social_links.pandatv)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.modalSocialLink}
                >
                  <Radio size={20} />
                  <span>팬더티비</span>
                  <ExternalLink size={14} className={styles.linkIcon} />
                </a>
              )}
              {member.social_links.chzzk && (
                <a
                  href={member.social_links.chzzk}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.modalSocialLink}
                >
                  <ExternalLink size={20} />
                  <span>치지직</span>
                  <ExternalLink size={14} className={styles.linkIcon} />
                </a>
              )}
              {member.social_links.youtube && (
                <a
                  href={member.social_links.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.modalSocialLink}
                >
                  <Youtube size={20} />
                  <span>유튜브</span>
                  <ExternalLink size={14} className={styles.linkIcon} />
                </a>
              )}
              {member.social_links.instagram && (
                <a
                  href={member.social_links.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.modalSocialLink}
                >
                  <Instagram size={20} />
                  <span>인스타그램</span>
                  <ExternalLink size={14} className={styles.linkIcon} />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Watch Button */}
        {member.is_live && member.social_links?.pandatv && (
          <a
            href={getPandaTvUrl(member.social_links.pandatv)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.watchButton}
          >
            <Radio size={18} />
            지금 방송 보러가기
          </a>
        )}
      </motion.div>
    </motion.div>
  );
}
