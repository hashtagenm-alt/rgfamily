"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Users, Radio, Calendar, FileText } from "lucide-react";
import Footer from "@/components/Footer";
import { useOrganization } from "@/lib/hooks";
import { MemberCard } from "@/components/info";
import type { OrganizationRecord } from "@/types/organization";
import { PledgeSidebar } from "@/components/info/PledgeSidebar";
import { ProfileSidebar } from "@/components/info/ProfileSidebar";
import AdminOrgOverlay, { useAdminOrgEdit } from "@/components/info/AdminOrgOverlay";
import { getRankByName } from "@/lib/constants/ranks";
import styles from "./page.module.css";

type UnitType = "excel" | "crew";

export default function OrganizationPage() {
  const { members, isLoading, getByUnit, getGroupedByRole, refresh } = useOrganization();
  const [selectedMember, setSelectedMember] = useState<OrganizationRecord | null>(null);
  const [activeUnit, setActiveUnit] = useState<UnitType>("excel");

  // 관리자 편집 기능
  const {
    isAdmin,
    editingMember,
    isModalOpen,
    handleMemberClick,
    handleModalClose,
  } = useAdminOrgEdit(refresh);

  // 멤버 클릭 핸들러 - 관리자는 더블클릭으로 편집, 일반 클릭은 선택
  const handleCardClick = (member: OrganizationRecord) => {
    setSelectedMember(selectedMember?.id === member.id ? null : member);
  };

  // 멤버 더블클릭 핸들러 - 관리자만 편집 모달 열기
  const handleCardDoubleClick = (member: OrganizationRecord) => {
    if (isAdmin) {
      handleMemberClick(member);
    }
  };

  // 유닛별 멤버 분류
  const unitMembers = getByUnit(activeUnit) as OrganizationRecord[];

  // 역할별 그룹화
  const grouped = getGroupedByRole(unitMembers);

  // 최상위 리더: 대표 → 부장 → 팀장 순으로 폴백
  const topLeaders =
    grouped.leaders.length > 0
      ? grouped.leaders
      : grouped.directors.length > 0
      ? grouped.directors
      : grouped.managers;
  // 중간 관리자: 팀장 (topLeaders가 팀장이면 빈 배열)
  const middleManagers =
    grouped.leaders.length > 0 || grouped.directors.length > 0
      ? grouped.managers
      : [];

  // 일반 멤버 - 직급 순으로 정렬 (여왕 1위 → 쌉노예 12위)
  const regularMembers = useMemo(() => {
    return [...grouped.members].sort((a, b) => {
      const rankA = a.current_rank ? getRankByName(a.current_rank)?.position ?? 999 : 999;
      const rankB = b.current_rank ? getRankByName(b.current_rank)?.position ?? 999 : 999;
      return rankA - rankB;
    });
  }, [grouped.members]);

  // 섹션 타이틀
  const getLeaderTitle = () => {
    if (grouped.leaders.length > 0) return "대표";
    if (grouped.directors.length > 0) return "부장";
    return "팀장";
  };

  return (
    <div className={styles.container}>
      {/* Minimal Navigation */}
      <nav className={styles.pageNav}>
        <Link href="/" className={styles.backBtn}>
          <ArrowLeft size={18} />
          <span>홈</span>
        </Link>
        <div className={styles.navTabs}>
          <Link
            href="/rg/org"
            className={`${styles.navTab} ${styles.active}`}
          >
            <Users size={16} />
            <span>조직도</span>
          </Link>
          <Link href="/rg/live" className={styles.navTab}>
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
        <h1 className={styles.pageTitle}>조직도</h1>
        <p className={styles.pageDesc}>RG Family 구성원을 소개합니다</p>
      </header>

      {/* Unit Toggle - Clean Tab Style */}
      <div className={styles.unitHeader}>
        <div className={styles.unitToggle}>
          <button
            className={`${styles.unitTab} ${activeUnit === "excel" ? styles.active : ""}`}
            onClick={() => setActiveUnit("excel")}
          >
            <span className={styles.unitName}>EXCEL UNIT</span>
            <span className={styles.unitCount}>{getByUnit("excel").length}명</span>
          </button>
          <button
            className={`${styles.unitTab} ${activeUnit === "crew" ? styles.active : ""}`}
            onClick={() => setActiveUnit("crew")}
          >
            <span className={styles.unitName}>CREW UNIT</span>
            <span className={styles.unitCount}>{getByUnit("crew").length}명</span>
          </button>
        </div>
      </div>

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
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <span>조직도를 불러오는 중...</span>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeUnit}
                className={styles.content}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Section: Leaders */}
                {topLeaders.length > 0 && (
                  <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <h2 className={styles.sectionTitle}>{getLeaderTitle()}</h2>
                      <span className={styles.sectionCount}>{topLeaders.length}명</span>
                    </div>
                    <div className={`${styles.grid} ${styles.gridLeaders}`}>
                      {topLeaders.map((member, index) => (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onDoubleClick={() => handleCardDoubleClick(member)}
                        >
                          <MemberCard
                            member={member}
                            size="large"
                            onClick={() => handleCardClick(member)}
                            isSelected={selectedMember?.id === member.id}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Section: Managers */}
                {middleManagers.length > 0 && (
                  <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <h2 className={styles.sectionTitle}>팀장</h2>
                      <span className={styles.sectionCount}>{middleManagers.length}명</span>
                    </div>
                    <div className={`${styles.grid} ${styles.gridManagers}`}>
                      {middleManagers.map((member, index) => (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onDoubleClick={() => handleCardDoubleClick(member)}
                        >
                          <MemberCard
                            member={member}
                            size="medium"
                            onClick={() => handleCardClick(member)}
                            isSelected={selectedMember?.id === member.id}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Section: Members */}
                {regularMembers.length > 0 && (
                  <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <h2 className={styles.sectionTitle}>멤버</h2>
                      <span className={styles.sectionCount}>{regularMembers.length}명</span>
                    </div>
                    <div className={`${styles.grid} ${styles.gridMembers}`}>
                      {regularMembers.map((member, index) => (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          onDoubleClick={() => handleCardDoubleClick(member)}
                        >
                          <MemberCard
                            member={member}
                            size="small"
                            onClick={() => handleCardClick(member)}
                            isSelected={selectedMember?.id === member.id}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Empty State */}
                {topLeaders.length === 0 &&
                  middleManagers.length === 0 &&
                  regularMembers.length === 0 && (
                    <div className={styles.emptyState}>
                      <Users size={48} />
                      <p>해당 유닛에 멤버가 없습니다.</p>
                    </div>
                  )}
              </motion.div>
            </AnimatePresence>
          )}
          <Footer />
        </div>

        {/* Right Sidebar - Pledge */}
        <div className={styles.rightSidebar}>
          <AnimatePresence mode="wait">
            <PledgeSidebar member={selectedMember} onClose={() => setSelectedMember(null)} />
          </AnimatePresence>
        </div>
      </div>

      {/* 관리자 오버레이 */}
      <AdminOrgOverlay
        editingMember={editingMember}
        isModalOpen={isModalOpen}
        onModalClose={handleModalClose}
        onMembersChanged={refresh}
      />
    </div>
  );
}
