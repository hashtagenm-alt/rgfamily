"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Users, Radio, Calendar, FileText } from "lucide-react";
import Footer from "@/components/Footer";
import { useOrganization } from "@/lib/hooks";
import {
  MemberCard,
  MemberDetailModal,
  type OrgMember,
} from "@/components/info";
import styles from "./page.module.css";

type UnitType = "excel" | "crew";

export default function OrganizationPage() {
  const { members, isLoading, getByUnit, getGroupedByRole } = useOrganization();
  const [selectedMember, setSelectedMember] = useState<OrgMember | null>(null);
  const [activeUnit, setActiveUnit] = useState<UnitType>("excel");

  // 유닛별 멤버 분류
  const unitMembers = getByUnit(activeUnit) as OrgMember[];

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
  // 일반 멤버
  const regularMembers = grouped.members;

  return (
      <div className={`${styles.container} ${activeUnit === 'crew' ? styles.crewTheme : styles.excelTheme}`}>
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

        {/* Unit Toggle - 프리미엄 탭 스타일 */}
        <div className={styles.unitHeader}>
          <div className={styles.unitToggle}>
            <button
              className={`${styles.unitTab} ${activeUnit === "excel" ? styles.activeExcel : ""}`}
              onClick={() => setActiveUnit("excel")}
            >
              <span className={styles.unitName}>EXCEL UNIT</span>
              <span className={styles.unitCount}>{getByUnit("excel").length}명</span>
            </button>
            <button
              className={`${styles.unitTab} ${activeUnit === "crew" ? styles.activeCrew : ""}`}
              onClick={() => setActiveUnit("crew")}
            >
              <span className={styles.unitName}>CREW UNIT</span>
              <span className={styles.unitCount}>{getByUnit("crew").length}명</span>
            </button>
          </div>
        </div>

      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>조직도를 불러오는 중...</span>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeUnit}
            className={styles.orgChart}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Level 0: Top Leaders (대표/부장) */}
            {topLeaders.length > 0 && (
              <>
                <div className={styles.level} data-level="0">
                  <div className={styles.levelMembers}>
                    {topLeaders.map((member) => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        size="large"
                        onClick={() => setSelectedMember(member)}
                      />
                    ))}
                  </div>
                </div>

                {/* Connector to Level 1 */}
                {(middleManagers.length > 0 || regularMembers.length > 0) && (
                  <div className={styles.connector}>
                    <div className={styles.verticalLine} />
                    {middleManagers.length > 1 && (
                      <>
                        <div className={styles.horizontalLine} />
                        <div className={styles.branchLines}>
                          {middleManagers.map((_, i) => (
                            <div key={i} className={styles.branchLine} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Level 1: Middle Managers (팀장) */}
            {middleManagers.length > 0 && (
              <>
                <div className={styles.level} data-level="1">
                  <div className={styles.levelMembers}>
                    {middleManagers.map((member) => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        size="medium"
                        onClick={() => setSelectedMember(member)}
                      />
                    ))}
                  </div>
                </div>

                {/* Connector to Level 2 (Members) */}
                {regularMembers.length > 0 && (
                  <div className={styles.connector}>
                    <div className={styles.verticalLine} />
                    {/* Only show branching if there are multiple members to justify spread */}
                    {regularMembers.length > 1 && (
                      <>
                        <div
                          className={styles.horizontalLine}
                          style={{
                            width: `${Math.min(
                              Math.max(regularMembers.length * 80, 200),
                              600
                            )}px`,
                          }}
                        />
                        <div
                          className={styles.branchLines}
                          style={{
                            width: `${Math.min(
                              Math.max(regularMembers.length * 80, 200),
                              600
                            )}px`,
                          }}
                        >
                          {/* Aesthetic optimization: Limit number of branch lines to avoid clutter */}
                          {Array.from({
                            length: Math.min(regularMembers.length, 8),
                          }).map((_, i) => (
                            <div key={i} className={styles.branchLine} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Level 2: Regular Members (멤버/크루) */}
            {regularMembers.length > 0 && (
              <div className={styles.level} data-level="2">
                <div className={styles.levelMembers}>
                  {regularMembers.map((member) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      size="small"
                      onClick={() => setSelectedMember(member)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {topLeaders.length === 0 &&
              middleManagers.length === 0 &&
              regularMembers.length === 0 && (
                <div className={styles.emptyState}>
                  <p>해당 유닛에 멤버가 없습니다.</p>
                </div>
              )}
          </motion.div>
        </AnimatePresence>
      )}

        {/* Member Detail Modal */}
        <AnimatePresence>
          {selectedMember && (
            <MemberDetailModal
              member={selectedMember}
              onClose={() => setSelectedMember(null)}
            />
          )}
        </AnimatePresence>
        <Footer />
      </div>
  );
}
