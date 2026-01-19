"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useLiveRoster } from "@/lib/hooks";
import { PledgeSidebar } from "@/components/info/PledgeSidebar";
import { ProfileSidebar } from "@/components/info/ProfileSidebar";
import type { OrgMember, UnitFilter } from "@/types/organization";
import { ArrowLeft, Radio, Users, FileText, Calendar } from "lucide-react";
import styles from "./page.module.css";

// PandaTV ID로 URL 생성
const getPandaTvUrl = (id: string) => `https://www.pandalive.co.kr/play/${id}`;

export default function LivePage() {
  const { members, isLoading } = useLiveRoster({ realtime: true });
  const [selectedMember, setSelectedMember] = useState<OrgMember | null>(null);
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('all');

  // Filter by unit
  const unitFilteredMembers = useMemo(() => {
    return unitFilter === 'all'
      ? members
      : members.filter((member) => member.unit === unitFilter);
  }, [members, unitFilter]);

  // Separate live and offline members
  const liveMembers = useMemo(() => unitFilteredMembers.filter(m => m.is_live), [unitFilteredMembers]);
  const offlineMembers = useMemo(() => unitFilteredMembers.filter(m => !m.is_live), [unitFilteredMembers]);

  const liveCount = liveMembers.length;
  const totalCount = unitFilteredMembers.length;

  return (
    <div className={styles.main}>
      {/* Navigation */}
      <nav className={styles.pageNav}>
        <Link href="/" className={styles.backBtn}>
          <ArrowLeft size={18} />
          <span>홈</span>
        </Link>
        <div className={styles.navTabs}>
          <Link href="/rg/org" className={styles.navTab}>
            <Users size={16} />
            <span>조직도</span>
          </Link>
          <Link
            href="/rg/live"
            className={`${styles.navTab} ${styles.active}`}
          >
            <Radio size={16} />
            <span>LIVE</span>
          </Link>
          <Link href="/rg/sig" className={styles.navTab}>
            <FileText size={16} />
            <span>시그</span>
          </Link>
          <Link href="/rg/history" className={styles.navTab}>
            <Calendar size={16} />
            <span>연혁</span>
          </Link>
        </div>
      </nav>

      {/* Page Header */}
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>라이브 방송</h1>
        <p className={styles.pageDesc}>RG Family 멤버들의 실시간 방송 현황</p>
      </header>

      {/* Main Layout - 3 Column: Left Sidebar + Content + Right Sidebar */}
      <div className={`${styles.mainLayout} ${selectedMember ? styles.sidebarsOpen : ''}`}>
        {/* Left Sidebar - Profile/Social */}
        <div className={styles.leftSidebar}>
          <AnimatePresence mode="wait">
            <ProfileSidebar member={selectedMember} onClose={() => setSelectedMember(null)} />
          </AnimatePresence>
        </div>

        {/* Content Area */}
        <div className={styles.contentArea}>
          <div className={styles.container}>
            {/* Filter Bar */}
            <div className={styles.filterBar}>
              <div className={styles.unitFilter}>
                {(['all', 'excel', 'crew'] as const).map((unit) => (
                  <button
                    key={unit}
                    onClick={() => setUnitFilter(unit)}
                    className={`${styles.unitButton} ${unitFilter === unit ? styles.active : ''}`}
                    data-unit={unit}
                  >
                    {unit === 'all' ? '전체' : unit === 'excel' ? '엑셀부' : '크루부'}
                  </button>
                ))}
              </div>
              <div className={styles.statsBar}>
                <div className={styles.liveIndicator}>
                  <span className={styles.liveDot} />
                  <span className={styles.liveCount}>LIVE {liveCount}</span>
                </div>
                <span className={styles.totalCount}>전체 {totalCount}명</span>
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
                      현재 방송 중
                    </h2>
                    <div className={styles.liveGrid}>
                      {liveMembers.map((member, index) => (
                        <motion.div
                          key={member.id}
                          className={`${styles.liveCard} ${selectedMember?.id === member.id ? styles.selected : ''}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => setSelectedMember(selectedMember?.id === member.id ? null : member)}
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
                            <div className={styles.liveCardMeta}>
                              <span className={styles.unitBadge} data-unit={member.unit}>
                                {member.unit === 'excel' ? '엑셀부' : '크루부'}
                              </span>
                              <span className={styles.liveStatusText}>방송중</span>
                            </div>
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
                    오프라인 멤버
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
                          className={`${styles.card} ${selectedMember?.id === member.id ? styles.selected : ''}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => setSelectedMember(selectedMember?.id === member.id ? null : member)}
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
        </div>

        {/* Right Sidebar - Pledge */}
        <div className={styles.rightSidebar}>
          <AnimatePresence mode="wait">
            <PledgeSidebar member={selectedMember} onClose={() => setSelectedMember(null)} />
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
